# Task 177 - Android Explicit Package Evidence Lookup

Status: completed

Added Android-side explicit package evidence lookup boundaries:

- `RealBankPackageInputPolicy`
- `ExplicitPackageEvidenceLookup`
- `ExplicitPackageEvidenceLookupResult`
- `BankPackageEvidenceLookupStatus`

The PackageManager collector now supports `lookupExplicitPackageEvidence(...)` for one exact package name.

Results:

- `FOUND`
- `PACKAGE_NOT_FOUND`
- `INVALID_PACKAGE_NAME`

The collector still does not enumerate installed apps and does not inspect app internals.
