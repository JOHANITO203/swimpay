# 052 - Android Keystore Signer Platform Implementation

## Goal

Add an Android Keystore-facing payload signer skeleton.

## Scope

- Define signer interface.
- Implement Android Keystore signer source.
- Include canonical fields: event id, device id, merchant id, notification hash, local counter, observed at and payload hash.
- Add a fake signer for local tests.
- No insecure production fallback.

## Acceptance Criteria

- Static tests verify signer boundaries and required fields.
