# Task 509 — Wizard backend wiring

Status: completed

Scope:
- Added backend lifecycle endpoints consumed by the Developer Integration Wizard surface.
- Kept wizard snippets safe for Web and Android.

Note:
- The existing static web wizard remains safe if the backend is unavailable; the new lifecycle APIs provide the production data source for merchant credentials, webhook URL, test and delivery history.

