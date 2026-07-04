# End-to-end tests (Playwright)

Playwright specs documenting the InvestaLens **v2.1.0** milestone flows.

## What's covered

| Spec | Documents |
| --- | --- |
| `auth.spec.ts` | Register, sign in, sign out; sign-in lands on `/portfolio`; Google button on login only. |
| `api-security.spec.ts` | Unauthenticated `POST /api/v1/chat` & `/api/v1/ai-import` → 401; `X-RateLimit-*` headers (100/min); CSV formula-injection neutralised. |
| `portfolio.spec.ts` | Create a portfolio, add a holding, add a transaction, see it in the table. |
| `sharing.spec.ts` | Share a portfolio read-only; recipient sees a "Shared" badge and no mutation controls. |
| `labels-groups.spec.ts` | Create/attach a label and filter Performance by it; create a custom group + category, assign an instrument, group Performance/Diversity by it. |
| `cgt.spec.ts` | Toggle "Optimise" on the CGT report → sale-allocation method comparison with the optimal method flagged. |
| `import.spec.ts` | Quick-import broker buttons (incl. CMC Markets); guided wizard Upload → Configure → Map → Review. |
| `a11y.spec.ts` | Mobile hamburger opens the nav Sheet; distinct per-route `<title>`; skip-to-content link; instrument search `role=combobox`. |

`global-setup.ts` registers (or reuses) a primary test user through the real
`/register` UI and saves the session to `e2e/.auth/user.json` (git-ignored).
It runs as the `setup` project that every browser project depends on, so the
authenticated specs start logged in.

## Prerequisites

The suite drives the **real application against a real database** — there are
no mocks. To run it you need:

1. **A built app.** `npm run build` (Prisma generate + Next build), then the
   suite's `webServer` runs `npm run start` on port 3000.
2. **A reachable Postgres database** with the Prisma schema migrated
   (`DATABASE_URL` set, plus NextAuth env such as `AUTH_SECRET`). Registration,
   sharing and CGT all read/write the DB.
3. **Playwright browsers installed:** `npx playwright install`.

Without a built app + DB the `setup` project fails fast with a clear message —
that is expected in a bare dev environment and simply means the suite can't run
there.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `E2E_BASE_URL` | Test against an already-running instance (e.g. a preview deployment). When **set**, the local `webServer` is not started. Defaults to `http://localhost:3000`. |
| `E2E_API_TOKEN` | A v1 API bearer token (Settings → API Tokens). Enables the authenticated API rate-limit / CSV-export checks in `api-security.spec.ts`; those cases **skip** if it's unset. |
| `E2E_PORTFOLIO_ID` | A portfolio id owned by the API token's user, for the live CSV-export check (optional). |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` / `E2E_USER_NAME` | Override the primary test-user credentials (useful against a shared DB). |

## Running

```bash
# One-time
npm run build
npx playwright install

# Run everything (boots npm run start automatically)
npm run test:e2e

# Against an already-running instance
E2E_BASE_URL=https://staging.example.com npm run test:e2e

# Just list the discovered tests (no server needed)
npx playwright test --list
```

Projects: `chromium`, `firefox`, `webkit`, and `Mobile Chrome` (Pixel 5, for the
mobile-nav spec). All depend on the `setup` project for authentication.
