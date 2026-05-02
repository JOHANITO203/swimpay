# Bank Template Pack Overview

## Purpose

This document explains how the Bank Template Pack fits into SwimPay.

The pack is located at:

```text
packages/bank-templates
```

It provides the deterministic template infrastructure for V1 banks:

```text
Sberbank
Tinkoff / T-Bank
VTB
Alfa-Bank
Gazprombank
```

## Why this pack exists

The parser must not be improvised inside controllers or workers.

Bank templates must be:

```text
versioned
auditable
testable
redacted
bank-specific
drift-aware
safe by default
```

## Key design

The template system has three layers:

```text
1. Shared lexicons and patterns
2. Bank-specific profiles and templates
3. Policies for lifecycle, drift, mutation, scoring and privacy
```

## Production truth

A template is never enough to confirm payment.

A template only says:

```text
This notification appears to match a known bank signal family.
```

The backend matching and trust core decides:

```text
auto_confirm
needs_review
reject
wait
```

## V1 principle

Start all bank profiles in `learning` or `shadow_testing`.

Promote only with evidence.
