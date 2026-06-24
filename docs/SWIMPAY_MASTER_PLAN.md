# SwimPay — Le plan ultime

> Document maître : la vision, en théorie, en technique imagée, et en chiffres.
> Chiffres de marché sourcés (2025). Discipline : aucune donnée inventée ; les
> montants d'investissement sont des estimations raisonnées, étiquetées comme telles.

---

## 1. L'idée, en une phrase (la simplicité)

**L'acheteur paie en argent normal. Le marchand reçoit en argent normal, dans sa monnaie.
SwimPay fait la tuyauterie invisible entre les deux — par le rail numérique le moins cher.**

Le client ne voit jamais de crypto. Il voit sa monnaie locale. Le stablecoin n'est qu'un
**tuyau interne**, comme l'électricité derrière une prise.

---

## 2. Ce qui se passe quand quelqu'un utilise SwimPay (imagé)

```
ACHETEUR                      SWIMPAY (le tuyau)                       MARCHAND
fiat:                    ┌──────────────────────────────────┐    fiat local:
 carte / mobile money    │ 1. Devis — coût réel              │     XOF mobile money
 / virement / RUB   ───► │ 2. Règles — plafond/KYC/screening │───► (Wave/Orange/Free),
                         │ 3. Entrée — rampe licenciée       │     banque, etc.
                         │ 4. Conversion — stablecoin         │  ◄── rail interne,
                         │    (Base/USDC · TON/USDT)          │      invisible
                         │ 5. Répartition — 1 paiement → N    │
                         │ 6. Sortie — rampe → mobile money   │
                         │ 7. Réconciliation — preuve réelle  │
                         └──────────────────────────────────┘
                          Grand livre en partie double = la vérité comptable
```

1. Le **marchand** crée une demande de paiement (montant, sa devise).
2. L'**acheteur paie** en fiat.
3. SwimPay **cote** le vrai coût, **convertit** via le pont stablecoin, **applique les règles**.
4. Le **marchand retire** en fiat sur son mobile money.
5. SwimPay **confirme** chaque étape — « RÉCONCILIÉ » = l'argent est réellement arrivé.

---

## 3. Les problèmes qu'on résout (avec les chiffres)

L'Afrique a **gagné le paiement local** : ~**1,2 milliard** de comptes mobile money,
**1 430 milliards $** échangés en 2025 (les 2/3 des flux mondiaux). Mais :

- **Transfrontalier cassé** : la banque correspondante des années 70 → **2–5 jours**,
  **+2,5–3 % de change**, transferts **>8 %**, et **127 banques africaines coupées de
  l'international en 2024–2025** (ça empire).
- **Le dernier kilomètre mobile money** que ni les banques ni les rampes ne servent proprement.
- **Valeur instable** : dans les économies à monnaie qui s'érode, on veut du dollar stable.
- **Couloirs ignorés** (ex. Russie↔Afrique) — demande réelle, offre quasi nulle.
- **Paiements des machines** : les agents IA commencent à payer ; personne ne sait les relier
  à un humain payé dans sa monnaie locale.

**Preuve de demande :** les dollars numériques = **43 % du volume crypto en Afrique
subsaharienne** (205 Md$ reçus, +52 %), utilisés pour le transfrontalier et l'épargne.

---

## 4. Les routes (corridors) qu'on veut créer

| Corridor | Entrée | Sortie | Statut |
|---|---|---|---|
| **USD → XOF** | USD (carte/virement/stablecoin) | XOF mobile money | câblé (devis) |
| **EUR → XOF** | EUR | XOF mobile money | câblé (devis) |
| **RUB → XOF** | RUB (via TON/Telegram) | XOF mobile money | câblé (devis) ; règlement à brancher |
| **Tout → Afrique** | n'importe quelle fiat | mobile money / banque | corridor-agnostic (un adaptateur par couloir) |
| **Machine → humain** | agent IA (stablecoin) | humain en fiat local | l'atout futur |

Principe : **corridor-agnostic**. Ajouter un couloir = une entrée de registre + un adaptateur
de rampe + la règle screening. La machine est conçue pour s'étendre, pas pour être réécrite.

---

## 5. Les opérations complexes qu'on sait réaliser

Là où un simple transfert s'arrête, SwimPay continue :

- **Répartition 1→N** : un paiement vers plusieurs bénéficiaires (marketplace, paie, splits).
- **Swarm / N×M** : router plusieurs paiements vers plusieurs destinataires *en même temps*,
  en shardant l'exécution sous un plafond technique — vélocité et débit.
- **Escrow conditionnel** : « livrer-puis-payer » — l'argent attend une condition.
- **Devises opposées** : router à travers des monnaies que le système bancaire sépare.
- **Micro-transactions machines** : machine↔machine et machine↔humain, réglées instantanément.

Le tout **déterministe** (pas de LLM sur les fonds) : « l'IA propose, les règles disposent ».

---

## 6. L'architecture, en théorie

Tout est un **ordre de paiement programmable**. Un payeur (humain, agent IA, ou pair — c'est
le même objet) émet un ordre ; le moteur le fait avancer dans sa machine à états ; **chaque
transition = une écriture comptable équilibrée**.

**Les 6 mouvements élémentaires :** Entrée · Conversion · Garde · Répartition · Sortie · Réconciliation.

**Le cycle de vie d'un ordre :**
```
QUOTÉ → AUTORISÉ → FINANCÉ → [EN_GARDE] → LIBÉRATION → RÉGLÉ → RÉCONCILIÉ ✅
                      │                                    │
                      └── échec/expiration ──► REMBOURSÉ / REJETÉ / EXPIRÉ
```

**Les 4 piliers techniques :**
1. **Ledger** (grand livre en partie double) — la vérité comptable : l'argent ne se crée ni
   ne se détruit ; soldes dérivés ; append-only ; idempotent.
2. **Moteur de règles** — gardes sur chaque transition : kill-switch, expiration, plafond,
   vélocité, liste blanche, **screening sanctions/KYC**, condition de libération.
3. **Réconciliation** — on ne déclare « réglé » que sur **preuve réelle** (confirmation
   on-chain pour la jambe crypto, statut API de la rampe pour la jambe fiat).
4. **Rails** (les bords physiques) — derrière une interface : rampe licenciée (fiat) +
   chaîne (stablecoin). C'est la seule partie qui touche le monde réel.

---

## 7. La custody, segmentée (le réalisme)

On n'est pas 100 % non-custodial par dogme — on **segmente** :

- **Segments non-custodiaux (d'abord, légers)** : SwimPay ne tient jamais les fonds (le payeur
  apporte le rail / paie en direct). Démarrage **lean**, rapide.
- **Segments custodiaux (ensuite, capitalisés, ring-fencés)** : float préfinancé, on-ramp
  opéré. Poids régulé complet **localisé** à ce segment, isolé pour ne pas contaminer le reste.

Chaque couloir porte une étiquette `custody_model` + son paquet de contrôles.

---

## 8. Le couloir Russie (le plus différenciant)

Deux modèles, l'un lean, l'autre lourd :

- **Modèle A — RUB → TON → USDT → XOF** *(recommandé pour démarrer)* : le **client convertit
  lui-même** ses RUB en stablecoin via Telegram Wallet (l'on-ramp russe réel), t'envoie de
  l'USDT ; tu off-ramps vers le XOF mobile money. **Léger, non-custodial à l'entrée.**
- **Modèle B — comptes chargés des deux côtés (float)** : capital-lourd, exposé au change, et
  bloqué par le **rebalancing** (RUB qui s'accumulent / XOF qui se vident). **Plus tard, capitalisé.**

**Le vrai gate, opérationnel :** ta rampe de sortie accepte-t-elle un flux d'origine RUB ?
C'est à valider auprès du partenaire — c'est ce qui décide si le couloir existe.

---

## 9. L'atout futuriste — l'économie des machines

Intuition clé : **une IA paie pour ce qu'elle ne peut pas faire elle-même = une action
humaine** (vérifier sur le terrain, livrer, attester). La payer **dans sa monnaie locale**,
c'est exactement ce qu'aucun acteur crypto-natif ne sait faire.

**Machine → action humaine → fiat local** : c'est là que notre dernier kilomètre devient un
**moat**, pas une commodité. Marché : commerce agentique **8 Md$ (2026) → 1 500 Md$ (2030)**.

---

## 10. Les partenaires (la liste)

| Besoin | Partenaires |
|---|---|
| **Rampe crypto → mobile money XOF** (cœur) | **Bitnob, Yellow Card** (en priorité) ; HoneyCoin, Kotanipay, Fonbnk, Paychant |
| **Mobile money fiat pur** (complément) | PawaPay, Flutterwave, Onafriq |
| **À éviter** | Binance (gel de compte, pas d'API payout) |
| **Chaîne + stablecoin** | Base + **USDC** (cœur) · **TON + USDT** (on-ramp russe / Telegram) |
| **KYC / AML / screening** | Sumsub, Onfido, Persona, Veriff · ComplyAdvantage, Chainalysis/TRM |
| **Clés / custody** (plus tard) | Turnkey, Privy, Fireblocks · ERC-4337 (Alchemy, ZeroDev, Biconomy) |
| **Société** | Stripe Atlas (Delaware) ou Legalstart / Shine / Qonto (France) |
| **RPC chaîne** | Alchemy / Infura (ou public `mainnet.base.org`) |

USDC vérifié (Circle) : Base mainnet `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` ·
Base Sepolia `0x036CbD53842c5426634e7929541eC2318f3dCF7e`.

---

## 11. Le modèle économique

- **Frais ~1 %** par opération (sous les ~3 % des PSP, sous les 8 % des transferts).
- **Infrastructure autonome** : logiciel + automatisation → opex faible, marge haute. Une boîte
  conçue pour **générer plus qu'elle ne consomme**.
- Levier = **volume × take rate**. À 1 % : 1 M$/mois → ~10 k$/mois ; 10 M$ → ~100 k$/mois. Le
  nerf, c'est le **volume** (un couloir cloué + les machines), pas le pourcentage.

---

## 12. Les chiffres — l'investissement nécessaire

**Démarrage lean (le tien) :** ~**500 $** pour incorporer. Le logiciel est déjà construit, donc
le capital ne sert pas à « bâtir » mais à **passer du logiciel au mouvement de vrai argent**.

**Pre-seed (~100–300 k$, ajustable) — usage des fonds :**

| Poste | Montant indicatif |
|---|---|
| Société + légal + conformité (avis juridique, programme AML) | ~30–80 k$ |
| Intégration rampe(s) + KYC + **liquidité de départ** | ~10–30 k$ + float |
| Petite équipe (12–18 mois) | le gros du budget |
| Infra, audits (si contrats), marge | ~20–50 k$ |

*(Fourchettes raisonnées, pas des chiffres gravés ; dépend de l'équipe et de la juridiction.)*

**Le prix (la taille du marché) :** transfrontalier africain **329 Md$ (2025) → 1 000 Md$
(2035)** · mobile money **1 430 Md$/an** · paiement-IA **1 500 Md$ (2030)**. On n'a pas besoin
de tout : **une tranche d'un couloir = une vraie entreprise ; le pont IA↔fiat-local = une
entreprise générationnelle.**

---

## 13. Ce qui est déjà construit vs ce qui reste (honnête)

**Construit + testé (branche `feat/programmable-settlement-sdk`, gated off) :**
- Cœur déterministe : ledger (partie double, durable Postgres), machine à états, moteur de
  règles (+ swarm), réconciliation, Cost Oracle (USD/EUR/RUB → XOF), lecteur de chaîne
  **vérifié en live sur Base Sepolia**, endpoints (SDK + 402). 160+ tests verts.

**Vit déjà en prod (produit historique) :** le receiver Android (détection de paiements
entrants → confirmation → webhooks) + programme devises, sur `staging.swimpay.pro`.

**Reste à faire (le vrai déblocage = business, pas code) :**
1. **Brancher une rampe licenciée** (Bitnob/Yellow Card) → passer du simulé au réel.
2. Société + cadre légal + KYC.
3. Durabilité Postgres complète (ordres + réconciliation), reprise après crash.
4. Premiers clients design-partners (distribution).

---

## 14. La séquence

1. **Société** (~500 $) + choisir le wedge (un couloir).
2. **Valider une rampe** qui accepte le flux (le gate réel).
3. **Brancher le réel** (rampe + KYC) → premier paiement fiat→fiat live, petit.
4. **Premiers clients** + mesurer (volume, vitesse, litiges).
5. **Étendre** couloir par couloir ; ajouter le segment machines (402).
6. Lever quand le couloir tient debout tout seul.

> En une phrase : **SwimPay est le tuyau programmable qui fait circuler l'argent fiat→fiat à
> travers les frontières et les couloirs mal desservis, en réglant en stablecoin à l'intérieur
> — pour les marchands, les acheteurs, les agents IA et les développeurs.**
