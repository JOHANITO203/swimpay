# Task 542 — API key verification against stored keys

Status: completed

Scope:
- Add production API key verification against hashed stored keys.
- Use SDK `Authorization: Bearer sk_...` to resolve merchant identity.
- Keep local `Bearer test_*` only in non-production.

Constraints:
- Raw API keys are never logged or returned.
- SDK semantics remain unchanged.

