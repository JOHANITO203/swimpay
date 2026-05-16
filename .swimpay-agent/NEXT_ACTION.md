# Next Action

generated_at: 2026-05-15T23:10:00+03:00

## Current Android Priority

Install the updated staging APK and verify onboarding + receiving methods on device.

## Completed Locally In This Pass

1. Ozon Bank selection fixed in onboarding state.
2. Launcher icon restored in onboarding.
3. Bank logos polished and reused in onboarding/receiving-method rows.
4. Receiving-method edit now performs destination replacement via create-then-delete against existing contracts.
5. Local session restore audited as already present and Keystore-protected.

## Device Test

1. Open onboarding and verify launcher icon, bank logos and Ozon selection.
2. Add card and SBP receiving methods.
3. Modify a method with a new destination and verify the old method disappears after backend reload.
4. Delete a method and verify it disappears after reload.
5. Google link/recover, force-stop, relaunch and verify local session restore.

## Blocker Watch

- If delete still does not remove an item after reload, capture backend response/logs for `DELETE /v1/merchant/receiving-methods/:method_id`.
- If replacement creates the new method but keeps the old one, the create succeeded but delete failed; Android reports this as a manual cleanup message.

generated_at: 2026-05-14T07:05:00+03:00

## Current Design Priority

Android Merchant readability/responsive polish is installed on the connected device as a staging APK. Next action is operator visual review for readability, bottom-nav comfort and SBP recognition.

## Completed Locally In This Pass

1. Recalibrated premium typography floors and bottom navigation.
2. Reduced repeated long explanatory copy on active dashboard/review/security surfaces.
3. Replaced visible review `Risque` wording with priority/review wording.
4. Added and registered one SBP placeholder visual mark.
5. Applied SBP mark to onboarding and receiving-method rows.
6. Passed staging Kotlin compile and staging APK assembly.
7. Installed the staging APK on the connected device.

## Next Recommended Design Action

1. Review dashboard, review queue/detail, receiving methods, integrations, receiver health and security settings on the phone.
2. Mark any remaining text that feels too large/small or clipped.
3. Enter Visual Freeze Mode only after the readable UI is accepted.

## Do Not Do

- Do not change backend/API/database/payment/webhook/receiver/SDK/state-machine code for this design pass.
- Do not run Roborazzi or update goldens before visual approval.

generated_at: 2026-05-14T00:00:00+03:00

## Current Design Priority

Android Merchant Full Visual Rebuild is locally complete as a design-only pass. Next action is operator visual review of the captured APK/screenshot, then Visual Freeze Mode only after approval.

## Completed Locally In This Pass

1. Rebuilt active premium Android Merchant surfaces toward the 14 mockups.
2. Preserved copy meaning and kept SBP visual orientation.
3. Made Ozon visually selectable when present in bank UI state.
4. Kept receiving setup visually capable of card, SBP and card+SBP.
5. Passed `:app:compileDebugKotlin` and `:app:assembleDebug`.
6. Installed and launched the APK on a real device; captured `.swimpay-agent/screenshots/android-full-visual-rebuild/after_launch.png`.

## Next Recommended Design Action

1. Review the live Android Merchant APK visually.
2. If accepted, enter Visual Freeze Mode.
3. Capture all 14 final screen screenshots.
4. Update Roborazzi goldens only after approval.

## Do Not Do

- Do not change backend/API/payment/webhook/receiver/database/SDK/state-machine code for this design pass.
- Do not update goldens before approval.
- Do not run screenshot verify as a blocking polish gate.

generated_at: 2026-05-13T00:59:00+03:00

## Current Runtime Priority (Receiver Arming Blocker)

1. Redeploy staging with the latest API build (creation-time arming fix).
2. Create a fresh order.
3. Complete full checkout path:
   - expected payment profile saved;
   - payment instructions shown;
   - continue-to-bank (`receiver_armed_at` written).
4. Wait fallback window or run synthetic review-safe trigger.
5. Confirm review in Android Merchant.
6. Verify webhook delivery in `webhook_deliveries` and external signature validation logs.
7. Rotate exposed staging secrets/tokens before final rehearsal sign-off.

## Completed Locally In This Pass

1. Persisted safe SDK/API `return_url` on orders for confirmed checkout return UX.
2. Exposed `return_url` through order, payment-session and checkout-status contracts.
3. Hosted checkout now uses stored merchant return URL before native-scheme/browser fallback.
4. Enriched final webhook payloads with `external_id`, amount, currency and status.
5. Final webhook worker now emits fulfillment webhooks for manual merchant decisions from both notification-signal reviews and no-notification manual-bank-check reviews.
6. Added targeted API/web/job-worker regression tests.

## Next Recommended Action

1. Apply migration `022_checkout_return_url_and_webhook_payload.sql` on staging.
2. Redeploy API, web and job-worker.
3. Create an external-app SDK order with `external_id` and `return_url`.
4. Confirm the review in Android Merchant.
5. Verify buyer checkout shows confirmed, then `Retourner au marchand` opens the configured return URL.
6. Verify the external backend receives signed `payment.confirmed`, verifies `SwimPay-Signature`, and fulfills by `external_id`.

## Do Not Do

- Do not use `return_url` as fulfillment proof.
- Do not put webhook secrets or API keys in `return_url`.
- Do not handle webhook secrets in Android.
- Do not change final-only webhook semantics.

## Previous Pass

## Completed Locally In This Pass

1. Fixed checkout `Retourner au marchand` for Android SDK custom return schemes.
2. `SwimPayCheckout.open(...)` now forwards `returnScheme` to hosted checkout as `swimpay_return_scheme`.
3. Hosted checkout now renders a safe native return URL after confirmation.
4. Unsafe return schemes are rejected and fall back to browser history.
5. Added targeted web and Android SDK guardrail tests.

## Next Recommended Action

1. Redeploy web to staging.
2. Rebuild/update the external Android app with the updated SDK code.
3. Open checkout with `SwimPayCheckoutOptions(returnScheme = "merchantapp", bankLauncherScheme = "merchantapp")`.
4. Confirm the review in Android Merchant.
5. Tap `Retourner au marchand` and verify the external app receives `merchantapp://swimpay-return?...`.

## Do Not Do

- Do not treat the app return as payment proof.
- Do not confirm locally in Android.
- Do not change webhook final-only semantics.

## Previous Pass

## Completed Locally In This Pass

1. Audited buyer checkout final-state propagation after merchant review confirmation.
2. Confirmed backend manual review decision already updates the payment session to `manual_confirmed`.
3. Added status polling to the hosted checkout waiting screen.
4. Added no-store headers to API and hosted web checkout status endpoints.
5. Made rejected buyer-safe status explicit in the shared checkout contract.
6. Added targeted contract/API/web tests for confirmed/rejected final state propagation.

## Next Recommended Action

1. Redeploy API/web to staging.
2. Create/open a real external-app checkout URL.
3. Confirm the merchant review from Android Merchant.
4. Verify the buyer checkout updates to `Paiement confirme` without manual browser refresh.

## Do Not Do

- Do not enable auto-confirmation.
- Do not treat signal detection as confirmation.
- Do not process real bank notifications in this sprint.
- Do not change public webhook semantics.

## Previous Pass

## Completed Locally In This Pass

1. Removed stale visual blockers from `.swimpay-agent/BLOCKERS.md`.
2. Added Android Roborazzi goldens for:
   - Moyens de reception;
   - Developer Integration;
   - Mode confirmation.
3. Kept hosted checkout browser baselines active and regenerated after checkout bank-selector changes.
4. Marked Ozon Bank operator runtime-verified for manual-review-only V1 use.
5. Added Ozon Bank as selectable sender/receiver bank in contracts.
6. Added documented Ozon placeholder icon `ic_bank_ozon`.
7. Exposed bank logo asset keys in checkout sender-bank selection and receiver-bank payment instructions.
8. Rendered bank logos on Android Merchant review cards.
9. Replaced Android local notification small icons with registered monochrome vector `ic_notification_small`.

## Next Recommended Action

1. Apply migration `021_ozon_bank_runtime_verified.sql` on staging.
2. Build/install the staging APK for device verification.
3. Only after the staging smoke is clean, continue official bank logo polish if approved assets are provided.

## Do Not Do

- Do not enable auto-confirmation.
- Do not treat runtime verified as official bank confirmation.
- Do not process real bank notifications in this polish pass.
- Do not add unregistered/generated bank logos.

## Current Pass - Checkout Sender Bank / Receiver Route

## Completed Locally In This Pass

1. Added explicit sender bank contract from the payer launcher registry.
2. Added explicit receiving method contract from active merchant routes.
3. Fixed Step 1 sender-bank visual selection.
4. Fixed checkout bank logo resolution outside repo-root cwd.
5. Added Step 2 sender bank and receiver bank separation.
6. Added targeted contract/API/web tests.

## Next Recommended Action

1. Run full validation.
2. Regenerate/verify checkout browser screenshots if visual baselines changed.
3. Redeploy API/web to staging.
4. Verify on mobile that all six sender banks are selectable and `Aller a ma banque` opens the selected sender bank.

## Do Not Do

- Do not use receiver bank as payer launcher.
- Do not add generated bank logos.
- Do not change payment confirmation semantics.
- Do not process real bank notifications in this checkout contract pass.

## Current Pass - Checkout Micro Details / Return Host

## Completed Locally In This Pass

1. Updated Step 1 checkout copy and sensitive-data notice.
2. Made late `J'ai paye` claims idempotent for confirmed, rejected and expired sessions.
3. Preserved Android SDK return scheme through hosted checkout form redirects.
4. Added checkout-safe return CTA resolution so raw API endpoints are not rendered as buyer destinations.
5. Added targeted API and web checkout regression tests.

## Next Recommended Action

1. Run full validation.
2. Run hosted checkout screenshot verification and record if intentional copy/layout baseline changes require it.
3. Redeploy API/web to staging.
4. Test Android SDK host return and late buyer claim behavior from the external app.

## Do Not Do

- Do not use return URL as fulfillment proof.
- Do not change final webhook semantics.
- Do not reopen final payment sessions from buyer actions.

## Validation Status

Full local validation passed. Next action is staging redeploy and external-app smoke test for Android return scheme plus late buyer claim reconciliation.

## Next - Checkout runtime rehearsal
- Redeploy staging and manually verify buyer flow: instructions -> waiting/final states, no edit CTA, checkout_edit=1 ignored.
## Checkout Contradiction Review (Audit-Only, 2026-05-13)

1. Basculer le rendu Step 1 vers `available_sender_banks` comme source primaire (et garder `payer_bank_launchers` pour la résolution d’ouverture uniquement).
2. Prioriser `logo_asset_key` contractuel backend pour tous les logos checkout (sender + receiver), fallback local en dernier recours.
3. Aligner le renderer d’étape sur `checkout_state` canonique backend avec priorité finale stricte.
4. Remplacer le fallback `history.back()` final par une destination déterministe “retour indisponible” quand aucun target sûr n’existe.
5. Ajouter tests E2E multi-tab/stale-session + webhook consumer rehearsal.

## Checkout Contradiction Fix Sprint (2026-05-13)
1. Deploy to staging and validate end-to-end Android scheme return + web return fallback.
2. Run real-device checkout where sender bank list comes from backend payload and verify logos for all configured banks.
3. Add observability counter for deterministic fallback hits (/merchant/return-unavailable).

## Android Merchant Design Polish Mode (2026-05-14)

1. Continue `01_login_welcome` visual refactor using `design/VISUAL_GATE_POLICY.md`.
2. Use `npm run android:compile`, `npm run android:test`, and APK assemble commands for normal polish validation.
3. Use `npm run android:visual:record` / `npm run android:visual:verify` only when freezing an approved visual state.

## Android Merchant Mockup Polish - Next Action (2026-05-14)

1. Use `01_login_welcome` as the new token baseline for onboarding polish.
2. Continue with `02_notification_access`: reuse `MockupScreenBackground`, `MockupGlassCard`, `MockupPrimaryButton`, `MockupOutlineButton` and the compact status/banner patterns.
3. Keep `npm run android:test` as the default validation and run `npm run android:visual:record` only for explicit visual captures.
4. Do not claim pixel-perfect; continue screen-by-screen visual diff against the reference PNGs.

## 2026-05-14T01:45:00+03:00 - Next Action
Continue with screen-by-screen manual visual polish, starting with `02_notification_access` and `03_bank_selection`, using the newly recorded numbered Roborazzi screenshots as the comparison target. Build a dedicated production `PremiumIntegrationsListStateScreen` before claiming screen 11 structure is close to the reference.

## 2026-05-14T12:00:00+03:00 - Next Action
Continue structural matching screen-by-screen without Roborazzi gates. Start with `07_dashboard_home`: rebuild the dashboard hero, chart, metric cards, quick actions and recent activity to match the reference PNG now that the global shell and bottom nav no longer use the old visual language.

## 2026-05-14T12:45:00+03:00 - Next Action

Use the new workflow docs for the next visual sprint:

1. Activate Design Polish Mode by saying: `Design Polish Mode`.
2. Activate Full Visual Rebuild Mode by saying: `Full Visual Rebuild Mode`.
3. Continue with `07_dashboard_home`, then `02_notification_access` and `03_bank_selection`.
4. Keep Roborazzi non-blocking until Visual Freeze Mode is explicitly requested.
5. Do not change backend, API, database, payment runtime, webhook, receiver runtime, SDK or notification processing during design-only work.

## 2026-05-14 - Android edge-to-edge shell/splash sprint
- Next visual pass: fix oversized/wrapped premium screen typography under real-device display settings and investigate accented glyph rendering.
- Optional QA: navigate directly to receiver health and unauthenticated login state for additional edge-to-edge captures.


## 2026-05-14 - Android text integrity and mojibake fix
- Next visual QA pass: spot-check review detail, receiving methods, integrations, receiver health and security settings for layout-specific overflow under real-device font/display settings.

2026-05-14 - Next: operator visual pass on freshly installed staging APK; inspect remaining density differences on dashboard/review/security before Roborazzi freeze.

---

generated_at: 2026-05-14T00:00:00+03:00

## Current Runtime Priority

Android Merchant Runtime Wiring is locally complete. Next action is to install the staging APK and verify that active screens use staging/backend data or honest loading/empty/error states.

## Completed Locally In This Pass

1. Removed debug/staging forced design fixtures from dashboard, reviews, review detail, receiving methods, integrations and receiver health.
2. Kept previews/goldens mock-capable while preventing staging runtime from using preview fixtures.
3. Replaced fake integration fallbacks with honest unavailable/configuration states.
4. Replaced fake security sessions/devices/IPs with an honest unavailable state.
5. Added runtime wiring guardrail tests.
6. Passed Kotlin compile, targeted Android JVM tests and staging APK assembly.

## Next Recommended Runtime Action

1. Install the staging APK built by `npm run android:assemble:staging`.
2. Log in against `https://staging.swimpay.pro`.
3. Verify dashboard/reviews/receiving methods/integrations/receiver health/security show real data or honest empty/offline states.

## Do Not Do

- Do not add features during this wiring check.
- Do not redesign screens.
- Do not use a local debug APK for VPS testing unless explicitly requested.

## 2026-05-15T01:30:00+03:00 - Button Wiring Next Action

1. Use the freshly installed staging APK on the connected phone.
2. Smoke-test dashboard quick actions, bottom nav tabs, receiving method actions, Settings -> Google link, app lock toggle, receiver health back arrow and advanced settings.
3. Continue staging runtime verification against `https://staging.swimpay.pro`.

## 2026-05-15T01:55:00+03:00 - Settings/menu verification

1. On the staging APK, open `Paramètres` from bottom nav.
2. Verify the simple menu shows `Apparence`, `Langue`, `Sécurité`, `Centre d'aide`, and `Contacter le support`.
3. Verify `Sécurité` still opens Google link/app lock, while `Langue` and `Apparence` remain separate simple screens.

## 2026-05-15T02:10:00+03:00 - Feature restoration next action

1. Restore simple access to the existing `Orders/Ventes` surface without adding a new feature.
2. Fix the Settings `Ventes` row so it no longer routes to `Récepteurs`.
3. Keep integrations scoped to the existing connected-site contract until a real multi-site contract is intentionally added.
4. Keep Security remote sessions/devices as honest unavailable state until a real repository exists.

## 2026-05-15T02:35:00+03:00 - Merchant simplicity next action

1. Operator device-check Dashboard, Integrations, Receiver Health and Security on the staging APK.
2. Confirm the default screens feel merchant-friendly and that `Détails techniques` is secondary.
3. Restore `Orders/Ventes` access as the next separate functional restoration item.

## 2026-05-15T03:05:00+03:00 - Orders/Ventes next action

1. On device, open Paramètres -> Ventes and verify the orders/sales screen opens.
2. Confirm it shows real staging orders or honest empty/offline state.
3. Next separate audit: check whether `OrderDetail` had a complete pre-design contract before restoring detail navigation.

## 2026-05-15T03:25:00+03:00 - Preexisting contract audit next action

1. Treat the pre-design contract audit as closed: completed old Android Merchant contracts are restored or present.
2. Keep `OrderDetail` as a documented partial/stub unless the operator asks for a dedicated Android order-detail wiring pass.
3. Do not add multi-site integrations or remote session/device management without a separate approved product/contract task.

## 2026-05-15T03:45:00+03:00 - Android UI rollback next action

1. Operator verifies the installed rollback staging APK on device `R5CWA0FEPZW`.
2. Confirm whether the restored 2026-05-13 UI direction is acceptable.
3. If accepted, only re-apply strictly necessary runtime/session fixes on top of this UI state.
# Next Action

generated_at: 2026-05-16T00:30:00+03:00

## Current Android Priority

Roborazzi is aligned with the current Android Merchant design tokens. Next step is operator review of the frozen staging visual state, then commit/push when accepted.

## Completed Locally In This Pass

1. Added `premium_startup_splash.png` Roborazzi coverage.
2. Added `premium_security.png` Roborazzi coverage for the Google row.
3. Regenerated premium Roborazzi baselines for the current design tokens.
4. Verified the regenerated baselines.

## Validation

1. `npm run android:screenshot:record`
2. `npm run android:screenshot:verify`

## 2026-05-16T00:40:00+03:00 - GitHub CI next action

GitHub CI failures from the provided logs are aligned locally. Next action is to commit/push the CI alignment patch and let GitHub rerun the jobs.

## 2026-05-16T07:25:00+03:00 - I18N next action

French is now the localization base for landing, Android resources, Android premium account/settings copy and the checkout entry shell. Next action is a separate pass to migrate remaining hardcoded Android business-screen copy and deeper checkout steps into the same `fr/en/ru` model without changing product semantics.

## 2026-05-16T14:25:00+03:00 - Mojibake next action

Keep `packages/bank-templates/src/fixtures.ts` and `packages/bank-templates/src/parser.ts` as the only explicit mojibake allowlist. If more malformed text appears elsewhere, fix the source text instead of expanding the allowlist.

## 2026-05-17T00:27:00+03:00 - Release production next action

Before creating the signed production APK, load the release keystore variables into the local build environment or CI secret store, then run `npm run android:assemble:release`. The current code now rejects missing release signing values instead of silently producing an unsafe release.
