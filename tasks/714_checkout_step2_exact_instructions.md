# Task 714 - Checkout Step 2 exact instructions

Status: completed

Goal: implement exact payment instructions based on Step 1.

Step 2 must show:
- exact payable amount;
- generated reference;
- matched masked receiver card or phone;
- selected method and sender bank;
- countdown timer;
- copy buttons for amount, reference, receiver details and summary.

Output:
- `.swimpay-agent/BUYER_CHECKOUT_STEP2_REPORT.md`

Rules:
- card method uses card route only;
- SBP/phone method uses phone route only;
- no active route means clean configuration error;
- no raw receiver or sender value exposure.
