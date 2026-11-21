ALTER TABLE publications
  ADD COLUMN IF NOT EXISTS review_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE TABLE IF NOT EXISTS uploaded_scripts (
  id BIGSERIAL PRIMARY KEY,
  uploader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  file_key UUID NOT NULL UNIQUE,
  file_name VARCHAR(255) NOT NULL,
  file_extension VARCHAR(16) NOT NULL CHECK (file_extension IN ('.js', '.py', '.sh', '.sql', '.txt')),
  mime_type VARCHAR(100) NOT NULL CHECK (mime_type IN (
    'application/javascript', 'text/javascript', 'text/x-python', 'text/x-shellscript',
    'application/sql', 'text/plain'
  )),
  file_size BIGINT NOT NULL CHECK (file_size BETWEEN 1 AND 10485760),
  CHECK (
    (file_extension = '.js' AND mime_type IN ('application/javascript', 'text/javascript'))
    OR (file_extension = '.py' AND mime_type IN ('text/x-python', 'text/plain'))
    OR (file_extension = '.sh' AND mime_type IN ('text/x-shellscript', 'text/plain'))
    OR (file_extension = '.sql' AND mime_type IN ('application/sql', 'text/plain'))
    OR (file_extension = '.txt' AND mime_type = 'text/plain')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_scripts_created
  ON uploaded_scripts (created_at DESC);

CREATE TABLE IF NOT EXISTS health_records (
  id BIGSERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  record_type VARCHAR(40) NOT NULL CHECK (record_type IN ('document', 'lab_result', 'imaging', 'other')),
  title VARCHAR(255) NOT NULL,
  file_key UUID NOT NULL UNIQUE,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  file_size BIGINT NOT NULL CHECK (file_size BETWEEN 1 AND 10485760),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_records_patient_created
  ON health_records (patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS health_record_access_grants (
  health_record_id BIGINT NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  doctor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (health_record_id, doctor_user_id)
);

CREATE INDEX IF NOT EXISTS idx_health_record_grants_doctor
  ON health_record_access_grants (doctor_user_id, health_record_id);

CREATE TABLE IF NOT EXISTS vitals (
  id BIGSERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  vital_type VARCHAR(20) NOT NULL CHECK (vital_type IN ('heart_rate', 'blood_pressure', 'spo2', 'temperature', 'weight', 'height', 'glucose')),
  value NUMERIC(10, 2) NOT NULL,
  diastolic_value NUMERIC(10, 2),
  unit VARCHAR(10) NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (vital_type = 'heart_rate' AND unit = 'bpm' AND value BETWEEN 20 AND 300 AND diastolic_value IS NULL)
    OR (vital_type = 'blood_pressure' AND unit = 'mmHg' AND value BETWEEN 40 AND 300
      AND diastolic_value IS NOT NULL AND diastolic_value BETWEEN 20 AND 200 AND value > diastolic_value)
    OR (vital_type = 'spo2' AND unit = '%' AND value BETWEEN 50 AND 100 AND diastolic_value IS NULL)
    OR (vital_type = 'temperature' AND unit IN ('C', 'F')
      AND ((unit = 'C' AND value BETWEEN 25 AND 45) OR (unit = 'F' AND value BETWEEN 77 AND 113))
      AND diastolic_value IS NULL)
    OR (vital_type = 'weight' AND unit IN ('kg', 'lb') AND value BETWEEN 0.1 AND 700 AND diastolic_value IS NULL)
    OR (vital_type = 'height' AND unit IN ('cm', 'in')
      AND ((unit = 'cm' AND value BETWEEN 20 AND 280) OR (unit = 'in' AND value BETWEEN 8 AND 110))
      AND diastolic_value IS NULL)
    OR (vital_type = 'glucose' AND unit IN ('mg/dL', 'mmol/L')
      AND ((unit = 'mg/dL' AND value BETWEEN 20 AND 1000) OR (unit = 'mmol/L' AND value BETWEEN 1 AND 55))
      AND diastolic_value IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_vitals_patient_measured
  ON vitals (patient_id, measured_at DESC);

CREATE TABLE IF NOT EXISTS vitals_access_grants (
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (patient_id, doctor_user_id)
);

CREATE INDEX IF NOT EXISTS idx_vitals_grants_doctor
  ON vitals_access_grants (doctor_user_id, patient_id);

CREATE TABLE IF NOT EXISTS email_outbox (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(80) NOT NULL,
  recipient_email VARCHAR(320),
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unconfigured'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'unconfigured')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 5),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  claim_token UUID,
  provider_message_id VARCHAR(255),
  error_code VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status <> 'sent' OR sent_at IS NOT NULL),
  CHECK (
    (status = 'sending' AND claimed_at IS NOT NULL AND claim_token IS NOT NULL)
    OR (status <> 'sending' AND claimed_at IS NULL AND claim_token IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_status_created
  ON email_outbox (status, next_attempt_at, created_at);
