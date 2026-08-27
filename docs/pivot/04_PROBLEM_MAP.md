# SwimPay — Cartographie des problèmes (2026-08-27)

Espace de problèmes que SwimPay peut résoudre, au-delà du swap (érodé par le
PI-SPI). Ancré sur la recherche primaire + agents. Fiabilité **[V]/[T]/[?]** comme
dans `03_RESEARCH_COMPLETE.md`.

## Le filtre de sélection

Un problème vaut le coup s'il coche : **douleur réelle · fit avec tes actifs
(identité/traçabilité, rails licenciés, checkout) · durabilité face au PI-SPI ·
monétisation · faisabilité.** Le PI-SPI (transferts inter-wallet gratuits/instantanés,
obligatoires 2026) **tue tout ce qui est « bouger l'argent moins cher »** et **valorise
tout ce qui est une couche par-dessus** : accepter, réconcilier, tenir les livres,
se conformer, scorer, prêter, prouver.

**Deux wedges à adoption forcée (rares et précieux) :**
- **FNE — Facture Normalisée Électronique [V]** : e-facturation **obligatoire pour
  toutes les entreprises** (grandes 01/06/2025, PME 01/07, **micro 01/08/2025**).
  Sans FNE : pas de déduction TVA, pas d'attestation fiscale (→ exclu des marchés
  publics). L'État force l'adoption ; personne ne relie *encaissement → réconciliation
  → FNE auto*. Portail DGI `fne.dgi.gouv.ci`.
- **Crédit [V]** : seuls ~2 % des adultes ont un prêt formel, **60 % veulent du
  crédit digital** — mais barrière **agrément SFD/microfinance** (Djamo l'a obtenu,
  1re fintech, sept. 2025).

## Carte notée (échelle ⭐1–5)

| # | Problème | Segment | Douleur | Fit | Durabilité PI-SPI | Monétisation | Difficulté |
|---|---|---|---|---|---|---|---|
| 1 | **Acceptation + réconciliation + FNE auto** (petit marchand) | Marchand | ⭐5 | ⭐5 | ⭐5 | ⭐4 | ⭐3 |
| 2 | **Compta/trésorerie PME unifiée** (multi-wallet → livres) | PME | ⭐5 | ⭐4 | ⭐5 | ⭐4 (SaaS) | ⭐3 |
| 3 | **Crédit thin-file / avance / BNPL** (sur l'historique) | Transverse | ⭐5 | ⭐4 | ⭐5 | ⭐5 | ⭐5 (SFD) |
| 4 | **Identité financière unifiée + annuaire vérifié** | Transverse | ⭐4 | ⭐5 | ⭐5 | ⭐3 (indirect) | ⭐3 |
| 5 | **Paie B2B & payouts** (salaires/gig + bulletins) | Entreprise | ⭐4 | ⭐4 | ⭐4 | ⭐3 | ⭐2 |
| 6 | **Épargne engagée / tontines digitales** | Grand public | ⭐4 | ⭐3 | ⭐4 | ⭐2 (float) | ⭐3 |
| 7 | **Couche commerce B2B transfrontalier** (KYB/FX/facture sur PI-SPI) | Cross-border | ⭐4 | ⭐3 | ⭐5 | ⭐4 | ⭐4 |
| 8 | **Gestion agrégée des factures/échéances** | Grand public | ⭐3 | ⭐3 | ⭐4 | ⭐2 | ⭐2 |
| 9 | **Collecte taxes municipales/marchés** | Public local | ⭐3 | ⭐4 | ⭐4 | ⭐3 | ⭐4 (politique) |
| 10 | Traçabilité/formalisation pour l'État (national) | Public | ⭐3 | ⭐4 | ⭐5 | ⭐3 | ⭐5 (cycle long) |
| 11 | Remises diaspora (last-mile) | Cross-border | ⭐3 | ⭐2 | ⭐2 | ⭐2 | ⭐4 |
| 12 | Réduction dépendance cash-out | Grand public | ⭐3 | ⭐2 | ⭐1 | ⭐1 | ⭐5 |
| 13 | Swap / transfert P2P générique | Grand public | ⭐2 | ⭐2 | ⭐1 | ⭐1 | ⭐2 |
| 14 | G2P (subventions, bourses) | Public | ⭐2 | ⭐2 | ⭐3 | ⭐2 | ⭐5 (détenu WB/MNO) |

## Lecture

**Le centre de gravité** n'est plus « bouger l'argent » mais **« mettre de l'ordre
dans l'argent »** : accepter partout, réconcilier, tenir les livres, se conformer
(FNE), prouver, scorer, prêter. Tes trois actifs réels (identité/traçabilité,
rails licenciés, checkout) convergent tous vers **le couple marchand/PME (#1-#2-#3)
soudé par l'identité (#4)**.

**La colonne vertébrale recommandée — « le système d'exploitation financier & fiscal
du petit commerçant ivoirien » :**
1. **Encaisser partout** (OM/Wave/MTN/Moov + carte, un checkout/QR) — ton actif checkout.
2. **Réconcilier + émettre la FNE automatiquement** (#1) — le wedge d'adoption forcée.
3. **Tenir les livres** (#2) — SaaS récurrent, la donnée propriétaire.
4. **Rendre bancable → crédit** (#3) — la monétisation finale, via partenaire SFD.
Le tout indexé sur **l'identité vérifiée** (#4). Grand public (tontines #6 → crédit)
et transfrontalier B2B (#7) viennent ensuite par effet de réseau.

## Réalités concurrentielles à intégrer

- **Djamo** : mieux financé ($17M 2025), **agrément microfinance** (peut prêter),
  compte épargne 6 %, Business account avec sous-comptes. Le concurrent à battre —
  mais orienté néobanque grand public, **pas** le petit marchand + FNE.
- **Julaya** : leader paie B2B, crédit PME *annoncé mais pas livré* → fenêtre.
- **CinetPay** : drapeaux (docs hors-ligne, règlement 8 j, dette clients alléguée
  >1,2 M$ [?]) → opportunité pour un entrant plus fiable.
- **L'État lui-même** : **Trésor Money / e-Impôts / DGI data-matching** → ne pas
  concurrencer sa collecte ; se brancher en *fournisseur de conformité* (FNE).
- Utilities (CIE/SODECI), remises, cash-out, G2P : **déjà servis / à prix plancher
  / détenus** → pas des cœurs de produit.

## À éviter comme cœur de produit
Swap payant (#13), cash-out (#12), remises sur prix (#11), G2P disbursement (#14).
Ce sont au mieux des hameçons, jamais le P&L.

## Sources
Agents de recherche (marchand/PME, grand public, institutionnel) sur : DGI FNE
(`fne.dgi.gouv.ci`), CGAP inclusion financière CI, Djamo (épargne/microfinance/
business), Julaya, Wave Coffre, Djangui/SmartMifin/TOVPAY (tontines), World Bank
(remises, PSNP), BCEAO PI-SPI, Trésor Money. Détails et URLs dans les transcripts
d'agents. Chiffres tiers à re-confirmer avant tout deck.
