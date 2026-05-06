# Task 451 - Buyer Checkout Recognition Hints

Status: completed

Add safe buyer recognition hints for checkout:
- first name
- last name
- phone number
- source card number

Do not collect CVV, expiry, PIN, SMS code or bank password.

Persist only derived safe values:
- buyer phone HMAC/masked
- buyer source card encrypted/HMAC/masked/last4

Raw card must not be stored, logged, rendered in merchant UI or sent in webhooks.
