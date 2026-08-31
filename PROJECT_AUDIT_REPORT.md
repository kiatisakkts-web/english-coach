# PROJECT AUDIT REPORT

## Scope and method

Independent read-only audit of the English Coach v1.0.0 repository and built application. Prior acceptance claims were not treated as evidence. Reviewed source, data, persistence, PWA assets, tests, documentation, dependency audit, development runtime, and production preview. No production code was changed during this audit.

The workspace is not a Git checkout, so commit history, branch state, and diff-based provenance could not be independently verified.

## Executive verdict

**FINAL SOFTWARE VERDICT: NOT READY**

The build and automated gates are green, and the primary shell is usable, but the implementation does not meet the stated feature-complete release contract. Several screens present static or generic values as learner data, the lesson pack is generated from repeated content, incorrect reading answers are accepted, and recorder cleanup is incomplete on unmount. Import safely accepts the current minimal schema but does not restore the declared learning collections.

## Verification summary

| Area | Result | Evidence |
|---|---|---|
| Build | PASS | `npm run build`; Vite production bundle generated |
| Typecheck | PASS | `npm run typecheck` |
| Lint | PASS* | `npm run lint` passes, but the script is only TypeScript compilation; no ESLint configuration/script exists |
| Unit tests | PASS | 2 tests in 1 file |
| E2E tests | PASS | 8 Playwright tests |
| Dependency audit | PASS | `npm install`; 0 reported vulnerabilities |
| Production preview | PASS with tooling gap | `npx vite preview` served the built app; `npm run preview` fails because the script is absent |
| Browser console | PASS | No warning/error entries observed on production load |
| PWA assets | PASS | Manifest, service worker, and SVG icon each returned HTTP 200 |
| Git/provenance | NOT VERIFIABLE | No `.git` directory in the workspace |

## Responsive matrix

No horizontal overflow was measured on the rendered screens at the required viewport sizes. The application uses a mobile navigation treatment and content stayed within the available document width.

| Viewport | Result |
|---|---|
| 375x667 | PASS |
| 390x844 | PASS |
| 430x932 | PASS |
| 768x1024 | PASS |
| 820x1180 | PASS |
| 1366x768 | PASS |
| 1440x900 | PASS |

The browser harness encountered strict-locator ambiguity when targeting labels such as “Learn” and “Practice” because other buttons contain those words; this is an audit-harness targeting issue, not a recorded application overflow defect. The visual shell and remaining critical screens were inspected at each size.

## Findings

### P1 — Release blockers

1. **Core learning data is not genuinely implemented.** `src/data/lessons.ts` generates all 30 lessons from one generic dialogue, one generic reading passage, three repeated vocabulary entries, and one templated question. The count and structural validator pass, but the content is not a complete 30-lesson learning pack as represented by the product copy. This affects Learn, Listening, Reading, Speaking, and Vocabulary quality.

2. **Progress is materially misrepresented and can be corrupted by normal navigation.** `src/main.tsx` hardcodes the streak to 7 and dashboard best streak to 14; skill percentages, completion totals, and mastered-word totals are static. Opening a lesson immediately adds two minutes, and completing a lesson always adds 25 XP without lesson completion/idempotency tracking. The initial save effect can race the asynchronous IndexedDB load and write default state before an existing record is loaded.

3. **Reading answer validation is incorrect.** `src/main.tsx` marks the comprehension state as answered for both the correct and “A completely different idea” buttons. The explanation is shown regardless of correctness, so an incorrect answer is accepted as successful.

4. **Recorder unmount lifecycle is incomplete.** The MediaRecorder implementation stops tracks and revokes Blob URLs in normal stop/delete paths, but unmount cleanup does not stop an active `MediaRecorder` or finalize its pending data. Navigating away while recording can leave the recorder lifecycle unresolved and can lose the recording. Automated coverage uses a `FakeRecorder`, so this defect is not exercised.

### P2 — Significant compliance gaps

5. **Import is safe but only partially restorative.** JSON parsing is guarded and schema version 2 is rejected when incompatible. However, runtime validation only validates a subset of `progress`; `profile`, `settings`, `vocabulary`, `review`, and `recentActivity` shapes are not validated, and `importProgress()` stores only the single progress record. The export function currently emits empty arrays for the declared learning collections. Therefore the stated full-data import/export contract is not met.

6. **Listening is a UI simulation rather than lesson audio.** Playback invokes browser TTS for one hardcoded sentence. The visible speed control is static, previous/next sentence controls are absent, and the transcript contains the same two café lines for every lesson.

7. **Placement scoring is coarse and partly fabricated.** The test has 28 questions and a total score, but no adaptive path or real per-skill scoring. Result skill labels are hardcoded (“Good”, “Growing”), and the listening section is text multiple-choice rather than audio listening. In-progress placement state is not persisted.

8. **Vocabulary review is not a learning data system.** Vocabulary is a hardcoded five-word surface. Add/review actions do not persist vocabulary or produce spaced-repetition/review records, despite the dashboard and export schema presenting review data.

9. **Onboarding is absent.** The navigation starts directly at a pre-populated learner named Mali with a default A2 profile. No first-run onboarding flow or profile setup was found.

10. **Speech recognition is not implemented.** The UI explains a future “Speech Match Score”, but no Speech Recognition integration or fallback scoring path exists. TTS fallback and MediaRecorder fallback messaging are present.

### P3 — Release hygiene and maintainability

11. `npm run lint` is an alias for `tsc`; there is no actual lint tool or lint configuration.

12. `npm run preview` is missing, although production preview can be run directly with Vite.

13. Export creates a Blob URL without revoking it after download.

14. Reset progress is a toast-only no-op, settings switches and voice selection are non-functional, and the “View progress”/“Start review” dashboard actions do not navigate.

15. Service-worker fetch handling has no offline failure fallback, and the cache version is fixed at `english-coach-v1`.

16. The workspace has no `.gitignore`; Git-based release traceability is unavailable because the workspace itself is not a repository.

## Import/export acceptance results

- Valid current-schema JSON: **PASS** — accepted, success feedback shown, progress record written.
- Malformed JSON: **PASS** — safely rejected with user-friendly feedback.
- Incompatible schema/structure: **PARTIAL** — current schema version and core numeric fields are checked, but nested collection structure is not validated.
- Reload after import: **PASS for the single progress record** — persisted XP/goal/minutes were exercised by E2E.
- Full declared data restoration: **FAIL** — profile/settings/vocabulary/review/recent activity are not stored/restored as declared.
- Export → import round trip: **PARTIAL/FAIL for full contract** — the minimal progress subset round-trips; declared collections are empty and do not round-trip learner records.

## MediaRecorder acceptance

**AUTOMATED MEDIARECORDER: PASS** for the mocked record → stop → playback → delete flow (one Playwright test).

**REAL HARDWARE ACCEPTANCE: USER VERIFICATION REQUIRED.** Physical microphone access was not performed in this audit environment; no hardware PASS is claimed.

30-second user checklist:

1. Open the production app on a secure origin and select Practice.
2. Click “Record my voice” and grant microphone permission.
3. Speak the target sentence for about 5 seconds; click “Stop recording”.
4. Confirm an audio player appears and plays the recording.
5. Delete it and confirm the player disappears.
6. Record a second clip, navigate away and back, and confirm no microphone remains active and the UI is usable.

## Accessibility and security observations

The primary controls have accessible names and the toast uses `role="status"`. Keyboard-only traversal, focus restoration, reduced-motion behavior, contrast, and screen-reader semantics were not fully certified by automated tests. Local-only IndexedDB/localStorage storage is an appropriate privacy posture for this build; no secrets or backend credentials were found in the scanned source. Imported JSON is parsed under a guarded handler and is not injected as HTML.

## Test adequacy

The 8 E2E tests are useful smoke coverage but do not prove the stated release scope. The 2 unit tests cover lesson count/shape and a trivial normalizer. Missing automated coverage includes migration edge cases, zero-valued data, import nested-schema validation, full export/import collections, placement boundaries and skill scoring, reading wrong-answer behavior, duplicate lesson completion, streak/date logic, and active-recorder unmount cleanup.

## Required remediation before release

1. Replace generated duplicate lesson bodies with verified lesson-specific content, or explicitly narrow the product claim.
2. Make progress event-driven and idempotent; remove hardcoded learner metrics and eliminate the load/save race.
3. Correct reading answer state and add assertions for wrong answers.
4. Stop/finalize MediaRecorder on unmount and add a lifecycle test.
5. Define and validate the import schema for every supported collection, persist those collections, and prove a full round trip after reload.
6. Either implement or remove claims for onboarding, real listening controls/audio, vocabulary review/SRS, and speech recognition.
7. Add a real lint command and a `preview` script for repeatable release verification.

## Final status

**Known Critical Bugs:** generic/repeated lesson content; fabricated/non-idempotent progress; incorrect reading acceptance; incomplete active-recorder cleanup; incomplete full-data import/export.

**Known Non-Critical Limitations:** no physical microphone verification in this environment; no Git provenance; no actual lint tool; static/non-functional secondary settings and dashboard actions; limited offline service-worker fallback; absent speech recognition.

**REMAINING SOFTWARE WORK:** Required — the P1 and P2 remediation items above.

