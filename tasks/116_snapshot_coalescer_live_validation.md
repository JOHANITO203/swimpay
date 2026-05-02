# 116 - Snapshot Coalescer Live Validation

## Goal

Validate notification snapshot extraction and coalescing from the listener path.

## Scope

- Capture title, text, big text, sub text, text lines, channel id, package name, notification id/tag and post time when available.
- Deduplicate duplicate snapshots.
- Produce stable notification and semantic hashes.

## Guardrails

- Do not persist raw notification fields.
- Hashes must not reveal raw phone or raw notification text.
