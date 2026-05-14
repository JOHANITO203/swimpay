# Android Text Integrity Audit

Date: 2026-05-14

Scope: Android Merchant premium UI text/layout quality only.

Issues found:
- `broken_word`: dashboard greeting was laid out in one horizontal row with the date chip, so Compose had too little width and split `Merchant` inside the word.
- `cramped_width`: bottom nav labels used the global `mockupSp` minimum, making `Intégrations` too wide under real-device font/display settings.
- `mojibake`: premium runtime/navigation/test sources contained UTF-8 bytes previously decoded as Windows-1252 text, e.g. `Ã©`, `Ã¨`, `â‚½`, `â€¢`.
- `wrong_encoding`: `PremiumDashboardScreens.kt` was stored in an encoding that could be read by PowerShell but not by the patch tool as strict UTF-8.
- `bad_responsive_layout`: title + secondary chip shared a row where the secondary chip had too much priority.

Screens affected by audit:
- Dashboard
- Bottom navigation
- Review/runtime fallback text
- Receiver health/runtime fallback text
- Receiving methods/runtime fallback text
- Integration/runtime fallback text
- Login/onboarding test expectations

Forbidden areas touched: none.

