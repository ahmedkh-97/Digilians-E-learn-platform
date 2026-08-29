# Ranking V2 — Digilians E-Learn V0.13.0

## Ranking hierarchy

The platform now has three ranking layers:

1. **Exam Ranking**
   - Every ranked exam/activity keeps its own leaderboard.
   - Best attempt only.
   - Rank by percentage, then completion time, then earlier submission.

2. **Track Overall Ranking**
   - Uses only the fixed Official Section exams inside one track.
   - Best attempt from each section is counted once.
   - Total Grade = sum of correct answers from those best section attempts.
   - Example: Junior Excel is ranked out of 230 marks.

3. **Full Bank Overall Ranking**
   - Junior and Professional are isolated.
   - Junior Total Grade is out of 930.
   - Professional Total Grade is out of 1189.
   - Uses all fixed Official Sections in that level.

## Fairness rule

Random Practice 40, Random Exam 50 and Final simulations remain ranked activities, but they **do not add marks** to Track Overall or Full Bank Overall totals because students may receive different random questions and those questions overlap with the fixed source sections.

## Aggregate ranking order

1. More fixed sections completed.
2. Higher Total Grade.
3. Higher overall percentage.
4. Faster combined time across the counted best section attempts.
5. Earlier submission as the final tie-breaker.

This prevents a student who solved only one or two sections with 100% from ranking above a student who completed the full bank.

## Data source

No database migration is required.

Overall rankings are calculated live from the existing `public.exam_attempts` rows in Supabase. The client:
- requests attempts for all fixed section exam IDs in the selected scope;
- chooses the best attempt per student per section;
- aggregates those best attempts into Track or Full Bank totals.

## Tabs

- Junior Overall
- Professional Overall
- Track Overall
- Exam Ranking

## Total marks

- Junior Data Analysis: 930
- Professional Data Analysis: 1189

Random challenge and final leaderboards remain available inside Exam Ranking.
