# APK intelligence — signing certs, notification channels, deeplinks (harvest 2026-06-06)

> Source: APKs provided locally by the operator (`Downloads/Analyse-APK/apk bank`),
> harvested with `scripts/apk-intelligence-harvest.sh` (aapt2 + apksigner + dexdump).
> **Honest truth per cell**: certs are reliable (V3 signer); channel IDs are
> best-effort (R8/obfuscation hides most → confirmed by the device learning loop);
> deeplinks are from the manifest. Certs come from operator-provided APKs, not
> Google Play — they pre-fill the EXPECTED cert; the `bank_app_signatures`
> pending→operator-review gate is unchanged (never auto-trusted from a sideload).

## Signing certificates (SHA-256, V3 signer)

| SwimPay profile | App / package | Version | Cert SHA-256 | Note |
|---|---|---|---|---|
| `wise_int` | Wise `com.transferwise.android` | 9.28.0 | `149c4ea5825a81065589d27a60ea7e554df4b49e3c660cb65ba730025080dbd0` | ✅ |
| `revolut_int` | Revolut `com.revolut.revolut` | 10.133 | `9c9be07135e972780282c2e5d27da06ecb8ee3adfc75303917ddf66d6faaefa4` | ✅ |
| `payoneer_int` | Payoneer `com.payoneer.android` | 8.5.7 | `8d607e96c1e38c9f5150cedf27401e5fd636a8340845b2c04204c158892be58f` | ✅ (was missing on apkpure) |
| `wave_ci` | Wave `com.wave.personal` | 26.05.27 | `d85ddd0752685c4205b6bedf035f62f8cc93025a44d1af982cfd6da85fd3ce26` | ✅ |
| `alfa_ru` | Alfa-Bank `ru.alfabank.mobile.android` | 12.53.11 | `58bfa7d6fa3aa0d4e8de8a3e6ca8d5a33b376fc48b2176d37bbe58ea8cbc7a23` | ✅ |
| `vtb_ru` | VTB `ru.vtb24.mobilebanking.android` | 20.9.1.4 | `38cbbeee52c94777f7ffd27ebb392009a00d574fa15895abf3bcd83e7f78cb69` | ✅ |
| `gazprombank_ru` | Gazprombank `ru.gazprombank.android.mobilebank.app` | 6.2.1 | `6178e775f87853fb4fd655695dc4cca50fe70577a527715789968f93741df89c` | ✅ |
| `tbank_ru` | T-Bank `com.idamob.tinkoff.android` | 7.36.0 | `5df281c2e6e94a80d769679a32c0318df6855c90f511785676ebfe892b40d9d8` | ✅ |
| (new) `taptapsend` | Tap Tap Send `com.taptapsend` | 2.73.1 | `e10a90f4e1ceac10d44a7ea0bb421c9fd9eda0886ad8829ed70437f61819326a` | new profile to create |
| — | MoMo `com.consumerug` | 2.2.1 | `1835f1e22f5e24b014e0d7fe2506cf985e11cdf7500d2329be3308b6e964134c` | ⚠️ **MTN MoMo Uganda — NOT the CI target** `mtnft.momo.consumer` |

### Missing from this harvest (need APKs to complete cert-pinning)
`sber_ru` (Sberbank), `ozon_bank`, `orange_money_ci` (Orange Money CI), and the **real** `mtn_momo_ci` (`mtnft.momo.consumer`). The provided "MoMo" is the Uganda app (`com.consumerug`) — a different package; do not pin it to `mtn_momo_ci`.

## Notification channel IDs (best-effort, confirm via learning)

| Profile | Channel-ish strings found | Usable? |
|---|---|---|
| `alfa_ru` | `notifications_channel`, `info_channels`, `claim_channel` | likely — seed `notifications_channel` |
| `vtb_ru` | `communicationChannel1/2/3` | likely — seed all three |
| `gazprombank_ru` | `default_push_channel`, `channel` | `default_push_channel` |
| `tbank_ru` | `CSPNotificationChannelID`, … | partial |
| `payoneer_int` | `ChannelID` (generic) | no |
| `revolut_int` | `Channel/channel/channels` (generic) | no |
| `wise_int`, `wave_ci`, taptapsend | none surfaced | → learning |

Most payment channel IDs are not statically extractable (server-driven / R8). The
device captures the real `channelId` on every notification; the learning table
(`bank_notification_channels`, status `pending`) records them in production for
operator confirmation. Static seeds above are a head start, not the source of truth.

## Deeplinks (for the SDK launcher registry)

Custom schemes worth wiring (App Link hosts omitted here; see `intelligence.tsv`):

| Profile | Payment-relevant schemes |
|---|---|
| `payoneer_int` | `payoneer` (+ App Links `*.app.link`) |
| `revolut_int` | `revolut` (+ `revolut.me`, `app.revolut.com`, `pay.revolut.com`) |
| `wise_int` | `wise`, `transferwise`, `tw` (+ `*.wise.com`) |
| `wave_ci` | `wave` (+ `pay.wave.com`, `www.wave.com`) |
| (new) taptapsend | `taptapsend`, `taptapsendmoney` (+ `taptapsend.onelink.me`) |
| `tbank_ru` | `tbank`, `tinkoffbank`, `tcalls`, `bank100000000004` |
| `vtb_ru` | `vtb`, `extvtb`, `bank100000000005`, `sbpay` |
| `gazprombank_ru` | `gpbapp`, `bank100000000001`, `sbpay` |
| `alfa_ru` | `alfabank` |

(RU SBP/`nspk` hosts — `qr.nspk.ru`, `sub.nspk.ru`, `me2mepull.nspk.ru` — confirm
the existing launcher deeplinks; they corroborate the registry shipped earlier.)

Raw per-app detail: `.apk-research/intelligence/intelligence.tsv` (gitignored).
