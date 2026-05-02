# Current Task

task_id: 096_sprint_4f_closeout_review
source_task_file: tasks/096_sprint_4f_closeout_review.md
status: completed

## Scope

Sprint 4F - Device-side Network Smoke Wiring.

## Files Allowed

- `apps/android-receiver/**`
- Android receiver docs
- `.swimpay-agent/**`
- `tasks/090_*.md` through `tasks/096_*.md`

## Forbidden Work

- Android payment confirmation or auto-confirmation.
- SMS permissions, SMS reading, accessibility scraping or bank app scraping.
- Real bank package names or certificate fingerprints.
- Production deployment or secret changes.
- Weakening backend matching or auto-confirm gates.

## Acceptance Criteria

- Sprint 4F task files exist.
- Task queue lists 090-096 in order.
- Debug app uses `http://127.0.0.1:8080` over `adb reverse tcp:8080 tcp:8080`.
- Debug HTTP client supports health, register, heartbeat and signal upload.
- Register, heartbeat, synthetic signal upload, outbox enqueue and outbox flush run from the real Android app.
- Payloads remain synthetic and redacted.
- Full Node, Compose and Android validation passes.

## Commands Run

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `docker compose --env-file .env.example -f infra/docker-compose.yml ps`
- `GET http://localhost:8080/api-health`
- `.\gradlew.bat :app:assembleDebug --no-daemon --stacktrace`
- `.\gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace`
- `adb devices -l`
- `adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080`
- `adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk`
- `adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity`

started_at: 2026-05-02T21:35:00+03:00
completed_at: 2026-05-02T22:09:47+03:00

## Result

Sprint 4F passed. The real Android app registered a receiver, sent heartbeat, uploaded a synthetic redacted notification signal and flushed a queued synthetic outbox signal through the local backend over adb reverse. The initial signature mismatch was fixed by using compact stable JSON for HMAC input.

