# HOME_CARD_DRAGON_QA_REPORT

generated_at: 2026-05-17
scope: Android Compose home card dragon-gold visual QA

## Result

Decision: `ready_for_controlled_runtime_trial`, not yet `production_default`.

The dragon-gold skin is visually usable in the card layer and is safe to test behind an explicit local/runtime switch later. It should not replace `CardVisualDefaults.HomeDashboard` as the production default until a device screenshot pass is approved.

## Area tested

Home/dashboard card:

- file: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`
- composable: `MonthlyActivityCard`
- layer root: `CardVisual`
- default theme: `CardVisualDefaults.HomeDashboard`
- dragon preview theme: `CardVisualDefaults.DragonGoldPreview`

Asset:

- `apps/android-receiver/android/app/src/main/res/drawable-nodpi/card_artwork_dragon_gold.png`

## Final recommended parameters

`CardVisualDefaults.DragonGoldPreview`:

```kotlin
artworkRes = R.drawable.card_artwork_dragon_gold
artworkAlpha = 0.36f
artworkScale = 1.08f
artworkOffsetX = 0.dp
artworkOffsetY = 0.dp
artworkRotation = 0f
```

Reasoning:

- `0.36f` keeps the dragon visible without overpowering the white amount and labels.
- `1.08f` gives the artwork enough coverage while staying clipped inside the rounded card.
- No offset or rotation is needed for the current 1016x640 asset.

## Preview updates

Added comparative previews:

- `CardVisualHomeDefaultPreview`
- `CardVisualDragonGoldPreview`

Both previews render the same card details used by the dashboard:

- icon;
- `Aujourd'hui`;
- `Paiements recus`;
- amount;
- status chip.

The dragon preview is isolated to `CardVisualDefaults.DragonGoldPreview`. The runtime dashboard still uses `CardVisualDefaults.HomeDashboard`.

## Captures

Generated local QA captures:

- `.swimpay-agent/screenshots/home_card_default_390.png`
- `.swimpay-agent/screenshots/home_card_dragon_gold_390.png`
- `.swimpay-agent/screenshots/home_card_dragon_gold_320.png`

Observed output size from Roborazzi for these focused captures:

- `320 x 260 px`

Note: Roborazzi normalizes the focused capture output to the test environment dimensions; the narrow/small-width capture still exercised the same Compose surface and did not show clipping or text loss.

## Visual findings

Passed:

- Artwork renders.
- Artwork is clipped inside the rounded card.
- Artwork is behind text/details.
- Amount remains readable.
- Main label remains readable.
- Top-right label remains readable.
- Wallet icon remains visible.
- Status chip remains present.
- No overflow outside the card.
- Default home card remains available without artwork.

Minor observation:

- The status chip text is visually very small in the focused capture. This appears consistent with the existing default card capture, not introduced by the dragon artwork.

## Safety checks

Passed:

- No Visa logo.
- No Mastercard logo.
- No Mir logo.
- No real card number.
- No payment logic change.
- No backend model change.
- No navigation change.
- No runtime activation of dragon skin by default.
- `artworkRes = null` remains supported by the layer.

## Verification commands

Passed:

```bash
./gradlew :app:testDebugUnitTest --tests com.swimpay.receiver.ui.premium.HomeCardDragonQaScreenshotTest
```

Passed with capture recording after increasing Gradle memory:

```bash
GRADLE_OPTS="-Xmx1024m -XX:MaxMetaspaceSize=512m" ./gradlew :app:recordRoborazziDebug --tests com.swimpay.receiver.ui.premium.HomeCardDragonQaScreenshotTest --no-daemon
```

Passed:

```bash
./gradlew :app:testDebugUnitTest --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest.homeCardVisualSupportsLayeredArtworkWithoutChangingDefaultDashboard
```

Passed:

```bash
./gradlew :app:assembleDebug
```

## Remaining risks

- A physical device screenshot is still needed before making dragon-gold the default runtime card.
- The card still uses fixed height `214.dp`; aspect-ratio migration remains deferred.
- The artwork file is about 969 KB, acceptable for preview QA but worth reviewing before broad production use.
- If future copy becomes longer, the dragon head on the left could compete with text and may need a slight right/down offset or lower alpha.

## Recommendation

Keep current production fallback:

- `CardVisualDefaults.HomeDashboard`

Use dragon only in:

- preview;
- QA screenshot test;
- later controlled runtime flag if explicitly approved.

Do not enable as the default production dashboard skin yet.
