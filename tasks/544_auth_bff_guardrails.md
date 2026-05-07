# Task 544 — Auth BFF guardrails

Status: completed

Scope:
- Add guardrails proving production disables local test bearers, cookies are secure, CSRF is required, API keys are hash-verified and identity boundaries remain separate.
- Ensure no payment behavior, auto-confirmation or public webhook semantics are changed.

Constraints:
- Do not weaken existing safety/product-truth tests.

