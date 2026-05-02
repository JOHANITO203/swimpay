# 17 — Operations Runbook

## Check service status

Use Docker Compose service status.

Critical services:

- proxy;
- PostgreSQL;
- Valkey;
- NATS;
- swimpay-api;
- swimpay-signal-worker;
- swimpay-job-worker;
- swimpay-web.

## Receiver offline

Symptoms:

- no heartbeat;
- notification access false;
- queue length increasing;
- checkout sessions not receiver_armed.

Action:

1. Mark merchant receiver degraded.
2. Disable auto-confirm for new sessions if receiver health critical.
3. Show dashboard warning.
4. Keep existing sessions in manual/review mode if required.

## Bank drift detected

Symptoms:

- unknown rate increase;
- amount extraction drop;
- phone/reference visibility drop;
- review rate increase.

Action:

1. Downgrade bank profile if needed.
2. Move affected templates to `review_only`.
3. Disable auto-confirm for affected bank if critical.
4. Review new canonical templates.
5. Promote only after shadow testing.

## False positive reported

Action:

1. Locate signal id and match id.
2. Mark review/action as false positive.
3. Increment template false_positive_count.
4. Degrade template immediately if auto-confirmed.
5. Audit the incident.
6. Notify affected merchant if needed.

## Webhook failing

Action:

1. Check delivery logs.
2. Retry if endpoint available.
3. Replay manually if merchant requests.
4. Keep event id stable.
5. Do not create duplicate payment decisions.

## Restore backup

Minimum restore test procedure:

1. Provision clean database.
2. Restore latest backup.
3. Verify migrations.
4. Verify orders/signals/webhooks counts.
5. Verify app can start.

## Disable auto-confirm globally

In emergency:

- set all bank profiles to `review_only`;
- set merchants auto_confirm_enabled false;
- keep signal detection and review queue active.

## Incident documentation

Every incident must record:

- time;
- affected merchants;
- affected bank/profile/template;
- root cause;
- decision taken;
- follow-up action.
