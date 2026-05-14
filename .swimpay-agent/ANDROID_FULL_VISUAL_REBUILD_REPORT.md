# Android Full Visual Rebuild Report

Date: 2026-05-14

## Implemented

- Remapped `PremiumColors` to the mockup dark palette so old component calls no longer emit light-theme visuals.
- Reworked shared premium components toward the mockup system:
  - app shell dark smoke background;
  - mockup SwimPay logo treatment;
  - glass cards;
  - neon green/cyan CTA buttons;
  - dark outline buttons;
  - status chips and state panels;
  - 5-item mockup bottom navigation.
- Changed bottom navigation from 4 old tabs to 5 mockup tabs:
  - Accueil;
  - En attente;
  - Récepteurs;
  - Intégrations;
  - Paramètres.
- Added `PremiumIntegrationsListStateScreen` as a dedicated visual surface for screen 11.
- Updated main runtime tab routing so Récepteurs opens receiving methods and Intégrations opens the integration list surface.
- Made Ozon Bank selectable in onboarding UI state by adding `ozon_bank` to the onboarding supported UI IDs.
- Updated receiving setup to visually represent Carte, SBP, or Carte+SBP selection without changing backend save semantics.
- Reworked receiving setup bank rows to show logo + name + subtitle + checkbox-style selected state.

## Not changed

No Roborazzi goldens were updated. No screenshot verify was run as a blocking gate.
