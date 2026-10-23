# Privacy

Koode is built for school-age learners (13–18). This document is the product source of truth for data classification, redaction, retention defaults, and deletion. Marketing pages must not invent stronger claims than what is written here.

## Age

- Independent learner sign-up states that Koode is for ages **13–18**.
- There is **no under-13 sign-up path** in the product UI.
- Learner magic-link requests require `ageConfirmed: true`; the API rejects learner sign-up without it and records `age_13_plus_confirmed` consent on new learner accounts.
- Classroom students may join via section code without email; teachers remain accountable for local school policy.

## Data classification

| Class | Examples | Rules |
| --- | --- | --- |
| **Account** | User id, role, emails, sessions | Postgres source of truth; admin export/delete for learners |
| **Learning evidence** | Pathway enrollments, challenge attempts, projects | Tied to user; deleted with account |
| **Tutor evidence** | Validated tutor reply + **hashed** learner message | Never store raw learner chat text in `tutor_turns` |
| **Secrets** | Magic-link tokens, session cookies, secret words, bootstrap secret | Hashed or one-time display; redacted from logs |
| **Operational logs** | Request ids, adapter id, phase | No raw emails, tokens, or learner messages |

## Redaction (logs)

API Pino redacts and **removes** these request fields/headers:

- `req.headers.authorization`
- `req.headers.cookie`
- `req.body.email`
- `req.body.token`
- `req.body.learnerMessage`
- `req.body.devToken`
- `req.body.secretWords`
- `req.body.bootstrapSecret`

Tutor route logs metadata only (`userId`, `adapterId`, `phase`) — not message bodies.

Config + checklist tests live in `apps/api/src/E7-S1-retention-redaction.test.ts`.

## Retention defaults (v1)

These are **product defaults** until a school contract says otherwise. Retention windows are config-enforced; tutor-turn purge is a **manual CLI** today (`pnpm db:purge-tutor-turns`), not a scheduled job.

| Data | Default retention | Notes |
| --- | --- | --- |
| Session cookies | 14 days | `sessionTtlMs` |
| Magic-link tokens | 15 minutes | `magicLinkTtlMs` |
| Tutor turns | 365 days (config) | `tutorTurnRetentionDays`; run `pnpm db:purge-tutor-turns` (cron TBD) |
| Learning records | Until account delete / export | Cascade on user delete |
| Consent stubs | Until account delete | Types are stubs until legal review |

Env override: `TUTOR_TURN_RETENTION_DAYS` (positive int, default `365`).

## Export & deletion (admin)

Platform admin can:

1. **Export** a learner/student record as JSON (emails, profile, enrollment/attempt/project counts, tutor turn metadata — **no** raw learner messages, **no** secret hashes).
2. **Delete** that user account; dependent rows cascade via FK `ON DELETE CASCADE`.

Teachers and admins are **not** deletable through this learner endpoint (403). Routes: `GET /admin/learners/:userId/export`, `DELETE /admin/learners/:userId`.

## Third-party models

- Default provider in CI and local is **`AI_PROVIDER=stub`** (no external calls).
- Live OpenAI-compatible path is opt-in (`AI_PROVIDER=openai-compatible`). Do **not** send identifiable child PII in prompts without a reviewed DPA and school agreement.
- Content personalization rewrites examples and pace; it must not change quiz `correctOptionId` or learning objectives.

## Synthetic fixtures

Repository tests and demos use synthetic emails and names only. Do not commit real student data.
