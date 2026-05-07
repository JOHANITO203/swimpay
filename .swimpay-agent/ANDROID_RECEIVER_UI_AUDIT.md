# Android Receiver and UI Audit

generated_at: 2026-05-07T14:40:00+03:00

## Verdict

The active Android visual source is `ui/premium`, and it is much more coherent than earlier legacy UI. However, several surfaces still use demo-looking live data and old wording (`Validation`, `Validé`, beta copy, automatic-update copy). This should be cleaned before real merchant demos.

## Strengths

- Active path remains `MainActivity -> PremiumMerchantApp -> PremiumMerchantRuntime`.
- No active legacy `ui/screens` source is used.
- Notification Access gate and Bank Target Lock models exist.
- UI has local-state/hydration fallbacks and avoids raw notification text/HMAC/package details in normal screens.

## High-risk UI findings

| Severity | File | Evidence | Risk |
| --- | --- | --- | --- |
| High | `PremiumMerchantRuntime.kt:83-119`, `:137-150` | Hard-coded amounts and demo review rows (`58,41`, `129,00`, `rev_demo`). | Merchant may see fake live activity as real. |
| High | `PremiumMerchantRuntime.kt:647`, `:666` | Default merchant ID `mch_demo`. | Demo identity can leak into QA assumptions. |
| Medium | `AndroidMerchantUiModels.kt:521-524` | Mode text references automatic validation availability. | Could imply autonomous confirmation in V1. |
| Medium | `apps/web/src/screens/MerchantScreens.ts` | Web merchant screens contain static dashboard/order/review amounts and timeline rows. | Browser QA can pass while live data is not wired. |
| Medium | `apps/web/src/screens/MerchantScreens.ts` | Several strings show mojibake in rendered source snapshots in prior outputs. | Encoding polish is needed before public demo. |

## Receiver runtime UI boundary

Android UI can show readiness states, but real NotificationListener runtime is still debug-synthetic-only. That makes any UI claim of live bank recognition premature until `ReceiverBoundaries` is wired to enabled supported bank targets.

## Recommendation

1. Replace demo payment rows with explicit empty/live states on all merchant UI surfaces.
2. Use "confirmation" consistently instead of "validation" where merchant-facing payment outcome is meant.
3. Ensure Mode de confirmation cannot imply active IA/automatic confirmation in V1.
4. Add real-device visual pass after removing demo data.

