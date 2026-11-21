import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";

const storageDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../uploads/private-health-records",
);

const types = new Map([
  ["application/pdf", { extension: ".pdf", signature: (buffer) => buffer.subarray(0, 5).toString() === "%PDF-" }],
  ["image/jpeg", { extension: ".jpg", signature: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff }],
  ["image/png", { extension: ".png", signature: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) }],
  ["image/webp", { extension: ".webp", signature: (buffer) => buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP" }],
]);

export function validateHealthRecordFile(file) {
  const type = types.get(file?.mimetype);
  if (!type || !Buffer.isBuffer(file.buffer) || file.buffer.length > 10 * 1024 * 1024 ||
      !type.signature(file.buffer)) {
    const error = new Error("Upload a valid PDF, JPEG, PNG, or WebP file no larger than 10 MB.");
    error.statusCode = file?.buffer?.length > 10 * 1024 * 1024 ? 413 : 400;
    throw error;
  }
  return type;
}

export function safePrivateFileName(name, fallback = "health-record") {
  const normalized = (typeof name === "string" ? name : "")
    .replace(/^.*[\\/]/, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  return normalized.slice(0, 255) || fallback;
}

export async function storePrivateHealthRecord(file, type) {
  const fileKey = randomUUID();
  await mkdir(storageDirectory, { recursive: true });
  const storedPath = path.join(storageDirectory, `${fileKey}${type.extension}`);
  await writeFile(storedPath, file.buffer, { flag: "wx", mode: 0o600 });
  return { fileKey, path: storedPath, extension: type.extension };
}

export function getPrivateHealthRecordPath(fileKey, mimeType) {
  const type = types.get(mimeType);
  if (!type || !/^[0-9a-f-]{36}$/i.test(fileKey)) {
    throw new Error("The stored file type is not supported.");
  }
  return path.join(storageDirectory, `${fileKey}${type.extension}`);
}

export function privateHealthRecordMimeTypes() {
  return [...types.keys()];
}
