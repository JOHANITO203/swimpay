# Codex Start Here

This repository is prepared for task-driven Codex work.

Do not ask Codex to "build SwimPay" in one instruction. Give it one task file at a time.

## Recommended Codex prompt format

```text
Read AGENTS.md, docs/02_SYSTEM_ARCHITECTURE.md and tasks/00X_task_name.md.
Implement only the task described in tasks/00X_task_name.md.
Do not implement unrelated features.
Follow the docs and update docs if behavior changes.
Run relevant tests, lint and typecheck.
Return a summary of changed files and test results.
```

## Task order

Implement tasks in this order:

1. `tasks/001_setup_monorepo.md`
2. `tasks/002_create_database_schema.md`
3. `tasks/003_implement_order_api.md`
4. `tasks/004_implement_payment_sessions.md`
5. `tasks/005_receiver_device_registration.md`
6. `tasks/006_android_receiver_core.md`
7. `tasks/007_signal_ingestion_endpoint.md`
8. `tasks/008_bank_profiles_and_parser.md`
9. `tasks/009_matching_core.md`
10. `tasks/010_review_queue.md`
11. `tasks/011_hosted_checkout.md`
12. `tasks/012_webhook_worker.md`
13. `tasks/013_bank_template_learning.md`
14. `tasks/014_deployment_docker_compose.md`
15. `tasks/015_security_hardening.md`
16. `tasks/016_end_to_end_tests.md`
17. `tasks/017_admin_console_minimal.md`

## Golden rules

- Payment decisions are deterministic.
- No LLM in payment decision.
- No SBP.
- No PSP.
- No SMS.
- No bank scraping.
- Android captures; backend decides.
- PostgreSQL is the source of truth.
- Ambiguity routes to review.
- Never auto-confirm amount-only signals.
