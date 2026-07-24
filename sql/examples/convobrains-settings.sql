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
  discovery_questions = '[
    {
      "id": "problem_pain",
      "section": "The Problem",
      "prompt": "What''s the main pain point you''re hoping to solve with ConvoBrains?",
      "input": "textarea"
    },
    {
      "id": "floors_type",
      "section": "Your Floors",
      "prompt": "Do you have a Sales floor, Support floor, or both?",
      "input": "text"
    },
    {
      "id": "floors_reps",
      "section": "Your Floors",
      "prompt": "Reps per floor?",
      "input": "text"
    },
    {
      "id": "floors_volume",
      "section": "Your Floors",
      "prompt": "Daily/monthly call volume?",
      "input": "text"
    },
    {
      "id": "floors_direction",
      "section": "Your Floors",
      "prompt": "Inbound, outbound, or mix?",
      "input": "text"
    },
    {
      "id": "qa_people",
      "section": "Quality Assurance",
      "prompt": "How many QA people do you currently have?",
      "input": "number"
    },
    {
      "id": "qa_channels",
      "section": "Quality Assurance",
      "prompt": "Do you also want QA done on emails/chats/messages? If yes, what''s the rough volume (daily/monthly)?",
      "input": "textarea"
    },
    {
      "id": "tools_dialer",
      "section": "Current Tools",
      "prompt": "Dialer in use?",
      "input": "text"
    },
    {
      "id": "tools_crm",
      "section": "Current Tools",
      "prompt": "CRM in use?",
      "input": "text"
    },
    {
      "id": "tools_recording_qa",
      "section": "Current Tools",
      "prompt": "Are calls recorded today? QA done manually or with a tool?",
      "input": "textarea"
    },
    {
      "id": "business_model",
      "section": "Business",
      "prompt": "B2B or B2C?",
      "input": "text"
    },
    {
      "id": "business_ticket",
      "section": "Business",
      "prompt": "Average ticket size per customer?",
      "input": "text"
    }
  ]'::jsonb,
  updated_at = now()
WHERE id = 1;
