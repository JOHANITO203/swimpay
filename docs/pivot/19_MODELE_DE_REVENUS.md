# Le modèle de revenus, disséqué opération par opération

> Chantier ouvert avec LO le 30 août 2026. Objectif : sortir chaque opération,
> la regarder à la loupe, la confronter au marché, et lui attacher un prix qui
> nous fait gagner de l'argent en plus des abonnements. **Rien n'est figé tant
> que LO n'a pas tranché les décisions du §8.**
>
> Fiabilité : `[V]` tarif concurrent vérifié en source primaire (docs `09`, `10`),
> `[T]` tiers, `[P]` proposition à nous, à valider.

---

## 1. Les deux principes, et le fait qui change tout

**Deux sources de revenu, pas une :**

1. **L'abonnement** au logiciel. Récurrent, prévisible, forte marge. C'est la base.
2. **Un pourcentage sur les opérations à valeur.** Variable, monte avec l'usage.

**La règle de tarification :**

- Les opérations banales (transfert dans le même réseau, réception simple) sont
  **gratuites ou à prix coûtant**. Elles servent à faire venir les gens.
- Les opérations à valeur (changer de réseau, aller vers la banque, la paie, le
  checkout) portent une **marge**.
- Notre coût réel est **très bas grâce au netting** (voir `17`). Le client voit
  un prix simple, nous gardons une marge cachée même sur les prix bas.

### Le fait structurant : SwimPay n'a pas d'agents de retrait

Les autres (Wave, Orange) ont des dizaines de milliers de points où l'on dépose
et retire du cash. **SwimPay n'en aura aucun**, et c'est un choix, pas un manque.

> **Pour retirer son argent de SwimPay, on le renvoie vers un réseau** (Orange,
> MTN, Moov, Wave), et on retire **chez eux**, à leurs points qui existent déjà.

Trois conséquences :

1. **On économise le réseau d'agents**, qui coûte des millions à bâtir et à
   animer. On monte sur celui des opérateurs.
2. **Chaque sortie est un transfert vers un réseau**, donc une opération qu'on
   peut mesurer, facturer, et surtout **netter** comme les autres.
3. **La sortie draine la caisse de l'opérateur visé.** Si tout le monde sort en
   même temps, les caisses se vident (la vague de retraits de `17` §7.4). Donc
   **la sortie doit rester bon marché**, sinon les gens ne gardent pas d'argent
   chez nous, le float fond, et le netting perd sa force. Prix et rétention sont
   liés.

---

## 2. Les transferts, classés par paire de réseaux

C'est la demande explicite de LO : le prix dépend de la paire.

### 2.1 Même réseau — Orange → Orange

| | |
|---|---|
| Ce que c'est | envoyer à un numéro du même opérateur |
| Le marché | souvent gratuit ; **le PI-SPI le rend gratuit et instantané en 2026** `[T]` |
| Notre coût | **quasi nul** : même caisse, ou simple écriture si les deux sont clients |
| Prix proposé | **gratuit** `[P]` |
| Rôle | produit d'appel, acquisition |

### 2.2 Réseaux différents — Orange → Wave (le swap)

| | |
|---|---|
| Ce que c'est | envoyer d'un réseau vers un autre |
| Le marché | difficile à faire aujourd'hui, vraie douleur ; **le PI-SPI le rendra gratuit à terme** `[T]` |
| Notre coût | le résidu de netting, **de l'ordre de 0,1 %** en simulation `[T]` |
| Prix proposé | **1 %, plafonné à 500 F** `[P]` |
| Marge | large tant que le PI-SPI n'est pas déployé chez notre partenaire |
| Alerte | le jour où le PI-SPI rend ce transfert gratuit pour le client, **cette marge disparaît**. On garde la valeur d'usage (tout au même endroit), pas le revenu. À anticiper, ne pas bâtir le P&L dessus. |

### 2.3 Mobile → Banque

| | |
|---|---|
| Ce que c'est | envoyer d'un wallet vers un compte bancaire |
| Le marché | les opérateurs facturent ; chez Julaya l'alimentation bancaire est gratuite dans l'autre sens `[V]` |
| Notre coût | le rail bancaire, **à vérifier** (non publié) |
| Prix proposé | **0,5 à 1 %** `[P]`, selon le coût réel du rail |
| Rôle | service B2B, la PME consolide sa trésorerie |

### 2.4 Le retrait — SwimPay → un réseau, pour cash-out

| | |
|---|---|
| Ce que c'est | sortir son argent vers son propre numéro, pour le retirer chez l'opérateur |
| Le marché | le cash-out opérateur coûte **~1 %** `[T]`, que le client paiera de toute façon chez eux |
| Notre coût | résidu de netting |
| Prix proposé | **gratuit, ou symbolique (0 à 0,3 %)** `[P]` |
| Pourquoi bas | la rétention et le float en dépendent (§1). Et facturer la sortie **en plus** du cash-out opérateur ferait payer deux fois : mauvais signal. |
| Décision LO | gratuit (rétention maximale) contre symbolique (petit revenu). Recommandation : gratuit au lancement. |

---

## 3. Les opérations métier, une par une

### 3.1 Réception de paiement — le commerçant encaisse une vente

| | |
|---|---|
| Le marché | **1 à 2,25 %** `[V]` ; Wave **~1 %** `[T]`, le moins cher |
| Notre coût | netting + compte marchand, bas |
| Prix proposé | **1 %**, aligné sur Wave `[P]` |
| Marge | fine sur la transaction ; le vrai revenu ici est **l'abonnement + la facture** |
| Règle | ne jamais dépasser Wave, sinon on devient une barrière au lieu d'un outil |

### 3.2 Paie de salaire — la PME verse N salaires

| | |
|---|---|
| Le marché | **Julaya 0,5 à 1,5 %** `[V]`, **PayDunya 2 %** `[V]` |
| Notre coût | netting ; **si les employés sont clients SwimPay, la paie devient une écriture interne, coût nul** |
| Prix proposé | **coût + 0,3 à 0,5 %**, ou un forfait par bulletin (100 à 300 F/salaire) `[P]` |
| Levier | chaque paie **recrute les employés** comme utilisateurs (`18` §11). La paie devient à la fois un revenu et un canal d'acquisition. C'est l'opération la plus stratégique. |

### 3.3 Paiement fournisseur

| | |
|---|---|
| Le marché | transfert B2B ; **inter-entreprises gratuit pour le payeur chez Julaya** `[V]` |
| Prix proposé | **0,3 à 0,5 %**, ou **gratuit si le fournisseur est client** `[P]` |
| Levier | pousse le fournisseur à ouvrir un compte SwimPay, encore une chaîne recrutée |

### 3.4 Checkout e-commerce

| | |
|---|---|
| Le marché | **2,25 à 3,5 %** `[V]` |
| Notre coût | netting + rail |
| Prix proposé | **1,5 %** `[P]` |
| Marge | bonne, nettement sous le marché |

---

## 4. La grille consolidée, à valider

| Opération | Marché | Prix SwimPay `[P]` | Ce qui fait notre marge |
|---|---|---|---|
| Transfert même réseau | gratuit / PI-SPI | **gratuit** | rien, acquisition |
| Transfert réseau différent | douleur réelle | **1 %, max 500 F** | netting (coût ~0,1 %) |
| Mobile → Banque | facturé | **0,5 à 1 %** | selon rail |
| Retrait vers un réseau | ~1 % cash-out | **gratuit ou 0,3 %** | rétention avant tout |
| Réception commerçant | 1 à 2,25 % | **1 %** | abonnement + facture |
| Paie de salaire | 0,5 à 2 % | **coût + 0,3 à 0,5 %** | volume + on-us si employés clients |
| Paiement fournisseur | 0 à 1 % | **0,3 à 0,5 %** | on-us si fournisseur client |
| Checkout e-commerce | 2,25 à 3,5 % | **1,5 %** | netting |

---

## 5. Les abonnements

| Profil | Abonnement `[P]` | Note |
|---|---|---|
| Le particulier | **gratuit** | fait venir le volume, nourrit la donnée et le netting |
| Le commerçant | **2 500 à 5 000 F/mois** | sous les outils de facturation existants (~12 000 F) |
| La PME | **10 000 F/mois** | le cœur du revenu, rentable dès ~140 clients |
| Le comptable | **1 000 à 2 000 F/dossier** | il refacture ses clients ; canal d'acquisition |

---

## 6. Où l'argent est vraiment gagné

Par ordre de solidité :

1. **Les abonnements PME.** Récurrents, prévisibles, forte marge, adossés à une
   obligation légale. La base du P&L.
2. **La marge sur les opérations à valeur.** Chaque transaction rapporte peu,
   mais le volume compte, et le netting garde notre coût très bas.
3. **Le float.** L'argent qui dort dans les caisses a une valeur, à capter avec
   le partenaire licencié (`17` §3.3). Pas au lancement.
4. **Le crédit, en an 2.** Sur l'historique certifié (`18` D). La plus grosse
   marge, la plus lointaine.

**Ce qu'il ne faut pas faire :** bâtir le P&L sur le swap. Le PI-SPI le tue à
terme. Le swap est un hameçon, pas une rente.

---

## 7. Confrontation au marché

Nos prix, en face des tarifs vérifiés.

| | PayDunya `[V]` | Julaya `[V]` | Wave `[T]` | Hub2 `[T]` | **SwimPay `[P]`** |
|---|---|---|---|---|---|
| Encaisser | 2,25 % | 0,5–1 % | ~1 % | 1,8–2,5 % | **1 %** |
| Verser / paie | 2,00 % | 0,5–1,5 % | — | — | **coût + 0,3–0,5 %** |
| Même réseau | — | — | gratuit | — | **gratuit** |
| Checkout | — | — | — | — | **1,5 %** |

On se place **au niveau du moins cher (Wave, Julaya)** sur l'encaissement et la
paie, et **sous le marché** sur le checkout. Ce qui rend ça soutenable et non
suicidaire, c'est le netting : notre coût réel est loin sous ces prix.

---

## 8. Les décisions que LO doit trancher, pour figer

1. **Le retrait est-il gratuit** (rétention maximale, float préservé) ou
   **symbolique** (petit revenu, risque de fuite) ?
2. **Le swap : 1 % plafonné 500 F**, ou une autre grille ? Et **quel plan quand
   le PI-SPI le rend gratuit** pour le client ?
3. **La réception commerçant : 1 % séparé**, ou **incluse dans l'abonnement**
   jusqu'à un volume, puis facturée ?
4. **La paie : pourcentage ou forfait par bulletin** ? Le forfait est plus
   lisible pour la PME.
5. **Le mobile → banque** : prix à fixer une fois le coût du rail bancaire connu.
6. **Un plancher par opération** (ex. minimum 25 F) pour ne pas perdre d'argent
   sur les tout petits montants ?

Une fois ces six points tranchés, la grille du §4 se fige et devient la table
de vérité pour le code du module de tarification.

---

## 9. Sources

Internes : `09_PAYDUNYA_TARIFS.md`, `10_JULAYA_TARIFS.md`, `17_LE_NETTING.md`,
`18_MODELES_D_ALGORITHME.md`. Tarifs Wave, Orange et Hub2 en source tierce, à
confirmer en primaire avant tout engagement public.
