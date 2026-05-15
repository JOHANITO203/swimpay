# SwimPay Figma Fusion Screen Plan

Date: 2026-05-15

Scope: visual planning only. No Android, backend, contract, runtime or product logic changes.

## Fusion Principle

Use the first Figma audit as the visual material:

- translucent glass cards;
- soft pastel glow;
- rounded mobile fintech surfaces;
- gentle shadows;
- card-led hierarchy.

Use the second Figma audit as the structure library:

- richer banking/mobile screen inventory;
- service grids;
- transaction/history rows;
- settings grouping;
- detail screens;
- support and help modules.

SwimPay adaptation:

- darker merchant-fintech base;
- no bank-account ownership language;
- no PSP/bank positioning;
- SwimPay Intelligence visible as the main product capability;
- technical details hidden by default.

## Core Visual Tokens

### Background

- Deep navy base: `#020817`
- Secondary navy: `#07111F`
- Soft radial glows:
  - cyan top-right;
  - violet/pastel top-left;
  - green lower-left.

### Glass Cards

- Surface: `rgba(255,255,255,0.08)` to `rgba(255,255,255,0.16)`
- Border: `rgba(255,255,255,0.14)` to `rgba(255,255,255,0.24)`
- Blur: `18px` to `28px`
- Radius:
  - hero card: `28-32px`
  - normal cards: `22-26px`
  - chips/buttons: `14-18px`
- Shadow:
  - dark depth: `0 24px 70px rgba(0,0,0,0.42)`
  - inner highlight: `inset 0 1px 0 rgba(255,255,255,0.14)`

### Accents

- Primary green: `#39FF88`
- Deep green: `#22C55E`
- Cyan: `#2DD8FF`
- Blue: `#2491FF`
- Violet: `#8B5CF6`
- Gold pending: `#FFC933`
- Red rejection/error: `#FF4D6D`

### Typography

- System sans / Inter-like.
- Screen title: large, simple, readable.
- Hero metric: dominant.
- Card title: strong.
- Metadata: muted but readable, never tiny.

## Screen Family Direction

### 1. Login / Welcome

Visual source:

- first Figma for soft glass hero and large rounded CTA;
- second Figma for clean banking login structure.

Composition:

- dark/pastel glow background;
- centered SwimPay mark;
- single frosted login card;
- two clear actions:
  - Se connecter;
  - Créer un compte;
- Google as optional recovery/linking, visually secondary.

Image brief:

> Dark premium mobile login for SwimPay Merchant, translucent glass login card, soft cyan and green glow, large rounded CTA, optional Google recovery button, no technical text, clean fintech atmosphere.

### 2. Dashboard / Accueil

Visual source:

- first Figma transparent metric cards;
- second Figma home/service grid structure.

Composition:

- greeting at top;
- hero card: `SwimPay Intelligence`;
- two or four metric cards:
  - Signaux à examiner;
  - Priorité haute;
  - Récepteurs actifs;
  - Intégration;
- quick action grid;
- activity list with bank/logo rows;
- glass bottom nav.

Image brief:

> SwimPay Merchant dashboard, dark navy glassmorphism, central SwimPay Intelligence card, translucent rounded metric cards, service action grid, recent activity rows, green/cyan fintech accents, premium but simple.

### 3. Review Queue / File d'examen

Visual source:

- first Figma transaction list cards;
- second Figma history/list pattern.

Composition:

- title: File d'examen;
- summary glass card with total pending;
- readable filters:
  - Tous;
  - À vérifier;
  - Aujourd'hui;
  - Filtrer;
- list cards:
  - bank logo zone;
  - bank name/reference;
  - amount;
  - confidence/status chip;
  - action button: Examiner.

Image brief:

> Merchant review queue screen, translucent glass list cards, bank logo circles, large readable ruble amounts, green outline action buttons, gold pending accents, no cramped text, dark fintech background.

### 4. Review Detail

Visual source:

- second Figma transaction detail / receipt structure;
- first Figma glass cards and glow.

Composition:

- amount and bank identity dominant;
- status chip: À vérifier / Priorité moyenne;
- glass section: Détails du signal;
- glass section: Éléments correspondants;
- compact notice: Vérification manuelle requise;
- two large actions:
  - Rejeter;
  - Confirmer manuellement.

Image brief:

> SwimPay review detail, large amount header, bank logo, translucent detail panels, matched signal checklist, manual decision actions, green confirm button, red reject button, dark glass premium style.

### 5. Receiving Methods / Méthodes

Visual source:

- second Figma card/service management screens;
- first Figma soft cards.

Composition:

- privacy/status card at top;
- segmented filters:
  - Toutes;
  - Actives;
  - À vérifier;
- method cards:
  - bank logo;
  - method type: Carte or Téléphone / SBP;
  - masked destination;
  - status chip;
  - edit/delete icons;
  - active toggle.

Image brief:

> SwimPay receiving methods screen, glass cards for bank routes, bank logos, card and SBP phone method labels, masked destinations, clear active toggles, green status chips, dark premium fintech.

### 6. Integrations List

Visual source:

- second Figma payments/services and settings module layout;
- first Figma frosted module cards.

Composition:

- merchant-friendly, not developer-console;
- connected site card;
- status rows:
  - Site actif;
  - Webhook OK;
  - Dernier test;
  - Santé de livraison;
- primary action: Tester / Configurer;
- technical details hidden behind secondary entry.

Image brief:

> SwimPay integrations screen for merchants, connected site glass card, simple health/status chips, no raw technical logs, green and blue accents, clear configure/test action, premium mobile banking structure.

### 7. Integration Detail

Visual source:

- second Figma detail/settings structure;
- first Figma transparent panels.

Composition:

- site name and active status;
- masked API key and masked webhook secret;
- webhook URL as copy field;
- delivery health summary;
- last tests as friendly rows;
- secondary button: Détails techniques.

Image brief:

> SwimPay integration detail, dark glass panels, masked API/webhook fields, friendly webhook health summary, delivery status rows, blue technical accents, details hidden by default.

### 8. Receiver Health

Visual source:

- second Figma health/settings cards;
- first Figma metric card transparency.

Composition:

- hero status card:
  - Récepteur actif / À vérifier / Hors ligne;
- cards:
  - Accès notifications;
  - Banques surveillées;
  - File locale;
  - Dernier contact;
- actions:
  - Tester;
  - Voir diagnostic;
  - Paramètres.

Image brief:

> SwimPay receiver health screen, large status glass card, green operational indicator, simple diagnostic cards, bank monitored list, notification access status, dark premium glassmorphism.

### 9. Security & Settings

Visual source:

- second Figma settings grouping;
- first Figma soft frosted rows.

Composition:

- grouped settings cards:
  - Compte;
  - Langue;
  - Apparence;
  - Verrouillage;
  - Notifications;
  - Confidentialité;
  - Aide;
- Google optional recovery row;
- no developer/system internals by default.

Image brief:

> SwimPay settings screen, clean merchant-friendly grouped settings, translucent rounded rows, language and appearance entries, app lock, notifications, privacy and help, no technical jargon, dark glass mobile fintech.

## Component Kit To Reuse Across Images

### Glass Hero Card

Use for:

- SwimPay Intelligence;
- receiver status;
- review summary;
- onboarding step summary.

Rules:

- large radius;
- strong internal highlight;
- one dominant metric or status;
- one short sentence;
- optional two mini stats.

### Glass Metric Card

Use for:

- pending reviews;
- receiver status;
- integration health;
- daily signal count.

Rules:

- icon tile top-left;
- title;
- large number/status;
- short metadata;
- no paragraph.

### Transaction / Review Row

Use for:

- recent activity;
- review queue;
- delivery history;
- receiving methods.

Rules:

- logo left;
- title and metadata center;
- amount/status/action right;
- no more than two text lines in the center.

### Service Grid Tile

Use for:

- quick actions;
- support;
- integration tasks;
- settings shortcuts.

Rules:

- icon first;
- short label;
- 4 tiles max per row on mock image;
- no tiny text.

### Bottom Navigation

Tabs:

- Accueil;
- Revue;
- Méthodes;
- Sites;
- Réglages.

Rules:

- glass container;
- active green;
- inactive muted but readable;
- no large black slab.

## Recommended Fusion Order

1. Make one dashboard image first.
2. Make one review queue image.
3. Make one review detail image.
4. Make one receiving methods image.
5. Make one settings image.

These five screens are enough to validate the visual identity before generating all remaining screens.

## What Not To Copy

From first Figma:

- overly light consumer background;
- fake personal bank card ownership;
- tiny chart labels;
- decorative lifestyle hero as main merchant dashboard.

From second Figma:

- loans;
- investments;
- mortgage;
- branch/ATM map;
- family banking;
- bank account ownership language;
- broad super-app scope.

## Short Master Prompt For Image Generation

> Create a SwimPay Merchant mobile app screen in a dark premium fintech glassmorphism style. Use deep navy background with soft cyan, violet and green glows. Use translucent rounded glass cards with subtle white borders, inner highlights and blur. The UI is merchant-friendly, simple and operational, centered around SwimPay Intelligence, payment signals, manual review, receiving methods and integrations. No bank account ownership, no PSP language, no official bank confirmation claim, no technical jargon. High readability, large cards, clean bottom navigation, green/cyan accents.
