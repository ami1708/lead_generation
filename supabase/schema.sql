-- ReviveIQ — Supabase schema
-- Run this in the Supabase SQL editor: https://supabase.com → your project → SQL Editor

-- ── CRM connections ────────────────────────────────────────────────────────────
create table if not exists crm_connections (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null,
  crm_type         text not null, -- hubspot | pipedrive | zoho | salesforce | teamgate
  api_key_encrypted text not null,
  instance_url     text,          -- Salesforce only
  last_synced_at   timestamptz,
  created_at       timestamptz default now()
);

create index if not exists crm_connections_user_id on crm_connections(user_id);

-- ── Leads ──────────────────────────────────────────────────────────────────────
create table if not exists leads (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null,
  source           text not null default 'csv', -- crm type or "csv"
  name             text not null,
  contact          text not null,
  interest         text,
  last_contact_date text,
  reason           text,
  budget           text,
  notes            text,
  raw_data         jsonb,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists leads_user_id on leads(user_id);

-- ── Lead scores ────────────────────────────────────────────────────────────────
create table if not exists lead_scores (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references leads(id) on delete cascade,
  user_id      text not null,
  score        integer not null check (score between 1 and 10),
  score_reason text,
  signals      jsonb,   -- full Tavily enrichment output
  boost        integer default 0,
  scored_at    timestamptz default now()
);

create index if not exists lead_scores_lead_id  on lead_scores(lead_id);
create index if not exists lead_scores_user_id  on lead_scores(user_id);

-- ── Batches ────────────────────────────────────────────────────────────────────
create table if not exists batches (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  status        text not null default 'pending', -- pending | processing | done | failed
  lead_count    integer default 0,
  scored_count  integer default 0,
  created_at    timestamptz default now(),
  completed_at  timestamptz
);

create index if not exists batches_user_id on batches(user_id);

-- ── Usage tracking ─────────────────────────────────────────────────────────────
create table if not exists usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  month         text not null, -- "2026-04"
  leads_scored  integer default 0,
  unique(user_id, month)
);

create index if not exists usage_user_id on usage(user_id);

-- ── RLS policies ───────────────────────────────────────────────────────────────
-- Enable RLS on all tables (service role bypasses this; anon/user clients are scoped)
alter table crm_connections enable row level security;
alter table leads            enable row level security;
alter table lead_scores      enable row level security;
alter table batches          enable row level security;
alter table usage            enable row level security;

-- We use the service role key in API routes (server-side only), so no JWT policies needed.
-- If you later add client-side queries, add policies like:
--   create policy "own data" on leads for all using (user_id = auth.uid());

-- ── Helper: upsert usage counter ───────────────────────────────────────────────
create or replace function increment_usage(p_user_id text, p_month text, p_count integer)
returns void language plpgsql as $$
begin
  insert into usage (user_id, month, leads_scored)
  values (p_user_id, p_month, p_count)
  on conflict (user_id, month)
  do update set leads_scored = usage.leads_scored + excluded.leads_scored;
end;
$$;

-- ── Unique constraint for lead upsert ──────────────────────────────────────────
-- Allows upserting on (user_id, contact) so re-importing the same lead updates it
alter table leads drop constraint if exists leads_user_contact_unique;
alter table leads add constraint leads_user_contact_unique unique (user_id, contact);
