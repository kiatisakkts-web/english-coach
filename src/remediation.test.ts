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
});
