# SwimPay Intelligence Retention Policy

Status: V1 production hardening policy hook.

SwimPay Intelligence stores supervised, redacted operational records only. These records support operator monitoring, false-positive review, profile improvement planning and incident investigation. They must not mutate runtime rules automatically and must not promote bank profiles or templates automatically.

## Data Classes

### Feedback Records

Feedback records may include:

- merchant id;
- shape hash;
- bank profile id;
- package name;
- profile version;
- classifier guess;
- constrained human label;
- feedback action;
- review status;
- intent-bound learning metadata.

Feedback records must not include raw notification text, raw phone numbers, raw card numbers, CVV, expiration date, bank passwords or SMS codes.

### Unknown-Shape Records

Unknown-shape records may include:

- merchant id if scoped;
- shape hash;
- bank profile id;
- package name;
- profile version;
- classification guess;
- seen count;
- first seen timestamp;
- last seen timestamp;
- review status.

Unknown-shape records must remain read-only in V1. Unknown-shape records must not promote profiles, create templates, enable trust or create payment reviews by themselves.

## Retention Windows

V1 policy defaults:

- feedback records: retain for 180 days;
- unknown-shape records: retain for 180 days;
- operator aggregate metrics: retain for 365 days if they remain redacted and non-identifying;
- raw notification text: not retained.

No raw notification title/body/text is retained by default. No raw buyer phone, buyer source card, receiver card or receiver phone is retained in Intelligence monitoring records.

## Export Boundary

Exports must be redacted-only.

Allowed export fields:

- shape hash;
- bank profile id;
- package name;
- profile version;
- category/classification;
- reason codes;
- review status;
- aggregate counts;
- timestamps;
- intent relation metadata.

Forbidden export fields:

- raw notification title/body/text;
- raw phone;
- raw card;
- webhook secret;
- receiver private key;
- merchant API secret;
- CVV;
- expiration date;
- SMS code;
- bank password.

## Cleanup Hook

The V1 cleanup hook is non-destructive until an explicit retention job is implemented with tests.

A future cleanup job must:

- run merchant-scoped or system-scoped with audit events;
- delete or aggregate only records older than the configured retention window;
- preserve redacted audit evidence needed for disputes;
- never delete active payment, review or webhook records required by product flow;
- emit safe metrics without PII;
- be reversible in staging before production rollout.

## Runtime Safety

Feedback must not mutate runtime rules.

Unknown-shape records must not promote profiles.

Retention or cleanup jobs must not change:

- Payment Intent Gate behavior;
- static bank profiles;
- classification rules;
- review creation rules;
- webhook semantics;
- auto-confirmation settings.

SwimPay remains payment-intent-bound. Background observations and unknown shapes alone do not create merchant payment reviews or webhooks.

