

# The Open-Source SDR War Room

**We don't need Salesforce. We need to know which SDR is converting and why.**

Most early-stage B2B teams hire their first SDR and manage them on Google Sheets,  
scattered call recordings, and founder intuition. We built the system we wished existed.



[Run locally](#run-it-in-3-steps) · [SDR playbook](#the-sdr-operating-model) · [What vs Why](#what-vs-why) · [Free QA scorecard](#bonus-score-your-own-cold-calls) · **[Book a demo](https://www.convobrains.com/contact)**

SDR War Room login

---



## Why this exists

We're a small team. Paying enterprise CRM prices for three reps is absurd.

We needed:

1. A **13-stage pipeline** we actually use
2. Visibility into **who is working** (logins, active time, outcomes)
3. **Follow-up discipline** — connected calls without a next step light up as alerts
4. **Call recordings** attached to contacts, not buried in Drive folders
5. Something a founder can stand up in **one command**

This repo is the **War Room**: pipeline operations for founder-led SDR teams.

[ConvoBrains](https://www.convobrains.com) is the **intelligence layer**: conversation analysis for call quality, pitch effectiveness, and objection handling.

> The War Room tells you **what** happened.  
>
> ConvoBrains tells you **why** it happened.

---



## Run it in 3 steps

Requires [Docker](https://docs.docker.com/get-docker/) and Node.js 22+.

```bash
git clone https://github.com/Insights388/ConvobrainsIntCRM.git
cd ConvobrainsIntCRM
make setup && make dev
```

Open **[localhost:5173](http://localhost:5173)** and sign in:

```text
Email:    founder.seed@convobrains.com
Password: TestSeed123!
```

*This is a demo seed account with 3 days of sample SDR activity. Want to see your
own team's real calls scored like this? [Book 15 min with us*](https://www.convobrains.com/contact)

`make setup` installs dependencies, starts an isolated Postgres container, applies the schema, and loads companies, contacts, and three days of SDR activity. It never touches production.

```bash
make reset-demo   # wipe & reseed local demo data
```

---



## Is this for you?

Use this if you:

- Have **1–10 SDRs** and no Salesforce admin
- Still live in **Sheets / Notion / WhatsApp** for deal tracking
- Care more about **daily activity + call discipline** than forecasting modules
- Want **self-hosted** data and an open codebase

Skip it if you need enterprise CPQ, multi-currency ERP integrations, or a full marketing automation suite.

---



## What's in the War Room


| Capability            | What you get                                         |
| --------------------- | ---------------------------------------------------- |
| **Live dashboard**    | Follow-ups due, demos, active opps, won/lost         |
| **13-stage pipeline** | Drag deals from lead → closed                        |
| **Contacts**          | Champions, statuses, notes, LinkedIn                 |
| **Paste import**      | Excel / Sheets / CSV → deduped companies + contacts  |
| **Call recordings**   | Upload & play audio per contact (S3 optional)        |
| **SDR activity**      | Logins, active/idle time, outcomes, targets          |
| **Manager alerts**    | No login by 10:30, zero connects, missing follow-ups |
| **Roles**             | Founder / admin / SDR                                |
| **Self-hosted**       | Your Postgres, your rules                            |


---



## The SDR operating model



### Daily rhythm

1. **Morning brief** — open the dashboard; clear follow-ups due today
2. **Pipeline** — move cards only when the stage actually changed
3. **Contacts** — update status after every dial (Didn't Pick → Connected → Interested…)
4. **Record** — attach the call when it mattered
5. **Activity** (managers) — check who worked, who coasted, who needs coaching



### The 13-stage pipeline

```text
Lead Added
  → Discovery Call Done
  → Follow-up
  → Demo Scheduled
  → Demo Delivered
  → Commercial Proposal Shared
  → POC Kickoff
  → Client Data Received
  → POC Delivered
  → Final Negotiation
  → Closed Won | Closed Lost | Not Interested
```

**Rule of thumb:** if the stage didn't change in the real world, don't move the card. Fake pipeline hygiene destroys trust.

### Targets (editable in Activity)

Default daily targets for an SDR:


| Metric          | Default |
| --------------- | ------- |
| Calls made      | 80      |
| Follow-ups set  | 25      |
| Demos scheduled | 4       |


Managers get alerts when reps log out incomplete, open dozens of records with zero status changes, or stack connected calls without follow-ups.

### Follow-up discipline

A connected call without a next step is a leak. The War Room surfaces that. Fixing it is culture + coaching — the software just refuses to hide it.

---



## Why not Salesforce / HubSpot / Sheets?


|                            | SDR War Room                                   | Spreadsheets | HubSpot      | Salesforce   |
| -------------------------- | ---------------------------------------------- | ------------ | ------------ | ------------ |
| Open source                | ✅                                              | —            | ❌            | ❌            |
| One-command demo           | ✅                                              | —            | ❌            | ❌            |
| Built for 1–10 SDRs        | ✅                                              | ✅            | Overkill     | Overkill     |
| Activity + alerts          | ✅                                              | DIY          | Paid / setup | Paid / setup |
| Call recordings by contact | ✅                                              | Chaos        | Add-on       | Add-on       |
| Conversation *why*         | via [ConvoBrains](https://www.convobrains.com) | ❌            | Limited      | Limited      |
| Starting software cost     | **$0**                                         | $0           | Free → $$$   | $$$          |
| Admin overhead             | Low                                            | High (chaos) | Medium       | High         |


> Enterprise CRMs optimize for process. Early teams need **visibility and velocity**.

---



## What vs Why


| War Room (this repo)             | [ConvoBrains](https://www.convobrains.com)            |
| -------------------------------- | ----------------------------------------------------- |
| Deal lost at Final Negotiation   | Scale from 5% to 100% auditing                        |
| 40 calls, 2 connects             | Faster Training and Feedbacks Loops                   |
| Follow-up set                    | Competitor Mentions and Why                           |
| Recording uploaded               | Revenue Leakage and Ticketing System                  |
| **Want this on your own calls?** | **[Talk to us](https://www.convobrains.com/contact)** |


**Fork this. Run your pipeline. When you need the why, [connect ConvoBrains](https://www.convobrains.com).**

The War Room stays fully useful without ConvoBrains. Intelligence is optional — not paywalled core CRM.

---



## Bonus: Score your own cold calls

We use a real, weighted QA framework to grade B2B SaaS cold calls — 8 parameters,
25 sub-parameters, opening through close. We're giving it away.

`[resources/b2b-saas-cold-call-qa-framework.xlsx](resources/b2b-saas-cold-call-qa-framework.xlsx)`

Grab a call recording, open the sheet, and score it manually. Two things become
obvious fast:

- Manual scoring is inconsistent — two people grade the same call differently
- It takes ~15 minutes per call, which means you're sampling 5% of calls, not all of them

That gap is exactly why we built **[ConvoBrains QA](https://www.convobrains.com/product/qa)** —
same framework, but it scores 100% of your call volume automatically, with evidence
timestamps and coaching notes attached.

**[Book a 15-min walkthrough](https://www.convobrains.com/contact)**

---



## Stack

```text
React 19 + TypeScript + Tailwind
              ↓
        Express 5 API
              ↓
          PostgreSQL 16
              ↓
     S3 (optional call recordings)
```

AWS is only required when testing uploads. Activity, pipeline, and import work without it.

---



## Commands


| Command           | What it does                        |
| ----------------- | ----------------------------------- |
| `make setup`      | Install, provision, migrate, seed   |
| `make dev`        | Web + API against the local demo DB |
| `make reset-demo` | Rebuild demo fixtures               |
| `make lint`       | Static checks                       |
| `make build`      | Production build                    |
| `make help`       | All targets                         |


---



## Import leads

1. Open **Import Leads**
2. Paste from Excel, Sheets, or CSV
3. Columns: `Company · Prospect · Job title · Email · Phone · Location · Employees · Industry`
4. Import — companies create/update; duplicate emails skip

---



## Deploy

**Vercel + PostgreSQL**

1. Import the repo in Vercel.
2. Set `DATABASE_URL`, `JWT_SECRET`, and optional AWS vars for recordings.
3. `DATABASE_URL='postgresql://…' npm run db:migrate`
4. Deploy and hit `/api/health`.



**Docker / EC2**

```bash
# create .env with production secrets
make docker-build
make docker-up
make health
```



---



## Security

Do not ship demo credentials or `testing/.env.testing` to production. Use a strong unique `JWT_SECRET`, verified TLS for Postgres, restricted CORS, and private object storage.

Report vulnerabilities privately to the maintainers.

---



## Contributing

```bash
make setup
make lint
make build
```

Schema: `[sql/schema.sql](sql/schema.sql)`. Feature-test DB: `[testing/README.md](testing/README.md)`.

---

**Built by [ConvoBrains](https://www.convobrains.com)**  
*Turn conversations into intelligence.*  
  
[Book a demo](https://www.convobrains.com/contact) · [support@convobrains.com](mailto:support@convobrains.com) · [LinkedIn](https://www.linkedin.com/company/convobrains/)