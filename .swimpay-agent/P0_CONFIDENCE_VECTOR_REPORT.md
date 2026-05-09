# P0 Confidence Vector Report

generated_at: 2026-05-09T23:10:00+03:00

Status: partially implemented.

Added in `@swimpay/matching-core`:

- `MatchConfidenceVector`
- deterministic amount/rail/direction/time-window/route/package/template/sender/reference/collision fields;
- vector returned by Payment Intent Gate decisions;
- vector returned by signal match decisions.

Runtime persistence:

- New migration adds `signal_matches.confidence_vector_json` and `collision_pressure`.
- Signal worker persists the vector for new manual-review matches.

Semantics preserved:

- `autoConfirmAllowed` remains `false`.
- Vector never confirms payment.
- Strong matches still create manual review only.

Remaining:

- Android/admin compact risk UI can consume the vector later.
