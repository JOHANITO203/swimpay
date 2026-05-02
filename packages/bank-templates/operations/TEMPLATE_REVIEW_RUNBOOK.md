# Template Review Runbook

## When to review

Review is required when:

```text
template unknown
template status learning
direction ambiguous
negative keyword and incoming keyword both present
phone missing
reference missing
amount collision
bank profile unverified
package/cert unknown
drift detected
```

## Review actions

```text
confirm as true incoming customer transfer
mark as cashback
mark as refund
mark as outgoing
mark as promo
mark as failed
mark as unknown
mark as false positive
```

## Output

Each review must write:

```text
review_action
human_label
reason
actor_id
created_at
template_id
signal_id
```

## Feedback

Human labels update:

```text
human_verified_count
false_positive_count
template reliability
bank reliability
adversarial fixtures if false positive
```
