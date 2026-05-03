# 194 Evidence Visibility Safety Tests

Status: completed

Add tests and static checks for package visibility safety.

Covered:

- no `QUERY_ALL_PACKAGES`;
- no installed-app enumeration APIs;
- no SMS permissions;
- no Accessibility scraping service;
- exact debug query does not imply trust;
- review-only remains review-only;
- no raw phone or raw notification text;
- no auto-confirm from evidence.
