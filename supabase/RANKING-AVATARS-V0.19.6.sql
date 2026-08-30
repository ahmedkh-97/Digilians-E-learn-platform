-- ============================================================
-- DIGILIANS E-LEARN — V0.19.6 SHARED RANKING AVATARS
-- Run once in Supabase SQL Editor.
--
-- Purpose:
--   Let all leaderboard viewers see each learner's selected avatar.
--
-- Privacy:
--   Stores ONLY:
--     player_id  (existing anonymous learner UUID)
--     avatar_id  (one of the 16 built-in characters)
--     updated_at
--
--   Does NOT store:
--     gender/category
--     email
--     learner answers
--     analytics identity
-- ============================================================

create table if not exists public.ranking_profiles (
  player_id uuid primary key,
  avatar_id text not null,
  updated_at timestamptz not null default now(),

  constraint ranking_profiles_avatar_id_check
  check (
    avatar_id in (
      'boy-3d-1','boy-3d-2','boy-3d-3','boy-3d-4',
      'girl-3d-1','girl-3d-2','girl-3d-3','girl-3d-4',
      'cat-3d','bear-3d','penguin-3d','otter-3d',
      'koala-3d','rabbit-3d','lion-3d','sloth-3d'
    )
  )
);

create index if not exists ranking_profiles_updated_at_idx
  on public.ranking_profiles(updated_at desc);

alter table public.ranking_profiles enable row level security;

drop policy if exists "ranking_profiles_public_read" on public.ranking_profiles;
create policy "ranking_profiles_public_read"
on public.ranking_profiles
for select
to anon, authenticated
using (true);

drop policy if exists "ranking_profiles_public_insert" on public.ranking_profiles;
create policy "ranking_profiles_public_insert"
on public.ranking_profiles
for insert
to anon, authenticated
with check (true);

drop policy if exists "ranking_profiles_public_update" on public.ranking_profiles;
create policy "ranking_profiles_public_update"
on public.ranking_profiles
for update
to anon, authenticated
using (true)
with check (true);

grant select, insert, update on public.ranking_profiles to anon, authenticated;

select
  'Shared ranking avatars ready' as status,
  to_regclass('public.ranking_profiles') as ranking_profiles_table;
