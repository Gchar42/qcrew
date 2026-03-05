-- Champion Stats: match_index, champion_match_cache (by match_id), champion_aggregates.
-- Season-long stats use match_index + champion_match_cache; aggregates stored in champion_aggregates.

-- 1) match_index: one row per (puuid, queue, season_key, match_id)
create table if not exists public.match_index (
  puuid text not null,
  queue text not null,
  season_key text not null,
  match_id text not null,
  game_start_ts bigint not null,
  primary key (puuid, queue, season_key, match_id)
);
create index if not exists idx_match_index_lookup
  on public.match_index (puuid, queue, season_key);

-- 2) champion_match_cache: full match payload by match_id (for champion stats pipeline)
create table if not exists public.champion_match_cache (
  match_id text primary key,
  queue text not null,
  game_start_ts bigint not null,
  data jsonb not null
);
create index if not exists idx_champion_match_cache_queue_ts
  on public.champion_match_cache (queue, game_start_ts);

-- 3) champion_aggregates: precomputed per (puuid, queue, season_key)
create table if not exists public.champion_aggregates (
  puuid text not null,
  queue text not null,
  season_key text not null,
  updated_at timestamptz not null default now(),
  champions jsonb not null,
  primary key (puuid, queue, season_key)
);
create index if not exists idx_champion_aggregates_lookup
  on public.champion_aggregates (puuid, queue, season_key);
