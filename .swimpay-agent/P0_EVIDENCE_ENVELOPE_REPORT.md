# P0 Evidence Envelope Report

generated_at: 2026-05-09T23:10:00+03:00

Status: partially implemented.

Added:

- Receiver upload evidence fields are carried from API validation into ingestion.
- `notification_signals` gains evidence-safe columns and `evidence_envelope_json`.
- API builds a redacted evidence envelope with:
  - `official_bank_confirmation=false`;
  - merchant/device/signal ids;
  - bank package and cert fingerprint;
  - notification/device/backend timestamps;
  - parser version;
  - shape and semantic hashes;
  - redacted amount/currency/direction/rail fields;
  - device signature;
  - backend integrity signature.
- Runtime hydrates package/cert/shape hash from persisted signals for trust and Payment Intent Gate input.

Not added:

- Full review-linked envelope mutation after review creation.
- Dedicated evidence envelope table with immutable version history.

No raw notification, raw PAN or raw phone is included.
