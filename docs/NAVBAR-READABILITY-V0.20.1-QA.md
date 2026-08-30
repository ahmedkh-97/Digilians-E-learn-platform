# V0.20.1 — Navbar Readability Polish QA

## Problem

The sixth desktop destination added by My Mistakes reduced the equal-width space available to each navigation item. `Official QBank` wrapped onto two lines even though the header had available horizontal space.

## Fix

- large desktop navigation target width: up to **760px**
- long labels use `white-space: nowrap`
- nav items use natural flexible widths instead of equal-width `flex: 1 1 0`
- font size is not reduced
- tablet/mobile breakpoints remain intact

## Protected behavior

Unchanged:
- My Mistakes logic/state
- Official QBank content
- SQL/Python/Excel learning content
- Exams and rankings
- Supabase schemas
- mobile bottom navigation

## Acceptance

At desktop width, all six labels must be a single line:

`Home | Learn | Official QBank | Exams | My Mistakes | Ranking`

## Visual component QA

Production CSS was rendered against all six desktop nav destinations.

Results:
- 1494px viewport: nav = 760px; all labels = 1 line; page overflow = 0
- 1320px viewport: nav = 720px; all labels = 1 line; page overflow = 0
- 1200px viewport: nav = 600px; all labels = 1 line; page overflow = 0
- 1100px viewport: nav = 520px; all labels = 1 line; page overflow = 0
- `Official QBank`: `white-space: nowrap`
- `My Mistakes`: `white-space: nowrap`
- desktop nav font remains 10.3px at >=1100px

Result: **PASS**

## Content protection

All JSON payloads from V0.20.0 are byte-identical except `data/changelog.json`, which is intentionally updated for V0.20.1.
