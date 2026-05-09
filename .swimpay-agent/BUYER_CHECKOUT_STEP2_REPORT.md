# Buyer Checkout Step 2 Report

## Implemented

- Step 2 shows method-matched receiving routes only:
  - card buyer flow sees card route only;
  - SBP/phone buyer flow sees phone route only.
- Instructions show:
  - exact payable amount;
  - generated reference;
  - masked receiver destination;
  - copy destination;
  - copy summary.
- Hosted web marks `payment_instructions_shown` when the instructions page is rendered.

## Safety

- No raw receiver card or phone is rendered in HTML.
- Copy details are revealed only through explicit buyer copy action.
- Step 2 does not confirm, emit webhook or create review.

