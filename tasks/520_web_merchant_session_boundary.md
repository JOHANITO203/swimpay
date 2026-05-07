# Task 520 - Web merchant session boundary

Status: completed

Implementation:
- Added `resolveMerchantServerBearerToken`.
- Developer integration and receiving-method admin defaults now share the same server-side merchant bearer resolution.
- Production returns no client when no approved server token exists.
- Production refuses explicit `test_*` merchant bearer tokens.
- Non-production keeps the local `test_<merchant_id>` fallback unless disabled by `SWIMPAY_ALLOW_DEV_MERCHANT_SESSION=false`.

Safety:
- No browser or Android snippet receives merchant secrets.
- Missing merchant server auth renders an unavailable/auth-required UI instead of live credentials.
