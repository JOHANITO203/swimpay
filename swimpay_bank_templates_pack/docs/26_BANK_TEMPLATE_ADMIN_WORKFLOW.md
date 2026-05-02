# Bank Template Admin Workflow

## Goal

Define how SwimPay operators manage templates safely.

## Workflow

```text
new notification observed
→ redacted canonical template generated
→ classified by parser
→ stored as template candidate
→ human/operator review if needed
→ shadow testing
→ promotion or rejection
```

## Admin actions

Allowed:

```text
mark true positive
mark false positive
promote to shadow_testing
promote to trusted_low_amount
degrade to review_only
disable template
merge duplicate templates
split unsafe template
```

Forbidden:

```text
trust a template without verified samples
trust a bank app without package/cert verification
auto-confirm amount-only signals
ignore false positives
store raw notification text for training without redaction
```

## Promotion checklist

Before `trusted_low_amount`:

```text
seen_count >= 30
human_verified_count >= 15
false_positive_count = 0
cashback/refund/outgoing/promo tests pass
drift status stable or minor only
bank app package and cert verified
```

Before `trusted`:

```text
seen_count >= 100
human_verified_count >= 40
false_positive_count = 0
reviewer agreement rate >= 95%
unknown rate stable
no major drift
```

## Incident response

If a false positive is found:

```text
1. immediately set template to review_only
2. identify affected matches
3. disable auto-confirm for bank if pattern repeats
4. add adversarial fixture
5. update parser rule
6. re-run all fixtures
7. require shadow testing before promotion
```
