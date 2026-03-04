-- Run this in Supabase SQL editor to create the match cache table.
-- STEP 0 from profileBundle match caching.

create table if not exists public.match_snapshots (
  id bigserial primary key,
  region text not null,
  queue text not null,              -- "solo" or "flex"
  match_id text not null,
  data jsonb not null,              -- full match dto
  fetched_at timestamptz not null default now(),
  stale_after_sec int not null default 86400
);

create unique index if not exists match_snapshots_unique
  on public.match_snapshots(region, queue, match_id);

create index if not exists match_snapshots_fetched_at
  on public.match_snapshots(fetched_at);

alter table public.match_snapshots enable row level security;
