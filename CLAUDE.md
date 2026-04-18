@AGENTS.md

# ReviveIQ Design Guidelines

## Avoid
- Generic card grids that look like Bootstrap
- Purple gradients on white backgrounds
- System fonts (Arial, Roboto, etc.)
- Rounded corners everywhere (use sharp or subtle radius)
- "AI slop" spacing — too much padding, too much whitespace

## Typography
- Headings: Geist (already loaded) at weight 700–800
- Body: IBM Plex Sans at weight 400–500
- Size jumps of 3x+ between heading levels (not 1.5x)
- Use weight extremes: 200 for labels vs 700 for numbers

## Color system
- Background: #0a0a0a (near black)
- Surface: zinc-900 (#18181b)
- Border: zinc-800 (#27272a)
- Primary accent: #00e5a0 (teal green)
- Danger: red-400
- Warning: yellow-400
- Success: green-400
- All colors via Tailwind or CSS variables — no hardcoded hex except accent

## Aesthetic reference
- Linear.app (clean, purposeful, dense but readable)
- Vercel dashboard (sharp typography, dark mode first)
- Raycast (keyboard-first, efficient layout)

## Component rules
- Metric cards: dark surface, muted label (text-zinc-500), large number (font-black)
- Score badges: colored circles, not pills
- Tables: no visible row separators — use hover states instead
- Buttons: primary = #00e5a0 text-black, secondary = zinc-800 border
- Inputs: zinc-900 bg, zinc-700 border, no glow on focus

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Recharts for data visualization
- No Framer Motion unless animation adds real value

## Layout rules
- Dashboard: 4-col metric row → content area
- Max content width: max-w-6xl
- Sidebar nav for multi-page app sections
- Mobile: stack everything vertically, hide non-essential columns in tables
