# Task 711 - Expected Payment Profile contract

Status: completed

Goal: implement the backend Expected Payment Profile contract for hosted checkout.

Required persisted data:
- payment session and merchant;
- normalized buyer name/fingerprint/variants;
- payment method `card` or `sbp`;
- sender bank;
- card/phone derived hints only;
- display amount, payable amount, reconciliation delta;
- generated reference and expiry;
- expected payment fingerprint.

Output:
- `.swimpay-agent/BUYER_EXPECTED_PAYMENT_PROFILE_REPORT.md`

Rules:
- raw PAN accepted only in Step 1 request;
- raw PAN/phone never returned after submit;
- no CVV, expiry, PIN or SMS code;
- no public webhook or payment confirmation behavior changes.
