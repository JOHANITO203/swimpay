# Task 590 - Android Receiver Real-Runtime Guardrails

Goal:
- Add guardrails for Android Receiver real-runtime safety.

Required:
- no SMS permission;
- no Accessibility service;
- no `QUERY_ALL_PACKAGES`;
- no broad app enumeration;
- no raw notification storage/upload;
- no Android order confirmation;
- no Android developer webhook;
- auto-confirmation remains disabled;
- only activated supported banks can enter the listener pipeline.
- Add tests.

Do not weaken existing safety tests.

