# Android WA Catalog Reduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the Android receiver app's West Africa catalog with the prod backend: exactly `wave_ci` / `orange_money_ci` / `mtn_momo_ci`, then rebuild and republish the APK.

**Spec:** `docs/superpowers/specs/2026-06-05-android-wa-catalog-reduction-design.md`

**Architecture:** Pure data-list edit in the hardcoded Kotlin catalog (server validates ids); display-label map gains `wave_ci`; test fixtures move off `wave_sn`; Roborazzi goldens re-recorded; release APK published to the landing's downloads.

**Tech Stack:** Kotlin/Compose (gradle via repo-root npm scripts), Roborazzi screenshots, Windows PowerShell (no `&&`).

---

### Task 1: Reduce the catalog + label map + test fixtures

**Files:**
- Modify: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/WestAfricaReceivingCatalog.kt:22-33`
- Modify: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt:699-716`
- Modify: `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMerchantApiWiringTest.kt:839-870` (wave_sn fixtures)

- [ ] **Step 1: Update the unit-test fixtures first** — in `AndroidMerchantApiWiringTest.kt`, replace every `wave_sn` occurrence (~lines 839, 856, 863, 870) with `wave_ci` (the JSON `bank_profile_id`, the submission `bankProfileId`, both assertions). Search the whole file for other retired ids (`orange_money_sn`, `moov_money_ci`, `free_money_sn`, `wizall_sn`, `djamo_ci`, `ecobank_ci`, `sg_connect_ci`) and switch any found to a kept id (`orange_money_ci` or `mtn_momo_ci`), preserving every assertion.

- [ ] **Step 2: Run tests to see the fixture-driven failures**

Run (repo root): `npm run android:test`
Expected: FAIL — `wave_ci` not in catalog (`byId`/`bankProfileIds` lookups) or golden diffs. If everything passes already, the fixtures didn't exercise the catalog — continue anyway.

- [ ] **Step 3: Replace the catalog list** — `WestAfricaReceivingCatalog.kt` lines 22-33 become:

```kotlin
    val wallets: List<WestAfricaReceivingOption> = listOf(
        WestAfricaReceivingOption("wave_ci", "Wave", "Côte d'Ivoire", 0xFF1DC8FF, "W", darkInk = true),
        WestAfricaReceivingOption("orange_money_ci", "Orange Money", "Côte d'Ivoire", 0xFFFF7900, "OM"),
        WestAfricaReceivingOption("mtn_momo_ci", "MTN MoMo", "Côte d'Ivoire", 0xFFFFCB05, "MTN", darkInk = true)
    )
```

Update the header comment (lines 3-8): append one sentence — `Reduced 2026-06-05 to the Côte d'Ivoire trio mirroring the backend registry reduction.`

- [ ] **Step 4: Label map** — in `AndroidMerchantApiWiring.kt` `MERCHANT_RECEIVING_METHOD_BANK_LABELS` (lines 699-716), add `"wave_ci" to "Wave",` after the `"wave_sn"` entry. KEEP all retired entries (display labels for pre-existing routes).

- [ ] **Step 5: Run unit tests**

Run: `npm run android:test`
Expected: unit tests PASS; Roborazzi `verifyRoborazziDebug` may FAIL on WA screens (legitimate visual change). If goldens fail on screens unrelated to receiving methods, STOP and report.

- [ ] **Step 6: Re-record goldens and verify**

Run: `npm run android:visual:accept` (record + verify)
Expected: PASS. Inspect the regenerated `premium_receiving_methods.png` (and any other changed golden) — the WA grid must show exactly 3 badges (W cyan, OM orange, MTN yellow) and no "+N" overflow badge.

- [ ] **Step 7: Commit**

```powershell
git add apps/android-receiver
git commit -m "feat(android): reduce WA receiving catalog to Wave CI / Orange Money CI / MTN MoMo CI"
```

---

### Task 2: Build and publish the release APK

**Files:**
- Replace: `apps/landing/public/downloads/swimpay-merchant.apk`

- [ ] **Step 1: Build the release APK**

Run: `npm run android:assemble:release`
Expected: BUILD SUCCESSFUL → `apps/android-receiver/android/app/build/outputs/apk/release/app-release.apk`. If release signing secrets are missing (signing failure), STOP and report BLOCKED — never publish a debug build.

- [ ] **Step 2: Publish to the landing**

```powershell
Copy-Item apps/android-receiver/android/app/build/outputs/apk/release/app-release.apk apps/landing/public/downloads/swimpay-merchant.apk -Force
```

Sanity: compare the new file size with the previous one (`git diff --stat` should show a same-order-of-magnitude binary, ~13 MB).

- [ ] **Step 3: Commit**

```powershell
git add apps/landing/public/downloads/swimpay-merchant.apk
git commit -m "chore(landing): publish receiver APK with CI-trio WA catalog"
```

---

### Task 3: VERIFY

- [ ] `npm run android:test` green; `npm run typecheck` clean (untouched TS); `git diff --stat` limited to android-receiver + the APK binary; report summary.
