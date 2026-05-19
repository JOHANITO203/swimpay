# Receiving Method Delete Confirmation Fix

## Scope

Android merchant UI only.

Touched surface:

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMerchantVisualArchitectureTest.kt`

No backend, payment runtime, navigation, API contract or notification-processing logic was changed.

## Root Cause

The delete action was technically wired, but the first tap only opened an inline confirmation panel inside the receiving-method card.

On small screens or lower scroll positions, this confirmation could appear below the visible area, making the button feel broken. The confirm action also reused the label `Supprimer`, so the first destructive action and final confirmation were visually ambiguous.

## Fix

The destructive delete confirmation now opens a centered Compose `Dialog`:

- the first `Supprimer` tap always produces visible feedback;
- the final destructive action uses the shorter label `Confirmer`;
- cancel/confirm buttons keep equal width and truncate safely if localized text is longer;
- the existing disable confirmation remains inline because it is less destructive and already understandable.

## Why This Is Correct

The bug was not in the backend delete endpoint or repository wiring. The UI action chain already reached `onDeleteMethod`; the unreliable part was the confirmation affordance.

Moving only the destructive confirmation to a modal fixes discoverability without changing the receiving-method lifecycle, route identifiers, backend state, audit behavior or payment logic.

## Verification

Command run:

```powershell
.\gradlew.bat :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest.premiumReceivingMethodComposeExposesOperationalDraftWithoutRawSavedDisplay --no-daemon --stacktrace --max-workers=1 --no-watch-fs
```

Result:

- first run failed before the fix because the delete confirmation was still inline;
- second run passed after the dialog implementation.

The command also recompiled the staging Kotlin sources.
