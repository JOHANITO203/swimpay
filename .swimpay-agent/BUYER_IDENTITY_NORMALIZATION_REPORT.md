# Buyer Identity Normalization Report

## Implemented

- Added deterministic buyer identity normalization in `@swimpay/contracts`.
- Supports Latin, Cyrillic, mixed and unknown script detection.
- Generates:
  - normalized full name;
  - Latin variants;
  - Cyrillic variants;
  - initials variants;
  - reversed-order variants;
  - buyer name fingerprint.

## Boundaries

- No LLM.
- No external translation API.
- No network service.
- Matching support is deterministic transliteration and normalization only.

## Usage

The backend persists normalized identity artifacts inside the Expected Payment Profile. These are matching hints only and do not confirm payment.

