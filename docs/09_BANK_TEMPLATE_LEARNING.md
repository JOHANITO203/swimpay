# 09 — Bank Template Learning

## Goal

Bank Template Learning creates and maintains a registry of bank notification templates for the V1 banks.

It is deterministic and does not use LLMs for payment decisions.

## V1 bank profiles

- `sber_ru`;
- `tbank_ru`;
- `vtb_ru`;
- `alfa_ru`;
- `gazprombank_ru`.

## Template canonicalization

Raw notification:

```text
Поступление 137 ₽
Перевод от Иван Петров +7 999 123-45-67. Коммент SWP-A8K2
```

Canonical template:

```text
поступление <AMOUNT> <CURRENCY>
перевод от <PERSON> <PHONE>. <REFERENCE>
```

## Placeholders

- `<AMOUNT>`;
- `<CURRENCY>`;
- `<PHONE>`;
- `<PERSON>`;
- `<REFERENCE>`;
- `<CARD_MASK>`;
- `<PHONE_MASKED>`;
- `<REFERENCE_TRUNCATED>`.

## Direction labels

- `incoming_customer_transfer`;
- `incoming_cashback`;
- `incoming_refund`;
- `outgoing_payment`;
- `failed_transfer`;
- `promo`;
- `balance_update`;
- `unknown`;
- `unknown_ambiguous_direction`.

## Negative gates

Must reject auto-confirm for notifications containing strong negative families:

- списание;
- покупка;
- оплата;
- кэшбэк;
- кешбэк;
- возврат;
- отклонено;
- не выполнено;
- акция;
- предложение;
- promo;
- cashback;
- refund;
- failed;
- declined.

Note: refund and cashback can be incoming money movements, but they are not customer purchase transfers.

## Template lifecycle

```text
new
→ learning
→ shadow_testing
→ trusted_low_amount
→ trusted
→ degraded
→ review_only
→ disabled
```

## Promotion rules

### To `shadow_testing`

- seen count >= 10;
- no false positives;
- direction stable.

### To `trusted_low_amount`

- seen count >= 30;
- human verified count >= 15;
- false positive count = 0;
- parser confidence >= 0.90;
- direction = `incoming_customer_transfer`.

### To `trusted`

- seen count >= 100;
- human verified count >= 40;
- false positive count = 0;
- drift low for recent period;
- signal quality stable.

## Drift detection

Signals of drift:

- more unknown templates;
- amount extraction drop;
- phone extraction drop;
- reference extraction drop;
- parser confidence drop;
- review rate increase;
- new keyword clusters;
- false positive increase.

Drift levels:

- `stable`;
- `minor_drift`;
- `major_drift`;
- `critical_drift`.

Response:

- minor drift: monitor;
- major drift: downgrade to `trusted_low_amount` or `review_only`;
- critical drift: disable auto-confirm for bank/template.

## Mutation predictor

The mutation predictor generates probable template variants for parser hardening.

Families:

- incoming keyword synonym;
- currency format change;
- amount moved title/body;
- phone removed/masked;
- reference removed/truncated;
- balance suffix added;
- punctuation change;
- language/transliteration change;
- notification compression/grouping.

This is not exact future prediction. It is parser robustness testing.

## Shadow mode

Before auto-confirming with a template, the system predicts what it would do but requires human review.

Example:

```text
Shadow prediction: would auto-confirm with score 94.
Actual decision: needs_review.
```

Feedback from review updates template reliability.
