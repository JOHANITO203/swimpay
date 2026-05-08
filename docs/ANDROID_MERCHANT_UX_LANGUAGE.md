# Android Merchant UX Language

Sprint 7D defines the merchant-facing language contract for the Android Receiver app.

The Android app is the merchant Receiver frontend. It must stay simple, operational and non-technical. Android captures, filters, redacts, signs and uploads. Backend services verify, match and decide. Android must never confirm an order or auto-confirm a payment.

## Allowed Merchant-facing Terms

- Paiement détecté
- À vérifier
- Validé
- Rejeté
- En attente
- Expiré
- Téléphone connecté
- Accès notifications
- Banque choisie
- Moyen de réception
- Carte bancaire
- Numéro de téléphone
- Site ou application connecté
- Notification envoyée
- Validation manuelle en bêta

- Créer un compte
- Se connecter
- Paramètres
- Sécurité

## Forbidden Merchant-facing Terms

These terms may appear only in internal tests, developer screens, API docs, debug panels or engineering documentation. They must not appear in default merchant UI:

- HMAC
- receiver route
- payment signal engine
- template
- package/cert
- TO_VERIFY
- approved_for_review_only
- official_bank_confirmation
- notification_hash
- webhook payload
- cert_sha256
- package_name

## Exact Onboarding Copy

Current account and onboarding truth is defined in
`docs/ANDROID_ACCOUNT_AND_ONBOARDING_TRUTH.md`.

When no valid mobile merchant session exists, Android shows an account entry
screen before onboarding. `Créer un compte` starts onboarding. `Se connecter`
recovers an existing profile. Google appears only in login/recovery and in
`Paramètres > Sécurité` profile linking; it is not onboarding copy.

The account creation UX may ask whether the merchant wants a personal profile or
a business/commerce profile. Both choices have the same rights and must not be
presented as admin roles. Do not ask for merchant user first or last names.

### Welcome

Title:

```text
Recevez vos paiements plus facilement
```

Subtitle:

```text
SwimPay détecte les paiements reçus, vous aide à les valider et prévient votre site ou votre application.
```

Benefits:

- Détection rapide — Repérez plus vite les paiements reçus.
- Validation simple — Confirmez ou rejetez en quelques secondes.
- Business connecté — Votre site ou application reçoit la mise à jour.

CTA:

```text
Commencer
```

### Connect Phone

Title:

```text
Connectez votre téléphone
```

Subtitle:

```text
SwimPay a besoin d’accéder aux notifications de cet appareil pour fonctionner.
```

Required state:

```text
Accès nécessaire
Activez l’accès aux notifications pour détecter les paiements reçus.
```

CTA:

```text
Activer l’accès
```

Notice:

```text
SwimPay ne lit pas vos SMS et ne contrôle pas votre banque.
```

### Choose Banks

Title:

```text
Choisissez vos banques
```

Subtitle:

```text
Sélectionnez les banques que vous utilisez pour recevoir vos paiements.
```

Badge:

```text
Validation manuelle en bêta
```

CTA:

```text
Continuer
```

### Receiving Method

Title:

```text
Ajoutez votre moyen de réception
```

Subtitle:

```text
Vos clients utiliseront ces informations pour vous payer.
```

Options:

- Carte bancaire — Recevez les paiements sur votre carte.
- Numéro de téléphone — Pratique pour les virements via SBP.

CTA:

```text
Ajouter
```

This copy does not add SBP integration behavior. SwimPay still does not initiate payment rails and does not process SMS.
SBP wording is allowed here only as familiar Russian transfer language for `phone_transfer`; the technical contract remains notification-signal-based and manual-confirmation-only.

### Configuration Test

Title:

```text
Vérifiez que tout fonctionne
```

Subtitle:

```text
Lancez un test avant de recevoir vos premiers paiements.
```

Checklist:

- Téléphone connecté
- Banque choisie
- Moyen de réception ajouté
- Site ou application connecté

CTA:

```text
Lancer le test webhook
```

The onboarding test is webhook-test-only and exists only after `Ajouter
maintenant` on the site/application step. If the merchant chooses `Configurer
plus tard`, show a brief success state and enter the app without this test.

Android may request the backend-owned test action, but Android does not send
developer webhooks directly. The test does not process real bank notifications,
does not confirm payment and does not emit `payment.confirmed`.

## Guardrails

- Default merchant screens must not show raw card, raw phone, raw notification text, package/cert, HMAC, template internals or raw webhook payloads.
- Default merchant screens must not claim official bank confirmation.
- Developer details are explicit and separate from merchant-friendly screens.
- Review-only beta copy must say manual validation is required.
