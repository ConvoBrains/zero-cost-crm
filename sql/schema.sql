-- Convobrains Sales CRM — PostgreSQL schema (idempotent)
-- Local (SSH tunnel): localhost:5433 / brains_crm
-- Deployed: RDS brains_crm via DB_URL_DEV

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Auth ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'sdr'
                CHECK (role IN ('founder', 'sdr', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Sales Pipeline (Companies) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS companies (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name           TEXT NOT NULL,
  stage                  TEXT NOT NULL DEFAULT 'Lead Added'
    CHECK (stage IN (
      'Lead Added',
      'Discovery Call Done',
      'Follow-up',
      'Demo Scheduled',
      'Demo Delivered',
      'Commercial Proposal Shared',
      'POC Kickoff',
      'Client Data Received',
      'POC Delivered',
      'Final Negotiation',
      'Closed Won',
      'Closed Lost',
      'Not Interested'
    )),
  industry               TEXT,
  location               TEXT,
  estimated_call_volume  INTEGER,
  employee_count         INTEGER,
  intent                 TEXT CHECK (intent IS NULL OR intent IN ('Hot', 'Warm', 'Cold')),
  offered_price          NUMERIC(12, 2),
  primary_contact_id     UUID,
  assigned_to            UUID REFERENCES users(id) ON DELETE SET NULL,
  last_contacted         DATE,
  next_follow_up         DATE,
  notes                  TEXT,
  source_link            TEXT,
  company_website        TEXT,
  linkedin_company       TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS companies_name_ci ON companies (LOWER(company_name));
CREATE INDEX IF NOT EXISTS companies_stage_idx ON companies (stage);
CREATE INDEX IF NOT EXISTS companies_next_follow_up_idx ON companies (next_follow_up);

-- ─── Contacts ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contacts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name     TEXT NOT NULL,
  company_id       UUID REFERENCES companies(id) ON DELETE SET NULL,
  role             TEXT,
  phone            TEXT,
  email            TEXT,
  linkedin_profile TEXT,
  contact_status   TEXT NOT NULL DEFAULT 'Not Contacted'
    CHECK (contact_status IN (
      'Not Contacted',
      'Called',
      'No Answer',
      'Interested',
      'Follow-up Required',
      'Rejected'
    )),
  champion         BOOLEAN NOT NULL DEFAULT FALSE,
  last_contacted   DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_ci
  ON contacts (LOWER(email))
  WHERE email IS NOT NULL AND email <> '';

CREATE INDEX IF NOT EXISTS contacts_company_idx ON contacts (company_id);
CREATE INDEX IF NOT EXISTS contacts_status_idx ON contacts (contact_status);
CREATE INDEX IF NOT EXISTS contacts_champion_idx ON contacts (champion) WHERE champion = TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_primary_contact_fk'
  ) THEN
    ALTER TABLE companies
      ADD CONSTRAINT companies_primary_contact_fk
      FOREIGN KEY (primary_contact_id) REFERENCES contacts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── Daily import staging ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_imports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  raw_text     TEXT NOT NULL,
  row_count    INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_import_rows (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id      UUID NOT NULL REFERENCES lead_imports(id) ON DELETE CASCADE,
  company        TEXT NOT NULL,
  prospect_name  TEXT NOT NULL,
  job_title      TEXT,
  email          TEXT,
  phone          TEXT,
  location       TEXT,
  employees      INTEGER,
  industry       TEXT,
  processed      BOOLEAN NOT NULL DEFAULT FALSE
);
