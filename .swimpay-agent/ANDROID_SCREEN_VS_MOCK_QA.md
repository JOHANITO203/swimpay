# Android Screen vs Mock QA

Date: 2026-05-14

Scope: Android Merchant design-only visual QA against `design/reference/android-merchant/*.png`.

## Method

- Built and installed staging APK.
- Launched `com.swimpay.receiver/.MainActivity` explicitly before capture.
- Verified focused package with `dumpsys window`.
- Captured device screenshots with ADB.
- Roborazzi/goldens were not run.

## Captures

- Dashboard current: `.swimpay-agent/screenshots/android-vs-mock/07_dashboard_tokenized.png`
- Dashboard ready state: `.swimpay-agent/screenshots/android-vs-mock/07_dashboard_ready.png`
- Review queue ready state: `.swimpay-agent/screenshots/android-vs-mock/08_review_queue_ready.png`
- Dashboard after foundation pass: `.swimpay-agent/screenshots/android-vs-mock/07_dashboard_foundation2.png`
- Review queue fixture after shell/density pass: `.swimpay-agent/screenshots/android-vs-mock/08_review_fixture5.png`
- Review detail fixture after shell/density pass: `.swimpay-agent/screenshots/android-vs-mock/09_review_detail_fixture3.png`

Discarded captures:

- `.swimpay-agent/screenshots/android-vs-mock/10_receiving_methods_tokenized.png`
- `.swimpay-agent/screenshots/android-vs-mock/11_integrations_list_tokenized.png`
- `.swimpay-agent/screenshots/android-vs-mock/12_integration_detail_tokenized.png`
- `.swimpay-agent/screenshots/android-vs-mock/13_receiver_health_tokenized.png`
- `.swimpay-agent/screenshots/android-vs-mock/14_security_settings_tokenized.png`

Reason: device focus switched to `com.whatsapp`; these are not valid SwimPay evidence.

## Dashboard vs `07_dashboard_home.png`

Status: closer, not pixel-perfect.

- Background: aligned to dark premium fintech tokens with soft glow.
- Cards: glass surfaces and borders are tokenized; card heights are closer but still not identical.
- Typography: foundation components now use `mockupSp`; metric cards remain heavier than the mock.
- Spacing: horizontal margin improved after `ScreenHorizontalWide` reduction; vertical density still needs another tightening pass.
- CTA/nav: bottom nav uses mock-style flat band, but icon and label scale still need tightening.
- Chart: replaced green bars with line/area chart, closer to mock.
- Old theme residue: less visible, but density and chart component still read as non-mock.

## Review Queue vs `08_review_queue.png`

Status: comparable via staging/debug design fixture, closer, not pixel-perfect.

- Runtime state contains no review items, so staging/debug now displays a visual fixture only for design QA.
- Shell top chrome was removed from non-home main tabs, matching the mock's screen-specific top bar.
- Header card, filters, search and bank rows now follow the mock structure.
- Remaining mismatch: cards are still taller than the mock, bank logos are placeholder/asset-limited, and filter controls are still too pill-heavy.

## Review Detail vs `09_review_detail.png`

Status: comparable via staging/debug design fixture, closer, not pixel-perfect.

- Non-content/error state now falls back to visual fixture on staging/debug only.
- Hero amount now maps to the amount row instead of the bank row.
- Shell/top bar structure is close to mock.
- Remaining mismatch: vertical density is still too large, detail rows have too much air, and bottom action area needs more exact mock sizing.

## Token Audit Applied

- Primary background: `#020817`
- Secondary background: `#07111F`
- Elevated card surface: `rgba(10,18,30,0.88)`
- Border: `rgba(255,255,255,0.08)`
- Neon green: `#39FF88`
- Electric blue: `#2491FF`
- Warning gold: `#FFC933`
- Purple signal: `#8B5CF6`
- Danger red: `#FF4D6D`

## Next Corrections

- Convert mock pixel tokens to density-aware Compose dimensions instead of raw `dp`.
- Tighten dashboard metric card height, internal padding, and title wrapping.
- Tighten review queue/detail rows and button areas.
- Extend staging/debug visual fixture fallback to receiving methods, integrations, receiver health and settings for reliable mock comparison when runtime data is empty.

## Scaled Dimension Pass - 2026-05-14

Validation build:

- `npm run android:assemble:staging` passed with `GRADLE_OPTS=-Xmx2048m -Dorg.gradle.jvmargs=-Xmx2048m`.
- Staging APK installed with ADB on `adb-R5CWA0FEPZW-Xl6cnq._adb-tls-connect._tcp`.
- Roborazzi/goldens were not run.

New valid captures:

- Dashboard: `.swimpay-agent/screenshots/android-vs-mock/07_dashboard_scaled_tokens_waited.png`
- Review queue: `.swimpay-agent/screenshots/android-vs-mock/08_review_queue_scaled_tokens.png`
- Review detail attempt: `.swimpay-agent/screenshots/android-vs-mock/09_review_detail_scaled_tokens.png`
- Receiving methods: `.swimpay-agent/screenshots/android-vs-mock/10_receiving_methods_scaled_tokens.png`
- Integrations list: `.swimpay-agent/screenshots/android-vs-mock/11_integrations_list_scaled_tokens.png`
- Integration detail attempt: `.swimpay-agent/screenshots/android-vs-mock/12_integration_detail_scaled_tokens.png`
- Settings tab attempt: `.swimpay-agent/screenshots/android-vs-mock/settings_tab_scaled_tokens.png`

Result:

- Added density-aware `mockupDp()` and tightened `mockupSp()` so cards, icons, nav and text are no longer oversized on the 1080x2340 / density 510 test device.
- Dashboard is materially closer to mock density after waiting for data load; still not pixel-perfect.
- Receiving methods now uses a denser mock-token layout; real runtime only had one method, so content count does not match the mock fixture.
- Integrations and settings navigation captures need another controlled pass because some taps opened route states that are not yet mock-equivalent.
- Remaining major visual mismatch: header rows became too compact in a few screens after dimension scaling, causing subtitle clipping; this needs a targeted header component pass rather than reverting the global scale.

## Header And Integration Detail Pass - 2026-05-14

Validation build:

- `npm run android:assemble:staging` passed after header and integration detail changes.
- Staging APK installed on ADB target and launched with focus on `com.swimpay.receiver/.MainActivity`.
- Roborazzi/goldens were not run.

New captures:

- Dashboard after header fix: `.swimpay-agent/screenshots/android-vs-mock/07_dashboard_header_fixed_valid.png`
- Review queue after header fix: `.swimpay-agent/screenshots/android-vs-mock/08_review_queue_header_fixed_valid.png`
- Integration detail rebuilt: `.swimpay-agent/screenshots/android-vs-mock/12_integration_detail_rebuilt_no_summary.png`

Result:

- Restored sufficient header/top-bar height after global dimension scaling, removing the worst subtitle clipping.
- Replaced the rendered integration-detail body with mock-driven sections: API keys, webhook URL, environment/status cards, webhook secret row, warning panel, delivery stats/list and test action.
- Removed the old integration summary card from the rendered detail screen so the first viewport now starts closer to mock 12.
- Remaining mismatch: integration detail still uses live/staging values where present, so exact mock fixture text/counts do not match; visual structure is now much closer.

## Settings Main Tab Rebuild - 2026-05-14

Change:

- `PremiumSettingsScreen` now renders the mock-driven `PremiumSecurityScreen` surface directly for the active Settings tab.
- This removes the old menu/profile/settings hub from the visible Settings tab and aligns the active runtime surface with `14_security_settings.png`.

Validation:

- `npm run android:assemble:staging` passed.
- ADB capture was attempted, but the target disconnected immediately after build; no valid screenshot was produced for this pass.

Blocker:

- Device unavailable in `adb devices` after the successful build. Reconnect is required for the next screenshot pass.

## Settings Screenshot Verification - 2026-05-14

ADB target returned:

- `adb-R5CWA0FEPZW-Xl6cnq._adb-tls-connect._tcp`

Valid capture:

- `.swimpay-agent/screenshots/android-vs-mock/14_security_settings_main_tab_rebuilt.png`

Result:

- The active Settings bottom-tab now opens the `Sécurité & paramètres` mock-driven surface instead of the previous menu/profile hub.
- The old Settings hub is no longer visible on the active Settings tab.
- Remaining mismatch: the screen is still slightly too vertically large/dense compared with `14_security_settings.png`, and the top status area/device overlay affects visual comparison.
