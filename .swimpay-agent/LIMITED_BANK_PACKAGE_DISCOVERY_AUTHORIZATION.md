# Limited Bank Package Discovery Authorization

generated_at: 2026-05-03T15:11:00+03:00

## Authorization

The operator authorized a limited ADB package lookup on the connected Android phone only for V1 bank package discovery.

## Allowed Keywords

- `sber`
- `tinkoff`
- `tbank`
- `vtb`
- `alfa`
- `gazprom`
- `gazprombank`

## Forbidden Actions

- no full installed-app report
- no app internals inspection
- no app opening
- no notification processing
- no SMS
- no scraping
- no Accessibility usage
- no customer data
- no production trust
- no auto-confirm
- no official bank confirmation claim

## Scope Boundary

Filtered ADB lookup may identify candidate package names only. Exact PackageManager evidence collection may run only for selected package names. Evidence must remain `pending_operator_review` or `approved_for_review_only`, with `trusted=false` and `auto_confirm_enabled=false`.
