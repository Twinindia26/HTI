import { getUploadedScriptFile, listUploadedScripts, createUploadedScript } from "../services/script-upload.service.js";

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function getUploadedScripts(_request, response) {
  const scripts = await listUploadedScripts();
  return response.status(200).json({ scripts });
}

export async function postUploadedScript(request, response) {
  const script = await createUploadedScript({ uploaderId: request.user.id, file: request.file });
  return response.status(201).json({ script });
}

export async function downloadUploadedScript(request, response, next) {
  const id = parseId(request.params.id);
  if (!id) return response.status(400).json({ error: "Script ID must be a positive integer." });
  const file = await getUploadedScriptFile(id);
  if (!file) return response.status(404).json({ error: "Private script not found." });
  response.set("Cache-Control", "private, no-store");
  response.set("X-Content-Type-Options", "nosniff");
  response.set("Content-Security-Policy", "sandbox; default-src 'none'");
  response.type(file.mimeType);
  return response.download(file.path, file.fileName, { headers: { "Content-Disposition": `attachment; filename="${file.fileName}"` } }, (error) => {
    if (error) next(error);
  });
}
