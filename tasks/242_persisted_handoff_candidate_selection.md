# Task 242 - Persisted Handoff Candidate Selection

Status: completed

## Scope

Document and guard persisted evidence selection before mutating production trust metadata.

## Result

The signed Compose rehearsal requires an explicit `SWIMPAY_EVIDENCE_ID`. It does not auto-select evidence and does not mutate by default.

## Safety

Only local/dev evidence already reviewed as `approved_for_review_only` may be used.
