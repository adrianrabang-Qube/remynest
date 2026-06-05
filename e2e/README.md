# E2E Security Tests (Playwright) — Phase 1

Manual-QA companion automation. **Scope is limited to 3 P0 security/isolation flows.**
These tests never modify application code, billing, or database schema.

## Tests

| Spec | Flow | Auth | Seed data |
|---|---|---|---|
| `auth-gate.spec.ts` | Authentication Gate Protection | none | none — always runs |
| `profile-isolation.spec.ts` | Profile Switching Data Isolation | owner | `E2E_FOREIGN_PROFILE_ID` |
| `caregiver-idor.spec.ts` | Caregiver IDOR Protection | caregiver | `E2E_FOREIGN_PROFILE_ID` / `E2E_FOREIGN_MEMORY_ID` |

Tests 2 & 3 **self-skip** when their env vars are absent, so a bare run only
executes the auth-gate checks.

## Setup

```bash
# one-time: install the browser binary
npx playwright install chromium

# configure dedicated TEST accounts (never real users)
cp .env.test.example .env.test   # then fill in values
```

## Run

```bash
# loads .env.test automatically via dotenv if you export it, e.g.:
set -a && source .env.test && set +a
npm run test:e2e          # headless
npm run test:e2e:ui       # interactive UI mode
```

By default Playwright starts the local dev server (`npm run dev`). Set
`E2E_BASE_URL` to run against a deployed environment instead.

## Notes

- The caregiver direct-URL check accepts a hard deny (401/403/404) or a 200 shell
  that renders no foreign content. If the detail page is client-rendered, confirm
  the empty/not-found state manually as well.
- `.auth/`, `test-results/`, and `playwright-report/` are git-ignored artifacts.
