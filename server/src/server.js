import "dotenv/config";
import app from "./app.js";
import { env, hasValidClerkKeys } from "./config/env.js";
import { startEmailOutboxWorker } from "./services/script-upload.service.js";

app.listen(env.port, () => {
  console.log(`HTI Backend listening on port ${env.port}`);
  console.log(`Clerk configured: ${hasValidClerkKeys()}`);
  console.log(`Database configured: ${Boolean(env.databaseUrl)}`);
  console.log(`Admin email configured: ${env.adminEmail || "(not set)"}`);
  startEmailOutboxWorker();
});