# Android Splash Screen Report

Date: 2026-05-14

Implementation:
- Added a premium Compose splash surface using the mockup background, centered SwimPay logo and short loading indicator.
- Added a clear UI boot enum:
  - `BootLoading`
  - `BootAuthenticated`
  - `BootUnauthenticated`
  - `BootLocked`
  - `BootOffline`
  - `BootError`
- The splash is held while local boot readiness resolves, then routes to the existing authenticated, unauthenticated or locked app path.
- The current app boot checks are local and synchronous, so the splash uses a short bounded delay instead of waiting forever on network.

QA:
- Captured `.swimpay-agent/screenshots/edge-to-edge/03_splash_after_font_cap.png`.
- Splash background extends behind the status bar.
- Logo is visible and centered.

