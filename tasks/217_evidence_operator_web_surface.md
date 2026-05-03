# 217 - Evidence Operator Web Surface

Status: completed

## Goal

Add a minimal `swimpay-web` operator surface for evidence review backed by the existing admin dashboard and audit APIs.

## Scope

- Add `GET /admin/evidence-review`.
- Render pending/recent evidence with masked certificate hashes.
- Render a safe unavailable state when the admin API is not reachable.
- Do not add production trust actions in the UI.
- Do not expose tokens, raw phone, raw notification text, raw title/body or secrets.

## Result

Completed in Sprint 4V.
