-- Discord OAuth and notification system for StatGap
-- Run with: supabase db push (or apply via dashboard)

-- Discord user linked to a summoner (one Discord account → one primary link)
create table if not exists public.discord_users (
  discord_id text primary key,
  username text not null,
  avatar_url text,
  summoner_name text not null,
  region text not null,
  created_at timestamptz not null default now(),
  guilds_scope_at timestamptz
);

create index if not exists idx_discord_users_summoner_region
  on public.discord_users (summoner_name, region);

-- Opt-in notification preferences per Discord user
create table if not exists public.notification_preferences (
  discord_id text primary key references public.discord_users(discord_id) on delete cascade,
  notify_rank_up boolean not null default true,
  notify_win_streak boolean not null default true,
  weekly_digest boolean not null default false,
  streak_threshold int not null default 5,
  updated_at timestamptz not null default now()
);

-- Which summoners this Discord user is tracking (for DMs and digest)
create table if not exists public.tracked_players (
  id bigint generated always as identity primary key,
  discord_id text not null references public.discord_users(discord_id) on delete cascade,
  summoner_name text not null,
  region text not null,
  added_at timestamptz not null default now(),
  unique(discord_id, summoner_name, region)
);

create index if not exists idx_tracked_players_discord
  on public.tracked_players (discord_id);
create index if not exists idx_tracked_players_summoner_region
  on public.tracked_players (summoner_name, region);

-- Server webhooks: guild admins link a channel webhook to get rank/streak posts
create table if not exists public.server_webhooks (
  id bigint generated always as identity primary key,
  guild_id text not null,
  channel_webhook_url text not null,
  summoner_names_to_track text[] not null default '{}',
  added_by_discord_id text not null references public.discord_users(discord_id) on delete set null,
  created_at timestamptz not null default now(),
  unique(guild_id, channel_webhook_url)
);

create index if not exists idx_server_webhooks_guild
  on public.server_webhooks (guild_id);

-- For mutual-server friend discovery: which guilds each Discord user is in (after granting guilds scope)
create table if not exists public.discord_user_guilds (
  discord_id text not null references public.discord_users(discord_id) on delete cascade,
  guild_id text not null,
  primary key (discord_id, guild_id)
);

create index if not exists idx_discord_user_guilds_guild
  on public.discord_user_guilds (guild_id);

-- Last known rank per summoner (for rank-up detection in cron)
create table if not exists public.rank_check_snapshots (
  summoner_name text not null,
  region text not null,
  tier text,
  rank text,
  league_points int,
  checked_at timestamptz not null default now(),
  primary key (summoner_name, region)
);

-- RLS: enabled so anon cannot access; only backend using service_role can (service_role bypasses RLS)
alter table public.discord_users enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.tracked_players enable row level security;
alter table public.server_webhooks enable row level security;
alter table public.discord_user_guilds enable row level security;
alter table public.rank_check_snapshots enable row level security;
