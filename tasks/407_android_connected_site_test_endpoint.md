# 407 - Android connected site test endpoint

Status: completed

Scope:
- Add `POST /v1/android-merchant/connected-site/test`.
- Require authenticated merchant context.
- Send or enqueue a test-only webhook event from the backend.
- Return safe queued/sent status and delivery id if available.
- Never let Android send developer webhooks directly.
- Add tests.
