# Contributing to Koode

Thanks for helping build open, learner-centered tools. This guide keeps the codebase maintainable and safe for contribution.

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm db:migrate
pnpm build
pnpm test
pnpm dev   # Next.js :3000 + Fastify :3001
```

Requirements: Node.js 22+, pnpm 10+, Docker (for local Postgres).

## Before you write code

1. Open an issue for substantial changes.
2. Keep PRs focused and small when possible.
3. Prefer clear names and small modules over clever abstractions.

## Tests (required for behavior changes)

| Layer | Command | Purpose |
| --- | --- | --- |
| Unit / locale parity | `pnpm test` | Pure logic, i18n keys, API integration |
| Critical-path E2E | `pnpm test:e2e` | Playwright: locales + classroom join |
| Locale gate | `pnpm locale:parity` | `en` and `ml` catalogs match canonical keys |
| Lint / types | `pnpm lint` · `pnpm typecheck` | Style and TypeScript |

Rules:

1. Behavior change → add or update a test in the same PR.
2. Use synthetic fixtures only. Never commit real student data.
3. Agents and LLM calls must use a **stub provider** in automated tests (when AI lands). Real API keys are for optional local demos only.
4. Locale PRs must update **both** `en` and `ml`, or add a new locale folder plus CI coverage.
5. Do not chase 100% coverage; protect authz, budgets, evidence writes, and i18n.

See [docs/testing.md](docs/testing.md).

## Locales

Canonical keys live in [`packages/contracts/src/i18n/message-keys.ts`](packages/contracts/src/i18n/message-keys.ts).  
Catalogs live in [`apps/web/locales/{en,ml}/common.json`](apps/web/locales).

```bash
pnpm locale:parity
```

## Code style

- TypeScript strict mode
- ESLint + Prettier (`pnpm format`)
- No hardcoded learner-facing English in UI — use message keys

## Security and safeguarding

- Never commit secrets, `.env` files with keys, or private conversations.
- Koode may serve minors in the future; treat privacy and safeguarding docs as requirements, not optional polish.

## License

By contributing, you agree that your contributions are licensed under the Apache License 2.0.
