# Real Package Evidence Input

generated_at: 2026-05-03T11:35:33+03:00

## Operator-provided Package Name

```text
ru.sberbankmobile
```

## Input Validation

Status: accepted

Reason:

- exact package-like string;
- no wildcard;
- no whitespace-separated multiple values;
- not `TO_VERIFY`;
- not `synthetic_debug_only`.

## Boundary

This input authorizes PackageManager metadata lookup for this exact package only. It does not authorize installed-app enumeration, notification processing, SMS access, app scraping, production trust or auto-confirmation.
