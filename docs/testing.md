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

## Foundation coverage (this milestone)

| Area | Location |
| --- | --- |
| Locale parity | `packages/contracts/src/i18n/parity.test.ts` |
| Web i18n loaders | `apps/web/src/i18n.test.ts` |
| API health | `apps/api/src/health.test.ts` |

## Adding a message key

1. Add the key to `packages/contracts/src/i18n/message-keys.ts`.
2. Add translations to `apps/web/locales/en/common.json` and `apps/web/locales/ml/common.json`.
3. Run `pnpm locale:parity`.
