# Task 706 - Harden real signal runtime

Goal: make the durable signal-worker path use the strict Payment Intent Gate as the authority before real notification testing.

Requirements:

- Use the strict payment-intent-bound gate for real runtime decisions.
- Wrong-bank or wrong-receiving-route signals must not create a merchant review.
- The current signal package/certificate trust must be exact, not profile-wide.
- Invalid signatures and untrusted device/app signals must not emit parsed/match events or create reviews.
- Negative, unknown and ambiguous categories remain manual/reject/wait only.
- No auto-confirmation and no `payment.confirmed` changes.

Validation:

- Add tests for wrong bank/wrong route.
- Add tests for invalid signature before parsing/audit side effects.
- Add tests for exact package/cert trust.
- Run targeted runtime/matching tests before closeout.
