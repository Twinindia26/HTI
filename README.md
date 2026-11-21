# Health Twin India (HTI)

HTI is organized as two independent JavaScript applications:

- `client/` — Next.js App Router frontend
- `server/` — Express REST API
- `reference/hti-website/` — reserved for website reference material

## Requirements

- Node.js 20.9 or later
- npm

## Frontend

In a terminal:

```powershell
cd client
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The frontend can also be
built and served independently:

```powershell
cd client
npm run build
npm start
```

Existing routes include `/`, `/about`, `/contact`, `/dashboard`,
`/how-it-works`, `/partners`, `/publications`, `/services`, and `/workshops`.
Static files are served from `client/public/`.

## Backend

In a separate terminal:

```powershell
cd server
npm install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

The API listens on [http://localhost:5000](http://localhost:5000). Its health
endpoint is [http://localhost:5000/api/health](http://localhost:5000/api/health)
and returns:

```json
{
  "status": "ok",
  "message": "HTI Backend is running"
}
```

Configure the existing Clerk application and Neon database in `server/.env`
using the variable names in `.env.example`; configure the existing Clerk
publishable key and `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api` in
`client/.env.local`. Do not commit either environment file. Set `ADMIN_EMAIL`
to the single administrator's verified primary email; it is intentionally
blank in the example file.

Before using the data-backed features, run the additive database migrations:

```powershell
cd server
npm run db:migrate
```

This is a manual operation; the application does not run migrations at startup.
The runner creates the existing baseline schema if absent, tracks applied
migrations, and applies `src/db/migrations/001_platform_records.sql` followed by
the additive `src/db/migrations/002_health_data.sql`. The new migration adds
private script uploads, patient health records, per-record doctor grants, vital
measurements, patient consent to share vitals, publication review reasons, and
an email outbox. It does not modify migration 001 or delete existing data. The
runner will stop if it finds multiple existing Admin accounts so they can be
resolved deliberately.

Patient prescription uploads are limited to 10 MB and stored outside the
public web directory in `server/uploads/private-prescriptions/`; health records
use `server/uploads/private-health-records/` with the same limit. This local
disk implementation is for development or a persistent, access-controlled
server volume.
Production deployments must configure encrypted, durable private storage and
backups before accepting real health records. File downloads require the owning
patient, an administrator, or a doctor who has a current explicit grant for
that individual record. Patients can revoke a record grant at any time.

Administrators can upload private text scripts from the admin dashboard. The
conservative default allowlist is `.js`, `.py`, `.sh`, `.sql`, and `.txt`, up to
1 MiB, with matching text MIME types. `UPLOAD_SCRIPT_EXTENSIONS`,
`UPLOAD_SCRIPT_MIME_TYPES`, and `UPLOAD_SCRIPT_MAX_BYTES` configure these
allowlists and size (maximum 10 MiB), selecting only supported extension/MIME
pairs from the default list. Files must be valid UTF-8 text without
NUL/binary control bytes; there is no universal script magic signature.
Scripts are UUID-named under `server/uploads/private-scripts/`, never executed,
and only downloadable by an administrator. Store this directory on a private,
persistent volume in production.

Script uploads create an admin notification and durable email-outbox entry.
Email uses the Resend HTTP API (native `fetch`, no added package). Set
`RESEND_API_KEY`, `EMAIL_FROM`, and the existing `ADMIN_EMAIL` to enable
delivery. If any are absent the outbox entry remains `unconfigured`; a `sent`
status is recorded only after a successful provider response. Provider
credentials belong only in the server environment. A background worker claims
messages with database row locks/skip-locked semantics, uses a 2-minute lease,
and retries failures up to five total attempts with 30-second exponential
backoff (capped at one hour). Expired claims are reclaimable; exhausted or
failed sends never appear as sent.

Patient health measurements include heart rate (bpm), blood pressure (mmHg),
SpO2 (%), temperature (C/F), weight (kg/lb), height (cm/in), and glucose
(mg/dL or mmol/L), with type-specific range and unit validation. A patient must
explicitly grant and may revoke doctor access to their vitals. Doctors can see
only health records and vitals shared with their own verified account.

Useful new API routes (all health-data routes require Clerk authentication and
server-side role checks):

- `GET /api/health/ready` — performs `SELECT 1`; returns only safe ready/unavailable status.
- `POST /api/admin/scripts`, `GET /api/admin/scripts`, `GET /api/admin/scripts/:id/file` — admin-only private scripts.
- `GET /api/admin/health-records`, `GET /api/admin/health-records/:id/file` — admin health-record access.
- `GET|POST /api/patient/records`, `GET /api/patient/records/:id/file`,
  `PUT|DELETE /api/patient/records/:id/access` — patient-owned private records and per-record grants.
- `GET|POST /api/patient/vitals`, `GET /api/patient/vitals/doctors`,
  `PUT|DELETE /api/patient/vitals/access` — patient measurements and doctor consent.
- `GET /api/doctor/records`, `GET /api/doctor/records/:id/file`,
  `GET /api/doctor/vitals` — only explicitly shared patient data.
- `PATCH /api/admin/publications/:id/review` — reasoned approval/rejection,
  reviewer/time, audit entry, and doctor notification. Doctor articles are first
  created as pending and cannot become public without approval and a separate
  administrator publish action.

Implemented API workflows include patient profiles and requests, private
prescription downloads, doctor and partner applications with administrator
review, public approved-partner search, publication/workshop management,
notifications, Clerk user synchronization/webhooks, and audited administrator
transfer. The readiness check does not reveal database connection details.
Have reviewed privacy and legal policies in place before accepting real health
records.

Run backend tests with `npm test`. The frontend can be built with
`cd client; npm run build` and linted with `cd client; npm run lint`.

The original root-level `node_modules/` and `.next/` directories are left
untouched; the frontend installs and builds using its own files under `client/`.
