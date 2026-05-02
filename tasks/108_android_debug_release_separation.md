# 108 - Android Debug/Release Separation

Status: completed

Scope:
- Ensure debug smoke controls and debug backend defaults remain debug-only.
- Ensure release does not expose synthetic smoke actions.

Acceptance:
- Debug broadcast receiver exists only in debug source set.
- Main UI hides smoke buttons in release through `BuildConfig.DEBUG`.
- Static checks prove release manifest has no debug receiver, SMS permission or Accessibility service.
