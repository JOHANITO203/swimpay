# Android Screen By Screen Acceptance Matrix

Date: 2026-05-14

Acceptance target for this sprint: remove mixed theme and reach close visual match. Pixel-perfect is not claimed.

| Screen | Status | Rebuilt | Old theme residue visible | Manual QA notes |
| --- | --- | --- | --- | --- |
| 01_login_welcome | close | yes | no obvious residue | Account frame, language switch, back/action rows now use mockup dark/glass styling. |
| 02_notification_access | close | yes | no obvious residue | Notification card rebuilt with mockup glass card, icon tile and cyan/green state. |
| 03_bank_selection | close | yes | no obvious residue | Bank rows show logo, name, status and selected checkbox; Ozon selectable when present in UI state. |
| 04_receiving_setup | close | yes | no obvious residue | Card/SBP/Card+SBP visual states retained; destination example block added with bank logo and masked value. |
| 05_site_app_setup | close | yes | no obvious residue | Old card treatment replaced by mockup glass/link icon treatment. |
| 06_webhook_test | close | yes | no obvious residue | Success/action card, info panel, checklist and CTA stack now follow mockup hierarchy more closely. |
| 07_dashboard_home | close | yes | no obvious residue | Live screenshot confirms dark premium glass cards and mockup bottom nav; structure still not pixel-perfect. |
| 08_review_queue | close | already | no obvious residue | Existing review queue already used mockup dark/glass treatment. |
| 09_review_detail | close | already | no obvious residue | Existing review detail already used mockup dark/glass treatment. |
| 10_receiving_methods | close | yes | no obvious residue | Add/edit forms, bank logos and SBP action styling are mockup-aligned. |
| 11_integrations_list | close | yes | no obvious residue | Dedicated integrations list remains mockup-styled and uses shared integration state. |
| 12_integration_detail | close | yes | no obvious residue | Developer/detail form fields now use mockup dark field styling. |
| 13_receiver_health | close | already | no obvious residue | Receiver health surface uses mockup glass cards and icon tiles. |
| 14_security_settings | close | yes | no obvious residue | Security/settings rows use mockup cards, icon tiles and state pills. |

## Evidence

- After screenshot: `.swimpay-agent/screenshots/android-full-visual-rebuild/after_launch.png`
- Device install and launch succeeded.
- Roborazzi was not used as a blocking gate.
