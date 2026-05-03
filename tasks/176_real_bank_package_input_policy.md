# Task 176 - Real Bank Package Input Policy

Status: completed

Sprint 4P requires real package evidence collection to start from one explicit operator/user supplied `package_name`.

Implemented policy:

- package input is debug/operator-only;
- blank values are rejected;
- wildcard/enumeration-like values are rejected;
- `TO_VERIFY` is rejected;
- `synthetic_debug_only` is rejected for real evidence;
- SwimPay does not guess package names as verified;
- SwimPay does not enumerate installed apps;
- SwimPay does not scrape app internals;
- SwimPay does not read app data;
- SwimPay does not process notifications for evidence collection.

The operator may provide a package name from external/manual knowledge, but SwimPay only records evidence after Android PackageManager confirms that exact package.
