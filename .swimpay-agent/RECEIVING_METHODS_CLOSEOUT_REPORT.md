# Receiving Methods Closeout Report

Date: 2026-05-08

## Summary

Merchant receiving methods are now a real persisted product feature across backend API, Android onboarding/menu UI, web merchant surface and checkout context.

## Files Touched

Backend/API:

- `apps/api/src/server.ts`
- `apps/api/src/orders.ts`
- `packages/contracts/src/index.ts`
- `packages/database/migrations/011_receiving_route_hmac_last4.sql`

Android:

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`

Web:

- `apps/web/src/index.ts`
- `apps/web/src/screens/MerchantScreens.ts`

Docs/tests:

- receiving-method API, Android, web and checkout tests updated.

## Validation Completed

- `npm run typecheck`
- `npm run android:doctor`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `apps/android-receiver/android/gradlew.bat :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`
- `apps/android-receiver/android/gradlew.bat :app:assembleDebug --no-daemon --stacktrace --max-workers=1`

Targeted API/web/contracts/Android receiving-method suites also passed before full validation.

## Blockers

No product blocker found in the implemented receiving-method path.

Operational blocker if staging/live is needed: migrations must be applied on the VPS database before staging API calls depend on HMAC/last4 columns.
