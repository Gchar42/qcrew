-- Temporary challenges for summoner icon verification
create table if not exists verification_challenges (
  puuid text primary key,
  riot_id text not null,
  region text not null default 'na1',
  challenge_icon_id integer not null,
  current_icon_id integer not null,
  created_at timestamptz default now()
);
