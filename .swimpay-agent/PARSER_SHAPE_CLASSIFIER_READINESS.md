# Parser / Shape / Classifier Readiness

Date: 2026-05-08

No real notifications were processed.

## Result

Status: ready with real-shape proof pending.

Synthetic fixtures and parser/runtime tests cover the five V1 banks and negative categories. Real notification shape validation is still gated.

## Evidence

- `packages/bank-templates/src/parser.ts`
- `packages/bank-templates/src/parser.test.ts`
- `packages/bank-templates/src/fixtures.test.ts`
- `packages/bank-templates/five-bank-synthetic-shadow-fixtures.json`
- `apps/signal-worker/src/runtime.test.ts`
- `tests/five-bank-shadow-rehearsal.test.ts`

## Checks

| Check | Status | Notes |
| --- | --- | --- |
| Sberbank | ready synthetic | Five-bank runtime fixtures cover it. |
| T-Bank | ready synthetic | Five-bank runtime fixtures cover it. |
| VTB | ready synthetic | Five-bank runtime fixtures cover it. |
| Alfa-Bank | ready synthetic | Five-bank runtime fixtures cover it. |
| Gazprombank | ready synthetic | Five-bank runtime fixtures cover it. |
| incoming | ready | Parser/runtime tests. |
| outgoing/refund/cashback/promo/failed | ready | Negative category tests. |
| unknown/amount-only | ready | Runtime routes to review/reject, no confirmation. |
| incoming/outgoing collision safety | partial | Negative gates exist; real shape collision proof pending. |
| no raw PII stored | ready synthetic | Fixture and runtime tests use redacted placeholders. |

## Missing Proof

Real bank notification shape metrics after explicit final capture approval.

