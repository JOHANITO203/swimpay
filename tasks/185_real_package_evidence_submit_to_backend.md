# Task 185 - Real Package Evidence Submit To Backend

Status: completed

Submit PackageManager metadata for `ru.sberbankmobile` to:

```text
POST /v1/bank-evidence
```

Expected result:

- `pending_operator_review`;
- `trusted: false`;
- `auto_confirm_enabled: false`;
- no phone data;
- no notification data;
- no customer data.

Result:

- evidence id: `f4069615-028b-4329-a136-115495bd058c`
- initial status: `pending_operator_review`
- `trusted: false`
- `auto_confirm_enabled: false`
