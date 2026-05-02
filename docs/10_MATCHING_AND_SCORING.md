# 10 — Matching and Scoring

## Goal

Match parsed notification signals to active payment sessions without claiming official bank confirmation.

## Input

- order;
- payment session;
- notification signal;
- bank profile;
- template stats;
- device trust;
- merchant trust;
- signal quality.

## Hard gates

Auto-confirm is blocked if any of these are true:

- signature invalid;
- device unauthorized;
- bank app not allowlisted;
- package/cert not trusted;
- event id already seen;
- notification hash already seen;
- local counter not increasing;
- direction is outgoing;
- direction is cashback;
- direction is refund;
- direction is promo;
- direction is failed;
- direction is unknown;
- order expired outside grace period;
- payment session inactive;
- amount mismatch;
- currency mismatch;
- collision unresolved;
- template disabled/review_only;
- receiver health critical;
- signal already used to confirm another order.

## Candidate search

Candidate sessions must match:

- same merchant;
- active/pending status;
- same currency;
- exact amount;
- valid time window;
- not already confirmed/rejected.

Then score phone/reference/time/template/device.

## Collision detection

Collision exists when more than one active candidate can match a signal and the signal lacks a unique phone or reference match.

Collision outcome:

```text
needs_review
```

Never auto-confirm a colliding amount-only signal.

## Score rules

```text
+35 amount exact
+35 sender phone exact
+45 reference exact
+25 direction incoming_customer_transfer
+10 trusted bank profile
+10 trusted bank app/cert
+10 trusted template
+10 valid time window
+10 high device trust
+5 high merchant trust
+5 name compatible

-30 ambiguous notification
-50 phone missing
-40 reference missing
-80 amount/session collision
-100 signal already used
-100 negative direction
-60 weak device trust
-50 template drift
```

## Auto-confirm rule

Auto-confirm only if:

```text
hard gates pass
score >= 90
amount exact
currency exact
direction = incoming_customer_transfer
phone exact OR reference exact
no collision
device trusted
bank profile trusted_low_amount OR trusted
template reliable
signal unique
order active
payment session active
```

## Review rule

Create review when:

- score is medium;
- phone missing;
- reference missing;
- collision detected;
- template in learning/shadow mode;
- bank profile degraded;
- signal is plausible but incomplete.

## Reject rule

Reject when:

- negative direction;
- invalid signature;
- duplicate signal;
- known false-positive template;
- expired session outside grace;
- amount mismatch;
- untrusted bank app in strict mode.

## Reason codes

All decisions must include reason codes:

- `amount_exact`;
- `currency_exact`;
- `sender_phone_exact`;
- `reference_exact`;
- `incoming_customer_transfer`;
- `trusted_bank_profile`;
- `trusted_device`;
- `trusted_template`;
- `no_collision`;
- `amount_collision`;
- `phone_missing`;
- `reference_missing`;
- `negative_direction`;
- `duplicate_signal`;
- `invalid_signature`;
- `template_drift`;
- `requires_review`.

## Critical rule

Never auto-confirm on amount alone.
