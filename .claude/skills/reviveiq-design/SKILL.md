---
name: reviveiq-design
description: Design system and component patterns for the ReviveIQ SaaS platform
---

# ReviveIQ Design System

## Brand
- Product: AI-powered dead lead revival engine for sales teams
- Personality: Sharp, intelligent, data-driven, trustworthy
- Users: Sales managers, calling agents, founders, VPs of Sales

## Component patterns

### Metric cards
- Dark surface (zinc-900), muted label (text-zinc-500 text-xs uppercase tracking-widest)
- Large number (text-3xl font-black), optional trend indicator
- Colored accent border-left for category

### Lead cards (list view)
- Score circle (colored by score range) + name + interest truncated + score reason
- Click to expand detail panel on right
- Green border on selected state

### Score badge
- Circle not pill
- Green (8-10), Yellow (5-7), Red (1-4)
- bg-{color}/20 text-{color} border border-{color}/30

### Call brief panel
- Split layout: lead info left, AI content right
- WhatsApp message in chat bubble style
- Call brief in monospace-ish block with copy button

### Web intelligence signals
- Purple accent (#a855f7) for AI-sourced data
- Score boost shown as "+N" badge
- Individual signal rows collapsed by default

## Page templates

### Dashboard (main)
- Top: 4 metric cards (total leads, hot leads, avg score, boost from signals)
- Middle: ranked lead list (left 40%) + detail panel (right 60%)
- Bottom: hot/warm/cold summary stats

### Landing page
- Full dark, teal accent
- Hero: badge + h1 + subtext + dual CTA
- Problem/solution: 2-col before/after cards
- How it works: 4-step numbered grid
- Stats bar
- CRM logos
- Waitlist form

## Dark mode
- Always dark — no light mode toggle needed
- All surfaces: zinc-900 to zinc-950 range
- Text: white → zinc-300 → zinc-400 → zinc-500 → zinc-600 hierarchy
