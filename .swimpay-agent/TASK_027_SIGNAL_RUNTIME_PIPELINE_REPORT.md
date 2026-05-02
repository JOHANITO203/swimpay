# Rapport - Task 027 Signal Runtime Pipeline

date: 2026-05-02  
phase: Phase 2 - Durable Runtime Integration  
task: `027_signal_runtime_pipeline`  
status: completed  
commit: `20b1411 task 027: signal runtime pipeline`

## Objectif

Mettre en place la fondation runtime durable du pipeline signal:

```text
signal.received
-> parser/classifier
-> matching
-> decision
-> review creation ou webhook.delivery_requested
```

La tache devait rester limitee a l'integration runtime. Elle ne devait pas implementer Android, SBP, PSP, SMS, scraping bancaire, confirmation officielle bancaire ou logique de production deployment.

## Preflight migration

Avant implementation, la migration `packages/database/migrations/001_initial_schema.sql` a ete inspectee comme demande.

Resultat:

- Les changements issus de la task 026 sont additifs et alignes avec `002_webhook_delivery_loop.sql`.
- Aucun drop destructif detecte.
- Aucune suppression de migration.
- Aucun champ raw phone ou raw notification text ajoute.
- Aucune contrainte de confirmation paiement affaiblie.

Conclusion: migration integrity safe pour continuer la task 027.

## Implementation

### Signal worker runtime

Ajout de:

- `apps/signal-worker/src/runtime.ts`
- `apps/signal-worker/src/runtime.test.ts`

Le runtime charge un signal depuis PostgreSQL ou depuis le repository in-memory de test, puis execute:

- parsing deterministe via `@swimpay/bank-templates`
- scoring et candidate matching via `@swimpay/matching-core`
- decision `needs_review`, `rejected` ou `auto_confirmed`
- audit events redacted
- demande de webhook delivery
- publication d'evenements internes runtime

### NATS integration

`swimpay-signal-worker` connecte maintenant le consumer durable `signal.received` au processeur runtime quand `DATABASE_URL` est configure.

Les autres consumers restent volontairement en stubs securises:

- `signal.verified`
- `signal.parsed`
- `match.scored`

Ils ne deviennent pas des points d'entree business independants dans cette task.

### API event publisher

L'API publiait encore les anciens evenements sous la forme `swimpay.internal.*`.

Correction faite:

- les evenements internes sont maintenant serialises en `InternalEventEnvelope`
- ils sont publies sur les subjects JetStream durables comme `signal.received`
- le signal-worker peut donc consommer les events effectivement emis par l'API

## Decision behavior

### Review path

Le runtime cree ou reutilise une review quand le signal est plausible mais non eligible a l'auto-confirmation.

Cas couverts:

- bank app metadata `TO_VERIFY`
- bank app metadata `pending_verification`
- bank profile untrusted
- template untrusted
- amount-only signal
- unknown direction
- collision
- no candidate

### Rejected path

Les directions negatives ne peuvent jamais devenir des paiements client:

- cashback
- refund
- outgoing payment
- outgoing transfer
- promo
- failed transfer

Le signal est conserve et marque/reporte comme rejected, sans suppression.

### Auto-confirm path

L'auto-confirmation existe seulement pour un cas synthetique strictement trusted:

- order active
- payment session active
- exact amount
- exact currency
- direction `incoming_customer_transfer`
- phone HMAC exact ou reference HMAC exact
- no collision
- trusted device
- trusted bank profile
- verified bank app metadata
- trusted template
- score suffisant

`TO_VERIFY` et `pending_verification` ne peuvent pas auto-confirm.

Amount-only ne peut jamais auto-confirm.

## Webhook behavior

Le runtime cree des demandes de webhook delivery pour:

- `payment.confirmed`
- `payment.needs_review`
- `payment.rejected`

Tous les payloads publics incluent:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

Aucune confirmation officielle bancaire n'est exposee ou impliquee.

## Privacy and safety

Verifications appliquees:

- pas de stockage raw buyer phone
- pas de stockage raw notification text par defaut
- parsing uniquement depuis champs redacted disponibles
- pas de PII brute dans webhook payload
- pas de PII brute dans audit payload
- pas de wording official bank confirmation
- pas de PSP/SBP
- pas de SMS
- pas de scraping banking app
- pas de LLM dans les decisions

## Tests ajoutes

Fichier:

- `apps/signal-worker/src/runtime.test.ts`

Couverture:

- incoming transfer route vers review quand app metadata est `TO_VERIFY`/pending
- cashback never auto-confirms
- refund never auto-confirms
- outgoing never auto-confirms
- promo never auto-confirms
- failed transfer never auto-confirms
- unknown direction route safe
- amount-only never auto-confirms
- phone/reference exact match peut auto-confirm dans un cas synthetic trusted
- collision cree review
- expired session ne confirme pas
- duplicate signal event reste idempotent
- review idempotente sur repetition
- `signal.received` handler appelle le processor
- event invalide est rejete
- webhook payload ne contient pas raw PII

## Validation

Commandes executees:

```bash
npm run typecheck
npm run lint
npm test
npm run build
docker compose --env-file .env.example -f infra/docker-compose.yml config
```

Resultat:

- typecheck PASS
- lint PASS
- tests PASS
- build PASS
- docker compose config PASS

Tests:

```text
27 test files passed
159 tests passed
```

## Documentation mise a jour

- `docs/SIGNAL_RUNTIME_PIPELINE.md`
- `docs/IMPLEMENTATION_NOTES.md`
- `docs/LOCAL_DEVELOPMENT.md`
- `docs/10_MATCHING_AND_SCORING.md`
- `.swimpay-agent/PROGRESS_LOG.md`
- `.swimpay-agent/NEXT_ACTION.md`
- `.swimpay-agent/PHASE_2_RUNTIME_PLAN.md`

## Fichiers principaux modifies

- `apps/api/src/signals.ts`
- `apps/signal-worker/src/index.ts`
- `apps/signal-worker/src/runtime.ts`
- `apps/signal-worker/src/runtime.test.ts`
- `apps/signal-worker/package.json`
- `apps/signal-worker/tsconfig.json`
- `package-lock.json`
- `docs/SIGNAL_RUNTIME_PIPELINE.md`

## Ce qui n'a pas ete implemente

Volontairement non implemente:

- Android Receiver app logic
- real bank package/cert verification
- production deployment
- PSP behavior
- SBP behavior
- SMS reading
- bank app scraping
- official bank confirmation
- task 028 review rejection semantics

## Risques restants

- Les tests PostgreSQL/NATS end-to-end reels restent a renforcer en task 029.
- Les semantics de review rejection restent a clarifier en task 028.
- Les bank app package/cert values restent non verifies et ne doivent pas etre trusted.
- Les consumers `signal.verified`, `signal.parsed`, `match.scored` restent des stubs securises.

## Prochaine tache recommandee

`028_review_rejection_semantics`

Objectif:

Clarifier et durcir ce que signifie un rejet de review:

- rejet du signal uniquement
- rejet de la session
- rejet de l'ordre
- impact webhook
- audit obligatoire
- idempotency

Cette clarification doit venir avant les tests E2E durables plus larges.
