# Task 723 - Real-World Bank Template Variants

Status: completed

Objective:
Add concrete, non-universal fixture variants for Russian SBP-style incoming transfers and card-credit incoming transfers.

SBP Variant:
- extracts `rail=sbp`;
- extracts amount;
- extracts sender name hint;
- extracts sender bank hint;
- treats balance as diagnostic only.

Card Variant:
- extracts `rail=card`;
- extracts amount;
- extracts source label;
- extracts receiver card last4;
- extracts card network;
- does not require sender hints.

Rules:
- fixtures enrich templates; they do not replace generic parsing;
- balance is not proof;
- strong match remains manual review only;
- no auto-confirmation.

Evidence:
- `packages/bank-templates/src/parser.ts`
- `packages/bank-templates/src/parser.test.ts`

