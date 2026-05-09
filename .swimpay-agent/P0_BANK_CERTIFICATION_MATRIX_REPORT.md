# P0 Bank Certification Matrix Report

generated_at: 2026-05-09T23:10:00+03:00

Status: partially implemented.

Added:

- `BankRouteCertification` contract type.
- `bank_route_certifications` table.
- Seed rows for the five V1 banks.
- Ozon Bank remains `package_validation_pending` with `package_unknown`.

Rules preserved:

- Ozon is not enabled for runtime capture until exact package/cert validation.
- Certification metadata does not auto-confirm payments.

Remaining:

- Gate checkout route selection and matching on certification status.
- Record live/active-sweep reliability metrics from real consenting tests.
