# Task 431 - Android premium receiver health states

Scope: frontend-only Android premium UI.

Implement premium Receiver health state surface using local Android-derived state:

- notification access active/action required
- receiver connected/disconnected
- allowed banks count
- outbox queue status
- backend reachable/not reachable label

Guardrails:

- no SMS permission
- no Accessibility scraping
- no real notification capture
- no backend/API change
