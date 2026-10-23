# Architecture (foundation)

Status: early implementation. Product principles and the full agent blueprint live in the root [README.md](../README.md).

## Monorepo layout

| Path | Role |
| --- | --- |
| `apps/web` | Next.js PWA shell (`en` / `ml`) with magic-link sign-in UI |
| `apps/api` | Fastify API: health, magic-link auth, session cookies |
| `packages/contracts` | Shared Zod types, auth schemas, and i18n contracts |
| `packages/database` | Drizzle schema + migrations (users, profiles, consent, sessions) |
| `packages/ai-gateway` | Model-agnostic gateway (`ModelAdapter`) + stub / OpenAI-compatible adapters |
| `packages/agent-runtime` | Bounded tutor workflow with Zod-validated turns |
| `prompts/` | Versioned prompt templates |
| `evaluations/` | Multilingual and safety evaluation assets |

## Locales

Supported locales: `en`, `ml`. Canonical keys are owned by `@koode/contracts`. Catalogs are owned by `@koode/web`.

## Model-agnostic AI

Application code depends on `ModelAdapter` / `AiGateway` only. Swap providers with env:

- `AI_PROVIDER=stub` (default, tests and offline)
- `AI_PROVIDER=openai-compatible` + `AI_BASE_URL` + `AI_MODEL` (+ optional `AI_API_KEY`)

## Boundaries

- PostgreSQL is the source of truth for private learner records.
- Agents must not bypass application authorization.
- Tutor outputs are schema-validated before they reach the client.
- Tutor evidence stores **hashed** learner messages, not raw chat text.
- Observability must not become a raw conversation archive (Pino redacts email/token/learnerMessage).
- In-memory rate limits protect magic-link and tutor routes (swap to Redis later if multi-instance).

