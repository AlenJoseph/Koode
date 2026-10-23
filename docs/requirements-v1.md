# Koode v1 — Business & Functional Requirements

Source: product intake (2026-10-23). This is the decision record for build order, tests, and demos (schools / investors / government).

## 1. Business goals

| Goal | Detail |
| --- | --- |
| Dual audience | **Classroom learners and independent learners are equal priorities.** |
| Age | **13–18** for v1. |
| Scale target | A few schools; on the order of **~500 students**. |
| Demo bar | Credible demo for **investors, government, and school pilots** — not a toy prototype. |
| Languages | **Product UI English-only until v1.1**, but i18n architecture stays (message keys, locale routing) so **ml can land without a rewrite**. Existing `en`/`ml` shell may remain until screens are migrated. **Full Malayalam + voice → v1.1.** Other Indian languages later. |
| Hosting | Must run **100% locally like production** (open source). Production target: **AWS**. |
| Content | Own + **open-licensed** content first; third-party later. Authoring: **platform admin from day one**; community + AI automation later. |

### Explicit non-goals (v1)

- Parents / guardians (→ **v2**)
- School admin / multi-school org tooling (→ **v2**; teachers create classes for now)
- Offline / PWA offline mode
- Voice I/O (→ after core components; with ml in v1.1)
- Real LLM in production until core components are done (**stub AI** until then)
- Teacher or parent access to raw AI chats / full evidence (**later**)
- Teacher deleting learner **accounts** (remove from class only)
- One person holding both **teacher and student** roles on the same account

## 2. Identity & accounts

### Roles

| Role | v1 | Notes |
| --- | --- | --- |
| Independent learner | Yes | Self sign-up (email magic-link recommended). |
| Classroom student | Yes | Section code + secret words (Code.org-style). |
| Teacher | Yes | Email magic-link; creates sections; assigns curriculum direction. |
| Platform admin | Yes | Set up pathways / challenges from day one. |
| Parent / guardian | No | v2. |
| School admin | No | v2. |

### Rules

1. **One account per person**, with **multiple emails** on that account (GitHub-style): verify and attach emails; classroom ↔ personal linking uses the same account identity, not duplicate users.
2. A person **cannot** be teacher and student on the same account.
3. Classroom roster login (section code + secret words) and personal magic-link login must resolve to the **same user** once linked/claimed.
4. Teacher may **remove a student from a class**, not delete the user’s account.
5. Reset secret words / archive section: include in classroom ops when we harden teacher tools.
6. **Independent sign-up (v1):** email magic-link only. **Google sign-in → v1.1** (ask before adding OAuth packages).
7. **Platform admin:** first-run bootstrap (create initial admin on first deploy / empty DB), not a long-lived env-only seed as the only path.
8. **Max class size: 50.**

## 3. Classroom & curriculum

1. Teachers create sections (schools as orgs come later).
2. Max class size is **50**.
3. Teacher selects **curriculum / pathway direction** (can be intentionally high-level / “vague direction”).
4. **Pace and method are optimized per student**; learners may **grow beyond** the teacher’s guided curriculum.
5. Pathways **and** challenges both exist; teacher-guided + student exploration.
6. Day-one learner value: can **try challenges, pathways, and projects** after sign-in (classroom or independent).

## 4. Tutor & agents (product intent)

Long-term partner, not a homework vending machine:

- Learning buddy / Socratic guide  
- Ethical growth help (skills, judgement, opportunity)  
- Future: reminders (“alarm clock”), job/skills finder, etc.

**v1 focus:** guided learning help inside pathways/challenges/projects with stub AI.  
**After components solid:** real LLM.  
**v1.1:** Malayalam depth + voice.

## 5. Progress & teacher insights

Learners: progress across pathways / challenges / projects.

Teachers (v1 ambition): **graphs**, not vanity metrics.

1. **Learning-support signals** — strengths, weaknesses, growth, where academic help is needed.
2. **Wellbeing-style indicator** — red / orange / green style summary with an **explanatory legend** (what the colours mean).  
   - Explicitly **not** a clinical diagnosis or health claim.  
   - Copy and docs must say this is an **indicative support signal** (engagement, stress proxies from learning behaviour, self-reported check-ins later — TBD), not medical advice.  
   - Colour meanings are for **explanation to teachers**, not a permanent label on the child.

Teacher **roster export**: yes in v1.  
Teacher/parent access to full AI chats: **not v1**.

## 6. Privacy & compliance

Privacy is a first-class requirement. Design toward:

- GDPR-style data minimisation, purpose limitation, retention controls  
- Education-sector expectations (EU + US — e.g. FERPA-minded practices where applicable)  
- Safe defaults for **13–18** (consent stubs today → real consent flows before public school pilots)

Concrete v1 engineering expectations:

- No raw chat archives in logs  
- Hashed / bounded tutor evidence where stored  
- Export and deletion pathways planned (even if admin-only at first)  
- Clear role-based access (teacher sees class analytics, not arbitrary user PII)

## 7. Surfaces (web)

| Surface | Requirement |
| --- | --- |
| Marketing / landing | **SEO-friendly** landing page |
| Docs | Good public docs site |
| App | Authenticated product (classroom, independent learn, tutor, progress) |
| UI/UX polish | Build solid components first; then a dedicated **UI/UX pass together** |

## 8. Quality bar (non-negotiable)

1. Clean, logical modules; production-like local run.  
2. Tests for **happy and negative** paths on each behaviour change.  
3. Prefer a **clear test suite per patch**; validate before commit so main stays demo-safe.  
4. Locale keys stay in sync when copy ships (`en` required; `ml` parity for shipped UI until v1.1 policy says otherwise).  
5. Playwright (or equivalent) for critical paths: sign-up/join → try pathway/challenge → progress.

## 9. Suggested build order (from these requirements)

1. **Independent learner sign-up** (email) + enforce teacher≠student + account-link story for classroom↔personal  
2. **Platform admin** minimal: create/edit pathways & challenges  
3. **Learner day-1 loop:** browse/start pathway → challenge → project stub → progress  
4. **Teacher:** remove-from-class, roster export, max class size; assign pathway direction to section  
5. **Teacher insights v1:** simple strength/growth/help graphs (learning signals only)  
6. **SEO landing + docs** site  
7. Privacy hardening pass before external school demo  
8. Real LLM swap  
9. v1.1 ml + voice; parents; school admin  

## 10. Decisions locked (2026-10-23)

| Topic | Decision |
| --- | --- |
| Max class size | **50** |
| Classroom ↔ personal | **GitHub-style multiple emails** on one account |
| Independent signup | **Email magic-link** now; **Google in v1.1** |
| Platform admin | **First-run bootstrap** |
| Locales | **en-only product UI until v1.1**; keep i18n plumbing for cheap ml |
| Teacher graphs | Learning-support + R/O/G wellbeing-style indicator with legend; **no diagnosis claims** |

## 11. Execution

See [`epics-v1.md`](./epics-v1.md) — one story at a time, independent test suite, e2e + subagent verify before the next story. First up: **E1-S1**.
