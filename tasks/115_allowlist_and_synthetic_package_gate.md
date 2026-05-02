# 115 - Allowlist And Synthetic Package Gate

## Goal

Add debug-only synthetic package gate support for listener smoke validation.

## Scope

- Accept `synthetic_debug_only` package/cert metadata in debug.
- Reject synthetic debug metadata in release or production mode.
- Keep `TO_VERIFY` and unknown package metadata untrusted.

## Guardrails

- Do not invent real package names or certificate fingerprints.
- Do not make synthetic metadata production trusted.
