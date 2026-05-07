# Task 586 - Bank Target Lock Non-Debug Runtime

Goal:
- Prepare a non-debug path that accepts only explicitly enabled supported bank package targets.

Required:
- Keep exact package allowlist only.
- Ignore unsupported package notifications immediately.
- Do not add `QUERY_ALL_PACKAGES`.
- Do not add broad installed-app enumeration.
- Do not add SMS or Accessibility.
- Add tests.

Product truth:
- Android Receiver listens only to supported activated bank targets.
- Android Receiver never confirms orders.

