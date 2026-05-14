# Android Screen By Screen Acceptance Matrix

Date: 2026-05-14

| Screen | Status | Matches mockup | Old theme residue visible | Notes |
| --- | --- | --- | --- | --- |
| 01_login_welcome | close | no | low | Uses mockup logo/background/cards, still needs spacing/logo fine tune. |
| 02_notification_access | partial | no | low | Shared tokens fixed; screen-specific structure still needs exact mockup rebuild pass. |
| 03_bank_selection | partial | no | low | Bank row logo/name/check structure improved; Ozon selectable in UI state. |
| 04_receiving_setup | partial | no | low | Carte/SBP/Card+SBP visual multi-select added; exact card hierarchy still needs polish. |
| 05_site_app_setup | partial | no | low | Shared mockup surfaces apply; layout still needs direct reference matching. |
| 06_webhook_test | partial | no | low | Shared mockup surfaces apply; timeline hierarchy still needs direct reference matching. |
| 07_dashboard_home | partial | no | medium | Live screenshot shows mockup colors/glass/nav but dashboard structure still differs. |
| 08_review_queue | partial | no | low | Review cards are mockup-styled; density still needs direct polish. |
| 09_review_detail | partial | no | low | Dark/glass visual direction applied; exact hierarchy still needs polish. |
| 10_receiving_methods | partial | no | low | Mockup theme active; list density/actions still need exact pass. |
| 11_integrations_list | partial | no | low | Dedicated visual surface added; data model is still reused from connected-site state. |
| 12_integration_detail | partial | no | low | Mockup theme active; exact blocks need polish. |
| 13_receiver_health | partial | no | low | Mockup theme active; exact grid needs polish. |
| 14_security_settings | partial | no | low | Mockup theme active; exact sessions/settings layout needs polish. |

Manual QA capture:

- `.swimpay-agent/visual-qa-android/android-full-rebuild-live-2.png`

Result: old light theme no longer visible on live home. The home screen remains structurally different from mockup 07, so status remains partial.
