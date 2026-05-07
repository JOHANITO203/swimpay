# Task 525 - Developer wizard auth hardening closeout

Status: completed

Summary:
- Developer Integration Wizard now has a safer production auth boundary.
- Local/dev bearer fallback remains development-only.
- Backend developer integration routes reject local merchant test bearer in production.
- Receiving-method admin writes now use the same server bearer as reads.

Remaining follow-up:
- Implement real merchant session/cookie/CSRF for the web merchant console.
- Implement production API key verification for all merchant API routes.
- Replace process-global merchant identity with authenticated merchant context.
