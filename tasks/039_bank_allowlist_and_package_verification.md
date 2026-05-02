# 039 - Bank Allowlist And Package Verification

## Goal

Define the local bank allowlist model and package/cert trust behavior.

## Scope

- Model `bank_profile_id`, `package_name`, `cert_sha256` and verification status.
- Keep `TO_VERIFY` untrusted.
- Ignore unknown packages locally.
- Add tests.

## Guardrails

- Do not invent real bank package names or real certificate fingerprints.
- Do not upload non-bank notifications.
- Do not trust `TO_VERIFY`.

## Acceptance

- Verified synthetic package/cert can pass local allowlist checks.
- `TO_VERIFY`, unknown and mismatched package/cert data are ignored or untrusted.
