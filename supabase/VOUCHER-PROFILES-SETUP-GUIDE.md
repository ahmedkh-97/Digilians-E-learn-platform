# Voucher Profiles Setup — V0.20.24

Apply `VOUCHER-PROFILES-V0.20.24.sql` in the same Supabase project used by Ranking when shared Voucher Track Overall ranking is ready to go live.

The table stores only anonymous ranking identity metadata:
- `player_id`
- `primary_track_id`
- `updated_at`

It does not store learner answers, email, phone, passwords, course progress, or Voucher question history.

If this migration is not deployed, local Voucher browsing, mocks, attempts, My Mistakes, and Exam Ranking continue to work. Shared Voucher **Track Overall** should show an unavailable/non-critical state because Primary Track filtering cannot be verified online.
