# Koode v1 — Epics & Stories

Derived from [`requirements-v1.md`](./requirements-v1.md).  
**Do not start the next story until the current one is done, e2e-green, and subagent-verified.**

## Delivery rules (mandatory)

1. **One story at a time** — small PR-sized slice; no epic-wide dumps.
2. **Independent test suite per story** — own Vitest file(s) and/or Playwright spec file named after the story id (e.g. `e2e/E1-S2-independent-signup.spec.ts`). Suites must not share mutable fixtures or depend on another story’s e2e having run first.
3. **Happy + negative paths** in that suite before calling the story done.
4. **Gate before next story:**
   - `pnpm test` (unit/integration) green  
   - Story’s Playwright suite green (`pnpm test:e2e -- <spec>` or filter by name)  
   - **Subagent verification** (explore or generalPurpose): review diff against acceptance criteria, confirm tests cover happy/negative, flag gaps  
5. **Commit only after gate passes** (when you ask to commit).
6. Ask before new packages/frameworks (OAuth/Google is **v1.1**, not these epics).

### Status legend

| Status | Meaning |
| --- | --- |
| `todo` | Not started |
| `doing` | Active story |
| `verify` | Implementation done; awaiting e2e + subagent |
| `done` | Gate passed |

---

## Epic E0 — Foundations already shipped (baseline)

Reference only — not re-opened unless a later story requires a fix.

| ID | Item | Notes |
| --- | --- | --- |
| E0-S0 | Monorepo, CI, locales plumbing, Postgres, magic-link teacher, tutor stub, classroom join, Playwright smoke | On `main` |

---

## Epic E1 — Identity: roles, emails, independent learner

**Outcome:** One person, one account, multiple emails; independent learner can sign up; classroom user can claim/link email without becoming a teacher.

| ID | Story | Acceptance criteria | Independent test suite | Status |
| --- | --- | --- | --- | --- |
| **E1-S1** | Multi-email user model | `user_emails` (or equivalent): primary + verified secondary emails; unique email globally; migrate off single `users.email` | `packages/database` schema test + `apps/api/src/E1-S1-user-emails.integration.test.ts` | `done` |
| **E1-S2** | Independent learner magic-link sign-up | New flow `/sign-up` (or role choice): creates `role=learner` (not teacher); cannot use teacher-only classroom APIs; session works for tutor | `apps/api` integration + `e2e/E1-S2-independent-signup.spec.ts` (happy + wrong/expired token) | `done` |
| **E1-S3** | Enforce teacher ≠ learner | Existing email on learner cannot become teacher via magic-link; teacher email cannot sign up as learner; clear errors | API integration negative cases in `E1-S3-role-isolation.integration.test.ts` | `done` |
| **E1-S4** | Claim/link classroom → personal | Signed-in classroom student (or after join) can add+verify email; later magic-link to that email lands on **same** user id; progress/membership preserved | `e2e/E1-S4-claim-email.spec.ts` + API integration | `todo` |
| **E1-S5** | Manage emails (GitHub-style minimal) | List emails; add email (verify magic-link); set primary; cannot remove last verified email | API integration + light e2e | `todo` |

**Epic e2e smoke (after E1 all done):** optional `e2e/E1-epic-smoke.spec.ts` — independent signup + classroom join + claim email. Still independent of E2+.

---

## Epic E2 — Platform admin bootstrap & content shell

**Outcome:** First-run admin exists; admin can CRUD pathways and challenges (content only, no fancy editor).

| ID | Story | Acceptance criteria | Independent test suite | Status |
| --- | --- | --- | --- | --- |
| **E2-S1** | First-run admin bootstrap | Empty DB / flag: bootstrap creates one platform admin; second bootstrap refused; credentials not logged in plaintext | `E2-S1-admin-bootstrap.integration.test.ts` | `todo` |
| **E2-S2** | Admin authz | Only `role=admin` hits `/admin/*`; teacher/learner get 403 | API negative tests | `todo` |
| **E2-S3** | Pathways CRUD | Admin create/list/update/archive pathway (title, summary, locale=en) | API + `e2e/E2-S3-admin-pathways.spec.ts` | `todo` |
| **E2-S4** | Challenges CRUD | Admin create/list/update/archive challenge; optional link to pathway | API + `e2e/E2-S4-admin-challenges.spec.ts` | `todo` |

---

## Epic E3 — Learner day-1 loop (pathways → challenges → projects → progress)

**Outcome:** After sign-in (independent or classroom), learner can try pathway/challenge/project and see basic progress.

| ID | Story | Acceptance criteria | Independent test suite | Status |
| --- | --- | --- | --- | --- |
| **E3-S1** | Browse & start pathway | Learner lists published pathways; starts enrollment | API + `e2e/E3-S1-start-pathway.spec.ts` | `todo` |
| **E3-S2** | Attempt challenge | Start/complete challenge attempt (stub success criteria); negative: unauthenticated 401 | API + `e2e/E3-S2-challenge.spec.ts` | `todo` |
| **E3-S3** | Project stub | Create project linked to pathway/challenge; save title/summary | API + e2e | `todo` |
| **E3-S4** | Learner progress page | Shows enrollments, challenge attempts, projects (en UI) | `e2e/E3-S4-progress.spec.ts` | `todo` |
| **E3-S5** | Tutor context hook | Tutor turn can accept optional pathway/challenge id (stub still); no chat leak to teachers | API integration | `todo` |

---

## Epic E4 — Teacher classroom hardening

**Outcome:** Safe classroom ops at scale ~50; export; assign curriculum direction.

| ID | Story | Acceptance criteria | Independent test suite | Status |
| --- | --- | --- | --- | --- |
| **E4-S1** | Max class size 50 | 51st add-student → 409/400; message clear | API boundary test | `todo` |
| **E4-S2** | Remove student from section | Removes membership only; user account remains; student cannot re-join with old secret until re-added | API + e2e | `todo` |
| **E4-S3** | Reset secret words | Teacher regenerates; old words fail; new words shown once | API + e2e | `todo` |
| **E4-S4** | Archive section | Archived section not joinable; teacher still sees history | API | `todo` |
| **E4-S5** | Roster export | Teacher downloads CSV (or JSON) of roster display names + codes metadata (no secret hashes) | API + e2e download | `todo` |
| **E4-S6** | Assign pathway direction | Teacher attaches pathway id(s) to section as guidance (not forced lock) | API + e2e | `todo` |

---

## Epic E5 — Teacher insights (learning + R/O/G support signal)

**Outcome:** Graphs for learning support; wellbeing-style R/O/G with legend; no diagnosis claims in copy.

| ID | Story | Acceptance criteria | Independent test suite | Status |
| --- | --- | --- | --- | --- |
| **E5-S1** | Learning-support aggregates | Per-section: strength/weakness/growth/help-needed derived from attempts (deterministic rules, stub data ok) | Unit tests for aggregator + API | `todo` |
| **E5-S2** | R/O/G support indicator | Per learner colour + **legend copy** stating non-clinical / indicative only | Unit + UI e2e asserts legend text | `todo` |
| **E5-S3** | Teacher insights page | Graphs render for a section; no raw chat content | `e2e/E5-S3-insights.spec.ts` | `todo` |

---

## Epic E6 — Public surfaces (SEO landing + docs)

**Outcome:** Marketing + docs sites; app remains separate.

| ID | Story | Acceptance criteria | Independent test suite | Status |
| --- | --- | --- | --- | --- |
| **E6-S1** | SEO landing page | Indexable landing (title/meta/OG); clear CTAs: teacher / learner / join class | Playwright SEO smoke (title, h1, meta) | `todo` |
| **E6-S2** | Docs site shell | Docs home + architecture/requirements/epics linked; works locally | Smoke e2e or build check | `todo` |

---

## Epic E7 — Privacy & demo hardening

**Outcome:** Safe enough for school/investor demo.

| ID | Story | Acceptance criteria | Independent test suite | Status |
| --- | --- | --- | --- | --- |
| **E7-S1** | Retention & redaction audit | Confirm logs/evidence redaction; document retention defaults | Checklist test / config tests | `todo` |
| **E7-S2** | Admin export/delete learner (minimal) | Admin can export or delete a learner record (GDPR-minded stub) | API integration | `todo` |
| **E7-S3** | Age gate copy (13–18) | Sign-up states age expectation; no under-13 path | e2e copy assert | `todo` |

---

## Epic E8 — Real LLM swap (after components)

| ID | Story | Acceptance criteria | Independent test suite | Status |
| --- | --- | --- | --- | --- |
| **E8-S1** | openai-compatible adapter live path | Feature-flagged; stub remains default in CI | Gateway tests + one manual/demo checklist | `todo` |

---

## Out of scope here (v1.1 / v2)

- Google sign-in (v1.1)  
- Full ml UI + voice (v1.1)  
- Parents, school admin (v2)  
- Offline PWA  
- Teacher/parent raw chat access  
- Community content marketplace / AI content automation  

---

## Execution queue (strict order)

Start here and move only after gate:

1. **E1-S1** Multi-email model  
2. E1-S2 Independent signup  
3. E1-S3 Role isolation  
4. E1-S4 Claim/link  
5. E1-S5 Manage emails  
6. E2-S1 → E2-S4  
7. E3-S1 → E3-S5  
8. E4-S1 → E4-S6  
9. E5-S1 → E5-S3  
10. E6-S1 → E6-S2  
11. E7-S1 → E7-S3  
12. E8-S1  

### Per-story checklist (copy into PR / chat)

```text
[ ] Story AC met
[ ] Happy-path tests
[ ] Negative-path tests
[ ] Suite is independent (own fixtures)
[ ] pnpm test green
[ ] Story Playwright (if any) green
[ ] Subagent verification noted (pass/fail + findings)
[ ] Ready to commit (ask human)
```

---

## First story when you say “go”

**E1-S1 — Multi-email user model**  
Schema + migration + uniqueness tests only. No UI yet. Then stop for e2e/subagent gate (API/schema suite) before E1-S2.
