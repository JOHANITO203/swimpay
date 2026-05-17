# App Theme State Token Audit Report

## Scope

Design-only audit and token reconciliation for Android Compose theme states.

No backend, payment runtime, navigation logic, dashboard data, or UI copy was changed.

## Theme States

The app exposes three appearance states through `PremiumThemeMode`:

- `SYSTEM`: resolves to the Android system dark/light value.
- `LIGHT`: forces the light visual family.
- `DARK`: forces the dark visual family.

Runtime resolution happens in `MainActivity`:

- `themeMode.resolve(systemDark)`
- `SwimPayMerchantTheme(darkTheme = resolvedTheme)`
- `PremiumColors.useDarkTheme(darkTheme)`

## Screen State Families

The reusable screen state model is `PremiumScreenState`:

- `Content`
- `Loading`
- `Empty`
- `ActionRequired`
- `Error`

These states are rendered through premium surfaces/components that now read from theme tokens.

## Screen Routes Covered

Routes in `PremiumRoute` are covered by the shared premium tokens and background shell:

- account entry and recovery
- onboarding
- main tabs: home, reviews, payment, business, settings
- payment detail
- receiving methods
- banks
- connected site
- receiver health
- configuration test
- confirmation mode
- security
- help center
- support contact
- language
- appearance
- order detail

## Token Application

Already tokenized:

- `PremiumPaperBackground`
- `PremiumCard`
- `PremiumNavigationBar`
- `PremiumButton`
- dashboard cards
- review cards
- onboarding cards
- settings rows
- icon tiles
- chips
- borders

Updated in this pass:

- `MaterialTheme` color schemes now derive from `PremiumColors` instead of stale Google Blue / default Material colors.
- Dark premium palette uses black/red/graphite/ember tokens to match the Samurai/Oni direction.
- Home Dashboard dark card edge/reflection no longer uses cyan/blue remnants.

## Theme-Specific Visual Bases

Light:

- Ryujin/Tsukuyomi background image.
- Moon/cyan natural light layers.
- DragonGold home card material.

Dark:

- `app_bg_dark_demonic_samurai.png` background image.
- No old cyan/green procedural glow path.
- Oni/Yatagarasu home card with black brushed workbench and feathered texture layers.
- Red/graphite component palette.

## Remaining Notes

Hardcoded whites remain intentionally for text/icons drawn over dark cards and primary gradient buttons. Preview-only background colors are not runtime styling.

## Verification Target

After this pass, each theme state should resolve through:

- `PremiumColors`
- `PremiumBrandGradient`
- `MaterialTheme.colorScheme` backed by `PremiumColors`

instead of stale fixed blue Material defaults.
