# Android Feature Restoration Report

## Restored in this pass

- Settings/Paramètres now renders the pre-design menu again instead of jumping directly to Security.
- Language entry is visible again.
- Appearance/theme entry is visible again.
- Security entry remains available.
- Confirmation Mode entry is visible again.
- Help Center and Contact Support entries are visible again.
- Dashboard quick action callbacks are wired to runtime navigation.
- Receiving method actions are wired to the existing runtime functions:
  - create
  - edit label
  - disable
  - mark recommended/default
  - delete

## Not restored yet

- `OrderDetail` route currently shows a generic placeholder; a real pre-design detail contract was not confirmed in the inspected code.

## Restored after follow-up

- `Orders/Ventes` is reachable again from Settings.
- Settings row `Ventes` no longer routes to `Récepteurs`.
- The existing orders runtime path is used through `activeRuntime.loadOrders()`.

## Not restored because not proven as pre-design features

- True multi-site integrations list.
- Remote device/session repository.
- Advanced notification preferences repository.
- Data/privacy management repository.
- Receiver diagnostic action tiles.

## Contract gaps to keep explicit

- Integrations: Android model/backend is still mostly single connected site/detail, not true multi-site list.
- Security: no real remote sessions/devices repository; UI must say unavailable rather than invent devices.
