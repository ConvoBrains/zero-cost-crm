-- Live RDS cutover for role `crm` (does not own all tables).
-- Safe on brains_crm_int: no DROP TABLE, no user/company deletes.
-- Full schema.sql may fail on CREATE INDEX for postgres-owned tables; use this instead.

-- Allow instance-configurable contact statuses (crm owns contacts).
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_contact_status_check;

-- Note: companies_stage_check is owned by postgres. Stages already match Zero Cost
-- defaults, so leaving it is fine. Drop later as postgres if you customize stages:
--   ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_stage_check;

CREATE TABLE IF NOT EXISTS app_settings (
  id                         SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  brand_name                 TEXT NOT NULL DEFAULT 'Zero Cost CRM',
  brand_tagline              TEXT NOT NULL DEFAULT '',
  logo_url                   TEXT NOT NULL DEFAULT '/convobrains-logo.png',
  stages                     JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_statuses           JSONB NOT NULL DEFAULT '[]'::jsonb,
  champion_status_to_stage   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_settings (
  id, brand_name, brand_tagline, logo_url, stages, contact_statuses, champion_status_to_stage
)
SELECT
  1,
  'Zero Cost CRM',
  'Track what happens. ConvoBrains explains why.',
  '/convobrains-logo.png',
  '[
    "Lead Added","Discovery Call Done","Follow-up","Demo Scheduled","Demo Delivered",
    "Commercial Proposal Shared","POC Kickoff","Client Data Received","POC Delivered",
    "Final Negotiation","Closed Won","Closed Lost","Not Interested"
  ]'::jsonb,
  '[
    "Not Contacted","Didn''t Pick","Connected - Got Referral","Connected - Not Right Person",
    "Connected - Future Follow-up","Interested","Called","No Answer","Follow-up Required","Rejected"
  ]'::jsonb,
  '{
    "Not Contacted": null, "Didn''t Pick": null,
    "Connected - Got Referral": "Follow-up",
    "Connected - Not Right Person": "Follow-up",
    "Connected - Future Follow-up": "Follow-up",
    "Interested": "Discovery Call Done", "Called": "Discovery Call Done",
    "No Answer": null, "Follow-up Required": "Follow-up", "Rejected": "Not Interested"
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE id = 1);
