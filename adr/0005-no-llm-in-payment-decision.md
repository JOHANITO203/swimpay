# ADR 0005 — No LLM in Payment Decision

## Status

Accepted

## Context

Payment decisions must be deterministic, auditable, explainable and privacy-safe.

## Decision

No LLM is allowed in:

- payment confirmation;
- matching decision;
- fraud decision;
- auto-confirmation.

## Consequences

Use deterministic rules, regex, template learning, hard gates, scoring and human review.
LLMs may be considered later only for back-office text assistance on redacted data, not for payment decisions.
