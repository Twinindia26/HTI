import { mkdir, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { query, transaction } from "../config/db.js";
import { safePrivateFileName } from "./private-file.service.js";

const storageDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../uploads/private-scripts",
);
const typeByExtension = new Map([
  [".js", ["application/javascript", "text/javascript"]],
  [".py", ["text/x-python", "text/plain"]],
  [".sh", ["text/x-shellscript", "text/plain"]],
  [".sql", ["application/sql", "text/plain"]],
  [".txt", ["text/plain"]],
]);
const emailMaximumAttempts = 5;
const emailLeaseSeconds = 120;
const emailBatchLimit = 10;
const emailRetryBaseMs = 30_000;
const emailRetryMaximumMs = 60 * 60 * 1000;

function isEmailConfigured() {
  return Boolean(env.adminEmail.trim() && env.resendApiKey && env.emailFrom);
}

export function emailRetryDelayMs(attemptCount) {
  if (!Number.isSafeInteger(attemptCount) || attemptCount < 1) {
    throw new RangeError("Email attempt count must be a positive integer.");
  }
  const exponent = Math.min(attemptCount - 1, 16);
  return Math.min(emailRetryBaseMs * (2 ** exponent), emailRetryMaximumMs);
}

export function validateScriptFile(file, config = env) {
  const name = safePrivateFileName(file?.originalname, "");
  const extension = path.extname(name).toLowerCase();
  const allowedTypes = typeByExtension.get(extension);
  let text = "";
  try {
    if (Buffer.isBuffer(file?.buffer)) {
      text = new TextDecoder("utf-8", { fatal: true }).decode(file.buffer);
    }
  } catch {
    text = "";
  }
  const validText = text.length > 0 &&
    !text.includes("\u0000") &&
    !/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(text);
  if (
    !allowedTypes ||
    !config.uploadScriptExtensions.has(extension) ||
    !config.uploadScriptMimeTypes.has(String(file?.mimetype || "").toLowerCase()) ||
    !allowedTypes.includes(String(file?.mimetype || "").toLowerCase()) ||
    !Buffer.isBuffer(file?.buffer) ||
    file.buffer.length < 1 ||
    file.buffer.length > config.uploadScriptMaxBytes ||
    !validText
  ) {
    const error = new Error("Upload a permitted UTF-8 text script using a matching extension and MIME type.");
    error.statusCode = file?.buffer?.length > config.uploadScriptMaxBytes ? 413 : 400;
    throw error;
  }
  return { extension, mimeType: file.mimetype, fileName: name };
}

export async function createUploadedScript({ uploaderId, file }) {
  const metadata = validateScriptFile(file);
  const fileKey = randomUUID();
  const storedPath = path.join(storageDirectory, `${fileKey}${metadata.extension}`);
  await mkdir(storageDirectory, { recursive: true });
  await writeFile(storedPath, file.buffer, { flag: "wx", mode: 0o600 });

  let script;
  try {
    script = await transaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO uploaded_scripts (uploader_id, file_key, file_name, file_extension, mime_type, file_size)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, file_name, file_extension, mime_type, file_size, created_at`,
        [uploaderId, fileKey, metadata.fileName, metadata.extension, metadata.mimeType, file.size],
      );
      await client.query(
        `INSERT INTO notifications (user_id, notification_type, message)
         VALUES ($1, 'script_uploaded', $2)`,
        [uploaderId, `A private script was uploaded (upload ${inserted.rows[0].id}).`],
      );
      await client.query(
        `INSERT INTO audit_logs (user_id, action, target_type, target_id)
         VALUES ($1, 'script.upload', 'uploaded_script', $2)`,
        [uploaderId, inserted.rows[0].id],
      );
      const recipient = env.adminEmail.trim() || null;
      const outbox = await client.query(
        `INSERT INTO email_outbox (event_type, recipient_email, subject, body, status)
         VALUES ('script_uploaded', $1, $2, $3, $4)
         RETURNING id`,
        [
          recipient,
          "Private script upload",
          `A private script upload (${inserted.rows[0].id}) requires administrator attention.`,
          recipient && env.resendApiKey && env.emailFrom ? "pending" : "unconfigured",
        ],
      );
      return { ...inserted.rows[0], file_key: fileKey, outbox_id: outbox.rows[0].id };
    });
  } catch (error) {
    try {
      await unlink(storedPath);
    } catch (cleanupError) {
      console.error("Could not remove an orphaned private upload:", cleanupError);
    }
    throw error;
  }
  try {
    await processEmailOutboxBatch({ limit: 1 });
  } catch {
    console.warn("Email outbox attempt could not complete; the upload remains saved for retry.");
  }
  const { file_key: _fileKey, outbox_id: _outboxId, ...safeScript } = script;
  return safeScript;
}

export async function claimEmailOutboxBatch({ limit = emailBatchLimit } = {}) {
  if (!isEmailConfigured()) return [];
  const batchSize = Number.isSafeInteger(limit) ? Math.min(Math.max(limit, 1), emailBatchLimit) : emailBatchLimit;
  return transaction(async (client) => {
    await client.query(
      `UPDATE email_outbox
       SET recipient_email = $1, status = 'pending', updated_at = NOW()
       WHERE status = 'unconfigured' AND recipient_email IS NULL AND event_type = 'script_uploaded'`,
      [env.adminEmail.trim()],
    );
    await client.query(
      `UPDATE email_outbox
       SET status = 'failed', claimed_at = NULL, claim_token = NULL,
           error_code = 'retry_exhausted', updated_at = NOW()
       WHERE status = 'sending'
         AND claimed_at <= NOW() - ($1 * INTERVAL '1 second')
         AND attempt_count >= $2`,
      [emailLeaseSeconds, emailMaximumAttempts],
    );
    const result = await client.query(
      `WITH candidates AS (
         SELECT id
         FROM email_outbox
         WHERE attempt_count < $1
           AND recipient_email IS NOT NULL
           AND next_attempt_at <= NOW()
           AND (
             status IN ('pending', 'failed', 'unconfigured')
             OR (status = 'sending' AND claimed_at <= NOW() - ($3 * INTERVAL '1 second'))
           )
         ORDER BY created_at, id
         LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       UPDATE email_outbox AS outbox
       SET status = 'sending', attempt_count = outbox.attempt_count + 1,
           claimed_at = NOW(), claim_token = gen_random_uuid(), updated_at = NOW()
       FROM candidates
       WHERE outbox.id = candidates.id
       RETURNING outbox.id, outbox.event_type, outbox.recipient_email,
         outbox.subject, outbox.body, outbox.attempt_count, outbox.claim_token`,
      [emailMaximumAttempts, batchSize, emailLeaseSeconds],
    );
    return result.rows;
  });
}

async function recordEmailFailure(message, errorCode) {
  const retryDelay = emailRetryDelayMs(Number(message.attempt_count));
  await query(
    `UPDATE email_outbox
     SET status = 'failed', next_attempt_at = NOW() + ($3 * INTERVAL '1 millisecond'),
         claimed_at = NULL, claim_token = NULL, error_code = $4, updated_at = NOW()
     WHERE id = $1 AND status = 'sending' AND claim_token = $2`,
    [message.id, message.claim_token, retryDelay, errorCode],
  );
}

async function deliverClaimedEmail(message) {
  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        from: env.emailFrom,
        to: [message.recipient_email],
        subject: message.subject,
        text: message.body,
      }),
    });
  } catch {
    await recordEmailFailure(message, "resend_request_failed");
    return;
  }

  if (!response.ok) {
    await recordEmailFailure(message, `resend_http_${response.status}`);
    return;
  }

  const providerResult = await response.json().catch(() => ({}));
  await query(
    `UPDATE email_outbox
     SET status = 'sent', provider_message_id = $3, sent_at = NOW(),
         claimed_at = NULL, claim_token = NULL, error_code = NULL, updated_at = NOW()
     WHERE id = $1 AND status = 'sending' AND claim_token = $2`,
    [
      message.id,
      message.claim_token,
      typeof providerResult.id === "string" ? providerResult.id.slice(0, 255) : null,
    ],
  );
}

export async function processEmailOutboxBatch({ limit = emailBatchLimit } = {}) {
  if (!isEmailConfigured()) return { claimed: 0 };
  const messages = await claimEmailOutboxBatch({ limit });
  const results = await Promise.allSettled(messages.map(deliverClaimedEmail));
  if (results.some((result) => result.status === "rejected")) {
    console.warn("Some email outbox updates remain claimed and will be retried after their lease expires.");
  }
  return { claimed: messages.length };
}

export function startEmailOutboxWorker({ intervalMs = 15_000 } = {}) {
  let processing = false;
  const process = async () => {
    if (processing) return;
    processing = true;
    try {
      await processEmailOutboxBatch();
    } catch {
      console.warn("Email outbox worker could not claim messages; eligible messages remain retryable.");
    } finally {
      processing = false;
    }
  };
  void process();
  const timer = setInterval(process, intervalMs);
  timer.unref?.();
  return timer;
}

export async function listUploadedScripts() {
  const result = await query(
    `SELECT s.id, s.file_name, s.file_extension, s.mime_type, s.file_size, s.created_at,
       u.full_name AS uploader_name
     FROM uploaded_scripts s JOIN users u ON u.id = s.uploader_id
     ORDER BY s.created_at DESC`,
  );
  return result.rows;
}

export async function getUploadedScriptFile(scriptId) {
  const result = await query(
    "SELECT file_key, file_name, file_extension, mime_type FROM uploaded_scripts WHERE id = $1",
    [scriptId],
  );
  const script = result.rows[0];
  if (!script || !/^\.[a-z0-9]{1,15}$/.test(script.file_extension)) return null;
  return {
    path: path.join(storageDirectory, `${script.file_key}${script.file_extension}`),
    mimeType: script.mime_type,
    fileName: `hti-script${script.file_extension}`,
  };
}
