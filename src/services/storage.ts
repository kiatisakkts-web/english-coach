import Dexie, { Table } from 'dexie';

export type CEFR = 'A1' | 'A2' | 'B1' | 'B2';
export type Profile = { name: string; level: CEFR; learningGoal: string };
export type Settings = { goal: number; translation: boolean; sound: boolean; voice: string; speechRate: number };
export type LessonProgress = { lessonId: string; completed: boolean; xpAwarded: number; completedAt?: string };
export type VocabularyRecord = { id: string; word: string; meaningThai: string; definition: string; example: string; status: 'New' | 'Learning' | 'Familiar' | 'Mastered'; nextReviewAt: string; interval: number; ease: number };
export type ReviewRecord = { id: string; vocabularyId: string; choice: 'Again' | 'Hard' | 'Good' | 'Easy'; reviewedAt: string };
export type DailyActivity = { date: string; minutes: number; activities: number };
export type StoredProgress = { id: 'current'; xp: number; goal: number; minutes: number; streak: number; bestStreak: number; placementLevel?: CEFR; updatedAt: number };
export type ExportPayload = { schemaVersion: 3; exportedAt: string; profile: Profile; settings: Settings; progress: Omit<StoredProgress, 'id' | 'updatedAt'>; lessonProgress: LessonProgress[]; vocabulary: VocabularyRecord[]; reviews: ReviewRecord[]; placement: { level?: CEFR; completedAt?: string; answers: number[] }; dailyActivity: DailyActivity[] };

export class EnglishCoachDB extends Dexie {
  progress!: Table<StoredProgress, string>; lessonProgress!: Table<LessonProgress, string>; vocabulary!: Table<VocabularyRecord, string>; reviews!: Table<ReviewRecord, string>; dailyActivity!: Table<DailyActivity, string>; profile!: Table<Profile & { id: 'current' }, string>; settings!: Table<Settings & { id: 'current' }, string>; placement!: Table<{ id: 'current'; level?: CEFR; completedAt?: string; answers: number[] }, string>;
  constructor() { super('english-coach'); this.version(3).stores({ progress: 'id,updatedAt', lessonProgress: 'lessonId,completedAt', vocabulary: 'id,status,nextReviewAt', reviews: 'id,vocabularyId,reviewedAt', dailyActivity: 'date', profile: 'id', settings: 'id', placement: 'id' }); }
}
export const db = new EnglishCoachDB();
const defaultProfile: Profile = { name: 'Mali', level: 'A2', learningGoal: 'Everyday conversation' };
const defaultSettings: Settings = { goal: 10, translation: true, sound: true, voice: 'US English', speechRate: 1 };
const validGoal = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 5 && n <= 30;
const validCEFR = (v: unknown): v is CEFR => v === 'A1' || v === 'A2' || v === 'B1' || v === 'B2';
const numberOr = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export async function loadProgress(): Promise<StoredProgress> {
  const current = await db.progress.get('current');
  if (current) return current;
  let legacy: Record<string, unknown> = {};
  try { legacy = JSON.parse(localStorage.getItem('english-coach-progress') || '{}') as Record<string, unknown>; } catch { /* defaults */ }
  const xp = Math.max(0, numberOr(legacy.xp ?? Number(localStorage.getItem('ec-xp')), 0));
  const goalValue = numberOr(legacy.goal ?? Number(localStorage.getItem('ec-goal')), 10);
  const minutes = Math.max(0, numberOr(legacy.minutes ?? Number(localStorage.getItem('ec-minutes')), 0));
  const streak = Math.max(0, numberOr(legacy.streak, 0));
  const old: StoredProgress = { id: 'current', xp, goal: validGoal(goalValue) ? goalValue : 10, minutes, streak, bestStreak: Math.max(streak, numberOr(legacy.bestStreak, streak)), placementLevel: validCEFR(legacy.placementLevel) ? legacy.placementLevel : undefined, updatedAt: Date.now() };
  await db.transaction('rw', [db.progress, db.settings], async () => { await db.progress.put(old); await db.settings.put({ id: 'current', ...defaultSettings, goal: old.goal }); });
  return old;
}
export async function saveProgress(p: Omit<StoredProgress, 'id' | 'updatedAt'>) { await db.progress.put({ id: 'current', ...p, updatedAt: Date.now() }); }
export async function exportProgress(): Promise<ExportPayload> { const p = await loadProgress(); const profile = (await db.profile.get('current')) || { id: 'current' as const, ...defaultProfile }; const settings = (await db.settings.get('current')) || { id: 'current' as const, ...defaultSettings, goal: p.goal }; const placement = (await db.placement.get('current')) || { id: 'current' as const, level: p.placementLevel, answers: [] }; return { schemaVersion: 3, exportedAt: new Date().toISOString(), profile: { name: profile.name, level: profile.level, learningGoal: profile.learningGoal }, settings: { goal: settings.goal, translation: settings.translation, sound: settings.sound, voice: settings.voice, speechRate: settings.speechRate }, progress: { xp: p.xp, goal: p.goal, minutes: p.minutes, streak: p.streak, bestStreak: p.bestStreak, placementLevel: p.placementLevel }, lessonProgress: await db.lessonProgress.toArray(), vocabulary: await db.vocabulary.toArray(), reviews: await db.reviews.toArray(), placement: { level: placement.level, completedAt: placement.completedAt, answers: placement.answers }, dailyActivity: await db.dailyActivity.toArray() }; }

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function validateImportPayload(value: unknown): value is ExportPayload {
  if (!isObject(value) || value.schemaVersion !== 3 || typeof value.exportedAt !== 'string' || !isObject(value.profile) || !isObject(value.settings) || !isObject(value.progress)) return false;
  const p = value.progress; const s = value.settings; const profile = value.profile;
  const xp = typeof p.xp === 'number' ? p.xp : NaN; const goal = typeof p.goal === 'number' ? p.goal : NaN; const minutes = typeof p.minutes === 'number' ? p.minutes : NaN; const streak = typeof p.streak === 'number' ? p.streak : NaN; const bestStreak = typeof p.bestStreak === 'number' ? p.bestStreak : NaN;
  if (typeof profile.name !== 'string' || !validCEFR(profile.level) || typeof profile.learningGoal !== 'string' || !validGoal(s.goal) || typeof s.translation !== 'boolean' || typeof s.sound !== 'boolean' || typeof s.voice !== 'string' || typeof s.speechRate !== 'number' || !Number.isFinite(s.speechRate)) return false;
  if (![xp, goal, minutes, streak, bestStreak].every(v => typeof v === 'number' && Number.isFinite(v)) || !validGoal(goal) || xp < 0 || minutes < 0 || streak < 0 || bestStreak < streak || (p.placementLevel !== undefined && !validCEFR(p.placementLevel))) return false;
  if (!Array.isArray(value.lessonProgress) || !Array.isArray(value.vocabulary) || !Array.isArray(value.reviews) || !Array.isArray(value.dailyActivity) || !isObject(value.placement) || !Array.isArray(value.placement.answers)) return false;
  const lessonIds = new Set<string>(); for (const row of value.lessonProgress) { if (!isObject(row) || typeof row.lessonId !== 'string' || lessonIds.has(row.lessonId) || typeof row.completed !== 'boolean' || typeof row.xpAwarded !== 'number') return false; lessonIds.add(row.lessonId); }
  const vocabIds = new Set<string>(); for (const row of value.vocabulary) { if (!isObject(row) || typeof row.id !== 'string' || vocabIds.has(row.id) || typeof row.word !== 'string' || !['New', 'Learning', 'Familiar', 'Mastered'].includes(String(row.status)) || typeof row.nextReviewAt !== 'string' || typeof row.interval !== 'number' || typeof row.ease !== 'number') return false; vocabIds.add(row.id); }
  return value.reviews.every(row => isObject(row) && typeof row.id === 'string' && typeof row.vocabularyId === 'string' && vocabIds.has(row.vocabularyId) && ['Again', 'Hard', 'Good', 'Easy'].includes(String(row.choice)) && typeof row.reviewedAt === 'string') && value.dailyActivity.every(row => isObject(row) && typeof row.date === 'string' && typeof row.minutes === 'number' && typeof row.activities === 'number');
}
export async function importProgress(payload: ExportPayload) { if (!validateImportPayload(payload)) throw new Error('This file is not a compatible English Coach backup.'); await db.transaction('rw', [db.progress, db.profile, db.settings, db.lessonProgress, db.vocabulary, db.reviews, db.placement, db.dailyActivity], async () => { await db.progress.put({ id: 'current', ...payload.progress, updatedAt: Date.now() }); await db.profile.put({ id: 'current', ...payload.profile }); await db.settings.put({ id: 'current', ...payload.settings }); await db.lessonProgress.clear(); await db.vocabulary.clear(); await db.reviews.clear(); await db.dailyActivity.clear(); await db.placement.put({ id: 'current', ...payload.placement }); await db.lessonProgress.bulkPut(payload.lessonProgress); await db.vocabulary.bulkPut(payload.vocabulary); await db.reviews.bulkPut(payload.reviews); await db.dailyActivity.bulkPut(payload.dailyActivity); }); return payload.progress; }
