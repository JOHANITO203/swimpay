# Task 687 - Android Merchant Subscreens Inventory

Status: pending

Objective: audit the current Android merchant app structure before implementing the settings sub-screens.

Scope:
- active Android app entrypoint;
- navigation system;
- menu/settings screens;
- theme system;
- string/localization support;
- local storage mechanism;
- backend API wiring;
- biometric/app-lock utilities;
- support/settings APIs.

Output:
- `.swimpay-agent/ANDROID_SUBSCREENS_INVENTORY.md`

Rules:
- audit first;
- do not change payment runtime;
- do not add SMS, Accessibility, bank scraping, QUERY_ALL_PACKAGES or broad enumeration;
- do not expose raw notification text, raw phone/card values or secrets.
