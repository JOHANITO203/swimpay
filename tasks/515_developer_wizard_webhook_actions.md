# Task 515 - Developer Wizard Webhook Actions

Sprint: 9F - Developer Integration Wizard Live UX Wiring

## Goal

Wire webhook URL save, test webhook, delivery history and retry actions to the Sprint 9E backend lifecycle.

## Requirements

- Add form route for webhook URL save.
- Add form route for backend-owned test webhook.
- Render recent merchant-scoped delivery history from backend.
- Add retry form/action for failed delivery rows.
- Keep errors merchant-safe.
- Add tests.

## Safety

- Test webhook must remain backend-owned.
- Retry must remain backend-owned.
- Do not render raw payloads or webhook secrets.
