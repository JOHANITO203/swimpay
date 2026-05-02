# Bank Template Dataset Strategy

## Principle

Use redacted, consented, merchant-side notification samples only.

## Dataset types

```text
synthetic_redacted
merchant_redacted
human_verified
shadow_mode_predictions
false_positive_cases
drift_cases
```

## Required fields

```text
bank_profile_id
locale
package_name_status
cert_status
title_redacted
body_redacted
big_text_redacted
sub_text_redacted
direction_label
amount_present
phone_present
reference_present
human_verified
source_type
created_at
```

## Redaction

Before storage:

```text
amount → <AMOUNT>
currency → <CURRENCY>
phone → <PHONE>
name → <PERSON>
reference → <REFERENCE>
card/account → <CARD_MASK>/<ACCOUNT_MASK>
```

## Training consent

Operational use and training use are separate.

A merchant can allow SwimPay to use notifications for payment matching without allowing samples to be used for global template training.

## No raw dataset by default

Do not build a raw notification dataset by default.

If raw text is ever used for debugging:

```text
explicit admin flag
limited retention
redaction before training
audit event required
```
