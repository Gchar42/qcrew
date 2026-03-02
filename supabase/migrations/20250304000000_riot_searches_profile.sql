-- Add profile icon and level for directory display.
alter table public.riot_searches
  add column if not exists profile_icon_id integer,
  add column if not exists summoner_level integer;
