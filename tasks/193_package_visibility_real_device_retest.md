# 193 Package Visibility Real Device Retest

Status: completed

Retest app-side explicit package evidence lookup after adding debug manifest visibility.

Expected:

- app-side `PackageManager` can find `ru.sberbankmobile` when installed and visible;
- evidence submission remains `pending_operator_review`;
- `trusted=false`;
- `auto_confirm_enabled=false`;
- if still not visible, ADB exact-package fallback remains documented.
