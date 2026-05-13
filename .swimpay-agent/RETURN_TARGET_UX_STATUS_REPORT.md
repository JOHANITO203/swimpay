# Return Target UX Status Report

Date: 2026-05-13

## Observed behavior

- Hosted checkout reached `/merchant/return-unavailable?...`.

## Classification

1. returnScheme absent or not propagated in that flow: **possible**
2. `return_url` absent: **not for older rows; present in many orders**
3. `return_url` unsafe/non-UX endpoint: **confirmed for older data**
   - Example pattern seen: API endpoint used as return URL (`/api/v1/payments/swimpay/return?...`)
4. host app not rebuilt with updated SDK return propagation: **possible**
5. manifest/app link not configured to capture scheme: **possible**
6. checkout missing `swimpay_return_scheme` query value: **possible**

## Root UX point

`return-unavailable` is now a deterministic safe fallback and indicates integration config mismatch, not payment failure.

## Required integration correction

- Android host flow: pass valid `returnScheme` and configure deep-link handling in host app.
- Web flow: pass buyer-facing `return_url`, not raw API JSON endpoint.

