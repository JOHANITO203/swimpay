# Task 638 - Bank Target Lock Readiness

Status: completed_ready_with_device_metric_pending

Objective: verify Bank Target Lock behavior before real notification testing.

Checks:
- Supported activated bank accepted.
- Supported non-activated bank rejected.
- Unsupported package rejected.
- No QUERY_ALL_PACKAGES.
- No broad installed-app enumeration.

Deliverable:
- `.swimpay-agent/BANK_TARGET_LOCK_READINESS.md`

Result:
- Code and tests align with exact V1 supported package probing.
- Real device metric remains pending: record detected supported-bank count through the installed staging APK without enumerating installed apps.

