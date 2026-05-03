# 211 Evidence Dashboard Live API Rehearsal

Status: completed

## Goal

Exercise the safe evidence review dashboard API from operator tooling.

## Completed

- The rehearsal tool fetches `/v1/admin/bank-evidence/review-dashboard`.
- It validates masked evidence output and dashboard safety flags.
- It rejects full certificate hashes, raw phone values and raw notification text.

