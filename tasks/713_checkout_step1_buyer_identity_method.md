# Task 713 - Checkout Step 1 buyer identity and method

Status: completed

Goal: implement Step 1 UI/backend wiring.

Step 1 collects:
- first name;
- last name;
- payment method: card or SBP/phone;
- exact V1 sender bank;
- full sender card PAN for card flow only;
- sender phone for SBP/phone flow only.

Output:
- `.swimpay-agent/BUYER_CHECKOUT_STEP1_REPORT.md`

Rules:
- PAN accepted only in Step 1;
- derive masked/last4/HMAC immediately;
- phone normalized/masked/HMACed immediately;
- no raw value in responses/logs/webhooks.
