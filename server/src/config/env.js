const port = Number(process.env.PORT || 5000);
const scriptExtensions = (process.env.UPLOAD_SCRIPT_EXTENSIONS || ".js,.py,.sh,.sql,.txt")
  .split(",")
  .map((extension) => extension.trim().toLowerCase())
  .filter(Boolean);
const scriptMimeTypes = (process.env.UPLOAD_SCRIPT_MIME_TYPES ||
  "application/javascript,text/javascript,text/x-python,text/x-shellscript,application/sql,text/plain")
  .split(",")
  .map((mimeType) => mimeType.trim().toLowerCase())
  .filter(Boolean);
const scriptMaxBytes = Number(process.env.UPLOAD_SCRIPT_MAX_BYTES || 1024 * 1024);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}
if (!Number.isSafeInteger(scriptMaxBytes) || scriptMaxBytes < 1 || scriptMaxBytes > 10 * 1024 * 1024) {
  throw new Error("UPLOAD_SCRIPT_MAX_BYTES must be between 1 and 10485760.");
}

function hasValidClerkKey(value, expectedPrefix = "pk_") {
  return typeof value === "string"
    && value.trim().startsWith(expectedPrefix)
    && !value.includes("your_key")
    && !value.includes("replace_me")
    && !value.includes("<")
    && !value.includes(">")
    && value.trim().length > expectedPrefix.length;
}

export function hasValidClerkKeys() {
  return hasValidClerkKey(process.env.CLERK_PUBLISHABLE_KEY || "") &&
    typeof process.env.CLERK_SECRET_KEY === "string" &&
    process.env.CLERK_SECRET_KEY.trim().startsWith("sk_") &&
    !process.env.CLERK_SECRET_KEY.includes("your_key") &&
    !process.env.CLERK_SECRET_KEY.includes("replace_me");
}

export const env = {
  port,
  nodeEnv: process.env.NODE_ENV || "development",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL || "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY || "",
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || "",
  clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET || "",
  adminEmail: process.env.ADMIN_EMAIL || "",
  uploadScriptExtensions: new Set(scriptExtensions),
  uploadScriptMimeTypes: new Set(scriptMimeTypes),
  uploadScriptMaxBytes: scriptMaxBytes,
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "",
  clerkEnabled: hasValidClerkKeys(),
};
