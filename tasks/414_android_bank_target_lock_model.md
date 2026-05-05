# Task 414 - Android Bank Target Lock model

Status: completed

Scope:
- Add a safe internal model for known supported bank targets.
- Probe only exact supported package names.
- Do not use broad installed-app enumeration, `QUERY_ALL_PACKAGES`, SMS or Accessibility.

Acceptance:
- Supported V1 bank target states are covered by tests.
- Notification package filtering can accept enabled target packages only while real capture remains gated elsewhere.
