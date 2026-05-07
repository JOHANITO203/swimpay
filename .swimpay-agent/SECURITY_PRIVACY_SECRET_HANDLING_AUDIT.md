# Security, Privacy and Secret Handling Audit

generated_at: 2026-05-07T14:40:00+03:00

## Verdict

Security posture is improving and no committed real OAuth secret was found in the scanned repo files. The remaining blockers are mostly boundary and runtime-semantics issues: incomplete BFF web wiring, old public webhook event types, and real receiver runtime gating.

## Strengths

- `.env.example` and `.env.production.example` contain placeholders, not real Google secrets.
- API keys and webhook secrets have hashing/encryption helper coverage.
- SDK errors sanitize secrets and raw PII.
- Public SDK webhook parser rejects raw phone/card/notification fields.
- Receiver signal contract rejects raw notification flags and raw phone fields.
- Android manifest does not include SMS, Accessibility or broad package permissions.
- BFF cookies are HttpOnly and Secure in production.

## Risks

| Severity | File | Evidence | Risk |
| --- | --- | --- | --- |
| High | `apps/web/src/index.ts:480-514` | Web forms mutate developer integration without web BFF CSRF token flow. | Browser-facing mutation boundary is incomplete. |
| High | `apps/web/src/screens/MerchantScreens.ts:419-420` | One-time secrets are rendered into HTML action response. | Acceptable only behind authenticated/CSRF-protected session and HTTPS; not ready for real flow yet. |
| High | `apps/job-worker/src/webhooks.ts:9-14` | Public webhook worker accepts internal event types. | Merchant systems could receive non-final events if endpoint configuration allows it. |
| Medium | `infra/docker-compose.yml` uses `.env.example`. | Dev credentials and `NODE_ENV=development` are default. | Production staging needs separate secret injection. |
| Medium | `docs/LOCAL_DEVELOPMENT.md` and some old docs show dev bearer/admin tokens. | Safe as local docs, but not public/operator production guidance. | Needs docs split. |

## No-real-secret finding

Search found placeholder/test values such as `sk_test_*`, `whsec_test`, `change_me_*`, and env variable names. No `GOCSPX-*` Google secret or live-looking OAuth secret was found in tracked repo files searched.

## Recommendation

1. Finish web BFF session + CSRF in the web app before any real credential lifecycle demo.
2. Make production env fail closed unless real OAuth/session/webhook secrets are injected externally.
3. Remove internal webhook event types from public delivery worker.
4. Keep real OAuth credentials untracked and never paste them into reports.

