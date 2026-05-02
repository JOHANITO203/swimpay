# apps/signal-worker AGENTS.md

This app owns signal verification, parsing, matching and payment decision logic.

Read before coding here:

- root `AGENTS.md`;
- `docs/08_ANDROID_RECEIVER_SPEC.md`;
- `docs/09_BANK_TEMPLATE_LEARNING.md`;
- `docs/10_MATCHING_AND_SCORING.md`;
- `docs/11_SECURITY_AND_PRIVACY.md`.

Rules:

- Payment decisions are deterministic.
- No LLM.
- No amount-only auto-confirm.
- Negative directions must not auto-confirm.
- Always emit reason codes.
- Use PostgreSQL constraints for final protection.
