# Task 469 - Product truth public event taxonomy

Status: completed

Goal:
- Align public webhook docs with the final V1 truth.
- Public merchant fulfillment webhooks must be post-merchant-confirmation only.

Rules:
- Do not change backend code.
- Do not change event names in runtime code.
- Keep internal event vocabulary separate from public webhook vocabulary.
- Keep `official_bank_confirmation=false`.

Done:
- Updated `docs/12_WEBHOOKS.md`.

