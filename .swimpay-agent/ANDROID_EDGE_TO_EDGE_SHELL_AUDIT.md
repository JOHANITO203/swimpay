# Android Edge-To-Edge Shell Audit

Date: 2026-05-14

Scope: Android Merchant UI shell only.

Inspected:
- `MainActivity.kt`
- `PremiumComponents.kt`
- `PremiumMerchantApp.kt`
- premium dashboard/review standalone screens for safe-area behavior

Findings:
- The runtime shell still used a persistent `PremiumTopChrome` on the home tab with hamburger, SwimPay mark and repeated merchant branding.
- The app did not explicitly opt into edge-to-edge window drawing.
- The shell applied `statusBarsPadding()` to the full column, which kept the app background visually below the status area instead of letting the background flow behind it.
- Bottom navigation already used `navigationBarsPadding()`, but the container read as a separate slab rather than part of the fullscreen surface.
- Standalone detail screens needed explicit status-bar padding once the window became edge-to-edge.

Forbidden areas touched: none.

