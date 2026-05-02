# Task 008 — Bank Profiles and Parser

## Goal

Implement deterministic parser and V1 bank profile rules.

## Read first

- `docs/09_BANK_TEMPLATE_LEARNING.md`
- `docs/19_BANK_PROFILES_V1.md`
- `docs/10_MATCHING_AND_SCORING.md`

## Requirements

Implement:

- amount extractor;
- currency extractor;
- Russian phone normalization;
- reference extractor;
- direction classifier;
- negative keyword gate;
- signal quality score.

Classify:

- incoming customer transfer;
- outgoing payment;
- cashback;
- refund;
- promo;
- failed;
- unknown.

## Acceptance criteria

- Parser tests cover Russian examples.
- Cashback/refund/outgoing/promo/failed are not classified as customer transfers.
- Amount and currency extraction work for `₽`, `руб.`, `RUB`.
- Phone normalization supports `+7`, `8`, spaces and punctuation.
