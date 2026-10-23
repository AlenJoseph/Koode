# Testing

Koode uses tests for **maintainability**, not ceremony. CI must stay green on every PR.

## Pyramid

1. **Unit (Vitest)** — Zod helpers, locale parity, budgets/retries (later), tutor state (later).
2. **Integration** — API + Postgres with stub AI (weeks 3–6).
3. **Locale parity** — every canonical key present in `en` and `ml`.
4. **Critical-path E2E (Playwright)** — locale smoke + teacher section → student secret-word join.
5. **AI eval checklist** — multilingual tutor quality; run on prompt/model changes, not as a flaky every-PR gate.

## Commands

```bash
pnpm test           # unit + API integration via Turborepo (not Playwright)
pnpm test:e2e       # Playwright critical path (starts API + web if needed)
pnpm locale:parity  # contracts locale suite
pnpm lint
pnpm typecheck
pnpm build
```

## Coverage

| Area | Location |
| --- | --- |
| Locale parity | `packages/contracts/src/i18n/parity.test.ts` |
| Content manuals | `packages/contracts/src/content.validation.test.ts` |
| Web dictionaries | `apps/web/src/i18n/dictionaries.test.ts` |
| API health / crypto | `apps/api/src/health.test.ts`, `crypto.test.ts` |
| Auth integration | `apps/api/src/auth.integration.test.ts` (needs `DATABASE_URL`) |
| Classroom integration | `apps/api/src/classroom.integration.test.ts` |
| Tutor integration | `apps/api/src/tutor.integration.test.ts` (persist + locales) |
| Privacy retention/redaction | `apps/api/src/E7-S1-retention-redaction.test.ts` |
| Admin learner export/delete | `apps/api/src/E7-S2-admin-learner-export-delete.integration.test.ts` |
| AI gateway / LLM flag | `packages/ai-gateway/src/E8-S1-openai-compatible.test.ts` |
| Content personalization | `packages/agent-runtime/src/personalize.test.ts` |
| Rate limiter | `apps/api/src/lib/rate-limit.test.ts` |
| Playwright E2E | `apps/e2e/tests/E*-S*-*.spec.ts` |

Local database + E2E:

```bash
pnpm db:up
pnpm db:migrate
pnpm build
pnpm --filter @koode/e2e exec playwright install chromium
pnpm test
pnpm test:e2e
```

## Adding a message key

1. Add the key to `packages/contracts/src/i18n/message-keys.ts`.
2. Add translations to `apps/web/locales/en/common.json` and `apps/web/locales/ml/common.json`.
3. Run `pnpm locale:parity`.

## Story gate (from epics)

Each story keeps its own Vitest file and/or Playwright spec named after the story id. Suites must not depend on another story’s e2e having run first. See [`epics-v1.md`](./epics-v1.md).
