# Testing

Koode uses tests for **maintainability**, not ceremony. CI must stay green on every PR.

## Pyramid

1. **Unit (Vitest)** — Zod helpers, locale parity, budgets/retries (later), tutor state (later).
2. **Integration** — API + Postgres with stub AI (weeks 3–6).
3. **Locale parity** — every canonical key present in `en` and `ml`.
4. **Critical-path smoke** — sign-in → locale switch → challenge (later).
5. **AI eval checklist** — multilingual tutor quality; run on prompt/model changes, not as a flaky every-PR gate.

## Commands

```bash
pnpm test           # all package tests via Turborepo
pnpm locale:parity  # contracts locale suite
pnpm lint
pnpm typecheck
pnpm build
```

## Coverage (weeks 3–4)

| Area | Location |
| --- | --- |
| Locale parity | `packages/contracts/src/i18n/parity.test.ts` |
| Web dictionaries | `apps/web/src/i18n/dictionaries.test.ts` |
| API health / crypto | `apps/api/src/health.test.ts`, `crypto.test.ts` |
| Auth integration | `apps/api/src/auth.integration.test.ts` (needs `DATABASE_URL`) |
| Tutor integration | `apps/api/src/tutor.integration.test.ts` (persist + locales) |
| Rate limiter | `apps/api/src/lib/rate-limit.test.ts` |

Local database:

```bash
pnpm db:up
pnpm db:migrate
DATABASE_URL=postgres://koode:koode@localhost:5433/koode pnpm test
```

## Adding a message key

1. Add the key to `packages/contracts/src/i18n/message-keys.ts`.
2. Add translations to `apps/web/locales/en/common.json` and `apps/web/locales/ml/common.json`.
3. Run `pnpm locale:parity`.
