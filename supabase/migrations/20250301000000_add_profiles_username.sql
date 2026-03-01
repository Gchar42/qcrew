-- Add username to profiles (nullable, unique case-insensitive).
-- Safe to run on existing schema.

alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username))
  where username is not null;

comment on column public.profiles.username is 'Unique display username (3-20 chars, letters/numbers/underscore).';
