# Julaya — grille tarifaire vérifiée, et ce qu'elle change

> **Source primaire** : `julaya.co/fr/prices`, onglet **Côte d'Ivoire**, relevée
> le 29 août 2026 avec un Chrome réel. Capture conservée dans
> `assets/julaya-prices-ci-2026-08-29.png`. Tout ce qui suit est **[V]**.
>
> À lire avec `09_PAYDUNYA_TARIFS.md`. L'écart entre les deux n'est pas un
> détail de négociation : il change le partenaire de lancement.

## 1. La grille, Côte d'Ivoire

### Recevoir de l'argent

| Opération | Frais | Délai |
|---|---|---|
| Cash & Collect (Wave, Xpress) | **0,5 % à 1 % TTC** selon volume et opérateur | Wave instantané · Xpress ≤ 1 h |
| Facturation (encaissement de factures émises) | **0,1 % à 0,5 % TTC** selon volume | Instantané |

### Payer

| Opération | Frais | Délai |
|---|---|---|
| Transferts groupés et individuels Mobile Money (Orange, MTN, Moov, Wave, **Djamo**) | **0,5 % à 1,5 % TTC** selon volume | qualité annoncée 97 à 100 % |
| Paiement de factures fournisseurs (CIE, SODECI, HKB Pass, +1000 entreprises) | **0,5 % TTC** | — |
| **Transferts inter-entreprises** | **GRATUITS** pour le payeur (0,1 % à 0,5 % TTC à la charge du **bénéficiaire**, selon volume) | — |
| Virements bancaires, toutes banques | selon volume | jour J si reçu avant 15 h |

### Approvisionner son compte

| Opération | Frais |
|---|---|
| Approvisionnement d'urgence par Mobile Money | **0,8 % à 1 % TTC** |
| **Dépôt cash en banque partenaire** | **GRATUIT** |
| **Dépôt chèque et virement** | **GRATUIT** (crédit à réception dans leurs livres) |

## 2. La comparaison qui tranche

| Opération | PayDunya CI | Julaya CI |
|---|---|---|
| Verser sur Mobile Money | **2,00 %** | **0,5 – 1,5 %** |
| Encaisser sur Mobile Money | **2,25 %** | 0,8 – 1 % (approvisionnement) |
| Alimenter par virement bancaire | **non publié** | **gratuit** |
| Transfert vers un compte du même réseau | **non publié** (`direct-pay/credit-account`) | **gratuit** côté payeur |
| Frais d'abonnement | aucun | non publié |

### Sur une paie réelle

L'exemple du prototype : masse salariale **1 160 000 FCFA**, 5 employés.

- **Julaya** : alimentation par virement bancaire **gratuite**, puis versement à
  1,5 % au pire → **17 400 FCFA**.
- **PayDunya** : alimentation par Mobile Money à 2,25 % (26 100 F) puis versement
  à 2,00 % (23 200 F) → **49 300 FCFA**.

**Julaya coûte 2,8 fois moins cher sur ce cas.** Et l'écart se creuse avec le
volume, puisque Julaya descend à 0,5 %.

### Sur le swap

- PayDunya : 2,25 % + 2,00 % = **4,25 %**
- Julaya : 1 % + 1,5 % = **2,5 %** au pire, **1 %** au mieux

Le swap reste perdant dans les deux cas au tarif public de SwimPay (0,8 %
plafonné 500 F), mais chez Julaya il devient *discutable* au lieu d'être
absurde.

## 3. Ce que « transferts inter-entreprises gratuits » veut dire pour nous

C'est la ligne la plus importante de la grille.

La file d'installation de SwimPay repose sur une idée : un destinataire qui a un
compte sur le même réseau se joint sans frais de rail. Chez PayDunya, cette idée
n'a **aucun tarif publié** pour l'appuyer. Chez Julaya, elle est écrite noir sur
blanc : le transfert inter-entreprises est **gratuit pour le payeur**.

Nuance à ne pas perdre : les frais ne disparaissent pas, ils **basculent sur le
bénéficiaire** (0,1 % à 0,5 % selon volume). Pour une paie de salaires, cela
signifie que l'employé paierait — ce qui est inacceptable et doit être négocié
ou absorbé. À vérifier avec eux.

## 4. Le blocage connu

`03_RESEARCH_COMPLETE.md` le dit : Julaya n'a **pas d'API publique**. L'accès
passe par le développement commercial (contact 25 22 01 86 16, fondateurs
Léopoldie et Talbot). C'est l'inverse de PayDunya, dont le sandbox est
self-serve et vérifié.

Le compromis est donc net :

- **PayDunya** : on code aujourd'hui, on paie cher.
- **Julaya** : on paie trois fois moins, on attend un rendez-vous commercial et
  une intégration non documentée publiquement.

`02_RAILS_AND_CUSTODY_STRATEGY.md` recommandait déjà Julaya comme « meilleur fit
paie B2B ». La grille vérifiée confirme et amplifie ce jugement.

## 5. Questions à poser à Julaya

1. Existe-t-il une API, même non publique, pour les transferts groupés et le
   suivi de statut ? Sandbox ? Documentation sous accord ?
2. Le transfert inter-entreprises gratuit s'applique-t-il à un versement de
   **salaire** vers un compte individuel, ou seulement entre entreprises ?
3. Les 0,1 % à 0,5 % « à la charge du bénéficiaire » peuvent-ils être basculés
   sur le payeur, et à quel coût ?
4. Quels sont les seuils exacts des volumes qui font passer de 1,5 % à 0,5 % ?
5. Les virements bancaires sortants « facturés selon le volume » : quelle grille ?
6. Un sous-agrégateur comme SwimPay peut-il ouvrir des sous-comptes par client
   (le repo mentionne des « sous-wallets multi-entreprises ») et sous quel
   statut réglementaire ?
