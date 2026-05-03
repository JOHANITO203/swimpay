# Task 184 - Real PackageManager Lookup One Package

Status: completed

Use Android PackageManager evidence lookup for exactly:

```text
ru.sberbankmobile
```

Rules:

- do not enumerate installed apps;
- do not inspect app data;
- do not open the bank app;
- collect only package name, signing certificate SHA-256, app version if available and install source if available;
- if the package is not found, stop with `PACKAGE_NOT_FOUND`.

Result:

- app-side debug PackageManager lookup returned `package_not_found`;
- exact ADB PackageManager query for `ru.sberbankmobile` found the package;
- collected metadata from the exact package only:
  - package: `ru.sberbankmobile`
  - app version: `17.5.0`
  - install source: `com.sec.android.app.samsungapps`
  - certificate SHA-256 masked in reports as `fea43e...99a2ea`.
