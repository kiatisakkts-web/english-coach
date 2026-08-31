import { describe, expect, it } from 'vitest';
import { compareSpeech } from './services/speechRecognition';

describe('speech match scoring', () => { it('scores matching words case-insensitively without claiming phoneme accuracy', () => { expect(compareSpeech('Could I have coffee please', 'could i have tea please').percentage).toBe(80); }); it('returns zero for empty or unrelated speech', () => { expect(compareSpeech('say this sentence', '').percentage).toBe(0); }); });
