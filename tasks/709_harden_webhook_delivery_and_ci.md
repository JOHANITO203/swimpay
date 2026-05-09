# Task 709 - Harden webhook delivery recovery and CI hygiene

Goal: make final webhook delivery more resilient and make repository validation enforceable.

Requirements:

- Stale `delivering` webhook delivery rows must become retryable or dead according to retry policy.
- Claim logic must not permanently strand a delivery if a worker dies mid-delivery.
- Keep public event taxonomy final-only.
- Add a versioned CI workflow for root and Android validation.
- Add deployment hygiene guardrails such as `.dockerignore` where safe.

Validation:

- Add webhook worker tests for stale `delivering` recovery.
- Add CI workflow file.
- Add `.dockerignore` without excluding required workspace files.
