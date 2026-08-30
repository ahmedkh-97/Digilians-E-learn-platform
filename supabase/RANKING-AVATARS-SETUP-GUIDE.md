# Shared Ranking Avatars — Supabase Setup

## 1. Open Supabase

Open the existing Digilians E-Learn Supabase project.

Go to:

`SQL Editor → New query`

## 2. Run the migration

Open:

`supabase/RANKING-AVATARS-V0.19.6.sql`

Copy all SQL into the editor and press **Run**.

Expected result:

`Shared ranking avatars ready`

and table:

`ranking_profiles`

## 3. Verify the table

Table Editor should show:

| column | role |
|---|---|
| player_id | anonymous learner identifier |
| avatar_id | one of the 16 built-in Soft 3D avatars |
| updated_at | last profile update |

There is intentionally no gender/category column.

## 4. Local test

`TEST-LOCAL.bat`

Localhost cannot fully validate the LIVE Supabase population behavior if you want to avoid changing production data during local testing.

The platform code itself should still load and Rankings should fall back safely.

## 5. LIVE rollout

Upload V0.19.6.

Each learner with an existing avatar only needs to open the updated platform once.

On opening:
- their browser syncs its avatar to `ranking_profiles`
- all other users can then see that avatar on Ranking
- historical ranking rows immediately gain that avatar because lookup uses `player_id`

Users who have not yet opened V0.19.6 will temporarily remain initials until they sync.

## Changing avatars

When a learner changes avatar from Profile:
- the same `player_id` row is updated
- everyone sees the new avatar on the next Ranking refresh/load

No new exam attempt is required.

## Trust model

The platform still uses the existing passwordless anonymous learner model.

`player_id` is an opaque browser UUID and the leaderboard remains friendly-competition infrastructure, not a tamper-proof identity system.
