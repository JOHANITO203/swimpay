# 218 - Evidence Web Dashboard Data Model

Status: completed

## Goal

Define web-side DTOs for evidence dashboard rows, status counts and audit events.

## Scope

- Keep web rendering defensive even if an upstream payload includes full certificate data.
- Display `trusted=false` and `auto_confirm_enabled=false`.
- Treat production trust metadata as audit/review state only.

## Result

Completed in Sprint 4V.
