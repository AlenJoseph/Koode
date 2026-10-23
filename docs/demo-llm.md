# Demo checklist — live LLM (E8-S1)

CI and default local always use the stub. Use this checklist only for a **manual demo** with a real OpenAI-compatible endpoint.

## Preconditions

- [ ] Postgres running; `pnpm db:migrate`
- [ ] `SESSION_SECRET` set (≥32 chars)
- [ ] You have a school/demo agreement if any learner PII could enter prompts
- [ ] Prefer synthetic accounts only

## Env

```bash
export AI_PROVIDER=openai-compatible
export AI_BASE_URL=https://api.openai.com/v1   # or Ollama / Groq / etc.
export AI_MODEL=gpt-4o-mini                    # provider-specific
export AI_API_KEY=...                          # omit for local Ollama if unused
```

Leave `AI_PROVIDER` unset (or `stub`) to return to CI-safe mode.

## Smoke

1. Start API + web.
2. Sign in as a learner (13+ age gate).
3. Open Tutor; send one short message.
4. Confirm reply is schema-valid JSON fields in UI (reply + optional guiding question).
5. Confirm API logs show `adapterId=openai-compatible` and **no** raw `learnerMessage`.

## Rollback

```bash
unset AI_PROVIDER AI_BASE_URL AI_MODEL AI_API_KEY
# or AI_PROVIDER=stub
```

## Personalization (E8-S2)

Optional tutor body fields:

- `contentPathwayId` / `contentChallengeId` — kebab-case ids from `content/pathways/`
- `paceBand` — `supported` | `steady` | `fast`
- `localContext` / `interests` — free text for examples

The runtime loads the JSON manual and appends a tutor brief. Quiz `correctOptionId` and objectives stay locked.
