# 191 Package Not Visible Vs Not Found

Status: completed

Improve evidence lookup semantics.

Implemented statuses:

- `FOUND`;
- `PACKAGE_NOT_FOUND`;
- `PACKAGE_NOT_VISIBLE_OR_NOT_DECLARED`;
- `INVALID_PACKAGE_NAME`.

Android `PackageManager.NameNotFoundException` now surfaces as a visibility/not-declared limitation for app-side operator UX, because Android can hide packages that are installed but not visible to the app.
