-- Champion benchmarks: average stats by tier + champion for percentile comparison
create table if not exists public.champion_benchmarks (
  champion_name text not null,
  tier text not null,
  games_sampled int not null default 0,
  avg_kda numeric(5,2) not null default 0,
  avg_cs_per_min numeric(5,2) not null default 0,
  avg_vision_score numeric(6,2) not null default 0,
  avg_damage_share numeric(5,2) not null default 0,
  avg_win_rate numeric(5,2) not null default 0,
  avg_gold_per_min numeric(7,2) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (champion_name, tier)
);

create index if not exists idx_champion_benchmarks_tier on public.champion_benchmarks (tier);

-- Cached champion analysis: stores computed stats + AI text per player-champion
create table if not exists public.champion_analysis_cache (
  riot_id text not null,
  region text not null,
  champion_name text not null,
  stats jsonb not null default '{}'::jsonb,
  ai_analysis text,
  ai_generated_at timestamptz,
  last_refresh_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (riot_id, region, champion_name)
);

create index if not exists idx_champion_analysis_cache_updated
  on public.champion_analysis_cache (updated_at);
