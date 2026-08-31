import { describe, expect, it } from 'vitest';
import { lessons, validateLessons } from './data/lessons';
import { placementQuestions } from './data/placement';
import { scorePlacement } from './services/placementScoring';
import { validateImportPayload } from './services/storage';

describe('release remediation regressions', () => {
  it('keeps all lesson dialogue and reading bodies unique', () => {
    expect(validateLessons(lessons)).toBe(true);
    expect(new Set(lessons.map(lesson => lesson.dialogue.map(line => line.english).join('|'))).size).toBe(30);
    expect(new Set(lessons.map(lesson => lesson.reading.text)).size).toBe(30);
  });
  it('derives placement level and per-skill percentages from answers', () => {
    const none = scorePlacement(placementQuestions, []); expect(none.score).toBe(0); expect(none.level).toBe('A1');
    const all = scorePlacement(placementQuestions, placementQuestions.map(question => question.correctAnswer)); expect(all.score).toBe(28); expect(all.level).toBe('B2'); expect(all.bySkill.Listening.percentage).toBe(100);
    const half = scorePlacement(placementQuestions, placementQuestions.map((question, index) => index < 14 ? question.correctAnswer : -1)); expect(half.percentage).toBe(50); expect(half.level).toBe('A2');
  });
  it('rejects malformed or legacy import payloads', () => { expect(validateImportPayload('{bad}')).toBe(false); expect(validateImportPayload({ schemaVersion: 2 })).toBe(false); expect(validateImportPayload({ schemaVersion: 3, progress: { xp: 1 } })).toBe(false); });
  it('rejects duplicate review records and invalid nested dates', () => { const valid = { schemaVersion: 3, exportedAt: new Date().toISOString(), profile: { name: 'Mali', level: 'A2', learningGoal: 'Travel' }, settings: { goal: 10, translation: true, sound: true, voice: 'US English', speechRate: 1 }, progress: { xp: 10, goal: 10, minutes: 5, streak: 1, bestStreak: 1 }, lessonProgress: [], vocabulary: [{ id: 'reservation', word: 'reservation', meaningThai: 'การจอง', definition: 'in context', example: 'A reservation.', status: 'Learning', nextReviewAt: new Date().toISOString(), interval: 1, ease: 2.5 }], reviews: [{ id: 'r1', vocabularyId: 'reservation', choice: 'Good', reviewedAt: new Date().toISOString() }], placement: { answers: [] }, dailyActivity: [] }; expect(validateImportPayload(valid)).toBe(true); expect(validateImportPayload({ ...valid, reviews: [valid.reviews[0], valid.reviews[0]] })).toBe(false); expect(validateImportPayload({ ...valid, vocabulary: [{ ...valid.vocabulary[0], nextReviewAt: 'not-a-date' }] })).toBe(false); });
});
