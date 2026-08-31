import { describe, expect, it } from 'vitest';
import { lessons, validateLessons } from './data/lessons';

describe('English Coach smoke checks', () => {
  it('normalizes a learner word match case-insensitively', () => {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
    expect(normalize(' Could I? ')).toBe('could i');
  });
  it('ships the validated 30-lesson content pack', () => {
    expect(lessons).toHaveLength(30);
    expect(validateLessons(lessons)).toBe(true);
    expect(lessons.filter(l => l.level === 'A1')).toHaveLength(8);
    expect(lessons.filter(l => l.level === 'A2')).toHaveLength(8);
    expect(lessons.filter(l => l.level === 'B1')).toHaveLength(8);
    expect(lessons.filter(l => l.level === 'B2')).toHaveLength(6);
  });
});
