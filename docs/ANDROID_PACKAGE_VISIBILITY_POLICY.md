# Android Package Visibility Policy

Status: REAL-CAPTURE-1 update.

SwimPay Receiver may collect bank package/certificate evidence only for an exact operator-provided package name. It must not enumerate installed apps, inspect app internals, read notifications, read SMS or scrape banking apps.

Android package visibility can hide installed packages from an app unless the package is declared through manifest visibility or another permitted Android visibility path. A package that is visible through ADB but not through the app is a visibility limitation, not production trust evidence.

Allowed V1 visibility paths:

- exact V1 supported-bank package visibility entries in the main Receiver manifest for Bank Target Lock detection;
- exact `<queries><package android:name="..."/></queries>` entries for operator-selected debug/operator dry runs when a package is not already in the supported-bank list;
- safe manual ADB fallback for local evidence rehearsal;
- future additional production visibility only after legal/product review.

Forbidden V1 visibility paths:

- `QUERY_ALL_PACKAGES`;
- installed-app enumeration through PackageManager;
- wildcard package queries;
- guessing package names as verified;
- using notification capture for evidence collection.

The current main Receiver manifest includes exact queries for the five V1 supported bank package targets:

- `ru.sberbankmobile`;
- `com.idamob.tinkoff.android`;
- `ru.vtb24.mobilebanking.android`;
- `ru.alfabank.mobile.android`;
- `ru.gazprombank.android.mobilebank.app`.

These queries are visibility only. They do not mark packages trusted, do not enable auto-confirmation and do not process bank notifications. They only allow `BankTargetLock` to ask Android whether each exact supported package exists.

Evidence states remain separate from trust:

- collected evidence starts as `pending_operator_review`;
- operator approval can only create `approved_for_review_only`;
- production trust is a separate dual-control workflow;
- auto-confirmation remains disabled unless all unrelated backend gates pass in a later approved scope.
