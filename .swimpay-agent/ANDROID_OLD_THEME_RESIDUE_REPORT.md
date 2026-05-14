# Android Old Theme Residue Report

Date: 2026-05-14

## Removed Or Neutralized

- Account-entry frame no longer uses the old flat background/chrome.
- Onboarding notification access, site/app setup, receiving setup and webhook test now use mockup glass surfaces and neon accents.
- Bank logos now sit in mockup dark icon tiles instead of old surface-alt containers.
- Ozon and other banks are visually selectable when present in the UI list.
- Dashboard and settings text fields now use dark mockup colors instead of default Material field styling.
- Settings choice rows now render with mockup glass cards, cyan/green icon tiles and pill states.
- Receiving methods keeps SBP visual orientation and supports card, SBP and card+SBP visual states.

## Still Not Pixel Perfect

- Screen 07 dashboard home is close in palette, cards and nav, but still differs structurally from the reference composition.
- Screens 02-06 now use the mockup language, but some spacing and exact hierarchy need a final visual approval pass.
- Screens 08-14 are no longer visibly old-theme, but several are still approximate rather than exact reference reproductions.
- `PremiumColors.*` references remain in compatibility code paths; active visual values are dark/mockup-aligned.

## Blockers

No runtime blocker was introduced. Exact per-screen pixel matching remains a design approval/freeze task, not a runtime task.
