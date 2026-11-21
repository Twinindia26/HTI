ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS license_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS experience_years INTEGER,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS health_card_id UUID DEFAULT gen_random_uuid();

ALTER TABLE users
  ALTER COLUMN health_card_id SET NOT NULL;

ALTER TABLE publications
  ALTER COLUMN doctor_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE audit_logs
  ALTER COLUMN target_id TYPE BIGINT USING target_id::BIGINT;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM users WHERE role = 'ADMIN') > 1 THEN
    RAISE EXCEPTION 'Multiple ADMIN accounts exist; resolve them before applying the single-admin constraint.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_single_admin
  ON users (role)
  WHERE role = 'ADMIN';

CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_license_number
  ON doctors (license_number)
  WHERE license_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_health_card_id
  ON users (health_card_id);

CREATE TABLE IF NOT EXISTS patient_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(40),
  date_of_birth DATE,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescription_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  request_type VARCHAR(30) NOT NULL CHECK (request_type IN ('prescription', 'price')),
  medicine_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  file_key UUID,
  file_name VARCHAR(255),
  file_mime_type VARCHAR(100),
  file_size BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewing', 'replied', 'closed')),
  admin_reply TEXT,
  replied_by INTEGER REFERENCES users(id),
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (file_key IS NULL AND file_name IS NULL AND file_mime_type IS NULL AND file_size IS NULL)
    OR (file_key IS NOT NULL AND file_name IS NOT NULL AND file_mime_type IS NOT NULL AND file_size > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_prescription_requests_user_created
  ON prescription_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescription_requests_status_created
  ON prescription_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(60) NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS partner_applications (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  partner_type VARCHAR(20) NOT NULL CHECK (partner_type IN ('pharmacy', 'diagnostic')),
  business_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  postal_code CHAR(6) NOT NULL,
  address TEXT NOT NULL,
  license_details TEXT,
  services TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by INTEGER REFERENCES users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_applications_status
  ON partner_applications (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_applications_postal
  ON partner_applications (postal_code, status);

CREATE TABLE IF NOT EXISTS workshops (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  mode VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workshops_status_schedule
  ON workshops (status, starts_at);
