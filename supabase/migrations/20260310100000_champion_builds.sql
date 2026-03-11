-- Champion builds table: stores aggregated build data from high-elo one-tricks
create table if not exists champion_builds (
  id bigint generated always as identity primary key,
  champion_name text not null,
  role text not null default 'mid',
  patch text not null,
  sample_size integer not null default 0,
  win_rate real,
  pick_rate real,
  ban_rate real,
  tier text, -- S+, S, A, B, C, D
  tier_rank integer, -- numeric rank within role (e.g. 5 of 53)
  tier_total integer, -- total champs in role
  items_start jsonb default '[]'::jsonb,
  items_core jsonb default '[]'::jsonb,
  items_4th jsonb default '[]'::jsonb,
  items_5th jsonb default '[]'::jsonb,
  items_6th jsonb default '[]'::jsonb,
  boots jsonb default '{}'::jsonb,
  runes_primary jsonb default '{}'::jsonb,
  runes_secondary jsonb default '{}'::jsonb,
  rune_shards jsonb default '[]'::jsonb,
  summoner_spells jsonb default '{}'::jsonb,
  skill_order jsonb default '[]'::jsonb,
  skill_path jsonb default '[]'::jsonb,
  counters jsonb default '[]'::jsonb,
  scraped_at timestamptz default now(),
  unique (champion_name, role, patch)
);

create index if not exists idx_champion_builds_name on champion_builds (champion_name);
create index if not exists idx_champion_builds_role on champion_builds (role);
create index if not exists idx_champion_builds_patch on champion_builds (patch);
