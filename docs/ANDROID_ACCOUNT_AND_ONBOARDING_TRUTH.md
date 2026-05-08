# Android Account And Onboarding Truth

This document is the current product truth for the SwimPay Android merchant app account entry, recovery and onboarding flow.

Historical reports and older task files may describe earlier onboarding experiments. Those archives do not override this document.

## Product Position

SwimPay is Android-first for the merchant receiver experience.

The web/dashboard and Auth BFF surfaces support staging, merchant operations and recovery, but they are not the primary account creation path for the Android app.

Android still follows the non-negotiable Receiver boundary:

- Android captures, filters, redacts, signs and uploads.
- Backend verifies, matches and decides.
- Android never confirms orders.
- Android never sends developer fulfillment webhooks.
- No SMS, Accessibility scraping, bank app scraping, broad app enumeration or raw notification upload.

## Entry Flow

When no valid mobile merchant session exists, the app starts on an account entry screen before onboarding.

The entry screen has two choices:

- `Créer un compte`
- `Se connecter`

The backend must first evaluate whether the current device is known through a privacy-safe device proof. This must not use raw device identifiers such as IMEI, raw Android ID, advertising ID or broad fingerprint collection. The acceptable direction is a device-bound proof such as an app install keypair/public key, signed challenge and safe install instance metadata.

Current implementation status: Android creates a privacy-safe app-install proof
boundary and sends only generated install proof material. It must not be
treatable as production-grade cryptographic device identity until Android signs
a server challenge with a private key kept in Android Keystore and the backend
verifies that challenge. This limitation does not permit raw fingerprint
collection.

The server response can classify the device as:

- known device;
- new device;
- ambiguous or recovery required.

## Account Types

`Créer un compte` starts onboarding and creates a lightweight merchant account.

The app supports two merchant profile choices:

- personal merchant profile;
- business/commerce merchant profile.

Both profile types have the same app permissions and rights. They are not presented as admin profiles in the Android UX.

Internally, the initial account may still map to a merchant membership role capable of managing that merchant. That implementation detail must not make the Android onboarding expose an `admin` persona.

## Minimal Identity

SwimPay does not collect merchant user first names or last names during Android account creation.

The account creation flow generates a pseudonym or display handle. Any optional business label is merchant-facing configuration, not proof of personal identity.

Buyer recognition hints in checkout/payment sessions are a separate payment matching surface and must keep their existing privacy rules. They do not justify collecting merchant account holder names in Android onboarding.

## Google

Google is not required for normal Android account creation.

Google appears only in these places:

- `Se connecter`, as a provider for existing account recovery/login;
- `Paramètres > Sécurité`, with the Google logo, to link or save a profile for future recovery.

Google must not appear as a required onboarding step and must not block `Créer un compte`.

The purpose of Google is account recovery. If a user chooses `Se connecter` and selects Google, a linked Google identity can restore the existing profile.

Android Google sign-in should use the platform Credential Manager / Sign in with
Google flow and send only a Google ID token to the SwimPay backend exchange or
link endpoint. The Android app must not store Google tokens as profile data and
must not collect first names or last names from the Google account.

## Create Account Onboarding

`Créer un compte` triggers onboarding.

The onboarding creates the account, stores only required minimal merchant data, registers or attaches the device, guides Notification Listener Access, detects supported bank targets, configures a receiving method and then enters the app.

The active Android onboarding sequence is:

1. Welcome / mission.
2. Notification Listener Access.
3. Supported activated bank target selection.
4. Receiving method.
5. Site or application choice.
6. Conditional webhook test.

Notification Listener Access remains mandatory for receiver detection. The app must explain that Android grants broad notification access and SwimPay narrows behavior locally through exact supported bank targets.

## Receiving Method Copy

The receiving method screen keeps the existing phone option copy that mentions SBP as merchant-facing Russian transfer wording.

This is a copy exception only. It does not add SBP integration, payment initiation, bank APIs, SMS reading or official bank confirmation.

## Site Or Application Branch

Step 5 routes to two different outcomes:

- `Configurer plus tard`: mark the connected-site setup as skipped, show a brief success/toast state, then enter the app.
- `Ajouter maintenant`: continue to integration configuration and then run the webhook test.

Skipping site/app setup must not block entry into the app.

## Webhook Test

The onboarding test path is webhook-test-only.

The test proves that the backend can send a test webhook to the configured external app endpoint and that the merchant integration can verify it.

The webhook test must not:

- process real bank notifications;
- confirm a payment;
- emit `payment.confirmed`;
- send a developer webhook directly from Android.

Webhook delivery remains backend-owned.

## Developer Surface

The `developer` concept exists for API keys, credentials, webhook URLs, SDK integration and delivery diagnostics.

It is not a separate merchant profile type in Android onboarding. Personal and business merchant profiles have the same app rights. Developer integration capabilities can be generated for each merchant account when needed.

## Permissions Summary

Android merchant profile choice does not change app permissions.

Payment review and webhook fulfillment remain governed by backend membership, API key and receiver device boundaries:

- mobile merchant session for the Android app;
- receiver device key for signed signal upload;
- hashed API keys for SDK/server integrations;
- BFF/session identity for web surfaces where used.

These identities must not be mixed.
