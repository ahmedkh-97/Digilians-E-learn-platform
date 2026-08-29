# Professional Official Final Blueprint — V0.12.2

## Status

**ACTIVE — Platform-generated ranked simulation using only Official Ministry QBank questions.**

Important: the Professional source bank does not provide an official ministry final-exam weighting. This blueprint is a platform simulation derived from the source-bank inventory; it is not a claim about the ministry's real final distribution.

## Exam settings

- Questions: **100**
- Time: **120 minutes**
- Feedback mode: **Exam mode only**
- Passing score: **60%**
- Retakes: **Allowed**
- Ranking: **Separate Professional Final leaderboard**
- Source revision: `professional-1189-r1`

## Track distribution

| Track | Source Questions | Source Share | Final Questions |
|---|---:|---:|---:|
| Excel | 230 | 19.3% | 19 |
| Power BI | 235 | 19.8% | 20 |
| SQL & Databases | 151 | 12.7% | 13 |
| Python for Data Analysis | 150 | 12.6% | 13 |
| Web Scraping | 123 | 10.3% | 10 |
| Machine Learning | 90 | 7.6% | 7 |
| Tableau | 210 | 17.7% | 18 |

Distribution method: **source-proportional Largest Remainder** across the 1189-question Professional bank.

Final distribution: **19 Excel · 20 Power BI · 13 SQL · 13 Python · 10 Web Scraping · 7 Machine Learning · 18 Tableau = 100**.

## Selection strategy

- Deduplicate within an attempt by question fingerprint.
- When the quota is large enough, include at least one question from every mapped topic.
- Allocate remaining slots proportionally to the topic pool sizes.
- Randomize within topics and shuffle the final 100 questions.
- Retakes generate a fresh selection from the same locked source revision.

## Integrity

- Professional bank remains **1189/1189** explanation-complete.
- Junior bank remains **930/930** explanation-complete.
- Official wording, options and official answers remain unchanged.
- Professional Final ranking/progress ID is isolated from Junior.

Professional Final ID: `official-professional-data-analysis-final-v1-professional-1189-r1`