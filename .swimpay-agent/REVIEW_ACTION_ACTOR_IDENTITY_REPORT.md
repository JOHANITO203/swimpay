# Review Action Actor Identity Report

Date: 2026-05-12

## Result

Review decisions now have a root-cause actor identity contract instead of a legacy compatibility shim.

## Model

- `actor_id`: nullable UUID for real merchant/admin/user identity only.
- `actor_type`: required actor class for runtime attribution.
- `actor_source`: optional safe source label.
- `actor_display`: optional safe UI/debug label.

Allowed `actor_type` values:

- `android_merchant`
- `dashboard_merchant`
- `system`
- `job_worker`
- `receiver_device`
- `admin`

## Implementation

- API review action endpoints infer actor identity from the authenticated context.
- Android mobile sessions produce `actor_type=android_merchant` and preserve the mobile user UUID when available.
- Dashboard/BFF sessions produce `actor_type=dashboard_merchant` and preserve the dashboard user UUID.
- Dev bearer calls remain traceable as `actor_type=dashboard_merchant`, `actor_source=dev_test_bearer`, with no fake UUID.
- No-notification fallback audit attribution is `actor_type=job_worker`.
- Android action payloads no longer send the legacy `actor_id=android_merchant` marker.

## Migration

Added:

```txt
packages/database/migrations/020_review_action_actor_identity.sql
```

VPS command after deploy:

```bash
cd /etc/dokploy/compose/swimpay-swimpay-merchant-usjsm2/code
sudo docker exec -i swimpay-postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < packages/database/migrations/020_review_action_actor_identity.sql
```

## Tests

Passed locally:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `npm run test:replay`
- `npm run test:matching`
- `npm run test:privacy`
- `npm run test:webhooks`
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:assembleDebug --no-daemon --stacktrace --max-workers=1`

Targeted coverage added:

- Android legacy actor marker cannot crash backend.
- Dashboard confirmation preserves a real user UUID.
- Android confirmation/rejection is attributed to `android_merchant`.
- Worker fallback attribution remains `job_worker`.
- Android no longer sends `actor_id` in review action payloads.
- Public webhook events do not expose actor internals.

## Deployment Note

The code expects the new review action actor columns. Apply migration `020_review_action_actor_identity.sql` on staging before trusting online review actions after deploy.
