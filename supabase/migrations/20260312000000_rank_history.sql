-- Rank history: store past season ranks per player for profile "past ranks" display.
-- Populated whenever we fetch a profile from Riot API. Ready for plug-and-play when API key is available.

create table if not exists public.rank_history (
  puuid text not null,
  region text not null,
  queue text not null,
  season text not null,
  tier text not null,
  rank text,
  recorded_at timestamptz not null default now(),
  primary key (puuid, region, queue, season)
);

create index if not exists idx_rank_history_puuid_region
  on public.rank_history (puuid, region);

comment on table public.rank_history is 'Historical ranked tiers per season. Upserted when profile is fetched from Riot API.';
