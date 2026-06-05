# West Africa receiving symmetry (Phase 2)

> **Update 2026-06-05 (migrations 026–027):** The West Africa provider set has
> been reduced to three active CI profiles: **Wave CI / Orange Money CI / MTN
> MoMo CI** on both payer-launcher and receiver sides. The eight original WA
> profiles (`orange_money_sn`, `wave_sn`, `free_money_sn`, `wizall_sn`,
> `moov_money_ci`, `djamo_ci`, `ecobank_ci`, `sg_connect_ci`) are retired
> (`selectable = false`, routes `pending_disable`). Phase 2.2 below still
> documents the original symmetric design; the current operational set is the
> CI trio only.

## Why
Before Phase 2, the buyer side (checkout) could offer West Africa / XOF payer
methods (Orange Money, Wave, MTN…) while the merchant side could only **receive**
on Russian rails (SBP / card), and an order could never even be created in XOF.
That asymmetry meant a buyer could be shown a payment method the merchant had no
way to receive.

## What Phase 2 delivers (symmetry is now structural)

| Phase | Change | Status |
|-------|--------|--------|
| 2.1 | `mobile_money` receiving rail + currency-aware amount parsing (`parseAmountMinor`); platform order currencies `{RUB, XOF, XAF}`; payer↔rail mapping extended. Migration 024 (additive). | Done |
| 2.2 | West Africa receiving bank profiles (`WestAfricaReceiverBankProfiles`, mirror of the payer launcher providers) + migration 025; WA phone normalization + international masking. | Done |
| 2.3 | `resolveMerchantPaymentReadiness` learns `mobile_money` + `receivable_currencies`; **order creation is gated**: an API-key order in a currency the merchant has no active route for is refused with `409 merchant_currency_route_required`. | Done |
| 2.4 | Backend high-level `/v1/merchant/receiving-methods` accepts `type: 'mobile_money'`; Android data layer (`ReceivingMethodType.MOBILE_MONEY`) so a WA route is configurable and operable in the **manual** model. | Done (backend + Android data layer) |

### The invariant now enforced
A merchant is only offered (and can only accept orders in) a currency it has an
active receiving route for. The checkout payer methods are currency-scoped
(Phase 1 fix). There is no path where a buyer is shown a method the merchant
cannot receive.

## What is intentionally NOT done yet (needs field data, not a code gap)
- **Automated notification capture** for Orange Money / Wave / MTN / Moov etc.
  Building reliable parsers requires real notification samples per app/locale.
  WA profiles are therefore `review_only` + `runtime_verified = false`: payments
  on a WA route work in SwimPay's **manual confirmation** model (the merchant
  reads their own wallet notification and confirms the order), exactly like a new
  RU bank before its templates are captured. Auto-detection is a later, sample-
  driven iteration — not a prerequisite for the symmetric manual flow.
- **Polished Android Compose picker** for selecting a WA bank + mobile money at
  add-method time. The data layer and API support it; the dedicated visual
  selector is a follow-up.

## Operational note
Migrations 024 and 025 are additive and must be applied on the live DB the same
way as 023 (initdb.d mounts only run on first init):
`Get-Content -Raw migration.sql | plink … "docker exec -i swimpay-postgres psql -v ON_ERROR_STOP=1 -U swimpay -d swimpay"`.
