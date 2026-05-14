# Android Edge-To-Edge Shell Report

Date: 2026-05-14

Implemented:
- Enabled edge-to-edge drawing in `MainActivity` with transparent status and navigation bars.
- Disabled light status/navigation bar icon appearance so system icons stay readable on the dark premium background.
- Removed the active runtime shell usage of the persistent top chrome.
- Kept screen titles as screen content.
- Kept back arrows on navigable sub-screens.
- Reworked the bottom navigation container to a darker glass gradient surface with stronger rounded top corners.
- Added shell-level status-bar padding around content while keeping the background behind the status bar.
- Added status-bar padding to payment detail standalone states.

Not implemented:
- No backend, API, database, webhook, payment runtime, receiver runtime or SDK changes.
- No Roborazzi or golden update.

