# Excel Deep Learning Standard V2

## Purpose

Excel Study should teach relationships and reasoning, not present a long sequence of summary cards.

The learner-facing architecture is therefore:

`Learning Group → Relationship Map → Deep Lesson → Practice/Quick Check`

Source Week numbers remain internal source-trace metadata, not the primary educational organization.

## Learning Group contract

Every Group must answer:

**What relationship connects these lessons?**

Required group elements:
1. Group number
2. Professional group title
3. One-sentence learning purpose
4. `How It Fits Together`
5. Flow between the lessons
6. Group progress once the full V2 rollout is approved

Grouping is a platform learning-map synthesis and must be labeled:

`PLATFORM LEARNING MAP`

## Deep Lesson contract

A full V2 Excel lesson should use the following components when supported by the source:

1. **Learning Goal**
   - what the learner should understand after the lesson

2. **How This Connects**
   - relationship to concepts immediately before/after it

3. **Real Problem**
   - what problem this Excel concept solves

4. **See It in Excel**
   - small sheet/table/cell/range visualization when layout matters

5. **Source Concept Explanation**
   - clear Arabic explanation with English Excel terms preserved

6. **Worked Example**
   - formula/feature application
   - formula remains LTR

7. **Formula Anatomy**
   - split the formula into meaningful tokens/arguments

8. **Execution Trace**
   - show the order Excel evaluates the expression when useful

9. **Expected Result**
   - explicit result when supported/calculable from source or from a clearly labeled clarification dataset

10. **Compare / Decision Table**
    - when multiple source-supported tools solve related problems

11. **Common Mistakes**
    - based only on source behavior or safe direct consequences of the source formula/rule

12. **Try It Yourself**
    - one small exercise before answer reveal

13. **Quick Check**
    - one focused concept check

14. **Next Connection**
    - explain how this concept is used later

15. **Source Trace**
    - exact deck + slide range

## Source integrity

Three content classes must remain visually distinct.

### SOURCE
Direct teaching from the uploaded course material.

### PLATFORM CLARIFICATION
A dataset, relationship map, execution trace, comparison layout, or practice reconstruction created only to explain a source-supported concept.

Required label variants include:

- `PLATFORM CLARIFICATION — based on the course concept`
- `PLATFORM LEARNING MAP`
- `PLATFORM CLARIFICATION — practice dataset ...`

### PRESENTATION CORRECTION / SOURCE INCONSISTENCY
Used when the supplied material has a typo, contradiction, or internally inconsistent example.

Never silently repair the source.

## Excel-specific visual rule

Use a visual model whenever meaning depends on:
- cell/range structure
- reference movement/fixing
- spill output
- lookup table position
- before/after formatting
- filtering output
- text splitting
- chart/sparkline interpretation

Avoid generic decorative diagrams when a mini spreadsheet is more educational.

## Formula rule

Every formula:
- LTR
- technical renderer
- readable independently from Arabic text
- source-supported
- no invented syntax

If a source mentions a function only in an assessment but does not teach its syntax, log a Source Gap instead of inventing a lesson.

## Prototype acceptance gate

The V2 standard should not be rolled out to the remaining Groups until the Group 02 prototype is reviewed for:

- explanation depth
- readability
- relationship clarity
- amount of detail
- visual usefulness
- formula walkthrough quality
- mobile usability

Practice and Exam remain locked during this review.
