# Phase 6 - Five-bank MVP Validation and Private Beta Readiness

status: active
started_at: 2026-05-03T15:05:00+03:00

## Strategic Correction

The production/admin hardening chain is paused after Sprint 5B.

Sprint 5A and Sprint 5B remain useful readiness work, but they did not complete the five-bank MVP validation matrix required for private beta. The current priority is five-bank MVP validation and private beta readiness.

## Selected V1 Banks

- `sber_ru` - Sberbank
- `tbank_ru` - Tinkoff / T-Bank
- `vtb_ru` - VTB
- `alfa_ru` - Alfa-Bank
- `gazprombank_ru` - Gazprombank

## Product Boundary

SwimPay is a Payment Signal Engine, not a PSP, bank or official bank confirmation system.

Phase 6 uses a review-only and shadow-first approach:

- no real notification processing yet;
- no real customer data;
- no installed-app enumeration;
- no invented package names or certificate fingerprints;
- package/cert evidence starts review-only;
- real bank notifications start shadow/review-only when later approved;
- auto-confirm is disabled for real banks;
- production/admin hardening is paused until the five-bank MVP matrix has a private beta path.

## Current Evidence Baseline

Sberbank has operator-selected package evidence for:

```text
ru.sberbankmobile
```

That evidence is not official bank confirmation. It is not auto-confirm readiness. Any production metadata trust drill was rehearsal-only or revoked, and real bank runtime remains review-only.

The other four banks still need explicit operator package-name input.

## Phase 6 Objective

Prepare private beta by proving that each selected bank has a clear status across:

- package evidence collection;
- receiver selection/readiness;
- Notification Listener capture readiness;
- redacted sample/shadow policy;
- parser/review routing;
- webhook behavior;
- privacy and no-auto-confirm guardrails.

