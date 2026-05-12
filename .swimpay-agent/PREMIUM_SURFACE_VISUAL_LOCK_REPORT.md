# Premium Surface Visual Lock Report

generated_at: 2026-05-12T20:05:00+03:00

## Locked Surfaces

The current Android visual source remains `ui/premium`:

- Accueil/dashboard
- Reviews list
- Review detail
- Receiver Health
- Moyens de réception
- Developer Integration
- Confirmation mode
- Settings/subscreens

Hosted checkout is audited as a runtime surface but not modified in this sprint.

## Tests Added / Extended

`AndroidMerchantVisualArchitectureTest` now also verifies:

- official launcher resources stay wired in the manifest;
- no ad-hoc runtime logo assets are added under Android resources;
- required bank icon resources remain present;
- premium visual gate token primitives exist.

## Not Changed

- Payment runtime.
- Webhook semantics.
- Matching logic.
- Android Receiver notification capture.
- Hosted checkout logic.

