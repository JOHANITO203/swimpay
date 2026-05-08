# Android Merchant App Screens

Sprint 7D adds a merchant-facing Android Receiver frontend with typed screen models and a real `MainActivity` surface.

## Visual Direction

- Soft teal/blue fintech palette.
- White rounded cards with subtle borders and shadows.
- Large readable titles.
- Short copy.
- Clear status labels.
- Mobile-first scroll layout.

## Implemented Screen Areas

### Onboarding

Current account and onboarding truth is defined in
`docs/ANDROID_ACCOUNT_AND_ONBOARDING_TRUTH.md`.

When no valid mobile merchant session exists, the Android app must show an
account entry screen before onboarding:

- `Créer un compte`
- `Se connecter`

`Créer un compte` starts onboarding and creates a lightweight merchant account.
`Se connecter` recovers an existing account. Google belongs to login/recovery
and `Paramètres > Sécurité` profile linking; it is not required during account
creation and must not be a mandatory onboarding step.

The account creation UX supports two profile choices with the same app rights:

- personal merchant profile;
- business/commerce merchant profile.

These profiles are not presented as admin personas. The app does not collect
merchant user first names or last names during account creation; it generates a
pseudonym/display handle.

The onboarding model includes:

1. Welcome.
2. Connect phone / Notification Listener Access.
3. Choose supported activated banks.
4. Receiving method setup.
5. Site or application choice.
6. Conditional webhook test.

The Notification Listener Access action opens Android system settings. The app does not bypass Android permission screens.

The `Site ou application` step branches:

- `Configurer plus tard`: mark site/app setup as skipped, show a brief success
  state, then enter the app.
- `Ajouter maintenant`: continue to integration setup, then run the webhook
  test path.

### Bank Selection

The bank selection model includes the five V1 merchant receiving banks:

- Sberbank
- T-Bank
- VTB
- Alfa-Bank
- Gazprombank

The merchant UI shows the simple badge:

```text
Validation manuelle en bêta
```

It does not show package names, certificate hashes, trust internals or production trust states.

### Receiving Methods

Supported merchant-facing methods:

- Carte bancaire
- Numéro de téléphone

The phone receiving-method copy may mention SBP as merchant/buyer-facing
transfer wording for the Russian market because users expect that language for
phone-number bank transfers. This is a copy exception, not an SBP integration:
SwimPay still does not initiate payments, call SBP APIs, read SMS,
scrape bank apps, or claim official bank confirmation.

After save, Android screen models display only masked identifiers:

- `Sberbank · •••• 4821`
- `T-Bank · +7 *** *** 45-67`

Full values are not shown after save and are not sent in webhooks.

Creation is a real backend mutation, not a local-only card. Android submits the
product contract to `/v1/merchant/receiving-methods`, keeps invalid/failed
drafts visible for correction, and clears the raw input only after the backend
returns success. The saved row can then be disabled or marked default from the
same screen.

### Configuration Test

The onboarding test path is webhook-test-only and exists only after the merchant
chooses `Ajouter maintenant` on the site/application step.

The webhook test is backend-owned. Android may request the backend test action,
but Android must not send developer webhooks directly.

The webhook test does not:

- process real bank notifications;
- confirm a real payment;
- emit `payment.confirmed`.

The webhook test checklist covers:

- Téléphone connecté
- Banque choisie
- Moyen de réception ajouté
- Site ou application connecté

If the merchant chooses `Configurer plus tard`, this test is skipped during
onboarding and the merchant enters the app after the brief success state.

### Dashboard

The dashboard model includes:

- readiness card;
- stat cards for review count, validations, sent notifications and phone status;
- recent detected payments with simple merchant statuses;
- bottom navigation labels.

Allowed statuses are:

- À vérifier
- Validé
- Rejeté
- En attente

### Receiving Methods List

The receiving methods screen includes:

- add card action;
- add phone action;
- populated card and phone rows;
- empty state;
- actions to modify, disable and set default.

It shows the required notice:

```text
Les informations complètes ne sont jamais envoyées dans les webhooks.
```

### Review Queue And Payment Detail

The review queue uses simple filters:

- Tous
- À vérifier
- Validés
- Rejetés
- Expirés

Payment review details translate internal reason codes into simple labels:

- Validation manuelle en bêta
- Référence non visible
- Seul le montant a été reconnu
- Plusieurs paiements similaires
- Banque encore en test

Review actions are modeled separately:

- Confirmer le paiement
- Rejeter le signal
- Rejeter la commande

Rejecting a signal does not reject the order by default.

### Connected Site Or Application

Default mode is merchant-friendly and hides developer event internals. Developer details are visible only when explicitly enabled.

Default actions:

- Tester la connexion
- Copier la clé développeur
- Voir les derniers envois

### Receiver Health And Settings

The Receiver health model shows:

- Accès notifications
- Banques surveillées
- File d’envoi
- Dernière synchronisation

It includes the required safety notice:

```text
SwimPay ne lit pas vos SMS et ne contrôle pas votre banque.
```

Settings shell sections:

- Business
- Paiements
- Développeur
- Sécurité
- Mode bêta

The future automation teaser is display-only. Sprint 7D does not enable automation.

## Sprint 7E API Wiring

Sprint 7E keeps the Sprint 7D merchant-facing copy and adds live wiring where backend endpoints already exist.

### Authenticated Session

The Android app has a typed `AuthenticatedMerchantSession` boundary.

- Missing auth shows a safe action-required/disconnected state.
- Local/dev auth is clearly marked as local/dev.
- Bearer tokens, API keys and webhook secrets are not shown in the merchant UI.

### Receiving Methods

The receiving methods screen can load and mutate live backend routes through:

- `GET /v1/merchant/receiving-routes`
- `POST /v1/merchant/receiving-routes`
- `PATCH /v1/merchant/receiving-routes/:route_id`

Saved rows remain masked only. Raw card or phone input is used only during submission and is cleared from Android view state after save.

### Review Queue And Actions

The review queue can load open reviews from:

- `GET /v1/reviews`

Review detail actions use:

- `POST /v1/reviews/:id/confirm`
- `POST /v1/reviews/:id/reject`

`Rejeter le signal` sends a signal-scoped rejection. `Rejeter la commande` sends an explicit order-scoped rejection. Android does not directly notify developer systems.

## Sprint 7F Mobile Backend Gap Closure

Sprint 7F adds live Android mobile backend wiring for the areas that were mock-only in Sprint 7E:

- dashboard summary through `GET /v1/android-merchant/dashboard-summary`;
- payment detail through `GET /v1/android-merchant/payments/:id`;
- connected site status through `GET /v1/android-merchant/connected-site`;
- connected site test through `POST /v1/android-merchant/connected-site/test`;
- configuration test through `POST /v1/android-merchant/configuration-test`.

The Android UI keeps the approved merchant-facing language and maps backend results into simple screen states. Raw card, raw phone, raw notification text, package/cert details, HMAC values and webhook secrets remain excluded from merchant screens.

Sprint 7F code-level validation and real-device install/launch passed. Live Docker-backed endpoint QA is blocked until the local Docker Desktop/containerd I/O issue recorded in `.swimpay-agent/BLOCKERS.md` is resolved.

## Real-device Visual QA

Sprint 7E built, installed and launched the debug APK successfully on Samsung SM-S916B (`R5CWA0FEPZW`).

Command shape:

```powershell
$adb = "C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb devices -l
& $adb -s <SERIAL> install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk
& $adb -s <SERIAL> shell am start -n com.swimpay.receiver/.MainActivity
```

UI-tree visual QA covered:

- onboarding visible;
- Notification Access gate visible and status shown;
- dashboard renders ready/problem states;
- receiving methods render masked destinations only;
- review queue and payment detail render simple merchant labels;
- connected-site developer details remain hidden unless enabled;
- Receiver health renders Notification Access and queue state;
- no raw card, raw phone, raw notification text, package/cert, HMAC, webhook secret or official bank confirmation wording appears.
