# 040 - Snapshot Extractor And Coalescer

## Goal

Extract Android notification snapshot fields and coalesce notification updates safely.

## Scope

- Support title/text/bigText/subText/summary/textLines/ticker/channel/group/postTime/package fields.
- Add `coalescing_window_ms`.
- Dedupe duplicate snapshots.
- Produce stable hashes.

## Guardrails

- Do not upload raw snapshot text.
- Do not create duplicate payment signals from repeated snapshot updates.

## Acceptance

- Tests cover extraction and duplicate coalescing.
