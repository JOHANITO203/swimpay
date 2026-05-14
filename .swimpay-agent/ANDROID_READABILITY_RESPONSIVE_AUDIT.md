# Android Readability Responsive Audit

Date: 2026-05-14

Scope: Android Merchant premium Compose UI only.

## Findings

- Dashboard: visual identity is close, but previous scale made labels cramped or oversized. Recalibrated fixture values, short metric labels and readable card zones.
- Review queue/detail: cards were too compressed and used friction wording. Increased row height, amount hierarchy and replaced `Risque` with priority/review wording.
- Receiving methods: SBP was text-only. Added a single registered SBP placeholder mark and overlaid it on phone/SBP methods.
- Bottom nav: previous container felt detached. Rebuilt it as an integrated dark premium bar with larger icon zones, selected green state and safe-area padding.
- Security/integration/receiver screens: long explanatory copy was reduced where it was visually dominating the surface.

## Guardrails

- No backend, API, database, webhook, payment runtime, receiver runtime, SDK or state-machine logic changed.
- Roborazzi was not run and no goldens were updated.
