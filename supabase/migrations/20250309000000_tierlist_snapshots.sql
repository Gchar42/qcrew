-- Stores scraped tierlist snapshots from public sources (MetaSRC).
-- One row per refresh; the tierlist API picks the most recent.

create table if not exists public.tierlist_snapshots (
  id bigint generated always as identity primary key,
  scraped_at timestamptz not null default now(),
  source text not null default 'metasrc',
  patch text,
  data jsonb not null
);

create index if not exists idx_tierlist_snapshots_scraped
  on public.tierlist_snapshots (scraped_at desc);
