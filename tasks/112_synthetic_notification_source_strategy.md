# 112 - Synthetic Notification Source Strategy

## Goal

Choose the safest debug-only strategy for validating the Android notification listener path with synthetic data.

## Scope

- Use synthetic redacted notification examples only.
- Prefer a debug-only source that cannot ship as a production bank trust signal.
- Document why real bank apps, real bank notifications and real customer data are out of scope.

## Guardrails

- No SMS.
- No scraping.
- No real bank package names or certificate fingerprints.
- Synthetic metadata must be marked `synthetic_debug_only`.
- Android must not confirm or auto-confirm a payment.
