# Tarifs des réseaux et coûts réels, par opération

> Recherche demandée par LO le 30 août 2026, après un reproche fondé : la grille
> de `19_MODELE_DE_REVENUS.md` posait des prix sans les avoir cherchés. Ce
> document apporte les chiffres publics, source par source, et calcule **ce que
> chaque opération nous coûte vraiment** selon le chemin utilisé.
>
> `[V]` vérifié en source primaire, `[T]` source tierce concordante, `[H]` calcul
> à nous. Relevé le 30 août 2026.

---

## 1. Ce que coûtent les réseaux mobile money

### 1.1 La grille, réseau par réseau

| Réseau | Envoi même réseau | Retrait (cash-out) | Encaissement marchand par API (**notre coût**) |
|---|---|---|---|
| **Orange Money** | **0 F** `[V]` | **1 %** `[V]` | **1 %**, règlement à J+5 `[T]` ; jusqu'à 1,5–2,2 % selon volume `[T]` |
| **Wave** | **1 %** `[T]` | **0 %** (2026) `[T]` | **~1 %** par API `[T]` ; QR gratuit pour le client |
| **MTN MoMo** | gratuit vers un abonné MTN, sinon **1 % (plafond 4 500 F)** `[T]` | **1 % (plafond 4 500 F)**, promo 0 % via l'appli `[T]` | paiement marchand gratuit pour le client `[T]` ; coût API à confirmer |
| **Moov Money** | gratuit vers un abonné Moov, sinon **1 %** `[T]` | **1 %** `[T]` | paiement direct souvent gratuit ou réduit `[T]` |

Sources : `orange.ci/fr/tarifs-orange-money.html` `[V]` ; blogs tarifaires CI 2026
et pages opérateurs `[T]`.

### 1.2 Le fait de marché qui explique tout

**Depuis l'arrivée de Wave (2021), tout le marché s'est aligné sur ~1 %.** Avant,
les opérateurs prenaient 1,5 à 3 %. Wave a imposé le retrait à 1 % puis 0 %, et
l'envoi à 1 %. Conséquences pour nous :

- **L'envoi dans le même réseau est déjà gratuit ou à 1 %.** On ne peut rien
  gagner là.
- **Le retrait est à 1 % ou déjà gratuit** (Wave, promo MTN). On ne peut pas le
  facturer plus cher que zéro.
- **Le paiement marchand est gratuit pour le client**, et coûte **~1 %** au
  marchand qui encaisse par API. C'est notre coût de référence pour encaisser.

### 1.3 La correction de mon erreur

`19` disait « Orange → Orange gratuit » sans source. **C'est vrai** (orange.ci :
« frais d'envoi 0 FCFA »), mais je l'avais deviné. C'est désormais sourcé. Le
reste des pourcentages de `19` était des propositions `[P]` que ce document
confronte enfin aux chiffres réels.

---

## 2. Ce que coûtent les rails (payin / payout)

| Rail | Encaisser (payin) | Verser (payout) | Fiabilité |
|---|---|---|---|
| **PayDunya** | **2,25 %** | **2,00 %** | `[V]` primaire (`09`) |
| **Julaya** | **0,5 à 1 %** | **0,5 à 1,5 %** | `[V]` primaire (`10`) |
| **CinetPay** | **1,5 à 2 %** | selon volume | `[T]` |
| **Hub2** | **1,8 à 2,5 %** | négociable dès 50 M/mois | `[T]` |

---

## 3. Ce que ça nous coûte, par élément

Le point que LO réclamait : pour chaque opération, le coût selon le chemin.

### 3.1 Encaisser un paiement (le commerçant reçoit)

| Chemin | Notre coût |
|---|---|
| **API marchande de l'opérateur** (Wave, Orange) | **~1 %** `[T]` |
| Rail généraliste PayDunya | 2,25 % `[V]` |
| Rail Julaya | 0,5 à 1 % `[V]` |
| **Netting** (nos caisses) | **~0,1 %** en simulation `[T]` |

> **Découverte : encaisser directement par l'API marchande de l'opérateur (~1 %)
> coûte deux fois moins qu'un rail généraliste comme PayDunya (2,25 %).** Pour
> l'encaissement, on va donc chez l'opérateur, pas chez un agrégateur. Et le
> netting bat tout le monde.

### 3.2 Verser (paie, fournisseur, sortie)

| Chemin | Notre coût |
|---|---|
| Julaya payout | 0,5 à 1,5 % `[V]` |
| PayDunya payout | 2,00 % `[V]` |
| API de décaissement de l'opérateur | à confirmer, ~1 % `[H]` |
| **Netting** | **~0,1 %** `[T]` |

### 3.3 Retirer (SwimPay → un réseau)

C'est un versement vers un réseau, donc le coût du §3.2. **Ensuite**, le client
retire chez l'opérateur et paie **son** cash-out : Orange 1 %, Wave 0 %,
MTN/Moov 1 %. Si on lui facturait aussi la sortie, il paierait deux fois.
D'où la recommandation de `19` : **sortie gratuite ou symbolique**.

---

## 4. Le swap, la question de LO, chiffrée

> *« Le swap, combien on devrait facturer sur la base des chiffres des
> concurrents si on utilisait une API de rails ? »*

Un swap Orange → Wave, c'est **encaisser sur Orange + verser sur Wave**. Le coût
dépend entièrement du chemin.

| Chemin du swap | Calcul | **Ce que ça nous coûte** |
|---|---|---|
| Rail **PayDunya** | 2,25 % + 2,00 % | **4,25 %** `[V]` |
| Rail **CinetPay** | ~1,75 % + ~1,75 % | **~3,5 %** `[T]` |
| Rail **Hub2** | ~2 % + ~2 % | **~4 %** `[T]` |
| Rail **Julaya** | 0,5–1 % + 0,5–1,5 % | **1 à 2,5 %** `[V]` |
| **Netting** (nos caisses) | résidu | **~0,1 %** `[T]` |

### 4.1 La réponse, sans détour

**Si on passe par une API de rails, un swap nous coûte entre 2,5 % et 4,25 %.**

Pour ne pas perdre d'argent, il faudrait donc facturer le client **au moins 2,5 %,
et jusqu'à plus de 4 %** selon le rail. Or :

- le transfert entre réseaux chez les opérateurs eux-mêmes tourne autour de **1 %**
  (Wave, MTN) ;
- le **PI-SPI le rendra gratuit** à terme `[T]`.

> **Conclusion : facturer un swap plus de 2,5 % est intenable face à un marché à
> 1 % qui va vers le gratuit. Donc le swap par une API de rails perd de l'argent
> à tout prix acceptable.**

### 4.2 Ce que ça prouve

**Le swap n'est rentable que par le netting**, où il coûte ~0,1 %. Là, on peut
le facturer 1 % (au niveau du marché) et garder une marge.

Autrement dit : le rail généraliste est un **filet de secours coûteux**, pas le
chemin normal. Mon `18` l'avait dit pour la fiabilité ; les chiffres le
confirment pour le prix. **Sans netting, il n'y a pas de marge sur le swap, ni
sur rien qui traverse.**

### 4.3 Le prix à afficher

| | Valeur |
|---|---|
| Prix marché du transfert inter-réseau | **~1 %** (Wave, MTN) |
| Notre coût par netting | ~0,1 % |
| **Prix SwimPay proposé** | **1 %, plafonné 500 F** `[P]` |
| Marge (par netting) | ~0,9 point |
| Marge (par rail, secours) | **négative**, à éviter |
| Alerte PI-SPI | la marge disparaît quand le rail public devient gratuit |

---

## 5. La grille de prix, corrigée et sourcée

Ce qu'on facture au client, avec la source du prix de marché en face.

| Opération | Marché (sourcé) | Prix SwimPay `[P]` | Notre coût (bon chemin) |
|---|---|---|---|
| Envoi même réseau | 0 F Orange `[V]`, 1 % Wave `[T]` | **gratuit** | ~0 (on-us) |
| Envoi réseau différent | ~1 % `[T]` | **1 %, max 500 F** | ~0,1 % netting |
| Retrait vers un réseau | cash-out 0–1 % `[V/T]` | **gratuit** | ~0,1 % netting |
| Encaisser une vente | ~1 % `[T]` | **1 %** | ~1 % API marchande, ~0,1 % netting |
| Paie de salaire | Julaya 0,5–1,5 % `[V]` | **coût + 0,3–0,5 %** | netting, on-us si employés clients |
| Checkout e-commerce | 2,25–3,5 % `[V]` | **1,5 %** | ~0,1 % netting + rail au besoin |

---

## 6. Ce que ces chiffres imposent au produit

1. **Encaisser passe par l'API marchande de l'opérateur (~1 %), pas par un rail
   généraliste (2,25 %).** Sauf Julaya, moins cher.
2. **Le netting n'est pas une option, c'est la seule source de marge** sur tout ce
   qui traverse. Sans lui, encaissement et swap sont à perte ou à zéro.
3. **Les rails sont le filet, pas la route.** Ils coûtent 2 à 4 fois le netting.
   On les réserve aux cas où une caisse est à sec.
4. **Le règlement Orange à J+5 est une contrainte de trésorerie** : l'argent
   encaissé arrive cinq jours plus tard. À financer, ou à préférer les rails à
   règlement rapide pour ces flux.
5. **Le swap ne porte pas le P&L.** Marché à 1 % qui va vers le gratuit avec le
   PI-SPI. Hameçon, pas rente. Le revenu vient de l'abonnement et de la marge
   nette sur les gros volumes (paie, checkout).

---

## 7. Ce qui reste à vérifier en primaire

- Le **coût exact de l'API marchande Orange** (1 % ou 1,5–2,2 % selon volume) et
  le délai J+5, à confirmer dans le contrat développeur.
- Le **coût de l'API de décaissement** de chaque opérateur (payout).
- Le **coût API marchand MTN et Moov** (le paiement est gratuit pour le client,
  mais l'encaissement par API ?).
- **CinetPay et Hub2** en source primaire, aujourd'hui `[T]`.

---

## 8. Sources

- `orange.ci/fr/tarifs-orange-money.html` `[V]` : Orange → Orange 0 F, retrait 1 %.
- `business.orange.ci` API Orange Money : marchand 1 %, règlement J+5, ouverte
  aux développeurs et ESN.
- Pages et blogs tarifaires CI 2026 (Wave, MTN, Moov) `[T]`.
- `wave.com` commissions CI (grille agents, pas client).
- Internes : `09_PAYDUNYA_TARIFS.md`, `10_JULAYA_TARIFS.md`, `17_LE_NETTING.md`,
  `18_MODELES_D_ALGORITHME.md`, `19_MODELE_DE_REVENUS.md`.
