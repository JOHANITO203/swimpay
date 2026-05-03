# Android Package Visibility Policy

Status: Sprint 4R foundation.

SwimPay Receiver may collect bank package/certificate evidence only for an exact operator-provided package name. It must not enumerate installed apps, inspect app internals, read notifications, read SMS or scrape banking apps.

Android package visibility can hide installed packages from an app unless the package is declared through manifest visibility or another permitted Android visibility path. A package that is visible through ADB but not through the app is a visibility limitation, not production trust evidence.

Allowed V1 visibility paths:

- exact `<queries><package android:name="..."/></queries>` entries for operator-selected debug/operator dry runs;
- safe manual ADB fallback for local evidence rehearsal;
- future production visibility only after legal/product review.

Forbidden V1 visibility paths:

- `QUERY_ALL_PACKAGES`;
- installed-app enumeration through PackageManager;
- wildcard package queries;
- guessing package names as verified;
- using notification capture for evidence collection.

The current debug/operator dry-run manifest includes an exact query for `ru.sberbankmobile` because the operator selected that package in Sprint 4Q. This query does not mark the package trusted, does not enable auto-confirmation and does not process bank notifications.

Evidence states remain separate from trust:

- collected evidence starts as `pending_operator_review`;
- operator approval can only create `approved_for_review_only`;
- production trust is a separate dual-control workflow;
- auto-confirmation remains disabled unless all unrelated backend gates pass in a later approved scope.
