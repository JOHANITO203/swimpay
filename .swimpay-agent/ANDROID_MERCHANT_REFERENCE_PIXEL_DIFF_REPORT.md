# Android Merchant Reference Pixel Diff Report

Date: 2026-05-13

This automated comparison normalizes each reference PNG to the Roborazzi golden viewport, then computes color-distance metrics.
It is a measurement aid, not a pixel-perfect gate, because the provided references include Android system chrome and taller device captures.

| Screen | Reference | Ref size | Golden size | Mean abs delta | RMS delta | Automated level |
| --- | --- | --- | --- | --- | --- | --- |
| `01_login_welcome` | `01_login_welcome.png` | 853x1844 | 432x932 | 0.1047 | 0.2128 | partial |
| `02_notification_access` | `02_notification_access.png` | 862x1824 | 432x932 | 0.1591 | 0.3478 | partial |
| `03_bank_selection` | `03_bank_selection.png` | 863x1823 | 432x932 | 0.1211 | 0.2459 | partial |
| `04_receiving_setup` | `04_receiving_setup.png` | 863x1823 | 432x932 | 0.3591 | 0.5692 | reference-drift |
| `05_site_app_setup` | `05_site_app_setup.png` | 864x1821 | 432x932 | 0.2035 | 0.4104 | reference-drift |
| `06_webhook_test` | `06_webhook_test.png` | 854x1842 | 432x932 | 0.0791 | 0.1683 | close |
| `07_dashboard_home` | `07_dashboard_home.png` | 864x1821 | 432x932 | 0.2349 | 0.4228 | reference-drift |
| `08_review_queue` | `08_review_queue.png` | 864x1821 | 432x932 | 0.2336 | 0.4267 | reference-drift |
| `09_review_detail` | `09_review_detail.png` | 887x1774 | 432x932 | 0.0994 | 0.1869 | partial |
| `10_receiving_methods` | `10_receiving_methods.png` | 863x1823 | 432x932 | 0.2373 | 0.4263 | reference-drift |
| `11_integrations_list` | `11_integrations_list.png` | 864x1821 | 432x932 | 0.2187 | 0.3981 | reference-drift |
| `12_integration_detail` | `12_integration_detail.png` | 816x1928 | 432x932 | 0.2187 | 0.3981 | reference-drift |
| `13_receiver_health` | `13_receiver_health.png` | 864x1821 | 432x932 | 0.2281 | 0.4181 | reference-drift |
| `14_security_settings` | `14_security_settings.png` | 863x1823 | 432x932 | 0.2306 | 0.4211 | reference-drift |

Pixel-perfect is not claimed. Roborazzi remains the drift gate for implemented Compose screens.
