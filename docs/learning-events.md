# Learning events (Phase A)

Itza-inspired activity catalog for Koode. **Postgres append-only log + in-API auto-help** — no Kafka/Flink required for `pnpm dev` or CI.

## Envelope

Every fact shares:

| Field | Role |
| --- | --- |
| `eventId` | UUID idempotency key |
| `eventType` | Catalog discriminator |
| `learnerId` | Partition key (set by server from session) |
| `pathwayId` / `contentId` / `stepId` | Context |
| `occurredAt` | Event time (ISO) |
| `payload` | Type-specific object |

Kafka-ready: same shape can publish to topic `learning.events` keyed by `learnerId` later without rewriting product logic.

## Ingest

- `POST /learning/events` — batch 1–50 events (`requireLearnerSide`)
- `GET /learning/events` — recent facts (optional filters)
- `GET /learning/auto-help` — last soft nudge for a scope

Response may include `{ nudge }` when rules fire (fail streak, hint+fail, seek thrash, idle, concept flagged).

**Trust:** only server-emitted `QUIZ_ANSWERED` with `payload.graded: true` count toward fail streaks. Client forgeries are ignored.

**Rate limit:** `POST /learning/events` is per-learner limited (`RATE_LIMIT_EVENTS_*`).

**Idle:** `GET /learning/config` exposes `autoHelpIdleMs` (default 15s for demos).

Fixes from review: [`review-solutions.md`](./review-solutions.md).

## Catalog

See `@koode/contracts` `learningEventTypeSchema` — pathway/session, video, slide, quiz, challenge/step, struggle/copilot, nudge audit.

## Coins

Koode coins and certificates are **derived from successCriteria evidence** (full quiz correct), never from `VIDEO_PROGRESS` or help events.

## Later

- Phase B: outbox → queue for delayed multi-device nudges  
- Phase C: Kafka + Flink when multi-service / district scale  
