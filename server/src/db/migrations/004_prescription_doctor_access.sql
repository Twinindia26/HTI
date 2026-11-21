CREATE TABLE IF NOT EXISTS prescription_access_grants (
  prescription_request_id BIGINT NOT NULL REFERENCES prescription_requests(id) ON DELETE CASCADE,
  doctor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (prescription_request_id, doctor_user_id)
);

CREATE INDEX IF NOT EXISTS idx_prescription_grants_doctor
  ON prescription_access_grants (doctor_user_id, prescription_request_id);