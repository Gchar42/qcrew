-- Matches table for storing per-player match rows (one row per participant per match).
-- Enables season-long champion stats and limits Riot API calls.

create table if not exists matches (
  match_id text not null,
  puuid text not null,
  queue_id int not null,
  champion_id int not null,
  kills int not null default 0,
  deaths int not null default 0,
  assists int not null default 0,
  win boolean not null default false,
  cs int not null default 0,
  damage int not null default 0,
  game_duration int not null default 0,
  game_creation bigint not null default 0,
  champion_name text,
  primary key (match_id, puuid)
);

create index if not exists idx_matches_puuid on public.matches(puuid);
create index if not exists idx_matches_queue on public.matches(queue_id);
