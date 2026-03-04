-- OP.GG-style caching: serve from cache first, refresh in background with lock.

create table if not exists summoner_cache (
  region text not null,
  riot_id text not null,
  puuid text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (region, riot_id)
);

create table if not exists match_cache (
  region text not null,
  puuid text not null,
  match_id text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (region, puuid, match_id)
);

create table if not exists profile_bundle_cache (
  region text not null,
  puuid text not null,
  queue_key text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (region, puuid, queue_key)
);

create table if not exists refresh_lock (
  key text primary key,
  locked_until timestamptz not null
);
