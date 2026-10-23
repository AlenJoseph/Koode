# Koode content manuals

JSON-driven pathway + challenge content. Humans (and later community PRs) edit files here.  
The app and LLM read the same files. **No UN/WHO logos on marketing** — research notes stay in `docs/pathways-v1.md`.

## Why JSON (not only Markdown)

- Contributors get a clear shape (validated in CI).
- Quizzes, pacing, and tutor briefs stay structured.
- An LLM can rewrite **examples and reading level** per child without inventing a new curriculum each time.
- Markdown still lives **inside** string fields (`introMarkdown`, `briefMarkdown`) for readable prose.

## Layout

```text
content/
  catalog.json                 # which pathways ship
  pathways/<pathway-id>/
    pathway.json
    challenges/<challenge-id>.json
```

Start set (6 pathways):

1. `know-yourself`
2. `think-it-through`
3. `body-and-care`
4. `money-sense`
5. `civic-life`
6. `living-world`

## Main product claim (personalization)

Koode’s selling point is **not** generic quiz banks. It is:

> Same trusted challenge skeleton for everyone → **LLM adapts pace, examples, and local context for this child** → child still does the thinking.

Each `pathway.json` and `challenge-*.json` includes an `llm` block:

| Field | Purpose |
| --- | --- |
| `adaptAxes` | What may change: `pace`, `reading_level`, `local_context`, `interests`, `language_mix` |
| `paceBands` | `supported` / `steady` / `fast` hint density + step size (session pacing, **not** a permanent label) |
| `tutorBrief` | Hard rules: guide, do not spoil answers, no diagnosis language |
| `personalizeTemplate` | Prompt skeleton filled at runtime with learner profile + this content |

### What the LLM may change

- Word difficulty and sentence length  
- Examples (market near the learner, local animals, school context)  
- How many hints and how small the next step is (`paceBands`)  
- Encouragement tone  

### What the LLM must not change

- Learning objectives and success criteria  
- Quiz `correctOptionId` (may rephrase option text carefully)  
- Safeguarding / privacy rules  
- Inventing medical, legal, or financial advice beyond the brief  

## Contribute

1. Copy an existing pathway folder as a template.  
2. Keep `id` fields kebab-case and stable.  
3. Run validation:

```bash
pnpm --filter @koode/contracts test -- src/content.validation.test.ts
```

4. Open a PR with only `content/` (+ schema if needed).  
5. Prefer small challenges (5–20 minutes) over giant lessons.

## Runtime

1. CI validates JSON via `@koode/contracts` `content.validation.test.ts`.  
2. Publish shells into Postgres (idempotent):

```bash
pnpm db:migrate
pnpm db:seed
```

   Upserts by `slug` (= content `id`), status `published`.  
3. Tutor personalization (E8-S2): pass `contentPathwayId` + `contentChallengeId` (+ optional `paceBand`, `localContext`, `interests`) on `/tutor/turn`.  
4. Agent runtime loads the challenge JSON, fills `personalizeTemplate`, appends pace-band coach notes.  
5. Locked: `correctOptionId`, objectives, success criteria.  
6. Still open: quiz UI (E9-S2).

## Status

v0 manuals authored for the six pathways. Personalization contract is live in the tutor runtime; quiz engine UI and DB seed remain follow-ups.