# Buyer Checkout Security Guardrails Report

## Added / Updated Tests

- PAN is accepted only through the Step 1 Expected Payment Profile contract.
- Luhn-invalid sender card numbers are rejected.
- CVV/CVC/security code/expiry/PIN/SMS/password/bank password fields are rejected.
- Wrong-method raw values are rejected.
- Raw PAN and raw phone are absent from responses, audit payloads and rendered checkout HTML after submit.
- Step 2 route selection is method-matched.
- `continue-to-bank` cannot run before instructions are shown.
- `J'ai payé` cannot run before receiver arming.
- `J'ai payé` does not confirm payment.
- No `QUERY_ALL_PACKAGES`, SMS, Accessibility, LLM payment decision or webhook semantic change was introduced.

## Validation

- Root tests passed: 75 files, 564 tests.
- TypeScript build passed.
- Lint passed.
- Docker Compose config rendered successfully.

