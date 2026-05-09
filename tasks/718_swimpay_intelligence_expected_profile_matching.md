# Task 718 - SwimPay Intelligence expected profile matching

Status: completed_backend_wiring_added

Goal: wire Expected Payment Profile hints into matching.

Fallback hierarchy:
1. active payment intent;
2. payable exact amount;
3. generated reference;
4. expected sender bank;
5. expected method;
6. phone/card hint;
7. name variants;
8. time window;
9. incoming direction;
10. incoming transfer category.

Output:
- `.swimpay-agent/SWIMPAY_INTELLIGENCE_EXPECTED_PROFILE_MATCHING_REPORT.md`

Rules:
- no single field confirms payment;
- strong match creates manual review only;
- ambiguous match uses `AMBIGUOUS_MATCH`.
