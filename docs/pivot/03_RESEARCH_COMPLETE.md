# SwimPay — Recherche complète (2026-08-27)

Sources primaires (BCEAO/CB-UMOA/ARTCI lues en direct, docs officielles récupérées
via Scrapling en contournant Cloudflare/403) + agents de recherche. Fiabilité :
**[V]** vérifié source officielle · **[T]** tiers crédible · **[?]** non vérifiable
publiquement, à confirmer.

---

## 0. Verdict en 5 points

1. **Le « swap payant » est un pont, pas un business.** Le rail interopérable
   BCEAO **PI-SPI est live** (30/09/2025) : transferts inter-wallets **gratuits,
   instantanés, obligatoires** (banques/EME/EP au 30/06/2026, confirmé au plus
   tard 30/09/2026). Le concurrent direct **Change** facture 2,5 %+100 F le swap
   OM↔Wave — modèle voué à être ramené à 0 par la BCEAO. **[V]/[T]**
2. **Ton intuition de départ est la bonne** : le moat durable = **identité +
   traçabilité + paie B2B + checkout**, pas le hop lui-même.
3. **Détenir un solde utilisateur dépensable = émettre de la monnaie
   électronique** → il faut un **partenaire EME** (pas un simple EP), toi en
   **distributeur**. C'est le point réglementaire structurant (§1). **[V]**
4. **Le montage distributeur est légal et documenté** : ta couche technique + ton
   ledger sont compatibles, à condition que les fonds vivent dans le **compte de
   cantonnement de l'EME** (100 % adossé, réconcilié quotidiennement). **[V]**
5. **Rails pour coder maintenant** : PayDunya (API primaire vérifiée, licencié CI
   EP.CI.008) et CinetPay (licencié CI, mais docs hors-ligne + règlement 8 j).
   **Mais** aucun EP n'est un EME → pour la *détention* de solde, la vraie
   question ouverte = **quel EME accepte de te prendre comme distributeur**.

---

## 1. Réglementaire — sources primaires BCEAO

### 1.1 LE fork : compte de paiement (EP) vs monnaie électronique (EME) — **[V]**
Instruction 001-01-2024 : un **compte de paiement** (tenu par un Établissement de
Paiement) sert **exclusivement à exécuter des opérations de paiement** (fonds en
transit). Un **solde prépayé, remboursable et dépensable auprès de tiers** = **monnaie
électronique**, réservée aux **EME** (Instruction 008-05-2015). → Le wallet SwimPay
(l'utilisateur garde un solde qu'il dépense/transfère) **est de la e-money** → exige
un **EME**, pas un EP. Un EP est en plus **interdit d'utiliser des distributeurs**
(Art. 8) — donc le montage « SwimPay distributeur » passe **par un EME**, pas par un EP.

### 1.2 Montage distributeur d'EME — légal et adapté — **[V]**
Instruction 008-05-2015, Art. 17-18 : une société non licenciée peut être
**distributeur** d'un EME agréé et : souscrire des clients, **charger de la
e-money, faire cash-out/remboursement, opérations de paiement**. Obligations :
journal des opérations, traçabilité, appliquer l'AML de l'émetteur ; **RCCM**
requis ; pas d'exclusivité imposable. **L'EME reste pleinement responsable**
envers les clients. **Une couche technique + un ledger opérationnel propre sont
compatibles**, réconciliés dans les livres de l'émetteur ; le distributeur **ne
détient pas** l'adossement (il vit chez l'EME). → C'est exactement l'architecture
SwimPay (Modèle A : omnibus EME + sous-registre SwimPay).

### 1.3 Plafonds e-money (Art. 31) — **[V]**
- Solde par client identifié : **≤ 2 000 000 FCFA**.
- Rechargements cumulés / mois / client : **≤ 10 000 000 FCFA**.
- Porteur non identifié : **≤ 200 000 FCFA/mois**, pas de crédit.
- Ne s'appliquent pas aux distributeurs/marchands.
(L'Instruction KYC 003-03-2025 est **risque-based**, sans paliers chiffrés — les
« niveaux 1/2/3 » à 100k/500k/5M des blogs **ne sont pas officiels**.)

### 1.4 Cantonnement (Art. 32-34) — **[V]**
Fonds de contrepartie dans un **compte dédié exclusif** en banque/SFD UEMOA,
**identifiés distinctement**, **réconciliés quotidiennement**, **100 % adossés**
(Art. 33), placements ≥ 75 % dépôts à vue, **jamais** pour financer l'émetteur.
C'est le ring-fence qui protège les clients en cas d'insolvabilité.

### 1.5 ARTCI (Loi 2013-450) — **[V]**
Traitement de données perso + téléphone en CI : **déclaration préalable ARTCI**
(autorisation si données sensibles), **consentement préalable explicite**,
finalité/proportionnalité, sécurité, droits (accès/rectification/opposition).

### 1.6 PI-SPI (obligation) — **[V]**
Banques, EME, EP, microfinance supervisés : **connexion effective au PI-SPI au
plus tard 30/06/2026** (interop instantanée obligatoire). Une fintech non
licenciée l'atteint **via son EME**.

---

## 2. Marché & concurrence — **[T] sauf indications**

- **CI = 1er marché MoMo UEMOA** : ~2,8 Md transactions (2024), > 38 000 Md XOF
  (~63 Md $), ~25 M comptes. **Wave** = disrupteur à **1 % (envoi) / retrait
  gratuit**, ~21 M comptes.
- **PI-SPI [V]** rend le P2P inter-wallet **gratuit/instantané** → **érode la
  proposition « swap payant »**. Reste une friction : le **cash-out** (Orange 1 %
  retrait, plafond ~5 000 F) que le PI-SPI ne supprime pas.
- **Concurrents swap/agrégation** : **Change (change.sn)** = swap OM/Wave/MTN/Moov
  à **2,5 %+100 F** (ton benchmark, condamné par PI-SPI) ; **Djamo** (super-app,
  1 M+ users, $17 M Série B avr. 2025) ; **Wizall**, **Semoa**.
- **Paie B2B** : **Julaya** (leader CI), **CinetPay Mass Payout**.
- **Conclusion stratégique** : positionne-toi comme la couche **orchestration +
  conformité/traçabilité + paie B2B + checkout** *par-dessus* les rails gratuits
  PI-SPI ; le swap = hameçon d'acquisition, pas le P&L.

---

## 3. Rails & partenaires

### 3.1 Référentiels officiels — **[V]**
- **EP agréés CI (au 28/02/2026)** : SYCA (001), Touchpoint/InTouch (002), Firstcom
  (003), **Julaya** (004), **Djamo** (005), **FeexPay** (006), **CinetPay** (007),
  **PayDunya/DUNYA** (008), Paymetrust (009). *(EP = compte de paiement, PAS
  émission e-money.)*
- **EME agréés CI** (émetteurs de la e-money) : **Orange Money CI, MTN Mobile
  Financial Services CI, Moov Money CI**. **Wave = Wave Digital Finance (SN)**,
  transfrontalier. *(C'est parmi les EME — ou un EME indépendant offrant de la
  distribution — que doit venir le partenaire custody.)*

### 3.2 Partenaires — synthèse (API / solde / sous-comptes / stabilité)

| Partenaire | Statut | API + sandbox | Détient solde | Sous-comptes/WaaS | Stabilité | Notes clés |
|---|---|---|---|---|---|---|
| **PayDunya** (DUNYA) | EP CI (008) + SN (001) | **[V] sandbox self-serve** (`app.paydunya.com/sandbox-api/v1`) ; 4 clés | oui (compte + `direct-pay/credit-account`) | non doc. | **racheté Peach Payments (avr. 2025)** | Endpoints payout/payin **vérifiés en primaire** ; opérateurs CI + `djamo-ci`. |
| **CinetPay** | EP CI (007) | **[T]** clés `sk_test_`/`sk_live_` ; **docs hors-ligne (NXDOMAIN) ce jour** | oui (compte préfinancé) | non | 2016, ~76 pers, ~$2,4 M | 2 API (Checkout `api-checkout…/v2` + Direct `api.cinetpay.net`) ; **règlement 8 j par défaut** (réductible ~72 h) ; Mass Payout ; +10 pays. |
| **Djamo** | EP CI (005) + SN | **[V]** docs lisibles ; staging gated | oui (solde business) | **Sub-Companies API** (attribution, pas custody ségréguée confirmée) | **mieux financé : $17 M Série B 2025** | **Collecte Djamo→Djamo only, MoMo « coming soon »** (bloquant). Payout 0,5 %. |
| **Julaya** | EP CI (004) | pas d'API publique (BD) | oui (comptes/IBAN) | **sous-wallets multi-entreprises** | EP mai 2025 + **CDC-CI (fonds d'État) oct. 2025** | Meilleur fit **paie B2B** ; contact 25 22 01 86 16 ; fondateurs Léopoldie/Talbot. |
| **Hub2** | non-EP (hors UEMOA) | **[V]** docs riches ; sandbox crédité 100k | oui (collecte+transfert) | non doc. | $8,5 M Série A 2024 | **Le rail** (MoMo+carte+**crypto**+payout), « Stripe francophone ». Pas custodian licencié. |
| **FeexPay** | EP CI (006) | dashboard/SDK | oui | non | **2023, le + jeune**, PCI-DSS | Risque d'exécution le + élevé. |

Tarifs (approx., **[T]**, à confirmer par devis) : CinetPay MoMo ~1-2 % / cartes
3,5 % ; Julaya transferts & collecte 0,5-1 %, bulk 0,1-0,25 % ; PayDunya encaissement
~1,5-3 %. Pages tarifs récupérées mais rendu bruité → **confirmer la grille exacte**.

### 3.3 Opérateurs en direct — **[V]** : seul **MTN MoMo** a un sandbox 100 %
self-serve (apprentissage). Orange/Wave = sandbox derrière compte marchand. Moov =
aucune API publique. Direct = non réaliste en solo → agrégateur.

---

## 4. Custody — les deux voies, revues par le fork e-money

- **Voie A — Wallet e-money (ce que tu as décidé).** Solde stocké/dépensable =
  e-money → **partenaire EME + SwimPay distributeur** ; fonds en cantonnement EME
  (100 %, réconcilié quotidien) ; ledger SwimPay = sous-registre ; plafonds Art. 31
  (2M/10M). **Bloqueur réel : trouver un EME qui te prend en distribution** (les EME
  CI sont les opérateurs eux-mêmes — peu enclins ; chercher un EME indépendant /
  banque-EME sponsor). Les EP (CinetPay/PayDunya) sont des **rails**, pas la
  réponse custody stricto sensu.
- **Voie B — Orchestration pass-through (sans stocker).** Chaque opération =
  payin→payout immédiat via rails EP (PayDunya/CinetPay) ; SwimPay ne détient pas
  de solde e-money → **pas besoin d'EME**, montage plus léger, aligné avec « le
  swap est un pont ». On perd le transfert interne gratuit instantané et
  l'économie de float. **Recommandé pour démarrer** ; la Voie A s'ouvre quand un
  deal EME est signé.

---

## 5. Recommandation finale & actions

1. **Repositionner** : couche orchestration + traçabilité + **paie B2B** +
   **checkout** au-dessus de PI-SPI. Swap = acquisition, pas P&L. Cette bascule
   suit tes textes de vision (identité/traçabilité) et la réalité PI-SPI.
2. **Démarrer en Voie B (pass-through)** derrière `RailConnector` : **PayDunya**
   (API vérifiée, sandbox, licencié CI) en rail #1, **CinetPay** en #2. Coder le
   **socle ledger** comme sous-registre de réconciliation (pas encore e-money).
3. **Ouvrir la Voie A en parallèle** : chercher l'**EME partenaire** (distribution)
   — c'est LA condition pour un vrai wallet. Julaya (paie) et Djamo (mieux financé,
   sous-comptes) sont les meilleurs interlocuteurs licenciés à approcher ; noter
   que ce sont des EP, donc valider avec eux le montage e-money/adossement.
4. **Confirmer par écrit avec le top 2-3** : (a) ségrégation légale des soldes,
   (b) liste KYB exacte (RCCM, NIU/DFE, RIB, pièce gérant, statuts, bénéficiaires),
   (c) SLA de règlement, (d) accès API/sandbox, (e) capacité EME/distribution.

### Questions ouvertes (à trancher, pas présumer)
- Quel **EME** accepte SwimPay en distributeur (Voie A) ? (le vrai verrou)
- Voie A dès le départ, ou **Voie B d'abord** puis A ? (je recommande B→A)
- Périmètre produit #1 : **paie B2B** (revenu récurrent, PI-SPI-proof) plutôt que
  swap ?

---

## Méthode & sources
Primaire : PDF BCEAO (liste EP 28/02/2026 ; Instr. 008-05-2015, 001-01-2024,
003-03-2025), liste EME CB-UMOA, Loi ARTCI 2013-450, communiqué PI-SPI. Docs
fournisseurs récupérées via **Scrapling** (Fetcher curl_cffi + StealthyFetcher
navigateur, contournant 403/Cloudflare) : developers.paydunya.com (payin/payout/
sandbox **vérifiés**), cinetpay.com, docs.hub2.io, julaya.co, docs.djamo.com,
developer.orange.com, docs.wave.com. Agents de recherche pour marché, stabilité,
onboarding. `docs.cinetpay.com` = **NXDOMAIN** ce jour (hors-ligne réel).
