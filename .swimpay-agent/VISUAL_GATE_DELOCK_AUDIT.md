# Visual Gate Delock Audit

Date: 2026-05-14

## Scope

This audit covers Android Merchant visual regression gates only. It does not move or weaken product, security, privacy, payment, receiver, webhook, asset registry, or copy-truth guardrails.

## Current Entrypoints

| Entrypoint | Location | Classification | Default policy |
| --- | --- | --- | --- |
| Roborazzi Gradle plugin | `apps/android-receiver/android/app/build.gradle.kts` | `visual_golden_test` | `move_to_manual_visual_gate` |
| `PremiumGoldenScreenshotTest` | `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/ui/premium/PremiumGoldenScreenshotTest.kt` | `visual_golden_test` | `move_to_manual_visual_gate` |
| `PremiumReferencePngComparisonTest` | `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/ui/premium/PremiumReferencePngComparisonTest.kt` | `visual_golden_test` | `move_to_manual_visual_gate` |
| `PremiumDesignGuardrailsTest` | `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/PremiumDesignGuardrailsTest.kt` | `visual_golden_test` / design-structure guardrail | `move_to_manual_visual_gate` |
| `npm run android:screenshot:record` | `package.json` | `visual_golden_test` | manual only |
| `npm run android:screenshot:verify` | `package.json` | `visual_golden_test` | manual only |
| `:app:testDebugUnitTest` / `:app:testStagingUnitTest` | Gradle test tasks | mixed suite | exclude visual tests by default |
| GitHub Actions Android receiver validation | `.github/workflows/ci.yml` | runtime/build validation | `must_keep_default`, without visual goldens |

## Guardrails That Must Stay Default

| Guardrail | Classification | Default policy |
| --- | --- | --- |
| No raw notification display/copy | `product_guardrail_test`, `security_guardrail_test` | `must_keep_default` |
| No official bank confirmation claims | `product_guardrail_test` | `must_keep_default` |
| No auto-confirmation wording/semantics | `product_guardrail_test`, `runtime_test` | `must_keep_default` |
| No Android-owned webhook delivery/confirmation semantics | `product_guardrail_test`, `runtime_test` | `must_keep_default` |
| Secrets and API/webhook keys masked | `security_guardrail_test` | `must_keep_default` |
| No fake runtime hardcoded data | `runtime_test`, `product_guardrail_test` | `must_keep_default` |
| SMS/Accessibility/scraping/QUERY_ALL_PACKAGES prohibitions | `security_guardrail_test` | `must_keep_default` |
| Android compile, JVM non-screenshot tests, assemble debug/staging | `runtime_test` | `must_keep_default` |

## Root Cause

The visual tests and legacy design-structure guardrails are normal JUnit/Robolectric tests, so generic Gradle unit test tasks can execute them. That makes every visual polish change behave like a release visual regression even when the developer only needs compile and non-visual guardrails.

## Delock Decision

Roborazzi remains available and required for visual freeze/release, but it is no longer part of default Android unit validation unless explicitly enabled.
