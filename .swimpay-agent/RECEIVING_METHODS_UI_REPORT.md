# Receiving Methods UI Report

Date: 2026-05-08

## Android Onboarding

The onboarding receiving-method step collects:

- method type: card or phone;
- supported bank;
- raw create-only identifier.

Completion persists the method through the backend before onboarding is treated as complete.

If backend creation fails, onboarding returns an action-required state instead of pretending the app is ready.

## Android Menu Screen

`Menu > Moyens de reception` now:

- lists backend methods from `GET /v1/merchant/receiving-methods`;
- creates methods via `POST /v1/merchant/receiving-methods`;
- disables via `/disable`;
- marks default via `/set-default`;
- displays only masked destination values.

The draft form now clears raw input only after a successful backend mutation. On local validation or network/server failure, the draft remains visible so the merchant can correct it.

## Validation UX

Android validates locally before network:

- card must look plausible;
- phone must look like a Russian phone number;
- no request is sent for invalid local drafts.

The safe error text does not echo the raw value.

## Web Merchant Screen

The web receiving-method page now has a real create form:

- bank selector;
- create-only destination value;
- optional label;
- distinct submit buttons for card and phone/SBP wording.

The SBP wording is copy only for Russian phone transfers; no SBP integration was added.
