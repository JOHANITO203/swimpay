# Neobank notification templates & signing certs (harvest 2026-06-06)

> Honest truth, same discipline as `WEST_AFRICA_PAYER_LAUNCHERS.md`: APK resource
> strings give us the **local notification templates** and the **app signing
> certificate**; the money-received notification copy of these apps is largely
> **composed server-side** (push payload), so the harvested strings are a
> starting point and the `learning` template-observation loop is the safety net
> for whatever the APK doesn't reveal. Certs come from the apkpure mirror — they
> are seeded as the EXPECTED cert to match the first real on-device signal
> against, but the `bank_app_signatures` operator-review gate still applies
> (never production-trusted straight from a mirror).

## Method

`scripts/apk-deeplink-harvest.sh` pattern, extended for resources + certs:
`curl` the apkpure XAPK CDN → unzip the base APK → `apksigner verify --print-certs`
(V3.0 Signer = the real app signer; the shared `3257d599…` "Source Stamp Signer"
is apkpure's stamp, ignored) → `aapt2 dump strings` filtered for money-received copy.

## Results

| App | Package | Signing cert SHA-256 (V3) | Notification templates found in APK | Source |
|-----|---------|---------------------------|-------------------------------------|--------|
| Wise | `com.transferwise.android` | `149c4ea5825a81065589d27a60ea7e554df4b49e3c660cb65ba730025080dbd0` | `%1$s received` ; `Incoming` ; `How you got paid for this?` | apkpure XAPK, aapt2 |
| Revolut | `com.revolut.revolut` | `9c9be07135e972780282c2e5d27da06ecb8ee3adfc75303917ddf66d6faaefa4` | server-composed; local fragments only: `From %1$s`, `from %1$s`, `Received on the %s` | apkpure XAPK, aapt2 |
| Payoneer | `com.payoneer.android` | not harvested — 404 on apkpure | none | — |

## Consequences for the parser design

- **Wise**: the `%1$s received` template (amount as `%1$s`) plus an English money
  verb set (`received`, `from`) gives a usable best-effort matcher. Reference/note
  text is server-side → observed via learning.
- **Revolut**: notification body is server-composed; the parser relies on a generic
  English money-received matcher + the `from %1$s` sender fragment, refined by
  observed templates. Lower initial confidence than Wise — expected.
- **Payoneer**: no APK evidence. Ships with the same generic English matcher; cert
  stays `documented_unknown` (→ `TO_VERIFY` on first signal → operator review).
  B2B notification formats are less predictable; learning-only is the honest stance.

## Cert seeding (migration 030)

`bank_profiles.package_cert_sha256` for `wise_int` / `revolut_int` set to the
harvested V3 certs above; `payoneer_int` stays `documented_unknown`. This only
pre-fills the EXPECTED cert — the runtime `bank_app_signatures` flow
(`pending_verification` → operator approve) is unchanged; a mirror cert is never
auto-trusted for production.
