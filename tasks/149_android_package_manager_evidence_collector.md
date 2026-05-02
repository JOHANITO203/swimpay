# 149 — Android PackageManager Evidence Collector Boundary

## Goal

Add a platform boundary for collecting signing certificate evidence from an explicit package name.

## Scope

- Use Android PackageManager only when an operator-selected package name is provided.
- Do not enumerate arbitrary apps for hidden collection.
- Return observed package/cert evidence as untrusted metadata.
- Keep JVM tests on pure policy/model code.

## Safety Rules

- No scraping.
- No SMS.
- No automatic trust.
