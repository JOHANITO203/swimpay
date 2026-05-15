# Android Current Feature Access Audit

## Accessible

- Login/create account.
- Google recovery/linking entry points.
- Onboarding.
- Dashboard.
- Review queue.
- Review detail.
- Receiving methods tab.
- Integrations/connected site tab.
- Settings menu entries after restoration:
  - Banques
  - Méthodes de réception
  - Mode de confirmation
  - Intégration développeur
  - Notifications / santé récepteur
  - Apparence
  - Langue
  - Sécurité
  - Support
  - Centre d'aide

## Inaccessible

- Pre-design `Orders/Ventes` main tab is no longer in the bottom navigation.
- Pre-design sales/orders list is not reachable as a main tab.

## Visible but not wired / placeholder

- `PremiumRoute.OrderDetail` currently renders a generic synchronization placeholder instead of an actual order detail.
- Remote sessions/devices in Security do not have a real repository; they must remain honest/unavailable, not fake.

## Wired but hidden

- `PremiumOrdersScreen` and `activeRuntime.loadOrders()` still exist, but no current tab loads them.

## Replaced by new feature or new shell

- Pre-design `Menu` tab became `Paramètres`.
- Pre-design `Connected Site` detail became a broader `Intégrations` tab, but backend model is still mostly single connected site/detail.
- Pre-design `Orders/Ventes` was displaced by `Récepteurs` in bottom nav.

## Too technical for user

- Receiver health diagnostic action tiles appear more technical than the pre-design merchant menu.
- Security remote/device session areas are only acceptable if displayed as unavailable without fake data.

## Missing from navigation

- `Orders/Ventes`.

## Broken route

- Settings row `Ventes` currently routes to `PremiumMainTab.Receivers`, not to the orders/sales feature.
