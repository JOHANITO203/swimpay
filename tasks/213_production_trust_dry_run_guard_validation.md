# 213 Production Trust Dry-run Guard Validation

Status: completed

## Goal

Validate production trust guardrails remain separate from review-only evidence.

## Completed

- The rehearsal tool can optionally request production trust for an explicit evidence id on a local/dev backend.
- It checks that the same actor cannot approve the request.
- It checks `trusted: false` and `auto_confirm_enabled: false` remain in production trust dry-run responses.

