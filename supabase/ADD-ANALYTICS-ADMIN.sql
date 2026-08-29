-- ============================================================
-- DIGILIANS E-LEARN — ADD PRIVATE ANALYTICS ADMIN
-- 1) First create the same email as a Supabase Auth user:
--    Supabase Dashboard → Authentication → Users → Add user
-- 2) Replace the example email below with YOUR admin email.
-- 3) Run this file in Supabase SQL Editor.
-- ============================================================

insert into public.analytics_admins (email)
values (lower('YOUR-ADMIN-EMAIL@example.com'))
on conflict (email) do nothing;

select email, created_at
from public.analytics_admins
order by created_at;
