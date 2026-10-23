# Architecture (foundation)

Status: early implementation. Product principles and the full agent blueprint live in the root [README.md](../README.md).

## Monorepo layout

| Path                     | Role                                                                        |
| ------------------------ | --------------------------------------------------------------------------- |
| `apps/web`               | Next.js PWA shell (`en` / `ml`) with magic-link sign-in UI                  |
| `apps/api`               | Fastify API: auth, classroom, learning loop, admin, tutor                   |
| `apps/landing`           | Public SEO marketing site                                                   |
| `apps/docs`              | Docs site (reads `docs/*.md`)                                               |
| `apps/e2e`               | Playwright story suites (`E*-S*-*.spec.ts`)                                 |
| `packages/contracts`     | Shared Zod types (auth, tutor, content manuals, i18n)                       |
| `packages/database`      | Drizzle schema + migrations                                                 |
| `packages/ai-gateway`    | Model-agnostic gateway (`ModelAdapter`) + stub / OpenAI-compatible adapters |
| `packages/agent-runtime` | Tutor workflow + content personalization                                    |
| `content/`               | JSON pathway/challenge manuals (contributor-friendly)                       |
| `docs/`                  | Architecture, requirements, epics, privacy, testing                         |
| `prompts/`               | Versioned prompt templates                                                  |
| `evaluations/`           | Multilingual and safety evaluation assets                                   |

## Locales

Supported locales: `en`, `ml`. Canonical keys are owned by `@koode/contracts`. Catalogs are owned by `@koode/web`.

## Model-agnostic AI

Application code depends on `ModelAdapter` / `AiGateway` only. Swap providers with env:

- `AI_PROVIDER=stub` (default, tests and offline)
- `AI_PROVIDER=openai-compatible` + `AI_BASE_URL` + `AI_MODEL` (+ optional `AI_API_KEY`)

Demo checklist: [`demo-llm.md`](./demo-llm.md).

### Per-child personalization (E8-S2)

Tutor turns may include `contentPathwayId`, `contentChallengeId`, `paceBand`, `localContext`, and `interests`.  
The runtime loads `content/pathways/.../challenges/*.json`, fills `llm.personalizeTemplate`, and appends pace-band coach notes.  
Quiz `correctOptionId` and objectives are **locked** — the model may rephrase examples, not rewrite the curriculum answer key.

`CONTENT_ROOT` overrides the manuals path (defaults to repo `content/`).

## Identity

- One **user** account; emails live in **`user_emails`** (GitHub-style, globally unique, one primary).
- Roles: `teacher` (classroom), `learner` (independent email), `student` (roster / section code).
- Magic-link `intent` is `teacher` or `learner` (stored on the token).
- Classroom students may have zero emails until they claim/link (E1 later stories).


## Classroom auth (Code.org-inspired)

- **Teachers** use email magic-link accounts (`role=teacher`).
- **Students** join with a 6-character **section code** → pick display name → **secret words** (no email).
- Teachers create sections, add roster names, and receive secret words once for login cards.
- Sessions are still DB-backed cookies for both roles.


## Boundaries

- PostgreSQL is the source of truth for private learner records.
- Agents must not bypass application authorization.
- Tutor outputs are schema-validated before they reach the client.
- Tutor evidence stores **hashed** learner messages, not raw chat text.
- Observability must not become a raw conversation archive (Pino redacts email/token/learnerMessage/secretWords).
- In-memory rate limits protect magic-link, student sign-in, and tutor routes (swap to Redis later if multi-instance).
- Admin can export/delete **learner/student** accounts (`/admin/learners/:id`); see [`privacy.md`](./privacy.md).
- Independent sign-up is gated for ages **13–18** (no under-13 path).

## Epic status

v1 epics E1–E8 are implemented; track story status in [`epics-v1.md`](./epics-v1.md).
