# Android Receiving Methods Action Audit + Plan

Date: 2026-05-15

Scope: Android Merchant `Moyens de réception` screen and user actions.

Forbidden scope: backend changes, API contract changes, payment runtime changes, receiver runtime changes, new features.

## Current Audit

### UI structure

- The screen currently renders two large method widgets:
  - card widget through `MerchantReceivingVerificationCard`;
  - SBP/phone widget through `MerchantSbpReceivingCard`.
- Add actions are rendered as plain rows:
  - `Ajouter une carte`;
  - `Ajoutez téléphone SBP`.
- Existing methods render as cards through `PremiumReceivingMethodRow`.
- The edit form and create form are shown inline inside the same `LazyColumn`.

### Visual defects

- Add-card and add-SBP rows look less premium than the widgets above them.
- Add rows do not visually communicate the target method enough: no bank/source context, weak action hierarchy, generic row shape.
- Existing method cards are visually heavier and less coherent than the top widgets.
- Mutation buttons are cramped:
  - `Désactiver` can wrap badly;
  - `Supprimer` sits as a small row action instead of a dangerous/destructive action with clear confirmation;
  - all actions have the same weight, although edit/default/disable/delete do not have the same risk.
- The UI lacks clear transaction feedback:
  - no visible success message after create/edit/disable/default/delete;
  - errors collapse into reload/offline state instead of staying near the action.

### Runtime wiring

The runtime callbacks exist and are passed from `PremiumMerchantApp` into the receiving-method screen in both locations:

- main `Payment` tab;
- dedicated `PremiumRoute.ReceivingMethods`.

Current callbacks call:

- `activeRuntime.createReceivingMethod(submission)`;
- `activeRuntime.updateReceivingMethodLabel(routeId, label)`;
- `activeRuntime.disableReceivingMethod(routeId)`;
- `activeRuntime.markReceivingMethodRecommended(routeId)`;
- `activeRuntime.deleteReceivingMethod(routeId)`.

The repository maps these to existing backend endpoints:

- `GET /v1/merchant/receiving-methods`;
- `POST /v1/merchant/receiving-methods`;
- `PATCH /v1/merchant/receiving-methods/:method_id`;
- `POST /v1/merchant/receiving-methods/:method_id/disable`;
- `POST /v1/merchant/receiving-methods/:method_id/set-default`;
- `DELETE /v1/merchant/receiving-methods/:method_id`.

Conclusion: button wiring exists, but action UX is not strong enough and failure/success feedback is underdesigned.

### Contract/source-of-truth notes

- The backend remains the source of truth for stored receiving methods.
- The UI should not display mock card/phone data when no method exists.
- Create form should submit only bank, method type and raw user input to the existing repository.
- Cards should render masked values only from backend response.

### Text/encoding risk

Some runtime strings still show mojibake in `PremiumMerchantRuntime` / API mapping paths, for example receiving-method success/error labels. These should be corrected while touching the screen, because visible feedback will expose them.

## Plan

### 1. Rebuild the add-card/add-SBP entry components

Replace the current simple add rows with two coherent premium action cards:

- same radius, border, icon tile and spacing as the receiving-method screen;
- left icon zone;
- title zone;
- short helper zone;
- right chevron/action zone;
- minimum 56dp touch area;
- no clipped text.

Proposed labels:

- `Ajouter une carte`
  - helper: `Carte bancaire ou carte liée à votre banque`
- `Ajouter un téléphone SBP`
  - helper: `Numéro de téléphone associé à une banque`

### 2. Convert create flow into a focused action panel

Keep the existing inline flow, but make it feel intentional:

- panel title changes by method type:
  - `Nouvelle carte`;
  - `Nouveau téléphone SBP`;
- selected method chip visible;
- bank selection as clear bank rows with logo/name;
- input label short and direct:
  - `Numéro de carte`;
  - `Numéro de téléphone`;
- primary CTA:
  - `Enregistrer la carte`;
  - `Enregistrer le téléphone`;
- secondary `Annuler` action.

### 3. Make method cards action-first

For each existing method:

- top zone: bank logo + method type + status chip;
- middle zone: masked destination from backend;
- bottom zone: actions with clear priority:
  - primary/neutral: `Modifier`;
  - neutral: `Définir par défaut` only when not recommended;
  - warning/secondary: `Désactiver` only when enabled;
  - destructive: `Supprimer`.

Avoid equal-weight cramped buttons.

### 4. Add safe action confirmations

Add lightweight confirmation for destructive/risky actions:

- `Désactiver`: confirm before calling backend;
- `Supprimer`: confirm before calling backend.

Do not add a new feature. This protects existing actions from accidental taps.

### 5. Add action feedback state

Add screen-local feedback:

- loading state on the action being executed;
- success banner/snackbar after backend success;
- error banner near the receiving-method screen if backend returns error.

Do not invent backend status. Use existing `safeMessage` and mutation results.

### 6. Fix receiving-method feedback text integrity

Correct accented strings exposed by receiving-method mutations:

- `Moyen ajouté`;
- `Moyen désactivé`;
- `Défini par défaut`;
- `Moyen modifié`;
- `Moyen supprimé`;
- `Aucun moyen de réception`;
- `Ajoutez une carte ou un téléphone SBP pour commencer.`

### 7. Validate actions on device

Required checks:

- Add card opens the card create panel.
- Add SBP opens the phone create panel.
- Save with empty input is disabled.
- Save with real input calls backend and reloads list.
- Modify opens edit panel and saves label.
- Disable calls backend after confirmation and reloads list.
- Set default calls backend and reloads list.
- Delete calls backend after confirmation and reloads list.
- No mock data appears when backend has no method.

### 8. Tests/validation

Run:

- `npm run android:compile`;
- `npm run android:assemble:staging`;
- targeted Android JVM tests if existing receiving-method UI/runtime tests are present.

Manual device QA:

- navigate to `Paiement`;
- execute each visible action;
- verify feedback and refreshed backend state.

## Implementation Files Likely In Scope

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt`
- targeted tests under `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver`

No backend file should be touched unless a later device test proves an existing endpoint is failing.
