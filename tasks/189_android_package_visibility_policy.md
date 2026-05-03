# 189 Android Package Visibility Policy

Status: completed

Document Android package visibility constraints for one-package evidence dry runs.

Implemented:

- exact package lookup remains the only supported app-side path;
- installed-app enumeration remains forbidden;
- `QUERY_ALL_PACKAGES` remains forbidden;
- ADB fallback is documented as local/operator-only;
- package visibility is explicitly not trust evidence.
