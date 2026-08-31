# Platform Stabilization & Data Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden learner data persistence, migration, restore, and platform-health diagnostics without changing approved educational or assessment behavior.

**Architecture:** Add a small pure storage-safety module for schema/migration contracts, keep storage access resilient through one wrapper layer in `storage.js`, make restore application rollback-safe, and enrich existing analytics error metadata rather than creating a second monitoring system. Existing public APIs remain compatible.

**Tech Stack:** Vanilla ES modules, localStorage/sessionStorage, Node `node:test`, existing pre-deploy tooling.

**Spec:** `docs/superpowers/specs/2026-08-31-platform-stabilization-data-safety-design.md`

## Global Constraints
- Start from approved V0.20.9 portable package.
- Do not modify Study, Practice, Exam, QBank, curriculum, syllabus, or ranking rules/content.
- No GitHub operations.
- Full regression runs once after feature QA, then package verification runs on the final ZIP.

---

### Task 1: Versioned storage schema and migration safety
**Files:** Create `assets/js/storage-safety.js`; modify `assets/js/storage.js`, `assets/js/app.js`; create `tests/storage-safety.test.mjs`.
**Produces:** `CURRENT_STORAGE_SCHEMA_VERSION`, `ensureStorageSchema()`, resilient learner-storage access and warnings.
- [ ] Write failing tests for absent schema migration, future-schema refusal, destructive-migration snapshot requirement, and unavailable localStorage reads/writes.
- [ ] Run targeted tests and verify RED.
- [ ] Implement minimal storage-safety module and wrappers.
- [ ] Run targeted tests and verify GREEN.

### Task 2: Rollback-safe Backup/Restore
**Files:** Modify `assets/js/backup-restore.js`; create `tests/backup-restore-safety.test.mjs`.
**Produces:** storage-schema-aware backups and rollback on partial restore failure.
- [ ] Write failing tests for storage schema backup validation and failed-write rollback.
- [ ] Run targeted tests and verify RED.
- [ ] Implement atomic best-effort apply/rollback and schema validation.
- [ ] Run targeted tests and verify GREEN.

### Task 3: Platform Health severity/current-version diagnostics
**Files:** Modify `assets/js/analytics.js`; create `tests/platform-health-stability.test.mjs`.
**Produces:** error severity metadata plus severity/current-version/last-error summary fields.
- [ ] Write failing pure aggregation/classification tests.
- [ ] Run targeted tests and verify RED.
- [ ] Implement classification and aggregation with backward compatibility for historical events.
- [ ] Run targeted tests and verify GREEN.

### Task 4: Pre-deploy gates and feature regression
**Files:** Modify `tools/pre-deploy-check.mjs`; run all targeted tests.
**Produces:** permanent guards for storage schema, rollback-safe restore, and health classification.
- [ ] Add guards that exercise real modules, not source-string-only assertions.
- [ ] Run targeted suite + Pre-Deploy + Excel Intake.

### Task 5: Release and package verification
**Files:** Update version/cache/changelog/readme only after feature gates pass; package once.
**Produces:** V0.20.10 stabilization ZIP and checksum.
- [ ] Run one full regression.
- [ ] Confirm protected-file hashes are unchanged.
- [ ] Bump version/cache/changelog to V0.20.10.
- [ ] Re-run release metadata gates.
- [ ] Package once, extract fresh, re-run full verification + HTTP smoke.
