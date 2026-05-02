# 00 — Project Overview

## Product name

SwimPay V1 — Payment Signal Engine.

## Problem

Small merchants selling digital products often receive bank transfers manually and validate them manually. The current flow is slow:

```text
buyer pays by bank transfer
→ merchant receives a bank notification
→ merchant checks manually
→ product is released manually
```

This does not scale and creates friction for buyers and merchants.

## SwimPay solution

SwimPay converts authorized bank notifications received on the merchant Android device into operational payment signals.

The system then:

- parses the signal;
- detects whether it is an incoming customer transfer;
- extracts amount, currency, phone, reference and useful metadata;
- matches it with a pending payment session;
- computes confidence/risk;
- auto-confirms low-risk cases;
- routes ambiguous cases to review;
- emits signed webhooks to developer systems.

## What SwimPay is

SwimPay is:

- a Payment Signal Engine;
- a merchant-side notification reconciliation system;
- a matching and scoring infrastructure;
- a developer API and webhook system;
- an Android Receiver App with merchant consent.

## What SwimPay is not

SwimPay is not:

- a bank;
- a PSP;
- an SBP integration;
- a payment initiator;
- a wallet;
- a custody system;
- an official bank confirmation provider.

## V1 target banks

V1 targets:

- Sberbank;
- Tinkoff / T-Bank;
- VTB Bank;
- Alfa-Bank;
- Gazprombank.

Package names and signing certificate fingerprints must be verified before trust.

## Core product principle

A bank notification is not a transaction record and not an official bank confirmation. It is an operational signal.

The system must always be honest about this limitation.

## V1 deployment constraint

V1 runs on one Ubuntu server:

- 2 GB RAM;
- 50 GB storage;
- Docker Compose;
- PostgreSQL;
- Valkey;
- NATS JetStream;
- Caddy or Nginx.

The architecture must be microservice-ready, but deployed compactly at first.
