# Validation status & what else is needed

Validated against [`requirements-v1.md`](./requirements-v1.md) and [`epics-v1.md`](./epics-v1.md).  
Updated after **pre-pilot P0 + P1 polish** land (2026-10-23).

**Verdict:** v1 is pre-pilot ready. Playwright gate: `pnpm test:e2e:pilot` (3) and full `pnpm test:e2e` (45) green. Remaining work is legal review, scheduled ops, and v1.1+ product.

---

## 1. Epic status

E0–E10 remain `done`. See [`epics-v1.md`](./epics-v1.md).

---

## 2. P0 / P1 completion (this pass)

| Item | Status |
| --- | --- |
| API age confirmation on learner magic-link | Done (`ageConfirmed: true` required; consent `age_13_plus_confirmed`) |
| Class size race hardened | Done (`SELECT … FOR UPDATE` on section before roster count) |
| Re-add student identity continuity | Done (soft `removedAt`; same display name revives same user) |
| Age consent record | Done on new learner accounts |
| Landing CTAs aligned with app | Done (student / join primary; teacher secondary) |
| Admin ≠ teacher shell | Done (admin → `/admin` only; no classroom CTAs) |
| Learner-only learning/tutor mutations | Done (`requireLearnerSide`; catalog GET still any auth) |
| Tutor unsigned → sign-up | Done earlier |
| Dictionary teacher-only string | Done (`auth.teacherOnlyHint`) |
| Nav flash while session pending | Done (hold nav until `fetchMe`) |
| Fail-closed unknown role | Done (`asSessionRole` throws) |

---

## 3. Still out of scope / later

| Gap | Bucket |
| --- | --- |
| External legal review of consent / ToS copy | Legal (not engineering) |
| Scheduled tutor-turn purge (cron) | Ops — CLI exists: `pnpm db:purge-tutor-turns` |
| Google sign-in | v1.1 |
| Full ml UI + voice | v1.1 |
| Parents / school admin org | v2 |
| Offline PWA | later |
| Playwright for E4-S1 / E4-S4 | optional test completeness |
| Production AWS deploy + secrets hygiene | ops |

---

## 4. Demo script

`pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev`

| Role | Path |
| --- | --- |
| Learner | `/en/sign-up` (age checkbox) → pathways → quiz → progress / tutor |
| Classroom | Teacher section → `/en/join` |
| Teacher | Quiet `/en/sign-in` → classroom → insights |
| Admin | Bootstrap → `/en/admin` |
| Landing | `:3002` learner-first CTAs |

Health: `aiAdapter=stub` unless live LLM env ([`demo-llm.md`](./demo-llm.md)).
