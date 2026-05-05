# Task 415 — Android Premium Visual Tests Replacement

Sprint: 7J — Android Frontend Source-of-truth Cleanup

Goal:

Replace legacy visual-design assertions with tests that assert `ui/premium` is the Android merchant visual source of truth.

Tests must verify:

- `MainActivity` mounts `PremiumMerchantApp`.
- `PremiumMerchantRuntime.forAppBuild()` is used.
- `ui/premium` contains active visual files.
- Legacy visual files are absent after purge.
- Premium bottom tabs exist.
- Premium onboarding copy uses approved merchant wording.
- Premium review actions are separate.
- Signal reject does not reject order by default.
- No forbidden merchant-facing jargon.
- No raw card, raw phone or raw notification text.
- No webhook secret.
- No official bank confirmation claim.
- Android does not directly send developer webhooks.
- Non-debug runtime can use disconnected mode instead of a local/dev bearer session.

Rules:

- Do not weaken existing safety tests.
- Do not remove privacy assertions.
- Do not alter backend/API contracts.
