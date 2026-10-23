# Validation status & what else is needed

Validated against [`requirements-v1.md`](./requirements-v1.md) and [`epics-v1.md`](./epics-v1.md) (2026-10-23).  
Scope: API authz, classroom, learning/quiz, tutor, insights, admin, web role UX, content manuals, e2e coverage.

**Verdict:** E0–E10 logic is largely correct and demo-ready for investors/internal school demos. Not yet school-pilot legal-ready. Gaps below are the remaining work.

---

## 1. Epic status (claimed vs verified)

| Epic | Stories | API / tests | UI / e2e | Notes |
| --- | --- | --- | --- | --- |
| E0 Foundations | baseline | yes | smoke | OK |
| E1 Identity | S1–S5 | integration + e2e | sign-up/claim/emails | Role isolation OK |
| E2 Admin shell | S1–S4 | integration + e2e | admin panels | Bootstrap + CRUD OK |
| E3 Learner loop | S1–S5 | integration + e2e | pathways/challenges/progress | OK |
| E4 Classroom harden | S1–S6 | integration; e2e for S2/S3/S5/S6 | classroom panel | **No Playwright for S1 (max 50) or S4 (archive)** — API covered |
| E5 Insights | S1–S3 | unit + integration + e2e | insights page + legend | OK |
| E6 Public surfaces | S1–S3 | contracts content test + e2e | landing + docs | CTA priority mismatch vs app (see §3) |
| E7 Privacy | S1–S3 | tests + e2e age gate | UI age gate only | Age not API-enforced |
| E8 LLM | S1–S2 | unit + stub-default e2e | tutor | Stub default OK; live path opt-in |
| E9 Content runtime | S1–S4 | seed + quiz + purge | quiz e2e | OK |
| E10 Learner UI | S1–S2 | visual/smoke | landing-matched shell | Role CTAs updated |

---

## 2. Logic that validates clean

| Invariant | Status |
| --- | --- |
| Teacher ≠ learner on same account (magic-link) | Pass |
| Claim email keeps same user id + progress | Pass |
| Classroom APIs `requireTeacher`; join public for students | Pass |
| Admin APIs `requireAdmin`; bootstrap one-shot | Pass |
| Max class size 50 (serial path) | Pass |
| Archived section not joinable | Pass |
| Insights = aggregates only; no raw chat to teachers | Pass |
| Quiz strips `correctOptionId` until submit; personalization cannot rewrite it | Pass |
| Stub AI default in CI/health | Pass |
| Tutor turns hashed learner message; purge CLI exists | Pass |
| 6 pathway manuals Zod-validated + seed upsert | Pass |
| Web: learner-first CTAs; quiet teacher sign-in; role nav | Pass (app) |

Spot-checked unit suite (`aggregator`, retention/redaction, health, config): green.

---

## 3. Gaps found (fix these)

### P0 — Fix before external school pilot

| Gap | Why it matters | Suggested fix |
| --- | --- | --- |
| Age gate is **UI-only** | API accepts learner magic-link with no age/consent field | Persist checkbox → API (`ageConfirmed` / consent type); reject without it |
| Class size check has race | Concurrent adds can exceed 50 | Row lock / unique constraint / advisory lock in `addStudent` tx |
| Re-add student creates **new user** | Orphan accounts; progress on old id lost | Re-attach membership to prior user when teacher re-adds same display slot, or soft-delete membership only with revive |
| Real consent / legal review | Stubs only | Legal copy + real consent records before pilots |

### P1 — Demo polish / consistency (do next)

| Gap | Why it matters | Suggested fix |
| --- | --- | --- |
| Landing CTA hierarchy ≠ app | Landing puts teacher primary; app is learner-first | Align landing hero with learner/join primary, teacher quiet |
| Admin treated as teacher in shell | Admin sees Classroom/Insights, then 403 (`requireTeacher` is teacher-only) | Separate admin nav → `/admin`; don’t map `admin` → teacher CTAs |
| Tutor unsigned CTA → `/sign-in` | Sends learners to teacher sign-in | Point to `/sign-up` (and join if classroom) |
| Learning/tutor APIs = any authenticated role | Teachers can enroll/attempt/tutor via API | Optional: `requireLearnerOrStudent` on learning + tutor routes |
| Hardcoded “for teachers only” EN string | Breaks ml parity | Move to dictionary keys |
| Nav flash while `fetchMe` pending | Brief wrong nav | Hold / skeleton until session resolves |
| `privacy.md` “not automatic purge” wording | Slightly stale (CLI exists) | Clarify: CLI exists; scheduled job not yet |
| README still says “Foundation in progress” | Undervalues shipped v1 | Update status to E0–E10 shipped |

### P2 — Nice-to-have / v1.1+

| Gap | Bucket |
| --- | --- |
| Google sign-in | v1.1 |
| Full ml UI + voice | v1.1 |
| Parents / school admin org | v2 |
| Offline PWA | later |
| Scheduled tutor-turn purge (cron) | ops |
| Playwright for E4-S1 / E4-S4 | test completeness |
| In-app admin nav link | demo convenience |
| Docs “Try the app” CTAs | marketing |
| Email manage UI beyond claim (E1-S5 is API-heavy) | product polish |
| Empty-state when DB unseeded | demo resilience |
| `asSessionRole` unknown → `'teacher'` fallback | harden to fail closed |
| Production deploy (AWS) + secrets hygiene | ops |

---

## 4. Recommended next queue (strict)

Do these in order; keep one story at a time + tests:

1. **Fix tutor unsigned link** → `/sign-up` (tiny, no epic needed).  
2. **Admin ≠ teacher in shell** — admin home → Admin panel; hide classroom CTAs for admin.  
3. **Align landing CTAs** with app (learner/join primary).  
4. **API age confirmation** on learner magic-link request.  
5. **Harden max class size** under concurrency.  
6. **Re-add student identity** continuity.  
7. **Learner-only API gate** on `/learning/*` and `/tutor/*` (optional but clean).  
8. Then **v1.1** (Google, ml depth, voice) per requirements.

---

## 5. Demo script (what works today)

Assuming `pnpm db:up && pnpm db:migrate && pnpm db:seed` and `pnpm dev`:

| Role | Path |
| --- | --- |
| Independent learner | `/en/sign-up` → pathways → challenge quiz → progress / tutor |
| Classroom student | Teacher creates section → `/en/join` with code + secrets |
| Teacher | Quiet `/en/sign-in` → classroom → insights (legend visible) |
| Admin | Bootstrap once → `/en/admin` pathways/challenges CRUD + learner export/delete |
| Landing / docs | `:3002` SEO landing, `:3003` docs |

Health should report `aiAdapter=stub` unless live LLM env is set ([`demo-llm.md`](./demo-llm.md)).

---

## 6. Explicit non-goals (still out of scope)

From requirements — do **not** treat as missing v1 work:

- Parents / guardians  
- School admin multi-org  
- Offline mode  
- Teacher/parent raw chat access  
- Community content marketplace  
- Clinical wellbeing claims (legend must stay non-diagnostic)
