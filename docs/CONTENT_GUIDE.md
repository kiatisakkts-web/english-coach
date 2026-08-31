# Content guide

New lessons should define: `id`, `title`, `level` (A1/A2/B1/B2), `topic`, `objectives`, `vocabulary`, `dialogue`, `speaking`, `shadowing`, `reading`, `quiz`, `grammarTip`, `summary`, and `xp`. Keep every dialogue and reading passage genuinely distinct, conversational, short enough for daily practice, and paired with Thai support where available. Add new items to the lesson data layer before adding UI-specific copy.

The runtime shape is `LessonContent` in `src/data/lessons.ts`. `validateLessons()` checks unique IDs, CEFR values, non-empty vocabulary/dialogue/reading/quiz content, and quiz answer indexes. Keep each lesson complete with at least three vocabulary items, four dialogue lines, one comprehension question, one speaking target, one reading passage, and one grammar tip.
