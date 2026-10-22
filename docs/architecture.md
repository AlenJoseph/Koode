# Architecture (foundation)

Status: early implementation. Product principles and the full agent blueprint live in the root [README.md](../README.md).

## Monorepo layout

| Path | Role |
| --- | --- |
| `apps/web` | Learner UI (foundation shell today; Next.js PWA next) |
| `apps/api` | HTTP API (health today; Fastify + auth next) |
| `packages/contracts` | Shared Zod types and i18n contracts |
| `packages/database` | Drizzle + PostgreSQL (stub) |
| `packages/ai-gateway` | Provider-neutral model gateway (stub) |
| `packages/agent-runtime` | Bounded tutor workflows (stub) |
| `prompts/` | Versioned prompt templates |
| `evaluations/` | Multilingual and safety evaluation assets |

## Locales

Supported locales: `en`, `ml`. Canonical keys are owned by `@koode/contracts`. Catalogs are owned by `@koode/web`.

## Boundaries

- PostgreSQL is the future source of truth for private learner records.
- Agents must not bypass application authorization.
- Observability must not become a raw conversation archive.
