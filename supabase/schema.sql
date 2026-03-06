-- Statgap Phase 1 – Supabase schema (no Riot/Discord)
-- Run this in Supabase SQL Editor.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- crews
create table public.crews (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- crew_members
create table public.crew_members (
  id uuid primary key default uuid_generate_v4(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz default now() not null,
  unique(crew_id, user_id)
);

-- matches (mock/placeholder; no Riot fields yet)
create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  champion_placeholder text not null,
  role text not null,
  kills int not null default 0,
  deaths int not null default 0,
  assists int not null default 0,
  cs_per_min numeric not null default 0,
  carry_score numeric not null default 0,
  grief_index numeric not null default 0,
  label text,
  played_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

-- reactions (e.g. like, fire, etc.)
create table public.reactions (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  created_at timestamptz default now() not null,
  unique(match_id, user_id, type)
);

-- comments
create table public.comments (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes
create index idx_crew_members_crew_id on public.crew_members(crew_id);
create index idx_crew_members_user_id on public.crew_members(user_id);
create index idx_matches_crew_id on public.matches(crew_id);
create index idx_matches_played_at on public.matches(played_at desc);
create index idx_reactions_match_id on public.reactions(match_id);
create index idx_comments_match_id on public.comments(match_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.matches enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;

-- Profiles: users only access their own
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Helper: is user in crew?
create or replace function public.user_in_crew(crew_uuid uuid)
returns boolean as $$
  select exists (
    select 1 from public.crew_members
    where crew_id = crew_uuid and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- Crews: only members can access
create policy "Users can view crews they belong to"
  on public.crews for select
  using (public.user_in_crew(id));
create policy "Users can create crews"
  on public.crews for insert
  with check (auth.uid() = owner_id);
create policy "Owners can update their crews"
  on public.crews for update
  using (auth.uid() = owner_id);
create policy "Owners can delete their crews"
  on public.crews for delete
  using (auth.uid() = owner_id);

-- Crew members: only crew members can view; owner can manage
create policy "Crew members can view crew_members"
  on public.crew_members for select
  using (public.user_in_crew(crew_id));
create policy "Crew owners can insert members"
  on public.crew_members for insert
  with check (
    exists (
      select 1 from public.crews c
      where c.id = crew_members.crew_id and c.owner_id = auth.uid()
    )
  );
create policy "Users can join as member"
  on public.crew_members for insert
  with check (auth.uid() = user_id);
create policy "Owners can delete members; users can leave"
  on public.crew_members for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.crews c
      where c.id = crew_members.crew_id and c.owner_id = auth.uid()
    )
  );

-- Matches: read/write only within crew
create policy "Crew members can view matches"
  on public.matches for select
  using (public.user_in_crew(crew_id));
create policy "Crew members can insert matches"
  on public.matches for insert
  with check (public.user_in_crew(crew_id));
create policy "Crew members can update matches"
  on public.matches for update
  using (public.user_in_crew(crew_id));
create policy "Crew members can delete matches"
  on public.matches for delete
  using (public.user_in_crew(crew_id));

-- Reactions: only within crew (via match)
create policy "Crew members can view reactions"
  on public.reactions for select
  using (
    public.user_in_crew((select crew_id from public.matches where id = match_id))
  );
create policy "Crew members can add reactions"
  on public.reactions for insert
  with check (
    auth.uid() = user_id
    and public.user_in_crew((select crew_id from public.matches where id = match_id))
  );
create policy "Users can delete own reactions"
  on public.reactions for delete
  using (auth.uid() = user_id);

-- Comments: only within crew
create policy "Crew members can view comments"
  on public.comments for select
  using (
    public.user_in_crew((select crew_id from public.matches where id = match_id))
  );
create policy "Crew members can add comments"
  on public.comments for insert
  with check (
    auth.uid() = user_id
    and public.user_in_crew((select crew_id from public.matches where id = match_id))
  );
create policy "Users can update own comments"
  on public.comments for update
  using (auth.uid() = user_id);
create policy "Users can delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- Create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
