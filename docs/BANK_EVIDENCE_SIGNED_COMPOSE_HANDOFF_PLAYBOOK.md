# Bank Evidence Signed Compose Handoff Playbook

This playbook describes a local-only signed-token Docker Compose rehearsal for bank package/certificate metadata production trust.

SwimPay remains a Payment Signal Engine. Production trust is app metadata trust only. It is not official bank confirmation and it does not enable payment auto-confirmation.

## Safety Boundary

The rehearsal must not:

- deploy to production;
- process real bank notifications;
- enumerate installed apps;
- read SMS;
- scrape bank apps;
- use customer data;
- expose raw phone numbers;
- expose raw notification text;
- leave metadata trust approved after the drill;
- enable auto-confirmation.

## Compose Signed-token Override

Use the local-only override:

```powershell
$env:ADMIN_TOKEN_HMAC_SECRET = "local_signed_operator_token_secret_change_me"
docker compose --env-file .env.example `
  -f infra/docker-compose.yml `
  -f infra/docker-compose.signed-admin.override.yml `
  config
```

Start only the services needed for the signed-token rehearsal:

```powershell
docker compose --env-file .env.example `
  -f infra/docker-compose.yml `
  -f infra/docker-compose.signed-admin.override.yml `
  up -d --build swimpay-api swimpay-web proxy
```

Restore the default local dev-token mode after the drill:

```powershell
docker compose --env-file .env.example -f infra/docker-compose.yml up -d --build swimpay-api swimpay-web proxy
```

## Token Preparation

Generate local signed operator tokens:

```powershell
$env:ADMIN_TOKEN_HMAC_SECRET = "local_signed_operator_token_secret_change_me"
npm run operator:tokens
```

For logs and reports, use masked output:

```powershell
npm run operator:tokens -- --masked
```

Do not commit generated tokens. Do not use this helper as production operator lifecycle tooling.

## Non-mutating Plan

Inspect the plan:

```powershell
npm run rehearsal:evidence:compose-signed -- --plan
```

The plan is non-mutating and documents the exact Compose override, environment variables and acceptance criteria.

## Mutating Local Drill

Use only a local/dev evidence row already reviewed as `approved_for_review_only`.

```powershell
$env:SWIMPAY_BASE_URL = "http://localhost:8080"
$env:SWIMPAY_SIGNED_COMPOSE_HANDOFF = "true"
$env:SWIMPAY_ALLOW_PRODUCTION_TRUST_HANDOFF = "true"
$env:SWIMPAY_EVIDENCE_ID = "<approved-review-only-evidence-id>"
$env:SWIMPAY_REQUESTER_TOKEN = "<signed-requester-token>"
$env:SWIMPAY_APPROVER_TOKEN = "<different-signed-approver-token>"
npm run rehearsal:evidence:compose-signed
```

Expected flow:

1. local API health passes;
2. requester asks for production trust;
3. requester approval is blocked by dual-control;
4. second operator approves metadata trust;
5. metadata trust is revoked after the drill;
6. redacted audit trace contains request, approval and revocation.

Expected safety flags:

```json
{
  "trusted": false,
  "auto_confirm_enabled": false
}
```

`production_trusted_app_metadata` may be true only during the approval step. It must be false again after revocation.

## Audit Acceptance Criteria

Audit trace must include:

- `bank_evidence.production_trust_requested`;
- `bank_evidence.production_trust_approved`;
- `bank_evidence.production_trust_revoked`.

Audit payloads must include masked certificate hashes only. They must not include:

- full certificate hash;
- raw phone;
- raw notification text;
- raw title/body;
- secrets;
- API keys;
- private keys.

## Closeout Checklist

Before closing the drill:

- evidence status is `production_trust_revoked`;
- same-actor approval was blocked;
- requester and approver were distinct;
- audit continuity was verified;
- Compose was restored to the expected local mode;
- no auto-confirmation was enabled;
- no real notification was processed.

## Production-readiness Package

Before using this playbook as part of any operator handoff, review `docs/BANK_EVIDENCE_PRODUCTION_TRUST_READINESS.md`.

That readiness package binds the local signed-token drill to operator identity, evidence dossier, audit, monitoring and rollback expectations. It also documents that the local token helper is not production operator lifecycle tooling.
