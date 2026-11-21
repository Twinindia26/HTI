import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessHealthRecord,
  hasExplicitRecordConsent,
  validateVital,
} from "../src/services/health-data.service.js";
import { validateHealthRecordFile } from "../src/services/private-file.service.js";
import {
  emailRetryDelayMs,
  validateScriptFile,
} from "../src/services/script-upload.service.js";
import { publicationIsPublic } from "../src/services/publication.service.js";

test("vital validation enforces paired type, unit, value, and date", () => {
  assert.equal(validateVital({
    type: "blood_pressure",
    value: 120,
    diastolicValue: 80,
    unit: "mmHg",
    measuredAt: "2026-10-01T10:00:00Z",
  }).diastolicValue, 80);

  for (const input of [
    { type: "heart_rate", value: 72, unit: "mmHg", measuredAt: "2026-10-01T10:00:00Z" },
    { type: "spo2", value: 101, unit: "%", measuredAt: "2026-10-01T10:00:00Z" },
    { type: "blood_pressure", value: 80, diastolicValue: 120, unit: "mmHg", measuredAt: "2026-10-01T10:00:00Z" },
    { type: "height", value: 150, unit: "in", measuredAt: "2026-10-01T10:00:00Z" },
  ]) {
    assert.throws(() => validateVital(input), { statusCode: 400 });
  }
});

test("health record access requires ownership or a doctor-specific grant", () => {
  assert.equal(canAccessHealthRecord({
    patientId: 7, viewerId: 7, viewerRole: "PATIENT",
  }), true);
  assert.equal(canAccessHealthRecord({
    patientId: 7, viewerId: 9, viewerRole: "PATIENT",
  }), false);
  assert.equal(hasExplicitRecordConsent(9, 9), true);
  assert.equal(hasExplicitRecordConsent(9, 8), false);
  assert.equal(canAccessHealthRecord({
    patientId: 7, viewerId: 9, viewerRole: "DOCTOR", grantedDoctorUserId: 9,
  }), true);
  assert.equal(canAccessHealthRecord({
    patientId: 7, viewerId: 9, viewerRole: "DOCTOR", grantedDoctorUserId: null,
  }), false);
  assert.equal(canAccessHealthRecord({
    patientId: 7, viewerId: 2, viewerRole: "ADMIN",
  }), true);
});

test("private health record uploads require a matching content signature", () => {
  assert.equal(validateHealthRecordFile({
    mimetype: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\n"),
  }).extension, ".pdf");
  assert.throws(() => validateHealthRecordFile({
    mimetype: "application/pdf",
    buffer: Buffer.from("not a PDF"),
  }), { statusCode: 400 });
});

test("script uploads accept permitted UTF-8 text and reject binary or mismatched files", () => {
  const config = {
    uploadScriptExtensions: new Set([".js", ".py"]),
    uploadScriptMimeTypes: new Set(["application/javascript", "text/x-python"]),
    uploadScriptMaxBytes: 1024,
  };
  assert.equal(validateScriptFile({
    originalname: "report.js",
    mimetype: "application/javascript",
    buffer: Buffer.from("const value = 1;\n"),
  }, config).extension, ".js");
  for (const file of [
    { originalname: "report.js", mimetype: "application/javascript", buffer: Buffer.from([0xff, 0x00]) },
    { originalname: "report.py", mimetype: "application/javascript", buffer: Buffer.from("print(1)") },
  ]) {
    assert.throws(() => validateScriptFile(file, config), { statusCode: 400 });
  }
  assert.throws(() => validateScriptFile({
    originalname: "report.js",
    mimetype: "application/javascript",
    buffer: Buffer.from("x".repeat(1025)),
  }, config), { statusCode: 413 });
});

test("email retry backoff grows exponentially and is capped", () => {
  assert.equal(emailRetryDelayMs(1), 30_000);
  assert.equal(emailRetryDelayMs(2), 60_000);
  assert.equal(emailRetryDelayMs(3), 120_000);
  assert.equal(emailRetryDelayMs(5), 480_000);
  assert.equal(emailRetryDelayMs(100), 60 * 60 * 1000);
  assert.throws(() => emailRetryDelayMs(0), RangeError);
});

test("only published, non-archived reviewed doctor publications are public", () => {
  assert.equal(publicationIsPublic({
    status: "published", doctor_id: 3, reviewed_by: 11, rejection_reason: null, archived_at: null,
  }), true);
  assert.equal(publicationIsPublic({
    status: "pending", doctor_id: 3, reviewed_by: null, archived_at: null,
  }), false);
  assert.equal(publicationIsPublic({
    status: "published", doctor_id: 3, reviewed_by: null, archived_at: null,
  }), false);
  assert.equal(publicationIsPublic({
    status: "published", doctor_id: 3, reviewed_by: 11, rejection_reason: "Needs changes", archived_at: null,
  }), false);
  assert.equal(publicationIsPublic({
    status: "published", doctor_id: null, archived_at: null,
  }), true);
  assert.equal(publicationIsPublic({
    status: "published", doctor_id: null, archived_at: "2026-10-01",
  }), false);
});
