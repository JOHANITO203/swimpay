# SwimPay Intelligence Gap Audit - Sprint 8B

## Current Sprint 8A Assets Preserved

- Android deterministic notification agent.
- Bank Target Lock and exact package filter.
- Privacy Firewall.
- Direction-aware shape hasher.
- Static five-bank profiles.
- Deterministic parser/classifier.
- Redacted signal upload contract.
- Passive feedback collector.
- Unknown shape monitoring.
- Local drift guard.
- Five-bank regression fixtures.
- Safety guardrails.

## Strategic Gap

Sprint 8A can classify supported-bank notifications, but the final product requires every payment review to be bound to an active buyer checkout payment intent.

Core correction:

- No active payment intent = no payment review.
- Activated bank notification alone is insufficient.
- `J'ai payé` is only a buyer claim and never confirms payment.
- Matching 100 % still requires merchant manual confirmation in V1.

## Missing Before Sprint 8B

- Buyer recognition hints for first name, last name, phone and source card.
- Safe buyer source card derivation with no raw storage.
- Payment intent model with display price, expected payment amount and reconciliation delta.
- Required `Continuer vers ma banque` arm step.
- Payment Intent Gate relation model.
- Intent-bound review copy.
- Intent-bound passive learning metadata.
- Fraud/error guard tests around no intent, wrong bank, negative categories and late candidates.

## Safety Position

No raw notification text, raw phone, raw card, CVV, expiry date, PIN, SMS code or bank password should be stored, logged, rendered to merchant UI or included in webhooks.

Auto-confirmation remains disabled.
