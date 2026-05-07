# 19 — Bank Profiles V1

## V1 bank profile IDs

```text
sber_ru
tbank_ru
vtb_ru
alfa_ru
gazprombank_ru
```

## Important warning

Do not invent trusted package names or certificate fingerprints.

Package names and signing certificate SHA-256 values must be collected from real installed apps and verified before status becomes trusted.

## Common profile structure

```yaml
bank_profile_id: sber_ru
display_name: Sberbank
country: RU
status: learning

trusted_apps:
  - package_name: TO_VERIFY
    cert_sha256: TO_VERIFY
    status: pending_verification

field_priority:
  - EXTRA_TITLE
  - EXTRA_TEXT
  - EXTRA_BIG_TEXT
  - EXTRA_TEXT_LINES
  - EXTRA_SUB_TEXT
  - tickerText

positive_keywords:
  - поступление
  - зачисление
  - перевод получен
  - получен перевод
  - вам перевели
  - пополнение

negative_keywords:
  - списание
  - покупка
  - оплата
  - кэшбэк
  - кешбэк
  - возврат
  - отклонено
  - не выполнено
  - акция
  - предложение

extractors:
  amount: enabled
  currency: enabled
  phone: enabled
  reference: enabled
  sender_name: weak_signal

review_gate:
  require_amount_exact: true
  require_phone_or_reference: true
  require_no_collision: true
  merchant_manual_confirmation_required: true
```

## Initial statuses

Recommended V1 start:

```text
Sberbank       learning or shadow_testing
Tinkoff/T-Bank learning or shadow_testing
VTB            learning
Alfa-Bank      learning
Gazprombank    learning
```

No bank starts as `trusted` without real pilot data.

## Bank profile lifecycle

```text
learning
→ shadow_testing
→ trusted_low_amount
→ trusted
→ degraded
→ review_only
→ disabled
```

## Bank reliability index

Inputs:

- known template rate;
- parser confidence;
- unknown rate;
- review rate;
- false positive rate;
- drift rate;
- phone/reference visibility;
- amount extraction success.

## Strong match review allowed only when

- bank profile is `trusted_low_amount` or `trusted`;
- template reliable;
- device trusted;
- matching hard gates pass.
- merchant manual confirmation remains required.
