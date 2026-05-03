# Task 180 - Evidence Collection Privacy and Safety Checks

Status: completed

Added or strengthened tests/static checks proving:

- no installed-app enumeration API path is exposed;
- package lookup requires one explicit `package_name`;
- unknown packages fail with `package_not_found`;
- no SMS permission/path is introduced;
- no Accessibility scraping service is introduced;
- no raw phone is emitted;
- no raw notification text is emitted;
- evidence submission does not enable auto-confirmation;
- evidence submission does not mark bank profiles trusted;
- production trust endpoints remain separate and dual-control protected.
