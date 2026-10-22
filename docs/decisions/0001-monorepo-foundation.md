# ADR 0001: Monorepo foundation

## Status

Accepted

## Context

Koode needs a contribute-friendly TypeScript codebase with shared contracts, bilingual UI from day one, and tests that protect maintainability.

## Decision

- Use **pnpm workspaces + Turborepo**.
- Share types and i18n keys via **`@koode/contracts`** (Zod).
- Ship **`en` and `ml`** locale catalogs with automated parity checks.
- Use **Vitest** for unit and locale tests; stub AI providers in automated tests when AI lands.
- License the project under **Apache License 2.0**.

## Consequences

- Contributors have one install/test path (`pnpm install` / `pnpm test`).
- UI strings cannot ship in English-only without failing CI.
- Next.js and Fastify replace the foundation HTTP shells in later weeks without changing package boundaries.
