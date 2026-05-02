# Task 013 — Bank Template Learning

## Goal

Implement template canonicalization, stats, shadow mode and drift basics.

## Read first

- `docs/09_BANK_TEMPLATE_LEARNING.md`
- `docs/19_BANK_PROFILES_V1.md`

## Requirements

Implement:

- canonicalization;
- template hash;
- template stats updates;
- reliability score;
- lifecycle status;
- drift detection basic;
- mutation predictor basic.

## Acceptance criteria

- Raw fake notification becomes redacted template.
- Seen count increments.
- False positive degrades template.
- New template starts in learning.
- No LLM used.
