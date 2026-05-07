# Task 538 — BFF session cookie lifecycle

Status: completed

Scope:
- Implement opaque server-side BFF sessions.
- Add secure HttpOnly cookie lifecycle, `/v1/me`, and logout.
- Bind CSRF material to the session.

Constraints:
- Cookie contains only opaque session id.
- Secure cookie required in production.

