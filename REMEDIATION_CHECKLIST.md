# English Coach remediation checklist

Derived from `PROJECT_AUDIT_REPORT.md`. Final approval remains with `PROJECT_AUDITOR_AGENT`.

| Audit ID | Severity | Root cause | Files involved | Fix status | Test added | Verification |
|---|---|---|---|---|---|---|
| A1 | P1 | Repeated generated lesson bodies | `src/data/lessons.ts` | Complete | uniqueness and completeness unit test | PASS |
| A2 | P1 | Hardcoded/non-idempotent progress | `src/main.tsx`, `src/services/storage.ts` | Complete | completion persistence/idempotency E2E | PASS |
| A3 | P1 | Reading accepted every option | `src/main.tsx` | Complete | correct/wrong answer E2E | PASS |
| A4 | P1 | Recorder not stopped on unmount | `src/main.tsx` | Complete | mocked recorder lifecycle E2E | PASS |
| A5 | P2 | Collections not validated or persisted | `src/services/storage.ts` | Complete | full-schema import E2E | PASS |
| A6 | P2 | Static listening controls/transcript | `src/data/lessons.ts`, `src/main.tsx` | Complete | lesson-specific content coverage | PASS |
| A7 | P2 | Fabricated placement skill labels | `src/data/placement.ts`, `src/services/placementScoring.ts`, `src/main.tsx` | Complete | per-skill/boundary unit and E2E tests | PASS |
| A8 | P2 | No persisted vocabulary review model | `src/main.tsx`, `src/services/storage.ts` | Complete | vocabulary review persistence E2E | PASS |
| A9 | P2 | No onboarding | `src/main.tsx`, `src/services/storage.ts` | Complete | onboarding persistence E2E | PASS |
| A10 | P2 | Speech Recognition not wired to UI | `src/services/speechRecognition.ts` | Partial | comparison helper unit test | PASS helper / UI pending |
| A11 | P3 | Lint alias only ran TypeScript | `package.json`, `eslint.config.js` | Complete | real `npm run lint` | PASS |
| A12 | P3 | Preview script absent | `package.json` | Complete | `npm run preview` | PASS |
| A13 | P3 | Export URL leak | `src/main.tsx` | Complete | code-path review | PASS |
| A14 | P3 | Fake settings/reset/dashboard actions | `src/main.tsx` | Complete | settings and navigation E2E | PASS |
| A15 | P3 | No offline fallback and stale cache | `public/sw.js` | Complete | syntax and production asset review | PASS |
| A16 | P3 | No ignore/provenance | `.gitignore` | Complete | repository hygiene review | PASS ignore / Git init pending |
