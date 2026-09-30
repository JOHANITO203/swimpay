# L'épargne rémunérée : un produit distribué, pas fabriqué

> Écrit le 29 septembre 2026, après validation de LO. Ce n'est **pas** un mode de la
> tontine : c'est un produit à part, où l'argent du client est placé et lui rapporte
> des intérêts.
>
> `[V]` vérifié · `[H]` à vérifier. Rien n'est codé.

---

## 1. Pourquoi SwimPay ne peut pas le faire lui-même

- **L'argent des clients n'est pas à SwimPay.** Il est chez le partenaire émetteur
  de monnaie électronique, sur un compte dédié, adossé à 100 % `[V]`. C'est la
  promesse de sécurité de SwimPay, et c'est la règle de la monnaie électronique.
  SwimPay ne peut pas s'en servir pour le faire travailler.
- **La monnaie électronique ne rapporte pas d'intérêts** au porteur `[H]`, à
  confirmer dans le texte de la BCEAO.
- **Recevoir de l'argent pour le faire fructifier et payer des intérêts est une
  activité réservée** aux établissements agréés : banques, microfinance (SFD),
  sociétés de gestion de fonds `[H]`.

Le faire sans agrément exposerait SwimPay aux poursuites que LO veut éviter.

---

## 2. La voie retenue : SwimPay distribue le produit d'un partenaire agréé

| Partenaire possible | Le produit | Qui fait travailler l'argent | Qui paie les intérêts |
|---|---|---|---|
| **Une banque** | Un dépôt à terme : une somme bloquée une durée fixée, à un taux fixé | La banque | La banque |
| **Une microfinance (SFD)** | Un dépôt à terme ou un plan d'épargne | La microfinance | La microfinance |
| **Une société de gestion de fonds** | Des parts d'un fonds de placement agréé | La société de gestion | Le fonds (rendement non garanti) |

**Pour le client, tout se passe dans l'application SwimPay** : il choisit un montant
et une durée, voit le taux et ce qu'il recevra, confirme par code. L'argent quitte
son compte SwimPay pour un compte **à son nom** chez le partenaire. À l'échéance, il
revient sur son compte SwimPay, avec les intérêts.

**SwimPay touche une commission de distribution** payée par le partenaire, sur
chaque franc placé. Le client ne paie pas de frais SwimPay en plus.

---

## 3. Les règles

| # | Règle |
|---|---|
| 1 | **SwimPay n'affiche que ce que le partenaire garantit.** Un taux fixe pour un dépôt à terme ; pour un fonds, le rendement passé, avec la mention que le rendement futur n'est pas garanti |
| 2 | Le nom du partenaire est affiché avant la confirmation : le client sait à qui il confie son argent |
| 3 | Sortie avant l'échéance : selon les conditions du partenaire, affichées avant la confirmation |
| 4 | L'argent placé **ne compte plus dans le solde de monnaie électronique** : il est chez le partenaire, à son nom |
| 5 | L'argent d'une tontine en cours ne peut pas être placé : il est bloqué pour la tontine |

---

## 4. Ce qu'il faut obtenir avant de lancer

- [ ] **Un partenaire** : une banque, une microfinance ou une société de gestion, qui
      accepte d'être distribuée par SwimPay.
- [ ] **Le statut de SwimPay comme distributeur** : intermédiaire en opérations de
      banque pour un dépôt, ou distributeur agréé par l'autorité des marchés
      (AMF-UMOA) pour un fonds `[H]`.
- [ ] **Le montant de la commission** de distribution, négocié avec le partenaire.

**À corriger sur le site** : il promet une épargne qui rapporte des intérêts. Tant
qu'aucun partenaire n'est signé, cette promesse est à retirer ou à passer en
« bientôt ».
