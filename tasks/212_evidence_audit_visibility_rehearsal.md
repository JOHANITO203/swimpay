# 212 Evidence Audit Visibility Rehearsal

Status: completed

## Goal

Exercise redacted evidence audit trace visibility.

## Completed

- The rehearsal tool fetches evidence audit events with `object_type=bank_package_evidence`.
- It validates that audit traces do not expose full certificate hashes, raw phone values, raw notification text or secrets.

