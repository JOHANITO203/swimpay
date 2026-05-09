# Task 704 - Metrics guardrails

Status: completed

Goal: add tests guarding the merchant metrics wiring.

Tests must cover:
- main card says `Paiements confirmés`;
- no main-card `Paiement suivi` label remains;
- no fake dashboard values;
- metrics come from backend/state model;
- zero-denominator confirmation rate is safe;
- no raw notification text/card/phone;
- no auto-confirmation;
- passive analytics does not create review or webhook.
