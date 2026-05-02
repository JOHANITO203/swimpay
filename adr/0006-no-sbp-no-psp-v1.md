# ADR 0006 — No SBP and No PSP in V1

## Status

Accepted

## Context

SwimPay's innovation is merchant-side signal infrastructure, not payment rail integration.

## Decision

V1 does not integrate:

- SBP;
- PSPs;
- bank APIs;
- payment initiation rails.

## Consequences

Buyer still performs transfer in bank app.
SwimPay automates recognition and reconciliation, not the bank transfer itself.
Marketing must not claim PSP capabilities.
