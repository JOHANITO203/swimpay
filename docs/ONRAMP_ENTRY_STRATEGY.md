# Stratégie d'entrée (on-ramp) — du crypto-in vers le fiat-in

> Synthèse du brainstorm : comment SwimPay fait entrer de l'argent, qui touche le
> fiat, et pourquoi Transak est l'adaptateur d'entrée choisi.

## 1. L'état réel : le code fait du crypto-in
Ce qui tourne aujourd'hui (flux `/v1/intents`, vérifié en live sur testnet) : **le client
paie en stablecoin**, SwimPay **lit la chaîne** pour confirmer. Le « client paie en argent
normal » est la **cible**, pas l'état actuel. Le bout fiat attend ses partenaires.

## 2. Pourquoi « invisible ET sans licencié » est impossible
**Convertir du fiat en crypto EST l'acte régulé.** Pour que ce soit invisible au client, il
faut un **licencié derrière le rideau** — donc il n'existe **aucune API** qui fait fiat→crypto
sans être un service licencié. Les deux objectifs se contredisent.

## 3. Les 4 chemins d'entrée
| Chemin | Évite un licencié ? | Réalité |
|---|---|---|
| **A. Rampe/agrégateur** (Transak, MoonPay…) | ❌ | C'EST le licencié. KYB. **Le plus pratique.** |
| **B. Opérateurs en direct** (Wave/Orange/MoMo) | ❌ | KYB aussi, payout gated ; coupe la marge ramp. |
| **C. P2P / LP informel** | ✅ | La « faille » : arbitrage réglementaire, exposition perso à l'échelle. |
| **D. Le client on-ramp lui-même** | ✅ (pour toi) | Logiciel pur ; mais casse l'« invisible ». |

**Direction retenue : D, via un on-ramp embarqué (Transak)** — le client paie en fiat dans un
widget licencié, SwimPay ne touche pas le fiat, reste *license-light*, et orchestre + confirme.

## 4. Transak — faits vérifiés (2026)
- **USDC sur Base : ✅** (Transak livre USDC/USDT/DAI/EURC sur 80+ réseaux ; USDC natif Circle sur Base).
- **EURC : ✅** côté entrée (option FX-propre pour EUR→XOF, *si* la sortie l'accepte).
- **Entrée EUR par SEPA : ~1–2 %** (le moins cher ; carte 3–5,5 % → à éviter).
- **Sortie (off-ramp) : pas pour le mobile money XOF** → la **sortie reste sur Bitnob/Yellow Card** (ou arrangée par LO).
- **KYC Reliance :** SwimPay peut réutiliser son propre KYC (Sumsub) → l'acheteur ne refait pas le KYC chez Transak (jusqu'à 20 k$). Le levier anti-friction.

## 5. L'équation simplifiée (marge + compétitivité)
Règle : **un seul stablecoin de bout en bout, entrée SEPA, zéro swap.**
```
Client paie EUR (SEPA) → Transak ~1,5–2 % → USDC sur Base (~0) → sortie ~2 % → marge SwimPay ~1 %
= ~4,5 % total   vs 8 % des transferts   → ~3 pts moins cher, ET 1 % pour SwimPay
```
Marge mince au début → le levier est le **volume** (négocier les taux partenaires à la baisse).
Le stablecoin de la sortie doit = celui de l'entrée (USDC par défaut), sinon un swap mange la marge.

## 6. Ce que Bitnob/Yellow Card font (et qu'on ne peut PAS programmer)
| Programmable — déjà à nous | Pas-programmable — eux |
|---|---|
| Orchestration, ledger, règles, réconciliation, devis FX, confirmation on-chain, UX | **Licences** · **Liquidité/float** + rebalancing · **Accès gated** opérateurs + banques · **Opération de conformité régulée** |

→ On ne loue pas « du logiciel » mais **une licence + du capital + un accès gated**. C'est
pour ça que ça vaut ~2 % et qu'on ne les disintermédie pas à court terme. **Notre moat = la
couche programmable au-dessus, pas la sortie** (qui est louée). Intégration verticale = plus
tard, capitalisé, couloir par couloir.

## 7. La société : la clé universelle
**Tout** partenaire fiat (entrée Transak comprise, en prod) exige un **KYB** = une **société**.
C'est de l'AML, non négociable. Bonne nouvelle : c'est **~500 $** et c'est le **premier domino**
qui débloque tous les partenaires. Le **dur (le logiciel) est fait**. ⚠️ Le **KYB prend des
semaines** → dès la société créée, lancer les dossiers **en parallèle**.

## 8. L'endpoint d'entrée Transak (design)
Le flux d'entrée Transak **réutilise tout** ce qu'on a :
```
1. SwimPay crée une intention (prix EUR, destination = adresse marchand/escrow, montant USDC).
2. SwimPay renvoie, dans l'instruction, une URL widget Transak verrouillée sur :
   walletAddress = destination · cryptoAmount = USDC dû · network = base · fiat = EUR · paymentMethod = SEPA.
3. L'acheteur paie en EUR dans Transak ; Transak livre l'USDC à l'adresse.
4. Notre chain-reader (déjà vérifié live) CONFIRME l'arrivée → réconciliation → réglé.
```
**On verrouille le montant CRYPTO** (l'USDC dû), pas le fiat : le marchand reçoit exactement
son dû, l'acheteur paie le montant + les frais Transak. La confirmation reste **la lecture
on-chain** (autoritaire) ; le webhook Transak n'est qu'une corroboration optionnelle.

Implémentation : module `transak.ts` (constructeur d'URL pur) + `onramp` ajouté à
l'instruction de l'intention quand une config Transak est présente. Gated derrière le pilote.

## 9. Rampes retenues + fallback (décision)
**Entrée (fiat → USDC) — construit :**
- **Primaire : Coinbase Onramp** — 0 % sur l'USDC + intégration sans KYB (compte dev). Encaisse une devise normale (USD/EUR…, **jamais le XOF**) → USDC. Flux en 2 temps (sessionToken minté côté serveur).
- **Fallback : Transak** — couverture plus large (115+ pays) + KYC Reliance (réutilise notre KYC). Câblé, secondaire.

**Sortie (USDC → fiat local) — à construire :**
- **Primaire : HoneyCoin** — **NGN + XOF dans une seule API**, % par route transparent (sans frais fixe → bon pour petits tickets), sandbox immédiat, KYB léger.
- **Fallback : Conduit / BVNK** — moins cher au **volume** (0,5–1 % / 25–50 bps) **mais** frais fixe (~35 $ Conduit) + KYB entreprise (~2 sem.) → **gros tickets uniquement**.
- **Routage** : ticket standard/petit → **HoneyCoin** ; gros volume → **Conduit/BVNK**. Un seul `RampPayoutRails` agnostique + routeur ; ajouter un rail = un adaptateur, **pas de réécriture**.

**À confirmer avant de signer HoneyCoin** : couverture **XOF Sénégal/CI** réelle + frais exacts du couloir.
**Bloquant commun** : toute sortie exige un **KYB = société** (le prochain sujet). L'entrée Coinbase, elle, démarre **sans société** (compte dev).
