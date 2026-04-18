# ReviveIQ — Product Flow

---

## What it is

ReviveIQ takes your pile of dead/cold leads, scores each one using claude AI and live web data, and gives your calling team a ranked list — hottest leads at the top so they stop calling blind and start calling smart.


## The problem

Every sales team has a graveyard of leads who said "follow up in 3 months" and were forgotten. Right now, our process is:

1. Every 6 months of end date, dump all cold leads on the calling team 
2. Team calls them cold, in random order, with no context
3. Most leads are never contacted at all, 50k deal size is treated as same as 50 lakh one.
4. Hot leads which has sit at the bottom of the list

No prioritisation. No intelligence. Revenue just leaks.

## How ReviveIQ works

**Step 1 — Connect your CRM**
HubSpot, Salesforce, Pipedrive, Zoho, Teamgate. Dead leads pull in automatically. You can also upload a CSV.

**Step 2 — AI searches the web per lead**
For each lead, ReviveIQ runs live searches to find:
- Did the company raise funding recently?
- Are they hiring for roles that need your product?
- Are they actively researching similar tools?
- Are they growing / expanding?

**Step 3 — Every lead gets a score (1–10)**
Score is based on:
- How long ago they went cold
- Why they went cold (budget constraint vs rejected)
- Whether a budget was mentioned
- How engaged they were before going cold
- Web signals found above (adds up to +3 bonus points)

Every score comes with a plain-English reason. Example: *"Went cold 8 months ago due to budget timing. Company just raised Series A. High revival likelihood."*

**Step 4 — Ranked list for the calling team**
- Hot (8–10): call this week
- Warm (5–7): call this month
- Cold (1–4): low priority

Manager sees the ranked list on the dashboard. Export to CSV for the team. No more flat dumps.

**Step 5 — Stays current automatically**
Every week: fresh web search per lead, re-score the entire list. If a lead's score jumps by 3+ points (e.g. just got funded), manager gets an immediate email alert.

---

## What the manager sees

- Dashboard with ranked lead table
- Hot / Warm / Cold count at the top
- Click any lead: score breakdown, what web signals were found, why the score is what it is
- Weekly email digest: top 10 hot leads every Monday
- Instant alert when something changes on a high-value lead

---

## What this is NOT (yet)

- Not sending WhatsApp messages or emails to leads (Phase 2)
- Not generating call scripts or proposals (Phase 2)
- Not live call transcription or conversation intelligence (future)

Phase 1 is purely: score the leads, surface the best ones, keep it current.

---

## Tech in one line

CRM pulls leads → Tavily searches web per lead → Claude AI scores using a rubric → dashboard shows ranked results → Resend emails digest weekly.

---

## Go-to-market

Pilot on our own sales team first. Recover 10–15 dead leads into paying customers. Use that as the case study. Then sell to other sales teams with proof: *"We recovered ₹X from leads we'd already written off."*


---

*ReviveIQ — April 2026 — amishanegi.work@gmail.com*
