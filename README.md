<div align="center">

# 🔁 ReviveIQ

### AI-Powered Dead Lead Revival Engine

**Upload your dead leads → Get live web signals → AI scores each one → Know exactly who to call first**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.1-f97316?style=flat-square)](https://groq.com)
[![Tavily](https://img.shields.io/badge/Tavily-Web_Search-8b5cf6?style=flat-square)](https://tavily.com)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)

---

</div>

## What is ReviveIQ?

Most sales teams have hundreds of "dead" leads sitting in their CRM — leads that went cold 3–12 months ago due to budget freezes, restructuring, competitor trials, or just bad timing. **These leads aren't dead. They're just waiting.**

ReviveIQ uses live web enrichment + AI scoring to automatically surface which of your dead leads are warm again right now, ranked by:

1. **Product Fit** — Does this company actually need what you sell?
2. **Revival Likelihood** — Are conditions right for them to buy now?
3. **Estimated ROI** — How much value will they get if they do?

---

## Demo

> Upload a CSV of your dead leads → AI enriches each one with live web signals → Ranked results in ~60 seconds

**Live app:** [reviveiq-final.vercel.app](https://reviveiq-final.vercel.app)

---

## Screenshots

### Landing Page
![ReviveIQ Landing Page — Hero section with "Revive your dead leads with AI" headline, feature cards showing Web Enrichment, AI Scoring, and ROI Estimation, and a teal CTA button linking to the dashboard](https://placehold.co/1200x630/0a0a0a/00e5a0?text=ReviveIQ+Landing+Page)

### Dashboard — Import Screen
![Dashboard import screen — dark UI with Company Name and Product fields, pre-loaded CSV textarea with sample lead data, and the Score leads with AI button](https://placehold.co/1200x630/0a0a0a/00e5a0?text=Dashboard+Import+Screen)

### Dashboard — AI Scoring in Progress
![Scoring progress screen — step-by-step checklist: parsing lead data, searching web for signals, scoring with AI, ranking results. Teal progress bar at 67%](https://placehold.co/1200x630/0a0a0a/00e5a0?text=AI+Scoring+In+Progress)

### Dashboard — Results View
![Results dashboard — 5 metric cards (Total, Hot, Warm, Cold, ROI Pipeline ₹8.4L/mo), ranked lead list on left with score circles, detail panel on right showing score breakdown](https://placehold.co/1200x630/0a0a0a/00e5a0?text=Results+Dashboard)

### Lead Detail Panel — ROI & Web Signals
![Lead detail panel — name, score circle, AI score reason, Product Fit 5/5, Revival Likelihood 4/5, ROI estimated ₹1.5L/mo, and live web signals from Tavily showing funding and hiring data](https://placehold.co/1200x630/0a0a0a/00e5a0?text=Lead+Detail+with+ROI+and+Signals)

---

## Features

| Feature | Description |
|---|---|
| **CSV Upload** | Paste or upload any CSV with lead data — no fixed format required |
| **Live Web Enrichment** | Tavily searches the web per lead for funding, hiring, intent, competitor, and growth signals |
| **Two-Dimension AI Scoring** | Groq LLaMA 3.1 scores each lead on Product Fit (0–5) + Revival Likelihood (0–5) = Total (1–10) |
| **ROI Estimation** | AI estimates the monthly business value each lead gets from your product |
| **ROI Pipeline Metric** | Dashboard shows total recoverable value across all hot + warm leads |
| **Hot / Warm / Cold Tiers** | One-click filtering by tier so your sales team knows exactly who to call |
| **Export CSV** | Download scored results with reasons for your CRM |
| **No Auth Required** | Zero friction demo — works instantly, no sign-up |

---

## How Scoring Works

```
TOTAL SCORE (1–10) = Product Fit (0–5) + Revival Likelihood (0–5)
```

**Product Fit (0–5)**
- `4–5` — Their industry directly needs your product
- `2–3` — They could benefit but it's not core to their business
- `0–1` — Poor fit, unlikely to ever convert

**Revival Likelihood (0–5)** — one point each for:
- Went cold 3–6 months ago (not too fresh, not too stale)
- Had a specific budget mentioned
- Cold reason was timing/budget (fixable), not a fundamental blocker
- Did a demo or trial (high engagement)
- Web signals show recent growth, funding, or competitor dissatisfaction

**Score Boost** — Tavily web search adds up to +3 to the AI score based on:
- Recent funding raised
- Actively hiring in relevant roles
- Researching similar tools (intent signals)
- Competitor reviews or switching signals
- Company expansion / growth news

---

## Tech Stack

```
Frontend       Next.js 15 (App Router) + TypeScript + Tailwind CSS
AI Model       Groq — LLaMA 3.1 8B Instant (free, fast, zero cost)
Web Search     Tavily API — real-time web enrichment per lead
Hosting        Vercel
```

**Why Groq?** Free tier, 500 RPM, <1s response times. LLaMA 3.1 follows JSON output instructions reliably.

**Why Tavily?** Purpose-built for AI agents. Returns clean, structured search results perfect for enrichment pipelines.

---

## CSV Format

Your CSV needs these columns (order doesn't matter, extra columns are ignored):

```csv
name,company,contact,interest,lastContact,reason,budget,notes
Rohan Verma,Pixelmatters Agency,rohan@pixelmatters.in,No-code app builder,4 months ago,Waiting for Q2 budget,35000/month,Digital agency with 12 clients
```

| Column | Required | Description |
|---|---|---|
| `name` | Yes | Contact person name |
| `company` | No | Company name (used for web search) |
| `contact` | Yes | Email or phone |
| `interest` | Yes | What they were interested in |
| `lastContact` | Yes | When you last spoke (e.g. "4 months ago") |
| `reason` | Yes | Why they went cold |
| `budget` | No | Budget signal if mentioned |
| `notes` | No | Any additional context |

A sample demo CSV for Appy Pie is included at [`public/appypie-demo-leads.csv`](public/appypie-demo-leads.csv).

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/ami1708/lead_generation.git
cd lead_generation
npm install
```

### 2. Set up environment variables

Create a `.env.local` file:

```env
GROQ_API_KEY=your_groq_key_here
TAVILY_API_KEY=your_tavily_key_here
```

Get your free keys:
- **Groq** → [console.groq.com](https://console.groq.com) — free, no credit card
- **Tavily** → [app.tavily.com](https://app.tavily.com) — free tier, 1000 searches/month

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Reference

### `POST /api/process-leads`

Scores a batch of leads using Groq AI + Tavily web enrichment.

**Request body:**
```json
{
  "leads": [
    {
      "name": "Rohan Verma",
      "company": "Pixelmatters Agency",
      "contact": "rohan@pixelmatters.in",
      "interest": "No-code app builder for client projects",
      "lastContact": "4 months ago",
      "reason": "Waiting for Q2 budget",
      "budget": "35000/month",
      "notes": "Digital agency with 12 clients"
    }
  ],
  "businessName": "Appy Pie",
  "product": "no-code app builder for mobile apps and chatbots"
}
```

**Response:**
```json
{
  "leads": [
    {
      "name": "Rohan Verma",
      "score": 9,
      "fitScore": 5,
      "revivalScore": 4,
      "scoreReason": "Digital agency directly builds apps for clients — perfect fit; budget timing reason is fixable",
      "roiEstimate": 150000,
      "roiReason": "Replaces 3-4 app builds per month at ₹40K dev cost each",
      "signals": {
        "recentFunding": "...",
        "hiringSignals": "...",
        "scoreBoost": 1,
        "boostReason": "company growing"
      }
    }
  ]
}
```

---

## Architecture

```
User uploads CSV
       │
       ▼
Parse CSV rows into Lead objects
       │
       ▼ (parallel per lead)
┌──────────────────────────────────┐
│  Tavily Web Enrichment           │
│  - Funding search                │
│  - Hiring signals                │
│  - Intent / competitor signals   │
│  - Growth indicators             │
└──────────────────────────────────┘
       │
       ▼ (parallel per lead)
┌──────────────────────────────────┐
│  Groq LLaMA 3.1 Scoring         │
│  - Product Fit (0-5)             │
│  - Revival Likelihood (0-5)      │
│  - ROI Estimate                  │
│  + Tavily boost applied          │
└──────────────────────────────────┘
       │
       ▼
Sort by total score → Return ranked leads
```

All enrichment and scoring runs **fully in parallel** — 10 leads take the same time as 1.

---

## Demo Walkthrough (Hackathon Script)

1. Open the live app → you land on the marketing page
2. Click **"Go to dashboard →"** — no login, no friction
3. Enter **Company: Appy Pie** / **Product: no-code app builder for mobile apps and chatbots**
4. Upload [`public/appypie-demo-leads.csv`](public/appypie-demo-leads.csv) or use the pre-loaded data
5. Click **"Score leads with AI →"** — watch the progress checklist run
6. Results load — 3 HOT leads (digital agency, D2C brand, EdTech SaaS), 4 WARM, 3 COLD
7. Click **Pixelmatters Agency** — see Product Fit 5/5, ROI ₹1.5L/mo, live web signals
8. Click the **ROI Pipeline** card — shows total monthly value across all recoverable leads
9. Click **Export CSV** — download scored results for the CRM

---
