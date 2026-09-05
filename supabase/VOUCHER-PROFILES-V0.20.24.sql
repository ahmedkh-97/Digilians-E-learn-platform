create table if not exists public.voucher_profiles (
  player_id uuid primary key,
  primary_track_id text not null,
  updated_at timestamptz not null default now(),
  constraint voucher_profiles_primary_track_check check (
    primary_track_id in ('data-analysis','marketing','graphic-design','ui-ux','media-production')
  )
);

alter table public.voucher_profiles enable row level security;

drop policy if exists "voucher_profiles_public_read" on public.voucher_profiles;
create policy "voucher_profiles_public_read" on public.voucher_profiles
for select using (true);

drop policy if exists "voucher_profiles_public_insert" on public.voucher_profiles;
create policy "voucher_profiles_public_insert" on public.voucher_profiles
for insert with check (true);

drop policy if exists "voucher_profiles_public_update" on public.voucher_profiles;
create policy "voucher_profiles_public_update" on public.voucher_profiles
for update using (true) with check (true);

grant select, insert, update on public.voucher_profiles to anon, authenticated;
