-- Example: configure a Convobrains production instance after `npm run db:migrate`.
-- Run against your RDS (not committed secrets). Safe to re-run (updates id = 1).

UPDATE app_settings SET
  brand_name = 'Convobrains CRM',
  brand_tagline = 'Founder''s Office · Sales ops',
  logo_url = '/convobrains-logo.png',
  stages = '[
    "Lead Added",
    "Discovery Call Done",
    "Follow-up",
    "Demo Scheduled",
    "Demo Delivered",
    "Commercial Proposal Shared",
    "POC Kickoff",
    "Client Data Received",
    "POC Delivered",
    "Final Negotiation",
    "Closed Won",
    "Closed Lost",
    "Not Interested"
  ]'::jsonb,
  contact_statuses = '[
    "Not Contacted",
    "Didn''t Pick",
    "Wrong/Bad Number",
    "Connected - Got Referral",
    "Connected - Not Right Person",
    "Connected - Future Follow-up",
    "Connected - Send Me an Email",
    "Connected - Send Me a WhatsApp Message",
    "Connected - Booked a Discovery Call",
    "Connected - Information Gathered (Not ICP)",
    "Connected - DQ Prospect (Not ICP)",
    "Connected - DQ Company (Bad Fit)",
    "Interested",
    "Called",
    "No Answer",
    "Follow-up Required",
    "Rejected"
  ]'::jsonb,
  champion_status_to_stage = '{
    "Not Contacted": null,
    "Didn''t Pick": null,
    "Wrong/Bad Number": null,
    "Connected - Got Referral": "Follow-up",
    "Connected - Not Right Person": "Follow-up",
    "Connected - Future Follow-up": "Follow-up",
    "Connected - Send Me an Email": "Follow-up",
    "Connected - Send Me a WhatsApp Message": "Follow-up",
    "Connected - Booked a Discovery Call": "Discovery Call Done",
    "Connected - Information Gathered (Not ICP)": null,
    "Connected - DQ Prospect (Not ICP)": "Not Interested",
    "Connected - DQ Company (Bad Fit)": "Not Interested",
    "Interested": "Discovery Call Done",
    "Called": "Discovery Call Done",
    "No Answer": null,
    "Follow-up Required": "Follow-up",
    "Rejected": "Not Interested"
  }'::jsonb,
  updated_at = now()
WHERE id = 1;
