# Android Business Contract Wiring Audit

## Dashboard

Status: `partially_wired`

- Metrics repository/backend wiring exists from tasks 698-704.
- Quick actions are restored to navigation callbacks.
- Remaining risk: cards must continue using repository data only, not visual preview defaults.

## Review Queue / Detail

Status: `correct`

- Queue uses `activeRuntime.loadReviews()`.
- Detail uses `activeRuntime.loadPaymentDetail(reviewId)`.
- Actions call:
  - `activeRuntime.confirmReceived(reviewId)`
  - `activeRuntime.rejectSignal(reviewId)`
  - `activeRuntime.rejectOrder(reviewId)`
- Backend remains owner of merchant decision.

## Orders / Ventes

Status: `hidden_feature`

- `activeRuntime.loadOrders()` exists.
- `PremiumOrdersScreen` exists.
- Current bottom nav removed `PremiumMainTab.Orders`.
- Current Settings row `Ventes` routes to `Receivers`, which is wrong.

## Receiving Methods

Status: `correct`

- Load: `activeRuntime.loadReceivingMethods()`.
- Create: `createReceivingMethod`.
- Edit: `updateReceivingMethodLabel`.
- Disable: `disableReceivingMethod`.
- Recommended/default: `markReceivingMethodRecommended`.
- Delete: `deleteReceivingMethod`.

## Integrations

Status: `partially_wired`

- Existing single connected site/detail contract is wired.
- API key, webhook URL, webhook secret, test webhook and developer export functions are present.
- True multi-site list is not an existing pre-design feature and remains a contract/repository gap.

## Receiver Health

Status: `partially_wired`

- `loadReceiverHealth` exists and uses local notification/listener/runtime state.
- Notification settings action is wired.
- Technical diagnostic action tiles should not be treated as restored features unless a pre-design contract is found.

## Security / Settings

Status: `partially_wired`

- Language: correct, local settings store.
- Appearance: correct, local settings store.
- App lock: correct, local settings store + device credential.
- Google link: correct path exists, needs device verification for session restoration.
- Remote sessions/devices: repository missing, must show unavailable honestly.
- Notification preferences/data privacy: not proven as pre-design real features.
