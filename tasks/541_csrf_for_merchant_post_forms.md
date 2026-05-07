# Task 541 — CSRF for merchant POST forms

Status: completed

Scope:
- Require CSRF for BFF session-backed merchant mutation routes.
- Cover developer integration key actions, webhook URL save, webhook test and delivery retry.
- Keep API key / receiver-device routes separate from browser CSRF.

Constraints:
- Missing/invalid CSRF rejects.
- CSRF token is bound to server-side session material.

