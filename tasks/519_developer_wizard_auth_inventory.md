# Task 519 - Developer wizard auth inventory

Status: completed

Scope:
- Audit merchant-facing web routes, developer integration client wiring and backend developer integration auth.

Findings:
- `/merchant/developer-integration` was live-wired but depended on a process-level server bearer, not a true merchant session.
- Non-production fallback used `Bearer test_<merchant_id>`.
- Production without `MERCHANT_INTEGRATION_BEARER_TOKEN` already rendered safe unavailable state.
- Production with an explicit local `test_*` bearer needed an explicit guard.
- Receiving-method write calls were missing the Authorization and Content-Type headers while reads sent Authorization.

Decision:
- Implement a narrow server-side bearer resolver.
- Keep local/dev fallback available only outside production.
- Reject local `test_*` merchant bearers in production for the developer integration lifecycle.
- Do not perform a broad auth/session rewrite in this sprint.
