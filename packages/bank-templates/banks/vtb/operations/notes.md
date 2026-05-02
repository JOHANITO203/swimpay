# VTB Bank — Bank Template Operations Notes

## Status

Initial V1 status: `learning`.

Do not enable auto-confirmation for this bank until:

- package name is verified from Android device
- signing certificate SHA-256 is verified
- at least 30 incoming customer transfer samples are observed
- at least 15 human-verified incoming samples exist
- zero false positives exist
- cashback/refund/outgoing/promo/failed templates are tested
- drift indicators are stable

## Data collection

Collect only redacted samples.

Required fields:

```text
title
body
bigText if available
subText if available
locale
package_name
package_cert_sha256
observed_at
expected_label
```

## Review guidance

Send to review when:

```text
phone missing
reference missing
amount collision
template unknown
template drift
bank app not verified
direction ambiguous
```

## Admin actions

Allowed actions:

```text
promote template
degrade template
disable template
merge duplicate templates
mark false positive
mark true positive
set bank review_only
```

## Forbidden actions

```text
manual trust without sample evidence
auto-confirm on amount only
auto-confirm during major drift
storing raw text for training without redaction
```
