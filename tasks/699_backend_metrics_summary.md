# Task 699 - Backend metrics summary

Status: completed

Goal: implement or wire `GET /v1/merchant/metrics/summary?range=7d|30d|today`.

Rules:
- merchant id must come from authenticated context;
- no client-controlled `merchant_id`;
- use real persisted orders/reviews/webhook state only;
- no fake/demo numbers;
- no raw PII or raw notification text.
