# Task 526 - Receiver Device Key Lifecycle Hardening

## Goals

- Audit and harden receiver key/device identity semantics.
- Ensure private key remains device-local and public key is merchant/device scoped server-side.
- Represent revoked/compromised/stale receiver states.
- Prevent unsafe public key replacement without explicit registration or rotation semantics.
- Add tests and document any deferred full rotation path.

## Safety

- Do not log key material.
- Do not expose receiver secrets or raw notification payloads.

