# Pilot runbook

End-to-end pilot path for schools / investor dry-runs. Verified by Playwright (`PILOT-end-to-end.spec.ts`).

## One-time prepare

```bash
cp .env.example .env   # if needed
pnpm install
pnpm pilot:ready       # db up + migrate + seed + build
pnpm --filter @koode/e2e exec playwright install chromium
```

## Verify (mandatory before a live pilot)

```bash
# Stop anything already on :3000–:3003, then:
pnpm test:e2e:pilot
```

Expect **3 passed**:

1. Classroom: teacher → join → pathway quiz → tutor → progress → insights  
2. Independent learner: sign-up → quiz → tutor → progress  
3. Negative: teacher has no Tutor nav  

Full suite (optional): `pnpm test:e2e`

## Manual demo script

```bash
pnpm pilot:ready
pnpm --filter @koode/api start &   # :3001
pnpm --filter @koode/web start &   # :3000
# optional: landing :3002, docs :3003
```

| Role | Steps |
| --- | --- |
| Teacher | `/en/sign-in` → Classroom → create section → add student → copy code + secret words → Insights |
| Student | `/en/join` → code + name + secrets → Pathways → Know yourself → Pause before you react → quiz → Tutor → Progress |
| Solo learner | `/en/sign-up` (confirm 13+) → same pathway/quiz path |
| Admin | Bootstrap once → `/en/admin` pathways/challenges |

Health check: `GET http://localhost:3001/health` → `aiAdapter` should be `stub` unless you opted into a live LLM ([`demo-llm.md`](./demo-llm.md)).

## Pilot checklist

- [ ] `pnpm test:e2e:pilot` green on this machine  
- [ ] Seeded content present (`pnpm db:seed`)  
- [ ] `MAGIC_LINK_DEV_MODE=false` in any shared/staging deploy (email delivery required)  
- [ ] `COOKIE_SECURE=true` behind HTTPS  
- [ ] Teachers briefed: insights legend is **not** clinical  
- [ ] Legal ToS / consent copy reviewed for your jurisdiction  

## Learning events + auto-help (Phase A)

- Event catalog + Postgres ingest: [`learning-events.md`](./learning-events.md)
- Showcase multi-step lesson: **Pause before you react** (slide → video → quiz → reflection)
- Soft **Need help?** Copilot popup; coins/shop/certificates at `/en/shop`
- Extra e2e: `pnpm --filter @koode/e2e exec playwright test learning-events-auto-help.spec.ts`

## Out of scope for this pilot build

Google sign-in, full Malayalam UI + voice, parents, multi-school admin, Kafka/Flink, scheduled tutor purge cron.
