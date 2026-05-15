# Android Google Session Diagnostic

generated_at: 2026-05-15T00:00:00+03:00

## Question

Does the Android Merchant Google button have a backend-ready session mechanism
that can restore a profile later without storing user profile data locally?

## Finding

Yes, the architecture exists:

- Android obtains a temporary Google ID token through Credential Manager.
- Android sends the ID token to backend only for exchange/linking.
- Android does not store the Google token.
- Backend links/recover accounts by Google `sub`.
- Backend returns a SwimPay Android mobile session token with `spm_` prefix.
- Android stores only the SwimPay mobile session locally.

## Android Local Session Storage

Current store:

- `SharedPreferencesPremiumMobileMerchantSessionStore`
- preference file: `swimpay_premium_mobile_session`
- token protected with `AndroidKeystoreStringProtector`
- saved fields:
  - merchant id
  - user id
  - display handle
  - protected mobile session token
  - expiry timestamp

This matches the product direction: no Google token/profile data stored locally.

## Backend Readiness

Backend contracts and handlers exist:

- `POST /v1/android-merchant/auth/google/link`
- `POST /v1/android-merchant/auth/google/exchange`
- `android_merchant_sessions`
- `users.google_sub`
- `android_merchant_devices`

Backend tests cover:

- Google optional recovery/linking;
- Google link then recover;
- mobile session creation on recovery;
- Android bearer `spm_...` session usage.

## Staging Evidence

- `https://staging.swimpay.pro/api-health` returned `200`.
- A synthetic `/v1/android-merchant/auth/google/exchange` probe with a fake token
  and valid-shaped device proof timed out instead of returning a fast rejection.

## Root-Cause Hypothesis

Most likely issue is not Android local storage. The current evidence points to
the staging backend Google verification boundary:

- missing or mismatched Google audience/client configuration; or
- outbound call to Google token verification hanging/slow; or
- no timeout on backend Google tokeninfo fallback.

## Required Next Fix

Add a focused Google-session hardening sprint:

1. Confirm staging env has matching:
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `SWIMPAY_ANDROID_STAGING_GOOGLE_SERVER_CLIENT_ID`
2. Add backend timeout around Google tokeninfo fallback.
3. Add diagnostics that reveal only masked audience/config status, never ID token.
4. Add Android test proving successful Google recovery persists the returned
   `spm_...` session locally.
5. Add a device smoke that links Google, force-stops the app, relaunches, and
   confirms the session is restored from local protected storage.

## 2026-05-15 Update

Implemented locally:

- Added a 2.5 second timeout to the backend Google tokeninfo fallback.
- Added masked backend diagnostics for rejected Google ID tokens:
  - provider;
  - purpose;
  - masked token audience hint;
  - configured audience count;
  - masked configured audience hints.
- The backend logs do not include the raw Google ID token.
- The response diagnostics continue to avoid raw ID token exposure.

Validation:

- Passed: `npm test -- --run apps/api/src/android-merchant.test.ts`.
- Passed: `npm run typecheck`.

Operator device test still required:

1. Create or recover an Android merchant session.
2. Link Google from Security Settings.
3. Force-stop the app.
4. Relaunch and confirm local session restoration.
5. If local app data is cleared, use `Se connecter` with Google to recover from backend link.
