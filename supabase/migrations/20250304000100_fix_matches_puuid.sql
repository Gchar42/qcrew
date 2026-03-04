-- Reconcile existing matches table with expected schema (puuid, queue_id, indexes).
-- Run after inspecting: select column_name, data_type from information_schema.columns
-- where table_schema = 'public' and table_name = 'matches' order by ordinal_position;

-- Step 2: Add puuid column if missing
alter table public.matches
add column if not exists puuid text;

-- Backfill from older column if it exists (only one of these will apply)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'matches' and column_name = 'player_puuid'
  ) then
    update public.matches set puuid = player_puuid where puuid is null and player_puuid is not null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'matches' and column_name = 'summoner_puuid'
  ) then
    update public.matches set puuid = summoner_puuid where puuid is null and summoner_puuid is not null;
  end if;
end $$;

-- Step 3: Ensure queue_id column exists as int
alter table public.matches
add column if not exists queue_id int;

-- Step 4: Add required indexes
create index if not exists idx_matches_puuid on public.matches(puuid);
create index if not exists idx_matches_queue on public.matches(queue_id);
