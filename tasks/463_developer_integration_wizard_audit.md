# Task 463 - Developer Integration Wizard Audit

## Goal

Audit merchant-facing integration wizard readiness.

## Check

- integration type choice: Web / Android
- API key generation
- webhook secret generation
- webhook URL configuration
- code snippets
- test webhook
- delivery history
- regenerate/revoke keys
- developer details mode

## Expected V1

Web and Android only. Secrets masked, shown once if applicable and never placed in Android APK snippets.

## Output

Create `.swimpay-agent/DEVELOPER_INTEGRATION_WIZARD_AUDIT.md`.

