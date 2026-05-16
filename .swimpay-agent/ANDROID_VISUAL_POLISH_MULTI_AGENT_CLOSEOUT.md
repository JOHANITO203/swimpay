# Android Visual Polish Multi-Agent Closeout

Date: 2026-05-16

Scope: Android Merchant UI/design polish only.

Forbidden scope respected:
- no backend changes;
- no API contract changes;
- no payment runtime changes;
- no webhook semantics changes;
- no receiver runtime changes;
- no SDK behavior changes;
- no payment confirmation semantics changes.

## Senior Design Direction

The pass reinforces SwimPay as a premium merchant payment-signal product:

- cobalt/cyan over deep navy;
- three-wave SwimPay mark as a repeatable product signature;
- cleaner payment-object cards;
- stronger icon and logo containers;
- more readable status surfaces;
- less generic card chrome.

## Agent A

Surface:
- premium tokens;
- brand mark;
- notification icon.

Changes:
- refined cobalt/cyan/navy token contrast;
- added a reusable three-wave brand mark component;
- added a reusable brand signal tile;
- rebuilt `ic_notification_small.xml` as a transparent monochrome three-wave mark.

Notification icon result:
- no square;
- no background;
- white strokes only;
- thicker `2.75` stroke;
- optically centered for Android status bar rendering.

## Agent B

Surface:
- onboarding;
- login/account entry.

Changes:
- launcher badge now uses the full launcher icon shape;
- removed visual artifact risk from foreground-only launcher usage;
- improved account/onboarding cards with consistent cobalt/cyan tiles, spacing and radius;
- benefit rows are visual rows, not fake interactive controls.

## Orchestrator

Surface:
- dashboard;
- receiving methods;
- bank logo containers;
- receiver health;
- settings shared choice rows.

Changes:
- recent payment rows now have a branded payment icon zone;
- receiving-method action rows now use a calmer premium surface instead of over-heavy gradients;
- SBP card mark gets a proper white logo capsule;
- bank logo capsules have improved padding, radius and shadow;
- receiver health has a visual status tile and status chips;
- shared settings choice rows now localize `Actif` / `Choisir`.

## Guardrails

- No Roborazzi baseline update.
- No copy rewrite beyond existing localized UI labels and mojibake cleanup.
- No new features.
- No fake runtime data.
- No official bank confirmation wording added.

## Validation

Passed:
- `rg -n "�|Ã|Â" apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium apps/android-receiver/android/app/src/main/res -g "*.kt" -g "*.xml"`
- `git diff --check`
- `:app:compileStagingKotlin`
- `npm run android:assemble:staging`
- `:app:assembleRelease -x lintVitalRelease`
- `apksigner verify --verbose --print-certs app-release.apk`
- `npm run build --workspace @swimpay/landing`
- ADB install and launch of signed release APK

Note:
- `lintVitalRelease` remains skipped for the release build because local JVM lint previously OOMed; staging lintVital passed.

## Remaining Visual Risks

- Connected site remains developer-heavy and should be simplified in a separate UI-only pass.
- Review detail can become more visual with a timeline/card hierarchy.
- Business screen can be less KPI-dashboard and more merchant activity oriented.
- Real-device screenshots should be reviewed before freezing Roborazzi baselines.
