# Task 694 - Backend Settings / Support Contracts

Status: pending

Objective: add or reuse backend contracts needed by Android settings.

Possible contracts:
- support tickets;
- confirmation settings;
- merchant app preferences.

Rules:
- additive migrations only if needed;
- tenant context must come from authenticated session;
- no client-controlled `merchant_id`;
- no raw PII/secrets in logs.

Output:
- `.swimpay-agent/BACKEND_SETTINGS_SUPPORT_CONTRACTS_REPORT.md`
