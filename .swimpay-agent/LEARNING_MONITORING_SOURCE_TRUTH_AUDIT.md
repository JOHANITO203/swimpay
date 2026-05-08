# Learning / Monitoring Source Truth Audit

Date: 2026-05-08

## Result

Passive learning and monitoring are aligned with V1: read-only, redacted-only and supervised.

## Verified

- Feedback does not mutate classifier rules.
- Feedback does not promote bank profiles.
- Unknown-shape monitoring does not create runtime skills.
- Unknown-shape monitoring does not create payment reviews.
- Operator surfaces are read-only for feedback/unknown-shape evidence.
- Exports are redacted-only.
- Retention policy exists.
- No raw notification title/body/text is stored.
- No raw phone/card is stored.
- No automatic learning in V1.

## Evidence

- `apps/api/src/intelligence.ts`
- `docs/INTELLIGENCE_RETENTION_POLICY.md`
- `tests/receiver-intelligence-prod-guardrails.test.ts`

## Boundary

Learning data can support later human-supervised product work. It cannot alter live matching, profiles, package trust, review creation, confirmation or webhook delivery automatically.

