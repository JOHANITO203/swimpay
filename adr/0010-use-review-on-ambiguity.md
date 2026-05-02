# ADR 0010 — Use Review on Ambiguity

## Status

Accepted

## Context

A false positive can release a product without real payment. Missing a true payment is less damaging than confirming a false one.

## Decision

Ambiguity routes to review.

Review is required for:

- amount-only signal;
- collision;
- missing phone and reference;
- learning/shadow template;
- degraded bank profile;
- unknown direction;
- medium confidence score.

## Consequences

The system may require human review more often in early V1, but it reduces dangerous false positives.
