# Task 533 - Receiver / Intelligence Guardrails

## Goals

- Add static/runtime guardrails proving:
  - no SMS permission;
  - no Accessibility service;
  - no QUERY_ALL_PACKAGES;
  - no broad installed-app enumeration;
  - no raw notification storage/upload;
  - no raw phone/card in logs/UI/webhooks;
  - no official bank confirmation claim;
  - no auto-confirmation;
  - no runtime rule mutation or profile promotion from feedback;
  - Android Receiver does not confirm orders or send developer webhooks;
  - public SDK/webhook semantics are unchanged.

## Safety

- Do not weaken existing product-truth tests.

