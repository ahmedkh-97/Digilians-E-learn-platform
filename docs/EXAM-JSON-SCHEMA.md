# Digilians E-Learn — Exam JSON Schema V1.0

## Required top-level fields
- `schemaVersion`
- `exam`
- `questions`

## Required exam fields
- `id`
- `title`
- `description`
- `course`
- `module`
- `category`
- `uploadedBy`
- `createdAt`
- `version`
- `difficulty`
- `settings`

## Required settings
- `timer.enabled`
- `timer.durationMinutes`
- `allowRetake`
- `feedbackModes`
- `shuffleQuestions`
- `shuffleOptions`
- `passingScore`

## Required question fields
- `id`
- `question`
- `options`
- `correctAnswer`
- `explanation.ar`
- `topic`
- `difficulty`

## Option rules
Each MCQ should contain exactly four options:
- `A`
- `B`
- `C`
- `D`

`correctAnswer` must match one of those option IDs.

## Difficulty
Question difficulty:
- Easy
- Medium
- Hard

Exam difficulty:
- Easy
- Medium
- Hard
- Mixed

## Source traceability
Recommended for every question:
- `source.file`
- `source.reference`

This allows a question to be traced back to the original course material.

## Registry entry
After validation, the platform can generate a registry entry such as:

```json
{
  "id": "english-module-1-exam-01",
  "title": "English Module 1 - Practice Exam",
  "description": "Practice exam covering Module 1.",
  "course": "English",
  "module": "Module 1",
  "category": "Practice",
  "difficulty": "Mixed",
  "questionCount": 50,
  "file": "exams/english/english-module-1-exam-01.json",
  "active": true,
  "featured": false
}
```
