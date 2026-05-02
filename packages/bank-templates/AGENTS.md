# packages/bank-templates AGENTS.md

This package owns bank profile rules, parser logic, template canonicalization and drift detection.

Read before coding here:

- root `AGENTS.md`;
- `docs/09_BANK_TEMPLATE_LEARNING.md`;
- `docs/19_BANK_PROFILES_V1.md`.

Rules:

- Do not trust unverified package/cert values.
- Separate cashback/refund from customer transfers.
- Use redacted canonical templates.
- No LLM in payment decisions.
