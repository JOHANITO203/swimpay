# 156 - Bank Evidence Intake Endpoint

## Goal

Add a receiver/backend evidence submission endpoint.

## Endpoint

`POST /v1/bank-evidence`

## Requirements

- Require merchant/receiver authentication consistent with local receiver endpoints.
- Validate registered device.
- Validate known `bank_profile_id`.
- Validate concrete `package_name` and `cert_sha256`.
- Allow only approved evidence sources, initially `android_packagemanager` and synthetic debug fixtures for tests.
- Store submitted evidence as `pending_operator_review`.
- Never trust evidence automatically.

## Response Wording

The response must clearly state:

- evidence accepted for operator review;
- not trusted yet;
- no auto-confirm enabled.
