# REFACTOR_PLAN

generated_at: 2026-05-17
scope: future migration of current bank-card visual into layered customizable component
mode: plan only, no implementation

## Goal

Migrate the current `MerchantReceivingVerificationCard` into a layered visual system without changing the current screen behavior or design during the first steps.

Target:

```text
CardVisual
  CardSurfaceLayer
  ArtworkSkinLayer
  SurfaceEffectsLayer
  CardDetailsLayer
  InteractionLayer
```

## Migration principles

- Keep the current visual output as the default baseline.
- Move code in small steps.
- Keep masked data only.
- Do not introduce real scheme logos.
- Do not introduce real card numbers.
- Do not make the card responsible for backend/payment behavior.
- Add visual customization only after the default rendering is safely extracted.

## Proposed files to create later

| File | Purpose |
| --- | --- |
| `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/CardVisual.kt` | Root `CardVisual` composable and layer order. |
| `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/CardVisualTheme.kt` | Theme model, defaults, validation helpers. |
| `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/CardVisualLayers.kt` | `CardSurfaceLayer`, `ArtworkSkinLayer`, `SurfaceEffectsLayer`, `CardDetailsLayer`, `InteractionLayer`. |
| `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/CardVisualDefaults.kt` | Default SwimPay card theme matching current output. |
| `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/ui/premium/CardVisualTest.kt` | Unit/static tests for theme defaults and safe constraints. |

## Proposed files to modify later

| File | Change |
| --- | --- |
| `PremiumDashboardScreens.kt` | Replace internals of `MerchantReceivingVerificationCard` with `CardVisual` adapter after visual parity is proven. |
| `PremiumDesignTokens.kt` | Move or mirror `PaymentCard` gradient into `CardVisualDefaults`; keep existing token for compatibility at first. |
| `PremiumComponents.kt` | Reuse generic primitives only if helpful; avoid adding unrelated card-specific logic here unless it is truly generic. |
| `PremiumGoldenScreenshotTest.kt` | Add or update receiving-method screenshot coverage after extraction. |
| `design/ASSET_REGISTRY.md` | Register card-skin assets only when actual runtime assets are introduced. |

## Step-by-step plan

### Step 1: Freeze current baseline

Actions:

- Capture current receiving-method screen screenshot.
- Record current default values:
  - height `190.dp`;
  - radius `34.dp`;
  - gradient `PremiumBrandGradient.PaymentCard`;
  - border white alpha `0.10f`;
  - padding `24.dp`;
  - logo size `42.dp`;
  - text sizes `24.sp`, `19.sp`, `14.sp`, `13.sp`, `12.sp`.

Tests/manual checks:

- Receiving-method screen still renders saved-card and empty-card states.
- No raw card number appears.
- No layout overlap on narrow device.

Risk:

- Existing golden baseline may already include unrelated screen drift. Do not update goldens unless intentional.

### Step 2: Extract data adapter without visual change

Actions:

- Keep `MerchantReceivingVerificationCard(method, language)`.
- Internally map `method` to a neutral `CardDetails` model:
  - brand;
  - subtitle;
  - masked destination;
  - status;
  - action label;
  - bank profile id.

Tests/manual checks:

- Same screen state before/after.
- Empty state still shows add-card copy.
- Saved state still shows masked card.

Risk:

- Bank id inference from subtitle remains fragile, but this step only isolates it.

### Step 3: Extract default `CardVisual`

Actions:

- Create `CardVisual` with default theme reproducing the current component.
- Keep layer functions internal at first if needed.
- Do not add external customization props yet beyond details/default theme.

Tests/manual checks:

- Screenshot parity with current card.
- No new runtime asset required.
- No performance regression visible during scroll.

Risk:

- Slight Compose layout differences may change screenshot pixels.

### Step 4: Split visual layers

Actions:

- Move background/radius/border to `CardSurfaceLayer`.
- Move text/logo/fallback icon to `CardDetailsLayer`.
- Add empty no-op `ArtworkSkinLayer`, `SurfaceEffectsLayer`, `InteractionLayer`.
- Keep no-op layers disabled by default.

Tests/manual checks:

- Same current design.
- Layer order inspected in code.
- Text remains readable.

Risk:

- Over-abstraction too early. Keep functions small and direct.

### Step 5: Introduce theme model with current default

Actions:

- Add `CardVisualTheme` with the requested shape:
  - `surface`
  - `artwork`
  - `effects`
  - `typography`
- Provide `DefaultSwimPayCardTheme` that matches current output.
- Keep optional artwork/effects unused unless assets exist.

Tests/manual checks:

- Default theme produces current visual.
- Invalid/empty optional assets do not crash.

Risk:

- Theme object may become too broad. Keep only fields used by rendering.

### Step 6: Add asset-ready layer support

Actions:

- Add optional image painter support for artwork/texture/reflection only after assets are registered.
- Clip all artwork/effects to card shape.
- Apply scale/x/y/rotate inside `ArtworkSkinLayer`.
- Add safe max size / content scale rules.

Tests/manual checks:

- Oversized artwork stays clipped.
- Transparent artwork overlays correctly.
- Text remains visible with default and one test artwork.
- No scheme logos or real card numbers.

Risk:

- GPU overdraw and memory usage if full-resolution bitmaps are too large.

### Step 7: Add visual QA coverage

Actions:

- Add screenshots for:
  - default empty card;
  - default saved card;
  - long bank name;
  - long masked destination;
  - artwork skin enabled;
  - small/narrow viewport.

Manual checks:

- Android emulator screenshot.
- Physical device smoke if available.
- Dark/light theme if supported.

Risk:

- Goldens can slow design iteration; freeze only after visual direction is approved.

## Soft migration strategy

Recommended order:

1. Keep current function signature.
2. Extract internal detail model.
3. Extract visual root with default theme.
4. Split layers while preserving defaults.
5. Add optional theme parameter with default value.
6. Add optional asset fields only after registry approval.
7. Migrate call sites gradually.

This avoids breaking the current receiving-method screen and keeps the refactor reversible.

## Manual test checklist after each implementation step

- Open `Moyens de reception`.
- Verify empty card state.
- Add or mock a card receiving method.
- Verify masked destination only.
- Verify bank logo or fallback icon.
- Verify text does not overlap on small width.
- Verify no raw identifier is displayed.
- Verify SBP card remains unaffected.
- Scroll the screen and check jank.
- Run existing premium golden screenshot test when the visual is intentionally frozen.

## Risks to track

| Risk | Mitigation |
| --- | --- |
| Current screen breaks due extraction | Keep wrapper signature unchanged until final migration. |
| Asset covers text | Define safe zones and keep details above artwork/effects. |
| Large bitmap memory use | Use WebP, downscale to display size, avoid huge PNGs. |
| Theme conflicts with premium tokens | Default theme should read current tokens; custom theme should be isolated. |
| Bank id parsing fails | Move toward explicit bank id in UI model. |
| Golden tests become noisy | Use manual screenshots during active polish, freeze goldens after approval. |
| Real brand/payment-network misuse | Asset registry review before runtime use. |

## Stop conditions

Do not continue a future refactor if:

- current visual parity cannot be proven;
- any raw card number appears;
- a custom asset includes real scheme branding;
- text becomes unreadable;
- receiving-method mutations stop working;
- the SBP receiving card regresses unintentionally.
