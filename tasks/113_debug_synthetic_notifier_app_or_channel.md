# 113 - Debug Synthetic Notifier App Or Channel

## Goal

Create a debug-only synthetic notification source for listener smoke validation.

## Scope

- Post synthetic incoming and negative notification examples.
- Keep source debug-only and clearly synthetic.
- Use safe examples with placeholders such as `<PHONE>`, `<PERSON>` and `<REFERENCE>`.

## Guardrails

- Do not include debug source in production trust policy.
- Do not use real bank notification content.
- Do not request SMS or Accessibility permissions.
