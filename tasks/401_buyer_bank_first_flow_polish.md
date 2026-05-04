# Task 401 - Buyer Bank-first Flow Polish

Status: completed

Scope:
- Polish the visual order of the buyer checkout:
  1. intro;
  2. bank selection;
  3. method selection after bank;
  4. payer launcher;
  5. payment instructions;
  6. live status states.
- The bank step must show bank logo/name/availability only.

Result:
- Bank selection no longer displays card or phone route details.
- Route details stay hidden until the selected route/instructions stage.
- Tests verify route details are absent on the bank step.
