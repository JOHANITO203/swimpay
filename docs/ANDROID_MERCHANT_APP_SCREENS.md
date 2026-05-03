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

The onboarding model includes:

1. Welcome.
2. Connect phone.
3. Choose banks.
4. Receiving method setup.
5. Configuration test.

The Notification Listener Access action opens Android system settings. The app does not bypass Android permission screens.

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

After save, Android screen models display only masked identifiers:

- `Sberbank · •••• 4821`
- `T-Bank · +7 *** *** 45-67`

Full values are not shown after save and are not sent in webhooks.

### Configuration Test

The configuration test checklist covers:

- Téléphone connecté
- Banque choisie
- Moyen de réception ajouté
- Site ou application connecté

The test is a configuration test only. It does not confirm a real payment.

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

### Still Mock-only Screens

The following areas remain typed mock repositories until dedicated mobile/backend endpoints exist:

- dashboard summary;
- payment detail by id;
- connected site/webhook status and test;
- configuration test.

These gaps are listed in `.swimpay-agent/ANDROID_FRONTEND_API_GAPS.md`.

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
