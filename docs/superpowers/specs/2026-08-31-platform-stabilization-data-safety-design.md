# Platform Stabilization & Data Safety Design

## Goal
Harden the approved V0.20.9 platform against hidden storage/migration/restore failures without changing approved learning, practice, exam, QBank, ranking rules, or assessment content.

## Scope
- Add an explicit versioned learner-storage schema and safe migration runner.
- Make current migration non-destructive; destructive future migrations must obtain a safety snapshot before changing learner data.
- Keep the platform usable when localStorage reads/writes are unavailable; surface a learner-visible save warning instead of crashing silently.
- Make backup restore rollback-safe when a browser storage write fails mid-restore.
- Add storage-schema compatibility to backup validation.
- Improve Platform Health data so app errors carry severity and summaries expose severity/current-version counts and last-error time.
- Add regression/pre-deploy gates for these contracts.

## Non-goals
- No track/content additions.
- No assessment-data edits.
- No ranking architecture redesign.
- No UI redesign beyond small status/health copy needed for the new safety behavior.
- No GitHub operations.

## Release gate
Targeted tests -> feature regression -> one full regression -> version/cache/changelog -> one package -> fresh-folder package verification.
