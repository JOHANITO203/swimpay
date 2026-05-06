# Task 496 - Credentials and webhook config

Sprint: 9D - Developer Integration Wizard Production Readiness

Goal:
Implement credentials/config screen using existing backend APIs where possible.

Acceptance:
- Show Merchant ID.
- Show public key.
- Show masked secret key.
- Show masked webhook secret.
- Show webhook URL field.
- Keep secrets masked.
- Document show-once lifecycle limitation if not implemented.
- Add tests.

Safety:
- Do not log or render unmasked secrets.
- Do not place secrets in Android or browser snippets.
