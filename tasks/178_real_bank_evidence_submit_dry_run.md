# Task 178 - Real Bank Evidence Submit Dry Run

Status: completed

Added debug/operator submission flow for explicit PackageManager evidence:

- debug action id: `submit_explicit_package_evidence`;
- required extra: `package_name`;
- optional extra: `bank_profile_id`;
- evidence is submitted to `/v1/bank-evidence`;
- backend response remains `pending_operator_review`, `trusted: false`, `auto_confirm_enabled: false`.

No live real evidence was collected because no real package name was provided by the user/operator.
