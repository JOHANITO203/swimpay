# SwimPay UI/UX Pro Max Adaptation

This is the practical SwimPay subset of UI/UX Pro Max guidance.

## Dark Premium Fintech Visual Grammar

- Prefer dark, high-contrast operational surfaces for Android Merchant premium
  screens.
- Use restrained fintech accents: green for primary positive action, amber for
  attention, red for destructive/error, cyan/blue only as secondary technical
  accent.
- Avoid playful palettes, generic purple AI gradients and mixed old/new theme
  surfaces.
- Status color must never be the only signal; pair it with text, icons or
  structure.

## Mobile-First Hierarchy

- Design phone-first before tablet or desktop variants.
- Put the next action, critical state and main metric above secondary detail.
- Keep touch targets at least 44dp, preferably 48dp for Android.
- Respect system bars, bottom nav, gesture areas and scroll insets.
- Keep bottom navigation to five or fewer primary items.

## Token-Driven Design

- Use semantic tokens for color, radius, elevation, spacing, typography, icon
  size and component height.
- Do not hardcode one-off hex values in active UI surfaces.
- Define dark and light contrast separately when both modes exist.
- Keep destructive, warning, success, disabled and selected states tokenized.

## Component Reuse

- Reuse shared shell, cards, buttons, badges, steppers, nav items, status panels
  and list rows.
- Create a component only when repeated structure or interaction justifies it.
- Do not nest decorative cards inside cards.
- Prefer platform-native Compose semantics for interactive controls.

## Spacing Discipline

- Use a 4dp/8dp rhythm.
- Align card padding, section gaps and gutters across screens.
- Keep compact dashboard surfaces scannable without cramping touch targets.
- Do not let dynamic labels or button text resize the layout unexpectedly.

## No Mixed Theme

- During Full Visual Rebuild Mode, remove old palette, old card style, old nav
  density, old shadows and old placeholder visuals from the active surface.
- Do not patch a new background under stale cards and call it rebuilt.
- If a shared component still renders the old theme, fix the shared component
  before per-screen polish.

## Visual Reference First

- Start from the provided mockup or recorded approved screen.
- Compare background, card geometry, typography, spacing, button states, icons,
  bottom nav and density.
- Preserve copy unless copy work is explicitly requested.
- Product truth review blocks dangerous claims, not ordinary visual copy.

## Screenshot Evidence Later

- During active polish, manual screenshots are enough for iteration.
- Record Roborazzi or browser goldens only in Visual Freeze Mode.
- Do not update goldens to bless an unfinished visual pass.

## No Fake Runtime Data

- Use real state models, explicit empty states or labeled fixtures in screenshot
  tests.
- Do not invent payment confirmations, bank confirmations, webhook success,
  receiver trust or notification content.
- Do not display raw notification text or raw secrets.

## No Unregistered Assets

- Use registered SwimPay and bank assets only.
- Do not generate unofficial bank logos.
- Do not use emoji as structural icons.
- If an asset is missing, use the approved placeholder pattern and document the
  gap in `.swimpay-agent/BLOCKERS.md`.
