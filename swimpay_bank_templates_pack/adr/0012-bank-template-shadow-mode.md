# ADR 0012 — Bank Template Shadow Mode

## Status

Accepted

## Context

New bank templates are risky. A newly observed notification format can be similar to incoming payment but still unsafe.

## Decision

New templates must pass through learning and shadow_testing before supporting auto-confirm candidates.

## Consequences

- New templates do not auto-confirm immediately.
- Operator review and human labels drive promotion.
- False positives degrade templates immediately.
