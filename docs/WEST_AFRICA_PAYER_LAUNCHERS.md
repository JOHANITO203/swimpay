# West Africa (UEMOA / XOF) — Payer launcher research

> Données pour étendre `PayerBankLauncherRegistry` (`packages/contracts/src/index.ts`) au mobile money + banques ouest-africaines.
> Recherche web ciblée (2026-06). **Vérité honnête** : la recherche donne de façon fiable les **packages** et les **codes USSD** ; elle ne donne **aucun scheme deeplink d'app** — ceux-ci doivent être extraits **on-device** (voir §Méthode). Tout `deeplink_schemes` ci-dessous = `[]` + `needs_device_verification: true`, comme tes entrées RU avant validation.

## Ce que la recherche a donné vs pas donné
| Donnée | Fiabilité web | Source |
|---|---|---|
| `android_package_candidates` | ✅ fiable | Google Play |
| `ussd_transfer_template` | ✅ codes officiels (one-shot rare) | sites opérateurs |
| Liens de paiement hébergés | ⚠️ existent mais **API/marchand** | docs officielles |
| `deeplink_schemes` / `deeplink_uri_template` | ❌ **introuvable** | → device |
| prefill montant/destinataire via deeplink | ❌ introuvable | → device |

**Conséquence d'archi** : pour l'Afrique de l'Ouest, l'initiation fiable sans API = **(1) lancement par package** + **(2) USSD pré-rempli en `tel:`** (là où un one-shot existe), avec la page hébergée comme surface d'autorité. Le scheme deeplink reste un *bonus* à valider sur device.

## ⬛ Schemes & App Links extraits des manifests RÉELS (preuve device-grade — 2026-06)
> Obtenu en téléchargeant l'APK (CDN apkpure) et en décodant le `AndroidManifest.xml` binaire via `aapt2`. Script réutilisable : **`scripts/apk-deeplink-harvest.sh`**. Bruit SDK filtré (`fbconnect`, `genericidp`, `recaptcha`, `smartech`).
> **Important** : un scheme/host enregistré prouve que l'app *s'ouvre* dessus — il ne donne PAS le chemin/params exacts qui pré-remplissent montant+destinataire (→ inspection de route ou test device).

| Package | App | Scheme(s) deeplink réels | App Link hosts | Note |
|---|---|---|---|---|
| `com.wave.personal` | Wave | **`wave://`** | pay.wave.com, www.wave.com, promo.wave.com, *.confirm.wave.com | routes : /receipt, /pay_bill_*, /transport_payment, /nearby_agents |
| `com.orange.myorange.osn` | Orange Max it SN | **`sameaosnapp://`** | maxit.orange-sonatel.com, sugu.orange-sonatel.com | |
| `com.orange.myorange.oci` | Orange Max it CI | **`omk://`**, **`orangemoneyafrique://`** | maxit-link.com, mpayment.orange-money.com, multi.app.orange-money.com, *.page.link | |
| `com.orange.orangemoneyafrique` | Orange Money Africa | **`omk://`**, **`orangemoneyafrique://`** (`webcom://` à vérifier) | mpayment.orange-money.com, multi.app.orange-money.com | routes : /app/, /a/, /.*/mpayment/abstract/.* |
| `com.djamo.app` | Djamo | — (pas de scheme propre) | p.djamo.com, p.djamo.io, go.djamo.com, hello.djamo.ci, carte.djamo.ci, a.djamo.com, djamo.page.link | App Links riches |
| `com.wizall.wizallclient` | Wizall | — | app.wizall(.*) | route /client (host tronqué, vérifier device) |
| `com.socgen.bankup` | SG Connect (SGBS/SGCI) | **`socgen.unibank.front://`** | — | banque SG multi-pays UEMOA |
| `com.app.ecobank` | Ecobank | — | ecobankmobile.page.link | Firebase Dynamic Links (Google les arrête ~2025) |
| `com.ecobank.rapidtransfer` | Ecobank Rapidtransfer | — | — | |
| `bf.moovmoney.hwmm` | Moov BF | `democonsumer://` ⚠ | — | scheme demo/test — à confirmer device |
| `com.tlc.flous.subs.bn` | Moov BJ | — | — | lancement par package seulement |
| `ml.moovmoney.mmpayorg` | Moov ML | — | — | lancement par package seulement |
| `africa.of.boamobile` | Bank of Africa | — | — | lancement par package seulement |
| `com.m2i.corismoney` | Coris Money | — | — | lancement par package seulement |
| `net.banqueatlantique.mbanking` | Banque Atlantique | — | — | lancement par package seulement |
| `com.cr2.orabank` | Orabank (KEAZ) | — | — | lancement par package seulement |

⚠️ `*.page.link` = **Firebase Dynamic Links**, arrêtés par Google (~2025) → ne pas s'appuyer dessus à long terme. Les schemes en gras sont les candidats d'initiation directe (à confirmer pour le prefill montant).

### Absents du CDN apkpure → à compléter par `adb pull` (device branché)
`com.oml.dsi.orangemobile` (Orange ML), `com.orange.myorange.obf` (Orange BF), `mtnft.momo.consumer` (**MTN MoMo**), `ci.moovmoney.mmpayapi` (Moov CI), `sn.free.app` (**Free/Mixx**), `com.paydunya.mydunya_live_2` (MyDunya), `com.uba.uemoa_client` (UBA RedPay), `com.nsiabanque.mobibnq` (NSIA), `com.bicici.mobilebanking` (BICICI — peut-être délistée). apkcombo/apkmonk étaient gated/anti-bot ; ces packages ne sont pas sur apkpure.

Recette (1 commande par app, device branché) — puis recoller dans le tableau ci-dessus :
```
adb shell pm path <pkg>                       # -> package:/data/app/.../base.apk
adb pull <chemin> base.apk
aapt2 dump xmltree base.apk --file AndroidManifest.xml | grep -iE "android:scheme|android:host|android:path"
```

## Mobile money (XOF)

### Orange Money / Max it
Migration en cours : ancien « Orange Money » rebrandé **Max it** in-place (même package `com.orange.myorange.<cc>`). App money multi-pays = `com.orange.orangemoneyafrique`.
| Pays | Packages | USSD transfert P2P | Scheme |
|---|---|---|---|
| SN | `com.orange.myorange.osn`, legacy `com.orange.mobile.orangemoney` | **one-shot** `#144#21*<dest>*<montant>*<secret>#` (intl `#144#22*<cc><num>*<montant>*<secret>#`) | [] device |
| CI | `com.orange.myorange.oci`, `com.orange.orangemoneyafrique` ; marchand `com.orange.money.ci.pro` | interactif `#144#` → `#144*1#` → `#144*11#` (national) | [] device |
| ML | `com.oml.dsi.orangemobile`, `com.orange.orangemoneyafrique` | famille `#144#21*...#` (one-shot community) | [] device |
| BF | `com.orange.myorange.obf` | `*144#` interactif | [] device |
| GW | `com.orange.myorange.ogw` | inconnu | [] device |
- prefill: **SN (et ML)** montant+dest via USSD one-shot ✅ ; CI/BF interactif. **Le PIN/secret ne doit jamais être pré-rempli** (l'utilisateur le tape). ⚠️ beaucoup d'OS/opérateurs bloquent l'autodial USSD multi-`*`/`#` → vérifier device.
- QR/lien individuel à montant figé : **non** (marchand uniquement).
- Togo / Bénin / Niger : **pas d'app Orange** (Orange n'est pas l'opérateur ; destinations corridor seulement).

### Wave
- packages : `com.wave.personal` (conso), `com.wave.business` (marchand). **App Links vérifiés** sur `pay.wave.com` + `www.wave.com` (assetlinks.json) → un lien ouvre l'app.
- pays : SN, CI, ML, BF, Gambie (XOF) + Ouganda.
- lien : `https://pay.wave.com/c/{checkout_session_id}` (ex. `pay.wave.com/c/cos-18qq25rgr100a`). **Montant = côté serveur via Checkout API** (clé Business), PAS en query string (le format `?a=&c=&m=` vu sur des blogs est **faux**). Destinataire = wallet lié à la clé.
- USSD : aucun code public (app/QR). prefill montant : ✅ mais **via API Business** (= compte marchand requis).
- scheme custom : aucun (App Links HTTPS). `needs_device_verification` pour le comportement réel d'ouverture.

### MTN MoMo
- package conso **unifié** : `mtnft.momo.consumer` (⚠️ ne pas confondre avec `momo://` / momo.vn = **Vietnam**, autre société).
| Pays | USSD racine | Note |
|---|---|---|
| CI | `*133#` (interactif) | `*111*..#` = crédit airtime, **pas** du cash |
| BJ | `*880#` (interactif) | code ARCEP MTN MoMo Benin |
| GN | `*144#` (community) | self-care `com.mtn.mtngcr3` ≠ wallet |
- prefill : interactif uniquement (pas de one-shot) → seul le **code racine** est prefillable en `tel:`. QR = marchand. scheme : [] device.

### Moov Money / Moov Africa
- packages **par pays** : CI `ci.moovmoney.mmpayapi` (+`com.mobiblanc.moov.mymoov_ci`), BJ `com.tlc.flous.subs.bn`, TG `com.huawei.moovmoney.tg.uat` (⚠️ `.uat`, vérifier la prod), BF `bf.moovmoney.hwmm` / `com.tlc.onatel.customer`, ML `ml.moovmoney.mmpayorg` / `ml.moovmoney.mmpaysp`, NE non confirmé.
- USSD : famille `*155#` (CI domestique opt **2**) ; **BF = `*555#`** ; **BJ ambigu `*855#` vs `*155#`**. Interactif (pas de one-shot). scheme : [] device.

### Fintech SN/CI
| App | Package conso | USSD | Lien/QR | Scheme |
|---|---|---|---|---|
| Free Money / **Mixx by Yas** (SN) | `sn.free.app` | `#150#` (interactif) | QR marchand scan-to-pay | [] device |
| Wizall Money (SN/CI/BF/ML) | `com.wizall.wizallclient` | inconnu | code SMS voucher (pas de lien) | [] device |
| Djamo (CI/SN) | `com.djamo.app` | aucun (app-only) | **Business** `pay.djamo-civ.com/xxxxx` (web, pilote) | [] (`link.djamo.com` existe, auth-walled) |
| MyDunya / PayDunya (BJ/BF/CI/ML/SN/TG) | `com.paydunya.mydunya_live_2` | inconnu | **lien hébergé** SMS/email, montant pré-rempli (collecte) | [] device |
- Apps agent/marchand à **exclure** du flux payeur : `sn.free.agent.app`, `com.tc.wizall.wizallpartner`, `com.djamo.agent.app`/`com.djamo.pos.app`, `com.paydunya.react.mobile.paydunya_app`.

## Banques (UEMOA) — lancement par package seulement (pas de prefill, pas de scheme)
| Banque | Package conso | Note |
|---|---|---|
| Ecobank | `com.app.ecobank` (+ `com.ecobank.rapidtransfer`) | multi-pays ; Rapidtransfer = P2P cross-border |
| Bank of Africa | `africa.of.boamobile` (+ `com.boamalidirect.android` ML) | exclure packages BOA Afrique de l'Est `com.mode.*` |
| Société Générale | `com.socgen.bankup` (SG Connect, multi-pays) | exclure `mobi.societegenerale.mobile.lappli` = France |
| UBA | `com.uba.uemoa_client` (RedPay UEMOA) | groupe `com.uba.vericash` |
| NSIA Banque | `com.nsiabanque.mobibnq` | exclure `com.smartaps.nsia_app` (assurance) |
| Coris Bank | `com.m2i.corismoney` (Coris Money) | wallet instant ; exclure `.agent` |
| Banque Atlantique | `net.banqueatlantique.mbanking` | multi-pays UEMOA |
| Orabank | `com.cr2.orabank` (KEAZ) | exclure `net.orabank.merchantapp` |
| BICICI (CI) | `com.bicici.mobilebanking` | ⚠️ **possiblement retiré du Play (oct. 2024)** — vérifier ; BICIS (SN) introuvable |

**Rail régional** : BCEAO **PI-SPI** (live sept. 2025, sur GIM-UEMOA) = instantané interopérable banques↔wallets↔MFI pour particuliers. C'est l'équivalent SBP de la zone — la vraie cible « push » à terme. Exposition par app à valider device.

## Méthode d'extraction des schemes (remplace le test manuel épuisant)
Au lieu de tâtonner app par app, extraire les schemes de l'APK installé :
```
adb shell pm path <package>            # localiser l'APK
adb pull <chemin_apk> app.apk
apktool d app.apk                       # ou: aapt dump xmltree app.apk AndroidManifest.xml
# chercher dans AndroidManifest.xml : <intent-filter> avec <data android:scheme="..."> / android:host
```
→ liste déterministe des schemes + hosts deeplink, à reporter dans `deeplink_schemes` / `deeplink_uri_template`, puis `runtime_verified` après un test d'ouverture réel.

## Notes pour le câblage contrat (quand on intègre)
- `PayerBankLauncherOption.country` est typé `'RU'` → élargir (ex. `'SN' | 'CI' | 'ML' | 'BF' | 'BJ' | 'TG' | 'NE' | 'GW'`).
- Ajouter une `launch_strategy` `ussd_dial` + un champ `ussd_transfer_template` (avec `%23` pour `#`), distinct du deeplink d'app.
- `tested_status` initial = `documented` / `needs_device_verification` ; `runtime_verified: false` jusqu'à validation device (comme les RU `real_device_*`).
- `can_prefill_amount` : `true` seulement Orange SN/ML (USSD one-shot) et Wave/PayDunya/Djamo Business (via API/lien hébergé) ; `false`/`unknown` ailleurs.
