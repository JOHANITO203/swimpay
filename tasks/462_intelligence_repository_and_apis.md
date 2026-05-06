# Task 462 — Intelligence Repository and APIs

Status: completed

Scope:
- Add `IntelligenceRepository` seam.
- Replace API in-memory maps with repository-backed storage.
- Keep existing `POST /v1/intelligence/feedback` and `GET /v1/intelligence/unknown-shapes`.
- Add read-only admin APIs for operator monitoring.

Safety:
- No auto-confirmation.
- No webhook emission.
- No review creation from feedback alone.

