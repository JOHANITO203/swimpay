# Decision Log

## 2026-05-02 - Local runner is a coordinator

The `.swimpay-agent` system prepares and validates tasks but does not edit product code automatically.

Reason: SwimPay development must stay task-bounded, auditable, and reviewable.

## 2026-05-08 - Android account entry and onboarding truth

The Android merchant app is Android-first for account creation and receiver
onboarding. When no valid mobile merchant session exists, the app starts with
login/create-account before onboarding.

Current truth:

- `Créer un compte` creates a lightweight merchant account and starts onboarding.
- `Se connecter` recovers an existing account.
- Google is optional recovery/linking only, visible in login and
  `Paramètres > Sécurité`; it is not required in onboarding.
- Personal and business/commerce profiles have the same app rights and are not
  presented as admin personas.
- Merchant user first names and last names are not collected during Android
  account creation; the app/backend generate a pseudonym/display handle.
- Known/new-device detection must use privacy-safe device proof, not raw device
  identifiers or broad fingerprint collection.
- Current device proof is privacy-safe install proof only. It is not yet
  production-grade cryptographic device authentication until a server challenge
  is signed with an Android Keystore-held private key and verified by backend.
- Android Google recovery/linking should use Credential Manager / Sign in with
  Google to send an ID token to backend. Android must not store Google tokens as
  profile data or collect first/last names from Google.
- Onboarding Step 5 branches: `Configurer plus tard` enters the app after a
  brief success state; `Ajouter maintenant` continues to a backend-owned webhook
  test.
- The onboarding test path is webhook-test-only. It does not process real bank
  notifications, confirm payments, emit `payment.confirmed`, or send developer
  webhooks directly from Android.

Canonical doc: `docs/ANDROID_ACCOUNT_AND_ONBOARDING_TRUTH.md`.
