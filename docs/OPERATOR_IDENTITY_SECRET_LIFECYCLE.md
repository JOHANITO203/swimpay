# Operator Identity and Secret Lifecycle

This document defines the production operator identity and secret lifecycle requirements for bank evidence production trust handoff.

SwimPay remains a Payment Signal Engine. Operator identity controls protect metadata trust operations only. They do not create official bank confirmation and they do not enable payment auto-confirmation.

## Current Boundary

`scripts/operator-token-helper.mjs` is local rehearsal tooling. It is not production operator lifecycle tooling.

The helper is useful for local signed-token drills because it creates separate requester, approver and revoker identities for the existing `signed_token` admin auth path. Generated unmasked tokens are local secrets and must not be committed.

## Required Production Controls

Before any production handoff, SwimPay needs:

- operator onboarding with named accountable users;
- credential issuance with approval record;
- credential rotation with scheduled cadence;
- credential revocation for departures, role changes and compromise;
- secure secret storage outside the repository;
- break-glass access with time limit and audit review;
- audit review for every production trust request, approval and revocation;
- requester and approver separation.

## Production Admin Auth Preflight

Production must not run with:

- `ADMIN_AUTH_MODE=dev_token`;
- `DEV_ADMIN_TOKEN` set;
- `DEV_ADMIN_OPERATOR_ID` set;
- `DEV_ADMIN_ROLE` set;
- shared operator credentials;
- untracked break-glass access.

Production must have:

- `ADMIN_AUTH_MODE` set to an approved production mode;
- `ADMIN_TOKEN_HMAC_SECRET` or external identity provider secret stored outside git;
- operator-specific credentials;
- separate requester and approver identities;
- revocation procedure tested before use;
- audit-event access verified.

## Secret Storage

Secrets must be stored outside the repository and outside documentation.

Acceptable future locations may include:

- host-level secret manager;
- deployment platform secret store;
- hardware-backed or OS-backed secret storage;
- external identity provider.

Do not store operator tokens, HMAC secrets, private keys, API keys or break-glass credentials in repo files, logs, reports or screenshots.

## Rotation

Rotation must include:

- scheduled rotation cadence;
- emergency rotation procedure;
- old secret retirement;
- service restart plan;
- audit entry for rotation;
- validation that old tokens no longer work.

## Revocation

Revocation must be available for:

- operator departure;
- role change;
- suspected token exposure;
- wrong approval;
- break-glass expiry.

Revocation must not delete audit history. It must preserve accountability.

## Break-glass

Break-glass access is allowed only for emergency operator recovery.

Requirements:

- explicit reason;
- short expiry;
- second-person review after use;
- audit event review;
- rotation after use if a shared secret was involved.

## Production Trust Separation

Operator identity hardening does not change payment rules.

Production trust remains app metadata trust only. It does not confirm payments, does not make SwimPay a bank or PSP and does not enable auto-confirmation.

Real bank notification processing requires a separate readiness review.
