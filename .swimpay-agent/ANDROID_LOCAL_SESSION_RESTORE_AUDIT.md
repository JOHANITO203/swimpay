# Android Local Session Restore Audit

generated_at: 2026-05-15T23:10:00+03:00

## Result

Local merchant session restore already exists.

## Existing Mechanism

- `SharedPreferencesPremiumMobileMerchantSessionStore` persists merchant id, user id, display handle, protected mobile session token and expiry timestamp.
- The token is protected through `AndroidKeystoreStringProtector`.
- `PremiumMerchantApp` reads `mobileMerchantSessionStore.currentSession()` on startup and creates the mobile runtime when the session is valid.
- `PremiumNavigation.initialRoute()` skips account entry only when a valid local mobile merchant session exists.
- Google recovery saves the backend-returned mobile session locally after successful exchange. Android does not store Google tokens as profile data.

## Remaining Device Test

1. Link/recover with Google on staging.
2. Confirm account opens the app.
3. Force-stop app.
4. Relaunch app.
5. Expected: app restores the local mobile session without asking for Google again, unless the backend-issued session is expired or app data was cleared.

## Non-Goal

No new user data store was added. No Google token persistence was added.

