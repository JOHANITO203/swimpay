# Task 715 - Bank launcher deeplink registry

Status: completed_with_native_android_launcher_pending

Goal: audit and implement the bank launcher registry.

Registry fields:
- bank id;
- package name;
- deeplink URI template;
- prefill capability flags;
- tested status;
- fallback strategy.

Output:
- `.swimpay-agent/BUYER_BANK_LAUNCHER_DEEPLINK_REPORT.md`

Rules:
- exact V1 supported bank packages only;
- no `QUERY_ALL_PACKAGES`;
- no broad installed-app enumeration;
- never assume prefill unless explicitly validated.
