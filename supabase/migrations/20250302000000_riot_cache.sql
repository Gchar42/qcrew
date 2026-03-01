-- Riot API cache: 10-minute TTL for account and match data.
-- Safe to run on existing project.

create table if not exists public.riot_cache (
  key text primary key,
  data jsonb not null,
  fetched_at timestamptz default now() not null
);

create index if not exists riot_cache_fetched_at on public.riot_cache(fetched_at);

alter table public.riot_cache enable row level security;

-- Allow anon to read/write cache (used by API routes with anon key).
create policy "Allow anon read riot_cache"
  on public.riot_cache for select
  using (true);
create policy "Allow anon insert riot_cache"
  on public.riot_cache for insert
  with check (true);
create policy "Allow anon update riot_cache"
  on public.riot_cache for update
  using (true);
