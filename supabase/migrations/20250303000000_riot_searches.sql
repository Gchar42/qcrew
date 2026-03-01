-- Search suggestions: store recent Riot ID lookups for autocomplete.
create table if not exists public.riot_searches (
  puuid text primary key,
  riot_id text not null,
  game_name text not null,
  tag_line text not null,
  updated_at timestamptz default now() not null
);

create index if not exists riot_searches_updated_at on public.riot_searches(updated_at desc);
create index if not exists riot_searches_riot_id_lower on public.riot_searches(lower(riot_id));
create index if not exists riot_searches_game_name_lower on public.riot_searches(lower(game_name));
create index if not exists riot_searches_tag_line_lower on public.riot_searches(lower(tag_line));

alter table public.riot_searches enable row level security;

-- Service role / admin only (API uses service key). No anon access.
create policy "No anon access to riot_searches"
  on public.riot_searches for all
  using (false)
  with check (false);
