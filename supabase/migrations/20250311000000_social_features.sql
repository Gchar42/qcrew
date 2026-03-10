-- Social features: profile cache, view counts, co-occurrence, push subscriptions
-- No auth required — all keyed by riot_id + region

-- 1) Lightweight profile cache for fast rank/LP lookups
create table if not exists public.profile_cache (
  riot_id text not null,
  region text not null,
  tier text,
  rank text,
  league_points int default 0,
  wins int default 0,
  losses int default 0,
  profile_icon_id int,
  summoner_level int,
  last_updated timestamptz not null default now(),
  last_viewed timestamptz not null default now(),
  primary key (riot_id, region)
);

create index if not exists idx_profile_cache_last_viewed
  on public.profile_cache (last_viewed desc);
create index if not exists idx_profile_cache_last_updated
  on public.profile_cache (last_updated);

-- 2) Profile view counts — daily buckets for 7-day rolling window
create table if not exists public.profile_view_counts (
  riot_id text not null,
  region text not null,
  view_date date not null default current_date,
  view_count int not null default 1,
  primary key (riot_id, region, view_date)
);

create index if not exists idx_profile_view_counts_date
  on public.profile_view_counts (view_date desc);

-- 3) Match co-occurrence: who appears in games with whom
create table if not exists public.match_cooccurrence (
  subject_riot_id text not null,
  subject_region text not null,
  partner_riot_id text not null,
  partner_region text not null,
  games_together int not null default 0,
  same_team_count int not null default 0,
  opposing_count int not null default 0,
  partner_wins int not null default 0,
  partner_losses int not null default 0,
  last_game_at timestamptz,
  primary key (subject_riot_id, subject_region, partner_riot_id, partner_region)
);

create index if not exists idx_match_cooccurrence_subject
  on public.match_cooccurrence (subject_riot_id, subject_region, games_together desc);

-- 4) Web push subscriptions (no account needed)
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  riot_id text not null,
  region text not null,
  subscribed_at timestamptz not null default now(),
  last_notified_at timestamptz
);

create index if not exists idx_push_subscriptions_summoner
  on public.push_subscriptions (riot_id, region);

-- RLS: service_role bypasses; block anon direct access
alter table public.profile_cache enable row level security;
alter table public.profile_view_counts enable row level security;
alter table public.match_cooccurrence enable row level security;
alter table public.push_subscriptions enable row level security;
