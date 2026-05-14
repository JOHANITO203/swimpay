# Android Edge-To-Edge Closeout

Date: 2026-05-14

Files changed:
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/MainActivity.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumReviewScreens.kt`

Validation:
- `npm run android:assemble:staging` passed.
- `./gradlew.bat :app:compileStagingKotlin --no-daemon --stacktrace --max-workers=1` passed.
- `git diff --check` passed with existing CRLF normalization warnings only.
- Installed `app-staging.apk` on connected device with ADB.

Manual QA screenshots:
- splash: `.swimpay-agent/screenshots/edge-to-edge/03_splash_after_font_cap.png`
- dashboard: `.swimpay-agent/screenshots/edge-to-edge/04_dashboard_after_font_cap.png`
- review queue: `.swimpay-agent/screenshots/edge-to-edge/05_review_queue.png`
- receiving methods: `.swimpay-agent/screenshots/edge-to-edge/06_receiving_methods.png`
- integrations: `.swimpay-agent/screenshots/edge-to-edge/07_integrations.png`
- security/settings: `.swimpay-agent/screenshots/edge-to-edge/08_security_settings.png`

Checks:
- Hamburger removed: yes.
- Permanent brand header removed: yes.
- Background extends behind status bar: yes.
- Status bar icons remain visible: yes.
- Bottom nav respects navigation bar area: yes.
- Roborazzi not run: yes.

Remaining visual issues:
- On the connected phone, the active system text/display settings still make several premium mockup screens oversized and partially wrapped.
- Some French accented glyphs render as replacement characters in the current installed UI; this appears outside the shell/splash change and should be handled in the next visual/text encoding pass.
- Receiver health was not reached from the visible settings navigation during this quick ADB sweep.

