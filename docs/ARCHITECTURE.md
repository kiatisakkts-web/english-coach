# Architecture

English Coach is a React/Vite local-first single-page app. The app shell owns navigation and shared session state; feature views own their interaction state. Browser speech and microphone capabilities are optional and report graceful fallbacks. Canonical learning state is persisted in the Dexie `english-coach` database.

The database uses `progress`, `profile`, `settings`, `lessonProgress`, `vocabulary`, `reviews`, `placement`, and `dailyActivity` tables. Export schema version 3 contains these supported collections and import replaces them transactionally after runtime validation. Lesson records are validated for complete, unique content. MediaRecorder owns a stream and recorder ref; stop, delete, replacement, and unmount cleanup stop tracks and revoke Blob URLs. Placement results use the canonical placement record and deterministic per-skill scoring.
