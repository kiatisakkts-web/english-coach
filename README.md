# English Coach

English Coach is a local-first English practice app for Thai learners at A1–B2. It focuses on short, repeatable Listening, Speaking, Reading, and Vocabulary practice.

## Features

- Dashboard with streak, XP, daily goal, skill balance, and continue-learning flow
- Lesson library with A1–B2 filters and 30 complete original lessons (8 A1, 8 A2, 8 B1, 6 B2)
- Listening lesson with browser Text-to-Speech, play/replay controls, transcript toggle, Thai translation, speaking prompt, and quick quiz
- Speaking Studio with Repeat After Me, real MediaRecorder capture, playable recordings, stop/delete/re-record controls, and graceful browser fallback
- 28-question progressive Placement Test with Estimated English Level results
- Vocabulary bank with Thai meaning, examples, pronunciation playback, mastery indicators, and review actions
- Progress analytics and settings for daily goal, voice, translations, sound, export, and reset messaging
- Progress persists in IndexedDB through Dexie, with idempotent migration from legacy `localStorage` keys
- Responsive mobile, tablet, and desktop layouts

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Testing

Run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`, and `npm run build`. Playwright Chromium covers app start, the 30-lesson library, lesson completion and refresh persistence, placement test completion, microphone fallback, and settings persistence.

## Browser notes

Text-to-Speech uses the browser Speech Synthesis API and falls back with a user-friendly message when unavailable. Microphone recording uses `getUserMedia()` and `MediaRecorder`; permission denial, missing hardware, unsupported browsers, and recording errors are handled with friendly messages. Speech Recognition is optional, and any Speech Match Score is an approximate word comparison rather than phoneme-level assessment.

## Storage and backup

Progress is stored in IndexedDB (`english-coach`, `progress` table) using Dexie. On first launch, legacy `english-coach-progress`, `ec-xp`, `ec-goal`, and `ec-minutes` values are migrated only if no IndexedDB record exists, then marked with `ec-data-migrated=2`. If IndexedDB is blocked, saving falls back to legacy local keys. Settings includes Export JSON and validated Import JSON actions. Imports require schema version 2 and valid numeric progress fields; malformed or incompatible files are rejected without changing stored data.

## Architecture

The current compact implementation uses React + TypeScript + Vite, Dexie, Lucide, Vitest, and Playwright. Typed content lives in `src/data/lessons.ts` and is validated at module load. Placement content lives in `src/data/placement.ts`; persistence lives in `src/services/storage.ts`; views are composed in `src/main.tsx` and styled in `src/styles.css`.

## Roadmap

MediaRecorder is the supported speaking capture path. A tested Speech Recognition comparison helper is included for future UI wiring; physical speech recognition remains browser-dependent and is not required for recording practice. Speech features may depend on browser/OS services and microphone permissions. The app stores profile, settings, progress, lesson completion, vocabulary reviews, placement, and daily activity locally. JSON export/import uses schema version 3 and validates the complete supported payload.
