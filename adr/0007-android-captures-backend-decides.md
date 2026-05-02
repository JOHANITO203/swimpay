# ADR 0007 — Android Captures, Backend Decides

## Status

Accepted

## Context

The Android Receiver App receives sensitive notification data and operates on a merchant device that may be offline or compromised.

## Decision

Android responsibilities:

- capture;
- filter;
- extract;
- redact;
- sign;
- upload.

Backend responsibilities:

- verify;
- anti-replay;
- parse/validate;
- match;
- score;
- decide;
- audit.

## Consequences

No final payment confirmation is implemented on Android.
