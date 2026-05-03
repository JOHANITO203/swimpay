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
