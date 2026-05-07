# Task 610 - Real staging observability and logs

Status: blocked_until_staging_stack_runs

Goal: review logs and evidence from the real staging run.

Checks:
- no raw notification text;
- no raw phone/card;
- no bank credentials;
- no Google tokens in frontend;
- no API keys or webhook secrets in logs;
- health endpoints, queues, webhook delivery and receiver heartbeat OK.

Deliverable:
- `.swimpay-agent/STAGING_OBSERVABILITY_LOGS_REPORT.md`
