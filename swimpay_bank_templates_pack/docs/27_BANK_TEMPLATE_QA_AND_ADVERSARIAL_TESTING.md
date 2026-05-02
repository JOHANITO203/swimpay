# Bank Template QA and Adversarial Testing

## Purpose

Prevent unsafe parser behavior.

## Required test classes

```text
positive incoming transfer tests
cashback negative tests
refund negative tests
outgoing negative tests
failed transfer negative tests
promo negative tests
amount-only review tests
balance disambiguation tests
masked phone tests
truncated reference tests
template drift tests
```

## Parser invariant tests

```text
cashback never auto-confirms
refund never auto-confirms
outgoing never auto-confirms
promo never auto-confirms
failed transfer never auto-confirms
amount-only never auto-confirms
unknown template never auto-confirms
unverified bank app never auto-confirms
```

## Adversarial mutations

For each trusted incoming template generate:

```text
incoming keyword replaced with cashback keyword
incoming keyword replaced with refund keyword
amount moved to balance suffix
phone removed
phone masked
reference removed
reference truncated
outgoing keyword inserted
failed keyword inserted
promo keyword inserted
```

## CI expectation

Codex should add a test runner that loads:

```text
packages/bank-templates/fixtures/global_redacted_notifications.jsonl
packages/bank-templates/fixtures/adversarial_notifications.jsonl
packages/bank-templates/banks/*/fixtures/*.jsonl
```

and verifies expected classification and auto-confirm candidacy.
