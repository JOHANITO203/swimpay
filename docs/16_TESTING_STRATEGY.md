# 16 — Testing Strategy

## Required test categories

- unit tests;
- integration tests;
- API tests;
- parser tests;
- matching tests;
- state machine tests;
- anti-replay tests;
- webhook tests;
- Android Receiver tests;
- end-to-end tests.

## Critical tests

### Parser

Must correctly classify:

- incoming customer transfer;
- outgoing payment;
- cashback;
- refund;
- promo;
- failed transfer;
- unknown.

### Matching

Must prove:

- amount exact match works;
- currency exact match works;
- phone exact match works;
- reference exact match works;
- amount-only does not auto-confirm;
- collision creates review;
- duplicate signal cannot confirm twice;
- same order cannot be confirmed twice;
- expired order does not auto-confirm outside grace;
- cashback/refund/outgoing/promo/failed never auto-confirm.

### Security

Must prove:

- invalid signature rejected;
- duplicate event id rejected;
- duplicate notification hash rejected;
- local counter regression rejected;
- API key hash validation works;
- webhook signature generated correctly.

### Webhooks

Must prove:

- delivery created;
- signature header generated;
- retry scheduled;
- replay creates new delivery;
- event id stays stable;
- endpoint/event pair is unique.

### State machine

Must prove:

- no direct `created` → `confirmed` transition;
- every transition emits audit;
- invalid transitions rejected.

## Test data

Use redacted fake notifications only. Do not store real raw bank notifications in test fixtures.

## CI expectation

Before merge:

- lint;
- typecheck;
- tests;
- build.
