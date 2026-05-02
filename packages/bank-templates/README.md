# SwimPay Bank Templates

This package contains the deterministic Bank Template Learning assets for SwimPay V1.

It is not a payment confirmation system. It classifies merchant-side authorized bank notifications into operational payment signals.

## V1 banks

- Sberbank
- Tinkoff / T-Bank
- VTB Bank
- Alfa-Bank
- Gazprombank

## Package contents

```text
dsl/
  BANK_TEMPLATE_DSL.md

schemas/
  JSON schemas for profiles, templates, policies and fixtures

shared/
  common Russian lexicons and extractor patterns

policies/
  lifecycle, scoring, drift, mutation, quality and privacy policies

banks/
  sberbank/
  tbank/
  vtb/
  alfa/
  gazprombank/

fixtures/
  global redacted fixtures and adversarial cases

operations/
  operational runbooks for template review, drift and incidents

src/
  TypeScript interfaces and constants for Codex implementation
```

## Core concept

A bank notification is converted into a canonical redacted template:

```text
Поступление 137 ₽
Перевод от Иван Петров +7 999 123-45-67. Коммент SWP-A8K2
```

becomes:

```text
поступление <AMOUNT> <CURRENCY>
перевод от <PERSON> <PHONE>. коммент <REFERENCE>
```

The parser can classify this as `incoming_customer_transfer`, but final payment confirmation is performed only by the backend matching and trust core.

## Template lifecycle

```text
new
→ learning
→ shadow_testing
→ trusted_low_amount
→ trusted
→ degraded / review_only / disabled
```

## V1 auto-confirm rule

Auto-confirm may happen only when the final backend decision has:

- amount exact
- active payment session
- direction `incoming_customer_transfer`
- sender phone exact OR reference exact
- trusted device
- trusted bank profile
- trusted template
- notification unique
- no collision
- score >= configured threshold

Amount alone is never sufficient.
