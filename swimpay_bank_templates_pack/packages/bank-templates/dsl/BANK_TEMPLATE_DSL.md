# Bank Template DSL

## Goal

The Bank Template DSL defines how SwimPay represents bank notification patterns in a deterministic, auditable and testable way.

The DSL must be readable by humans and machine-readable by parser code.

## File types

Each bank has:

```text
profile.yml
templates/*.yml
fixtures/redacted_samples.jsonl
fixtures/adversarial_samples.jsonl
operations/notes.md
```

## Bank profile structure

```yaml
bank_profile_id: sberbank_ru
display_name: Sberbank
country: RU
status: learning
auto_confirm_status: review_only

trusted_apps:
  - package_name: TO_VERIFY
    cert_sha256: TO_VERIFY
    verification_status: pending_verification

supported_locales:
  - ru-RU

field_priority:
  - EXTRA_TITLE
  - EXTRA_TITLE_BIG
  - EXTRA_TEXT
  - EXTRA_BIG_TEXT
  - EXTRA_TEXT_LINES
  - EXTRA_SUB_TEXT
  - EXTRA_SUMMARY_TEXT
  - tickerText

template_defaults:
  require_amount_for_signal_quality: true
  require_direction_for_signal_quality: true
  require_phone_or_reference_for_auto_confirm: true
```

## Template structure

```yaml
template_id: sberbank_ru_incoming_customer_transfer_v1
bank_profile_id: sberbank_ru
version: 1
status: learning
direction_label: incoming_customer_transfer
risk_class: customer_payment_candidate

match:
  title_any:
    - "поступление <AMOUNT> <CURRENCY>"
    - "зачисление <AMOUNT> <CURRENCY>"
  body_any:
    - "перевод от <PERSON> <PHONE>"
    - "получен перевод от <PHONE>"

positive_keywords:
  - поступление
  - зачисление
  - перевод получен
  - получен перевод

negative_keywords:
  - покупка
  - оплата
  - кэшбэк
  - возврат
  - отклонено

extractors:
  amount:
    strategy: transaction_amount_near_direction_keyword
    required: true
  phone:
    strategy: russian_phone_normalization
    required_for_auto_confirm: true
  reference:
    strategy: swimpay_reference
    required_for_auto_confirm_if_phone_missing: true

decision_hints:
  parser_signal_quality_floor: 80
  allow_auto_confirm_candidate: true
  backend_must_verify_no_collision: true
```

## Status values

```text
new
learning
shadow_testing
trusted_low_amount
trusted
degraded
review_only
disabled
```

## Direction labels

```text
incoming_customer_transfer
incoming_cashback
incoming_refund
incoming_salary_or_income
incoming_non_customer
outgoing_payment
outgoing_transfer
failed_transfer
promo
balance_update
unknown
unknown_ambiguous_direction
```

## Required reason codes

Each parser result must emit reason codes.

Examples:

```text
incoming_keyword_detected
negative_keyword_detected
amount_extracted
phone_extracted
reference_extracted
template_matched
template_low_reliability
cashback_keyword_detected
refund_keyword_detected
outgoing_keyword_detected
failed_keyword_detected
ambiguous_direction
```

## Redaction

Raw samples must be converted:

```text
137 ₽ → <AMOUNT> <CURRENCY>
+7 999 123-45-67 → <PHONE>
Иван Петров → <PERSON>
SWP-A8K2 → <REFERENCE>
карта **1234 → <CARD_MASK>
```

## No auto-confirm in DSL

The DSL can mark a template as `allow_auto_confirm_candidate: true`.

It must never mark a payment as confirmed.

Final confirmation belongs to backend matching and trust core.
