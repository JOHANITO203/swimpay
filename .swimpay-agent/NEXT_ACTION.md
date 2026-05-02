# Next Action

generated_at: 2026-05-02T16:12:30+03:00

## Latest completed task

027_signal_runtime_pipeline is complete.

## Commands run

- `npm test -- --run apps/signal-worker/src/runtime.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`

## Pass/fail status

PASS

## Blockers

No current blockers.

## Next recommended task

028_review_rejection_semantics (`tasks/028_review_rejection_semantics.md`)

## What not to do next

- Do not push to remote until the user explicitly asks.
- Do not change review rejection semantics without product review.
- Do not bypass the Postgres-backed webhook delivery loop for public webhooks.
- Do not implement Android final payment decisions.
- Do not auto-confirm outside documented matching and decision rules.
- Do not auto-confirm on amount alone.
- Do not store raw phone numbers.
- Do not store raw notification text by default.
- Do not create real bank package or certificate values.
- Do not deploy.
- Do not continue after failing checks unless the failure is understood and documented.
