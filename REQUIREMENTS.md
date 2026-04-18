# ReviveIQ — Product Requirements Document

**Version**: 1.0  
**Date**: 2026-04-17  
**Status**: Draft

---

## 1. Product Overview

ReviveIQ is an AI-powered dead lead revival engine. It connects to a sales team's CRM, pulls inactive/cold leads, scores each one using web intelligence and AI, and surfaces a prioritized list so the calling team knows exactly who to contact first and why.

**Core value**: Recovered revenue from leads the team already paid to acquire — without buying new leads.

**Pilot**: The builder's own sales business (1000+ dead leads, active calling team).

---

## 2. User Flow

```
Landing page
    ↓ (Sign up / Log in)
Auth (Clerk)
    ↓
Dashboard — Connect CRM or upload CSV
    ↓
Leads pulled → stored in DB
    ↓
Enrichment Agent runs (Tavily web search per lead)
    ↓
Scoring Agent runs (Claude Haiku)
    ↓
Dashboard shows ranked leads with scores, signals, reasons
    ↓
Sales manager calls in score order
    ↓
Weekly: re-score + email digest sent
```

---

## 3. Tech Stack

| Layer | Tool | Reason |
|---|---|---|
| Framework | Next.js App Router + TypeScript | Already in use |
| Auth | Clerk | Fastest integration with App Router, handles sessions/OAuth |
| Database | Supabase (Postgres) | DB + real-time + storage in one, free tier sufficient for pilot |
| AI model | Claude Haiku (claude-haiku-4-5-20251001) | Fast, cheap (~$0.001/lead), sufficient for scoring |
| Web enrichment | Tavily | Already integrated, live web search |
| Email | Resend | Already wired in codebase |
| Cron / scheduling | Vercel Cron Jobs | Already on Vercel, zero infra overhead |
| Payments | Stripe | After pilot — usage-based billing |
| UI | Tailwind + shadcn/ui | Already in use |

---

## 4. Database Schema

### `users`
Managed by Clerk. Clerk user ID is the foreign key everywhere.

### `crm_connections`
```
id                uuid PK
user_id           text (Clerk user ID)
crm_type          text  -- hubspot | pipedrive | zoho | salesforce | teamgate
api_key_encrypted text  -- AES-256 encrypted before storing
instance_url      text  -- Salesforce only
last_synced_at    timestamptz
created_at        timestamptz
```

### `leads`
```
id               uuid PK
user_id          text
source_crm       text  -- crm type or "csv"
name             text
contact          text  -- email or phone
interest         text
last_contact_date text
reason           text  -- why they went cold
budget           text
notes            text
raw_data         jsonb -- full original record from CRM
created_at       timestamptz
updated_at       timestamptz
```

### `lead_scores`
```
id           uuid PK
lead_id      uuid FK → leads.id
score        integer  -- 1–10
score_reason text
signals      jsonb    -- full Tavily enrichment output
boost        integer  -- points added from web signals
scored_at    timestamptz
```

### `batches`
```
id          uuid PK
user_id     text
status      text  -- pending | processing | done | failed
lead_count  integer
scored_count integer
created_at  timestamptz
completed_at timestamptz
```

### `usage`
```
id           uuid PK
user_id      text
month        text  -- "2026-04"
leads_scored integer
```

---

## 5. Scoring Model

### Dimensions

| Dimension | Condition | Points |
|---|---|---|
| **Recency** | Went cold 3–6 months ago | 3 |
| | 6–12 months ago | 2 |
| | 1–2 years ago | 1 |
| | 2+ years ago | 0 |
| **Cold reason** | Budget / timing constraint | 2 |
| | Lost to competitor | 1 |
| | Not interested / ghosted | 0 |
| **Budget signal** | Specific budget mentioned | 2 |
| | Budget unknown | 1 |
| **Engagement history** | Multiple touchpoints, demo'd, was close | 1 |
| | Single or no touchpoint | 0 |
| **Web signals (Tavily)** | Recent funding found | +2 |
| | Active intent / evaluating tools | +2 |
| | Hiring for relevant roles | +1 |
| | Competitor engagement (G2/Capterra) | +1 |
| | Company growth / expansion | +1 |

**Total: 1–10** (capped at 10, minimum 1)

### Score tiers

| Score | Label | Action |
|---|---|---|
| 8–10 | Hot | Call this week |
| 5–7 | Warm | Call this month |
| 1–4 | Cold | Low priority |

### Claude's role

Claude Haiku receives: lead fields + enrichment signals + scoring rubric.  
Its job: map the qualitative text (reason, notes) to the right score dimension buckets and write the score reason in one plain-English sentence.  
Claude does NOT invent the score — it fills in the rubric, the math is deterministic.

---

## 6. AI Agents

### Agent 1 — Enrichment Agent
- **Trigger**: called per lead during batch processing
- **Input**: lead name, company name, interest/product
- **Process**: 5 Tavily searches in parallel
  1. `"{company}" funding raised investment 2024 2025`
  2. `"{company}" hiring job {product} OR "sales operations" 2025`
  3. `"{company}" looking for {product} OR evaluating OR switching`
  4. `"{company}" review G2 Capterra {product} OR similar`
  5. `"{company}" expansion growth new office 2024 2025`
- **Output**: signals object → saved to `lead_scores.signals`
- **Cost**: ~5 Tavily searches per lead (free tier: 1000 searches/month)
- **Caching**: signals cached in DB, only re-fetched on weekly re-score

### Agent 2 — Scoring Agent
- **Trigger**: called per lead after enrichment
- **Input**: lead data + signals + scoring rubric
- **Model**: Claude Haiku
- **Output**: `{ score, score_reason }`
- **Cost**: ~$0.001 per lead
- **Prompt structure**: structured rubric passed in system prompt, lead data in user message, JSON-only response

### Agent 3 — Batch Orchestrator
- **Trigger**: manual (user clicks "Run scoring") or weekly cron
- **Process**:
  1. Pull all leads for user from DB
  2. Check usage limit — block if exceeded
  3. Create batch record (status: processing)
  4. Run Agent 1 + Agent 2 in parallel across all leads
  5. Write scores to `lead_scores`
  6. Update batch status → done
  7. Trigger email digest if weekly cron run
- **Parallelism**: all leads enriched simultaneously, then all scored simultaneously

---

## 7. CRM Integration

### Supported CRMs
| CRM | Auth method | Leads pulled |
|---|---|---|
| HubSpot | Private App Token | Contacts (inactive) |
| Pipedrive | API Token | Persons (inactive) |
| Zoho CRM | OAuth Access Token | Leads (status = inactive) |
| Salesforce | Access Token + Instance URL | Leads (IsConverted = false, oldest activity first) |
| Teamgate | API Key | Leads (status = inactive) |

### Sync strategy
- **On connect**: pull up to 500 leads, store in `leads` table
- **Weekly cron**: pull new leads added since `last_synced_at`, update `crm_connections.last_synced_at`
- **Manual re-sync**: user can trigger at any time from dashboard

### Data stored
API keys are encrypted (AES-256) before writing to DB. Never stored in plaintext.

---

## 8. Scheduling + Freshness

| Job | Frequency | What it does |
|---|---|---|
| CRM sync | Weekly (Monday 6am) | Pull new cold leads from all connected CRMs |
| Re-score | Weekly (Monday 7am) | Re-run enrichment + scoring on all leads |
| Email digest | Weekly (Monday 8am) | Send top 10 hot leads to sales manager |
| Score jump alert | Real-time (on re-score) | If any lead score increases by 3+, send immediate email |

All cron jobs run via Vercel Cron → hit internal API routes.

---

## 9. Notifications

### Weekly digest email (every Monday)
- Sent to: the sales manager / account owner
- Contains: top 10 hot leads with scores + one-line reason each
- Includes: any leads whose score jumped since last week
- Link: back to dashboard

### Score jump alert (immediate)
- Triggered: when re-score detects a lead's score increased by ≥ 3 points
- Contains: lead name, old score → new score, reason (e.g. "just raised Series A")
- Sent via Resend

### No email for the lead list itself
Dashboard is the source of truth. Email just flags important changes.

---

## 10. Dashboard

### Pages
| Route | Description |
|---|---|
| `/` | Marketing landing page + waitlist |
| `/sign-in` | Clerk auth |
| `/sign-up` | Clerk auth |
| `/dashboard` | Main lead scoring dashboard (auth required) |
| `/dashboard/settings` | CRM connections, API keys, notification preferences |

### Dashboard main view
- **Metric row**: Total leads · Hot (8–10) · Warm (5–7) · Cold (1–4) · Last scored
- **Lead table**: ranked by score, columns: Score · Name · Contact · Interest · Last contact · Reason · Score reason · Signals flag
- **Lead detail panel**: click a lead → score breakdown, web signals found, export single lead
- **Batch controls**: "Run scoring" button, progress indicator, last run timestamp
- **Export**: download full ranked list as CSV

### Settings page
- Connect / disconnect CRM (with API key input)
- Notification email address
- Plan + usage meter (X / 1000 leads scored this month)

---

## 11. Monetization

### Plans

| Plan | Leads scored / month | Price |
|---|---|---|
| Free | 100 | ₹0 |
| Pro | 1,000 | TBD |
| Scale | Unlimited | TBD |

### Usage tracking
- `usage` table tracks `leads_scored` per user per calendar month
- Before each batch run: check if `leads_scored + batch_size > plan_limit`
- If exceeded: show upgrade prompt, block batch from starting
- Usage resets on the 1st of each month

### Stripe integration
- Payment on upgrade click
- Webhook updates user plan in DB
- **Build last** — after pilot proves value

---

## 12. Build Order

### Phase 1 — Foundation (build first)
1. Supabase schema setup (leads, scores, batches, usage tables)
2. Clerk auth — protect `/dashboard`, per-user data isolation
3. Save CRM leads to DB on connect (currently not persisted)
4. Save scored results to DB (currently lost on page refresh)

### Phase 2 — Scoring engine
5. Restructure scoring to the rubric model (deterministic dimensions + Claude interpretation)
6. Batch orchestrator — parallel enrichment + scoring, batch status tracking
7. Dashboard — real lead table from DB, metric cards, lead detail panel

### Phase 3 — Automation
8. Vercel Cron — weekly CRM sync + re-score
9. Resend email digest + score jump alerts
10. Usage tracking + upgrade gate

### Phase 4 — Monetization
11. Stripe integration
12. Plan management, upgrade flow

### Phase 5 — Calling AI (future)
- WhatsApp warm-up messages
- AI call briefs
- Auto CRM push after call
- Proposal generation

---

## 13. Out of Scope (for now)

- Mobile app
- Live call transcription / conversation intelligence
- LinkedIn enrichment (requires paid API)
- Website visitor tracking pixel
- Multi-user teams / roles within one account
- White-labelling
