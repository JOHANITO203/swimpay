# Task 727 - Integration Secret Revocation Lifecycle

Harden API key and webhook secret lifecycle for staging/production use.

Implement or finalize:
- API key active/revoked state;
- webhook secret active/revoked state;
- revoke API key endpoint;
- revoke webhook secret endpoint;
- rotate creates a new secret and revokes the old one;
- revoke requires merchant auth and appropriate permission;
- Android revoke actions must be gated by device security confirmation where available;
- normal reads stay masked;
- raw values remain show-once only.

Rules:
- revoked API keys cannot create orders;
- revoked webhook secrets cannot verify new webhook signatures;
- no raw key/secret in logs, Android state dumps or normal API reads;
- no browser/Android snippets containing private secrets.

Create:
`.swimpay-agent/INTEGRATION_SECRET_REVOCATION_REPORT.md`
