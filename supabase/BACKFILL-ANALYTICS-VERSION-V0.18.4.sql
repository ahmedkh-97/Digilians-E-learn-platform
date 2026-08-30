-- ============================================================
-- DIGILIANS E-LEARN — V0.18.4 ANALYTICS VERSION BACKFILL
-- Run ONCE in Supabase SQL Editor after V0.18.4 is deployed.
--
-- Why:
-- Analytics was introduced in V0.18.3, but V0.18.3 read the build
-- version from the wrong DOM element, so those early events were
-- stored as "unknown".
--
-- V0.18.4 fixes future events. This script corrects historical
-- V0.18.3 "unknown" events only.
-- ============================================================

-- 1) Preview how many rows will be changed.
select count(*) as unknown_events_before
from public.analytics_events
where platform_version = 'unknown';

-- 2) Backfill the affected V0.18.3 events.
update public.analytics_events
set platform_version = '0.18.3'
where platform_version = 'unknown';

-- 3) Verify current version distribution.
select
  platform_version,
  count(*) as events
from public.analytics_events
group by platform_version
order by platform_version desc;
