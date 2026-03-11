-- Champion patch notes cache: stores scraped champion changes per patch.
create table if not exists public.champion_patch_notes (
  id bigint generated always as identity primary key,
  champion_name text not null,
  patch_version text not null,
  patch_date text,
  change_type text, -- buff, nerf, change, adjust
  changes_text text not null,
  scraped_at timestamptz default now() not null,
  unique(champion_name, patch_version)
);

create index if not exists cpn_champion on public.champion_patch_notes(lower(champion_name));
create index if not exists cpn_patch on public.champion_patch_notes(patch_version desc);

alter table public.champion_patch_notes enable row level security;

create policy "No anon access to champion_patch_notes"
  on public.champion_patch_notes for all
  using (false)
  with check (false);