# 159 - Receiver Evidence Submit Flow

## Goal

Add an Android debug-side submit flow for explicit PackageManager evidence.

## Requirements

- Do not enumerate installed apps.
- Submit only an explicit package evidence observation.
- Automated tests must use synthetic evidence.
- UI/result wording must say evidence is submitted for operator review, not trusted yet, review-only until approved.
- No auto-confirm wording or behavior.
