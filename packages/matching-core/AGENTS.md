# packages/matching-core AGENTS.md

This package owns deterministic matching and decision scoring.

Read before coding here:

- root `AGENTS.md`;
- `docs/10_MATCHING_AND_SCORING.md`.

Rules:

- No amount-only auto-confirm.
- Phone exact or reference exact is required for auto-confirm.
- Collision creates review.
- Return reason codes for every decision.
- Do not use LLMs.
