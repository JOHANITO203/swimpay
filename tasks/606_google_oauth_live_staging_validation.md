# Task 606 - Google OAuth live staging validation

Status: blocked_missing_external_credentials

Goal: validate live Google OAuth exchange in staging if credentials are configured.

Checks:
- `/auth/google/start`
- Google redirect and callback
- BFF session
- `/v1/me`
- cookie flags
- active merchant context

Deliverable:
- `.swimpay-agent/GOOGLE_OAUTH_STAGING_REPORT.md`
