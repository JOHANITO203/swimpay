# Buyer Checkout Step 1 Report

## Implemented

Step 1 now collects:

- first name;
- last name;
- buyer method: card or SBP/phone;
- sender bank from the exact V1 bank list;
- sender card number for card flow;
- sender phone number for SBP/phone flow.

## Security

- CVV, CVC, security code, expiry, PIN, SMS code, password and bank password fields are rejected case-insensitively.
- Wrong-method raw values are rejected:
  - phone is rejected for card flow;
  - card is rejected for SBP/phone flow.
- Sender card uses plausible length and Luhn validation.
- Only masked/HMAC values survive after submission.

