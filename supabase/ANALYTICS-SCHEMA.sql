-- ============================================================
-- DIGILIANS E-LEARN — PRIVATE ANALYTICS V1
-- Run once in: Supabase Dashboard → SQL Editor
-- Safe to re-run.
-- ============================================================

create extension if not exists pgcrypto;

-- Approved analytics administrators.
create table if not exists public.analytics_admins (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint analytics_admins_email_lowercase
    check (email = lower(email))
);

-- Anonymous product-usage events.
-- Intentionally stores no learner name, email, IP address or question answers.
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  session_id uuid not null,
  event_type text not null,
  route text,
  course_id text,
  track_id text,
  module_id text,
  exam_id text,
  platform_version text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_visitor_idx
  on public.analytics_events (visitor_id);

create index if not exists analytics_events_session_idx
  on public.analytics_events (session_id);

create index if not exists analytics_events_event_type_idx
  on public.analytics_events (event_type);

create index if not exists analytics_events_track_idx
  on public.analytics_events (track_id)
  where track_id is not null;

create index if not exists analytics_events_version_idx
  on public.analytics_events (platform_version)
  where platform_version is not null;

-- SECURITY DEFINER helper:
-- Analytics SELECT policies call this function.
-- The function checks the authenticated Supabase JWT email against
-- the private allowlist without exposing that allowlist to anonymous users.
create or replace function public.is_analytics_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.analytics_admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_analytics_admin() from public;
grant execute on function public.is_analytics_admin() to authenticated;

alter table public.analytics_events enable row level security;
alter table public.analytics_admins enable row level security;

-- Remove broad grants first, then restore only the minimum needed.
revoke all on table public.analytics_events from anon, authenticated;
revoke all on table public.analytics_admins from anon, authenticated;

-- Students/browsers may only INSERT anonymous analytics events.
grant insert on table public.analytics_events to anon, authenticated;

-- Authenticated clients may issue SELECT requests, but RLS only returns
-- rows to approved analytics admins.
grant select on table public.analytics_events to authenticated;
grant select on table public.analytics_admins to authenticated;

drop policy if exists "analytics anon insert" on public.analytics_events;
drop policy if exists "analytics authenticated insert" on public.analytics_events;
drop policy if exists "analytics admin read events" on public.analytics_events;
drop policy if exists "analytics admin read allowlist" on public.analytics_admins;

create policy "analytics anon insert"
on public.analytics_events
for insert
to anon
with check (true);

create policy "analytics authenticated insert"
on public.analytics_events
for insert
to authenticated
with check (true);

create policy "analytics admin read events"
on public.analytics_events
for select
to authenticated
using (public.is_analytics_admin());

create policy "analytics admin read allowlist"
on public.analytics_admins
for select
to authenticated
using (public.is_analytics_admin());

-- No UPDATE or DELETE policy is created for browsers.
-- Anonymous users also receive no SELECT privilege at all.

select
  'Analytics schema ready' as status,
  to_regclass('public.analytics_events') as events_table,
  to_regclass('public.analytics_admins') as admins_table;
