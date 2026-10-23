# Solutions to triple-review gaps (P0/P1)

Implemented against the software / PM / investor review. Email/deploy remain ops decisions.

## P0 — shipped in code

| Gap | Solution |
| --- | --- |
| Trusted client `payload.correct` | Auto-help only counts `QUIZ_ANSWERED` with `graded: true`. Server emits those after quiz submit. Client pre-grade fails removed. |
| No rate limit on events | Per-user `MemoryRateLimiter` on `POST /learning/events` (default 120/min). |
| Awkward quiz retry | Attempt stays `in_progress` until **passed**. UI allows try-again. `correctOptionId` omitted from fail responses. |
| Idle never shows in demos | Default `AUTO_HELP_IDLE_MS=15000`; `GET /learning/config` drives the lesson idle timer. |
| Answer leakage into Copilot | Copilot strips `chosen` / `correct` / `correctOptionId` / raw question text from facts before the model prompt. |

## P1 — shipped in code

| Gap | Solution |
| --- | --- |
| Dead `hint_then_fail` | Lesson quiz **Hint** button → `QUIZ_HINT_REQUESTED`. |
| Dead `PATHWAY_ENROLLED` | Server emits on enroll. |
| Idle config unused | Wired through config → learning events service + `/learning/config`. |
| Nudge audit timing | `AUTO_HELP_NUDGE_SHOWN` when nudge state appears (not only on open). |

## Still ops / product (not code this round)

| Gap | Recommended solution |
| --- | --- |
| No real email | Keep `MAGIC_LINK_DEV_MODE=true` for local/demo. For school pilot: add Resend/SES behind `MagicLinkMailer` and set `MAGIC_LINK_DEV_MODE=false` + `COOKIE_SECURE=true`. Do not flip the flag without a sender. |
| Deploy / ToS | Hosted Postgres + API + web; checklist in `docs/pilot.md`. |
| Coins only on perfect | Keep for integrity. Optional later: separate “effort streak” badge, never buy certificates. |
| Privacy export | Add `learning_events` + `coin_ledger` to admin export/delete; document retention in `docs/privacy.md`. |
| Pilot e2e coverage | Extend `PILOT-end-to-end` with lesson → fail → nudge → pass → shop. |

## Env knobs

```bash
AUTO_HELP_ENABLED=true
AUTO_HELP_IDLE_MS=15000          # demos; use 90000 in long classrooms if desired
AUTO_HELP_FAIL_STREAK=2
RATE_LIMIT_EVENTS_MAX=120
RATE_LIMIT_EVENTS_WINDOW_MS=60000
```
