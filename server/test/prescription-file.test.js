import assert from "node:assert/strict";
import test from "node:test";
import { validatePrescriptionFile } from "../src/services/prescription.service.js";

test("accepts a PDF only when the file signature matches its MIME type", () => {
  const file = {
    mimetype: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\n"),
  };
  assert.equal(validatePrescriptionFile(file).extension, ".pdf");
});

test("rejects a spoofed or unsupported upload", () => {
  assert.throws(
    () => validatePrescriptionFile({
      mimetype: "application/pdf",
      buffer: Buffer.from("not a PDF"),
    }),
    { statusCode: 400 },
  );
  assert.throws(
    () => validatePrescriptionFile({
      mimetype: "text/html",
      buffer: Buffer.from("<script>alert(1)</script>"),
    }),
    { statusCode: 400 },
  );
});
