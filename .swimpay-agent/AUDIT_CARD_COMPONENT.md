# AUDIT_CARD_COMPONENT

generated_at: 2026-05-17
scope: current bank-card visual component audit
mode: analysis only, no implementation

## Summary

The current visual bank card is not an isolated component yet. It is a private Jetpack Compose function embedded in the receiving-method screen:

- `MerchantReceivingVerificationCard`
- file: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`
- line anchor: around `1059`

It currently renders a fixed SwimPay merchant card preview for the Android premium merchant app. It is useful as a current visual baseline, but it mixes surface, theme, data selection, bank logo resolution, fallback icon, typography, layout, and card-state copy in one block.

## Files found

| File | Role |
| --- | --- |
| `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt` | Main implementation of `MerchantReceivingVerificationCard`, caller inside `PremiumReceivingMethodsStateScreen`, bank-logo mapping helpers, `PremiumBankLogo`, sibling SBP card. |
| `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDesignTokens.kt` | Defines premium colors, radii, type sizes, elevation, and `PremiumBrandGradient.PaymentCard`. |
| `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt` | Defines generic containers such as `LiquidGlassCard`, `PremiumCard`, `PremiumGradientPanel`, and brand marks. Current card visual does not reuse a dedicated card-visual primitive. |
| `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumReceivingMethodBankCatalog.kt` | Provides bank profile options used indirectly to infer bank id from display text. |
| `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantUiModels.kt` | Builds receiving-method display rows, masks card identifiers, provides title/subtitle/status strings. |
| `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt` | Converts API receiving-route data into `MerchantReceivingMethodDisplay`, including masked values and bank display names. |
| `apps/android-receiver/android/app/src/main/res/drawable-nodpi/ic_bank_*.png` | Current bank logo assets used by `PremiumBankLogo`. |
| `apps/android-receiver/android/app/src/main/res/drawable/ic_bank_ozon.xml` | Placeholder bank asset for Ozon Bank. |
| `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/ui/premium/PremiumGoldenScreenshotTest.kt` | Golden screenshot coverage for receiving-method screen, indirectly covering the card visual. |
| `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMerchantVisualArchitectureTest.kt` | Static architecture tests around receiving-method screen and premium components. |
| `design/ASSET_REGISTRY.md` | Current asset source of truth for logos and registered runtime assets. |

## Current component structure

Current call path:

1. `PremiumReceivingMethodsStateScreen` renders a `LazyColumn`.
2. It selects the first method whose title or subtitle contains `carte`.
3. It calls `MerchantReceivingVerificationCard(method, language)`.
4. The card infers `bankProfileId` from `method.subtitle`.
5. The card draws a single `Box` with fixed size, clipping, gradient, border.
6. It draws top row:
   - left: `SwimPay` text and "Carte marchand" / "Carte a ajouter"
   - right: bank logo or credit-card icon fallback
7. It draws bottom column:
   - destination/bank text from `method.subtitle`
   - status from `method.status`
   - action/title from `method.title`

Current props:

```kotlin
private fun MerchantReceivingVerificationCard(
    method: PremiumReceivingMethodUiItem?,
    language: PremiumLanguageOption = PremiumLanguageOption.FR
)
```

Effective data dependencies:

- `method.title`
- `method.subtitle`
- `method.status`
- `language.ui(...)`
- `PremiumBrandGradient.PaymentCard`
- `PremiumColors`
- `PremiumBankLogo`
- `Icons.Default.CreditCard`

## Hardcoded points

### Dimensions

- Card height: `190.dp`
- Card radius: `34.dp`
- Border width: `1.dp`
- Inner padding: `24.dp`
- Bank logo size: `42.dp`
- Fallback icon box: `42.dp`
- Fallback icon radius: `16.dp`
- Fallback icon size: `24.dp`
- Bottom spacing: `10.dp`

### Colors

- Surface gradient comes from `PremiumBrandGradient.PaymentCard`.
- `PaymentCard` itself is fixed to:
  - `0xFF000A1F`
  - `0xFF07152F`
  - `0xFF003BFF`
- Text colors are fixed to `Color.White` with alpha variants:
  - `0.68f`
  - `0.88f`
- Border is fixed to white alpha `0.10f`.
- Fallback logo tile is white alpha `0.12f`.

### Text

- Brand text: `SwimPay`
- Type text: `Carte marchand`
- Empty type text: `Carte a ajouter`
- Empty destination text: `Aucune carte enregistree`
- Empty status text: `A configurer`
- Empty action text: `Ajouter une carte`

These strings are user-facing and currently mixed into the visual function.

### Images and icons

- Bank logos are selected by hardcoded `when (bankProfileId)` in `bankIconResource`.
- Fallback uses `Icons.Default.CreditCard`.
- No card artwork, chip asset, texture asset, reflection asset, border asset, or mask asset exists.
- No Visa/Mastercard-like scheme logo is used, which is good and should remain true.

### Layout and positioning

- Layout is fixed to a two-band vertical structure: top row and bottom column.
- No explicit aspect ratio. The card uses `fillMaxWidth().height(190.dp)`.
- Text placement is controlled by Compose `Column`/`Row`, not a reusable coordinate system.
- The future "tattoo on surface" artwork model does not exist.

### Effects

- Gradient is baked into the main Box background.
- Border is baked into the main Box.
- No texture/noise/reflection/metal effects.
- No animation in this component.
- No interaction state in the visual itself; it is display-only.

## What is mixed in one block

The current function mixes:

- visual card surface;
- gradient theme;
- empty/configured state copy;
- bank lookup;
- logo rendering;
- fallback icon rendering;
- card details typography;
- data selection by string matching upstream;
- localization calls.

This is the main reason it should become a layered visual system before adding assets.

## Current limitations

1. The component cannot accept independent artwork, texture, reflection, mask, border, chip, logo, or typography assets.
2. The gradient can only be changed through `PremiumBrandGradient.PaymentCard`, not per card theme.
3. The card has no theme object and no stable visual contract.
4. The card height is fixed and may not preserve bank-card ratio across screen widths.
5. The bank id is inferred from display text, which is fragile for localization and custom merchant labels.
6. Bank logo and fallback icon are part of the visual block rather than a `CardDetailsLayer`.
7. Text and visual layers are not separated, so future artwork can easily collide with text.
8. No explicit clipping/masking contract exists for oversized artwork.
9. No preview asset registry exists for card skins.
10. Existing golden screenshots cover the whole receiving-method screen, not the card visual as a reusable unit.

## Risks before refactor

| Risk | Why it matters |
| --- | --- |
| Responsive break | Fixed `190.dp` height plus `fillMaxWidth()` may distort the intended bank-card aspect ratio on narrow/wide devices. |
| Oversized asset | Future artwork could overflow or cover text without a fixed mask/clip layer. |
| Text collision | Current text has no safe zones; artwork/reflection could sit under important labels. |
| Theme conflict | `PremiumBrandGradient.PaymentCard` is global and not a card-theme contract. |
| Data coupling | `bankProfileIdFromDisplay(method.subtitle)` is fragile and not suitable for custom visual themes. |
| Asset governance | Current asset registry covers bank/app marks, not card-skin layers. |
| Performance | Multiple bitmap layers without constraints could increase GPU overdraw and memory use. |
| Test fragility | Golden screenshots may fail if the visual is moved without preserving the current default rendering. |

## Audit conclusion

The current card should be treated as a visual baseline, not as the final abstraction. The safest path is to extract a default-equivalent `CardVisual` wrapper that reproduces the current output first, then progressively move surface, artwork, effects, details, and interaction concerns into separate layers.
