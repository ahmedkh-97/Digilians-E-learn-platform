# Python Study Content V2 — V0.16.0

## Objective

The prior Python Learn experience was strong as exam revision but too compressed for a learner studying a concept for the first time.

V0.16.0 keeps the existing source-grounded curriculum and assessment architecture, but rebuilds the Study presentation around understanding rather than memorization.

## Study Template V2

Every Python Study section now follows this teaching sequence:

1. **What Is It?**  
   Plain-language explanation of the source concept.

2. **Why Do We Need It?**  
   Connects the concept to how code/data is read or manipulated.

3. **Mental Model**  
   A compact visual/structural analogy such as:
   - Variable → label pointing to a value
   - String → indexed character sequence
   - Dictionary → named key/value drawers
   - Function → Input → Process → Output
   - NumPy → array/grid with shape
   - DataFrame → labeled table
   - Visualization → Question → Variables → Chart → Insight

4. **Step-by-Step**  
   Concepts are read in execution order rather than as isolated bullets.

5. **Comparison / Before-After**  
   Added where it materially improves understanding.

6. **Code Lab**  
   Real selectable LTR Python code with the existing source/clarification labels.

7. **Try Changing This**  
   Learners are prompted to predict a changed output before executing.

8. **Quick Check**  
   One interactive question before leaving the topic.

9. **Source Trace**  
   Course-source trace remains visible.

## Coverage

- Python Sessions: 13/13
- Study Sections: 75/75 upgraded to V2
- Sections with a code/example walkthrough: 75/75
- Total code walkthroughs: 77
- Interactive Quick Checks: 75
- Unique Quick Check questions: 75
- All structured Python code blocks parse successfully.

## Source policy

Study V2 does not silently add curriculum topics.

Two content classes remain visually distinguishable:

- **Source-based / source-rendered content**  
  Concepts and examples directly grounded in the supplied Python materials.

- **Platform Clarification**  
  Additional mental models, small examples and transformations created only to explain an existing source concept. These are explicitly labeled and are not presented as official course text.

## Sessions 1–7

The first seven sessions now favor beginner learning:
- concept before syntax;
- state/execution tracing;
- more code examples;
- comparisons where common confusion exists;
- shorter Arabic sentences around isolated English/Python technical terms.

## NumPy

NumPy uses the array/grid mental model and emphasizes:
- shape before indexing;
- row/column interpretation;
- vectorized operations;
- broadcasting;
- aggregations;
- practical numerical transformations.

Important lessons include `Before → Operation → After` blocks.

## Pandas

Pandas uses the DataFrame/table mental model and separates:
- row filtering;
- column transformation;
- missing-data handling;
- grouping/aggregation;
- date conversion;
- end-to-end analytical workflow.

`Before → Operation → After` is used to make DataFrame transformations visible instead of describing them only in prose.

## Visualization

Visualization sections now start from the analytical question:
`Question → Variables → Chart Choice → Read → Insight`

This is applied across Matplotlib, distribution/outlier analysis, Seaborn and geospatial visualization.

## Assessment protection

The following are byte-identical to V0.15.3:
- all 13 Python production Question Banks;
- all 13 Python Session Practice exam payloads;
- `data/exam-blueprints.json`;
- `data/question-banks.json`;
- `data/exams.json`;
- `data/official-qbank.json`.

Therefore Study V2 does not alter exam answers, scoring, ranking or Official Ministry content.

## QA

- Dynamic Python Track generation regression: PASS
- Dynamic Python Final-share generation regression: PASS
- SQL dynamic-generation regression: PASS
- 75/75 Study V2 objects present
- 75/75 Study Sections include examples
- 77/77 code walkthroughs parse as Python
- 75/75 Quick Checks valid
- 75/75 Quick Checks unique
- All JSON parses
- All JavaScript passes `node --check`
- Direct JS DOM references resolve
- SQL: 520 questions preserved
- Python: 520 questions preserved
- Junior Official: 930 preserved
- Professional Official: 1189 preserved

## Browser note

No full automated Chromium visual click-through is claimed in this environment. The Study V2 data, renderer bindings, interactive Quick Check logic, code syntax, assessment integrity and runtime exam generation were validated directly.
