# Bank Template System

## Purpose

The Bank Template System helps SwimPay classify merchant-side bank notifications from selected V1 banks.

It provides:

- bank profiles
- template DSL
- extraction rules
- classification rules
- lifecycle policies
- drift detection policies
- mutation prediction policies
- redacted fixtures
- QA and adversarial test assets

## What the system does

It answers:

```text
Does this notification look like an incoming customer transfer?
What entities are visible?
Which template family does it match?
Is the template reliable enough for backend matching?
Has the bank notification format drifted?
Should auto-confirmation be allowed, limited or disabled?
```

## What the system does not do

It does not:

```text
confirm money officially
initiate bank payments
call SBP
call bank APIs
read SMS
read the buyer phone
scrape banking apps
make final payment decisions on Android
```

## Data flow

```text
Android notification
→ allowlist filter
→ package/cert verification
→ snapshot extraction
→ coalescing
→ local redaction/extraction
→ signed upload
→ backend signature verification
→ template classification
→ signal quality score
→ order matching
→ decision engine
→ review or webhook
```

## Template classification hierarchy

The classifier must first handle strong negative categories:

```text
failed_transfer
promo
outgoing_payment
incoming_cashback
incoming_refund
incoming_non_customer
```

Only after negative gates pass can a signal be considered:

```text
incoming_customer_transfer
```

## Precision over recall

For payments, false positives are worse than missed detections.

The Bank Template System must prefer:

```text
review
```

over unsafe auto-confirmation.
