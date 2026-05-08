# Task 612 - Intelligence Source-of-Truth Inventory

Status: completed_with_findings

Scope:
- Audited Android Receiver, backend receiver device APIs, signal ingestion, signal worker runtime, matching-core, bank-templates, feedback persistence, unknown-shape monitoring, operator surfaces, webhook worker, SDKs, docs and `.swimpay-agent` reports.
- Classified each area against V1 product truth.

Result:
- Main inventory: `.swimpay-agent/SWIMPAY_INTELLIGENCE_SOURCE_TRUTH_INVENTORY.md`.
- Aligned: active runtime manual-confirm-only behavior, public webhook final-event taxonomy, SDK public webhook parsing, Android package gate, redaction/outbox safety, feedback and unknown-shape read-only behavior.
- Partially aligned: non-debug Android upload transport is fail-safe/no-op; real staging capture cannot complete until staging upload transport is wired.
- Stale vocabulary only: disabled or compatibility `auto_confirm*` schema/template/profile fields and historical reports.
- Contradictory before operator testing: active admin/template response vocabulary can still expose `auto_confirm_allowed_by_template`.
- Dangerous before real testing and fixed in this sprint: legacy receiver signal payload validation did not reject nested raw notification fields before normalization.

Validation:
- Targeted receiver signal test was run red then green.
- Full validation is tracked in task 622.
