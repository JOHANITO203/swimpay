# Database Migrations and Data Integrity Audit

generated_at: 2026-05-07T14:40:00+03:00

## Verdict

Migrations are additive and generally safe, but production migration operations are not yet ready. The schema still contains future/legacy auto-confirm states and public webhook payload storage requires strict contract guardrails.

## Migration inventory

Current migrations:

1. `001_initial_schema.sql`
2. `002_webhook_delivery_loop.sql`
3. `003_review_rejection_semantics.sql`
4. `004_bank_package_evidence.sql`
5. `005_bank_evidence_production_trust_policy.sql`
6. `006_checkout_bank_selection.sql`
7. `007_hybrid_receiving_routes.sql`
8. `008_intelligence_feedback.sql`
9. `009_developer_integration_lifecycle.sql`
10. `010_auth_bff_foundation.sql`

## Strengths

- Order external IDs are unique per merchant.
- Notification `event_id` and `notification_hash` are unique.
- Webhook deliveries dedupe endpoint/event pairs.
- Review actions support signal/session/order scopes.
- Auth BFF tables are additive.
- Intelligence feedback/unknown shape tables include non-mutating constraints.

## Risks

| Severity | File | Evidence | Risk |
| --- | --- | --- | --- |
| High | `packages/database/migrations/001_initial_schema.sql:7-9` | `merchants.auto_confirm_enabled`, `auto_confirm_limit_minor`. | Conflicts with manual-only V1 unless future-gated and inactive. |
| High | `001_initial_schema.sql:254-260` | Unique confirmed indexes include `auto_confirmed`. | Future state is active in schema constraints. |
| High | `webhook_deliveries.payload_json` | Payload JSON is stored. | Safe only if public event creation blocks raw PII/internal events. |
| Medium | Docker Compose mounts migrations under `docker-entrypoint-initdb.d`. | Existing volumes do not auto-run new migrations. | VPS migration runbook/tooling is required. |
| Medium | `merchant_users` legacy table remains alongside `users`/memberships. | Dual identity tables can confuse future auth work. | Needs taxonomy/migration plan. |

## Recommendation

1. Add an explicit migration runner/runbook for existing staging/prod volumes.
2. Future-gate or remove active V1 use of `auto_confirmed`/merchant auto-confirm columns.
3. Ensure webhook payload JSON storage is restricted to final public V1 events with safe payloads.
4. Run backup/restore and migration dry-run before VPS real-world staging.

