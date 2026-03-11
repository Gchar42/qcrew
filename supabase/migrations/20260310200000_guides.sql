-- Guide authors: verified via Riot RSO
create table if not exists guide_authors (
  id bigint generated always as identity primary key,
  riot_puuid text unique not null,
  riot_id text not null, -- gameName#tagLine
  region text not null default 'na1',
  tier text, -- CHALLENGER, GRANDMASTER, MASTER, DIAMOND, etc.
  rank text, -- I, II, III, IV
  lp integer default 0,
  main_champion text,
  play_rate real,
  champion_rank text, -- e.g. "#1 Shen NA"
  avatar_icon_id integer,
  verified_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_guide_authors_puuid on guide_authors (riot_puuid);

-- Community guides
create table if not exists guides (
  id bigint generated always as identity primary key,
  slug text unique not null,
  author_id bigint not null references guide_authors(id) on delete cascade,
  champion_name text not null,
  role text not null default 'mid',
  title text not null,
  content text not null default '',
  tags jsonb default '[]'::jsonb,
  views integer default 0,
  likes integer default 0,
  published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_guides_champion on guides (champion_name);
create index if not exists idx_guides_author on guides (author_id);
create index if not exists idx_guides_slug on guides (slug);

-- Guide likes (one per session/user)
create table if not exists guide_likes (
  id bigint generated always as identity primary key,
  guide_id bigint not null references guides(id) on delete cascade,
  session_id text not null,
  created_at timestamptz default now(),
  unique (guide_id, session_id)
);
