# Le netting — l'idée qui change l'économie du produit

> Idée de LO, 29 août 2026 au soir, formulée ainsi : *« les mobile money sont des
> éléments de cuisine interne. Le client utilise SwimPay pour transférer vers
> n'importe quel mobile money. Ce que le back end fait est un montage que le
> front n'affiche pas. »*
>
> **Elle annule ce que j'ai écrit une heure plus tôt** dans `16` §1 : « sur le
> flux, il n'y a pas de marge ». C'était vrai pour un modèle qui fait traverser
> chaque franc. Ce n'est plus vrai dès qu'on cesse de le faire traverser.

---

## 1. Le mécanisme

### 1.1 Ce que le client voit, ce que la machine fait

Un utilisateur alimente son sous-compte SwimPay **depuis Orange Money**, puis
envoie un montant **vers un numéro Wave**.

| Ce qu'il voit | Ce qui se passe vraiment |
|---|---|
| « Mon argent est parti d'Orange vers Wave » | L'argent d'Orange **reste chez Orange**. Le versement vers Wave part de **notre réserve Wave**. Rien ne traverse. |

On tient **une réserve par opérateur**. Une entrée crédite la réserve de son
opérateur ; une sortie débite la réserve de l'opérateur de destination. **Aucun
transfert inter-opérateur n'a lieu par transaction.**

### 1.2 Ce qui coûte, et ce qui ne coûte plus

Les réserves dérivent : celle d'Orange gonfle, celle de Wave se vide. Quand
l'écart dépasse un seuil, **on rééquilibre en un seul mouvement**, sur le **solde
net**, pas sur chaque opération.

> **On paie le rail sur le net, pas sur le brut.**

Chiffrage d'ordre de grandeur, à démontrer sur données réelles :

| | Sans netting | **Avec netting** |
|---|---|---|
| Flux mensuel brut | 100 M F | 100 M F |
| Ce qui traverse réellement | 100 M F | **10 M F** (déséquilibre net, hypothèse 10 %) |
| Coût rail à 2 % | **2 000 000 F** | **200 000 F** |

**Le facteur est celui du taux de compensation.** Plus les flux entrants et
sortants se répartissent également entre opérateurs, plus le net est petit, plus
le coût s'effondre. C'est exactement la mécanique de tous les métiers de change
et de transfert.

### 1.3 Ce que ça corrige dans mes calculs

`16` §1 disait : encaisser coûte 2,25 %, on vend 1 %, on perd 1,25 point.
**Faux dès qu'on ne fait plus traverser chaque franc.** Le bon calcul est :

```
marge = (prix facturé × flux brut) − (coût du rail × flux NET)
```

À 1 % facturé sur 100 M et 2 % payé sur 10 M : **1 000 000 − 200 000 = 800 000 F
de marge mensuelle**, là où le calcul naïf annonçait une perte.

**La marge n'est pas dans le prix. Elle est dans le taux de compensation.**

---

## 2. Trois leviers que personne n'utilise

### 2.1 La facture nous donne la trésorerie de demain

C'est le levier le plus fort, et il n'existe que chez nous.

**Une FNE est émise avant d'être payée.** Nous voyons donc, plusieurs jours à
l'avance, combien d'argent va arriver, chez quel marchand, et — dès qu'on connaît
ses habitudes d'encaissement — **sur quel opérateur**.

| | Ce qu'ils voient | Quand |
|---|---|---|
| Un agrégateur | le paiement | au moment où il arrive |
| Un opérateur | le paiement | au moment où il arrive |
| **SwimPay** | **la facture** | **jours avant le paiement** |

Conséquence : **on pré-positionne les réserves.** On est long là où l'argent va
entrer, court là où il va sortir. Le rééquilibrage devient anticipé au lieu d'être
subi, donc plus rare, donc moins cher — et on ne se retrouve jamais à court sur
un opérateur au mauvais moment.

> **La boucle fiscale finance la boucle de trésorerie.** C'est le lien entre les
> deux moitiés du produit, et je ne l'avais pas vu.

### 2.2 On peut façonner le déséquilibre au lieu de le subir

Le taux de compensation n'est pas une donnée du ciel. On l'influence :

- **par le prix** : rendre moins cher de recevoir sur l'opérateur où l'on est
  court, plus cher là où l'on déborde ;
- **par le recrutement** : aller chercher des marchands qui encaissent là où l'on
  a besoin d'entrées ;
- **par le défaut proposé** : quand l'utilisateur n'a pas de préférence forte,
  proposer d'abord l'opérateur qui nous arrange.

Personne ne fait ça, parce que personne n'a à la fois la surface de prix et la
vue sur les deux côtés.

### 2.3 Le PI-SPI nous sert, alors qu'il tue les autres

Le rail interopérable de la BCEAO rend les transferts inter-wallet gratuits et
instantanés, obligatoires en 2026. Toute la place dit qu'il tue le métier du
swap. C'est vrai.

**Pour un moteur de netting, il fait l'inverse : il rend le rééquilibrage
gratuit.** Le seul coût résiduel du modèle disparaît.

> **Ce qui tue le business de tout le monde améliore le nôtre.** Il faut être
> construit sur le netting pour que ce soit vrai.

---

## 3. Les plafonds — une contrainte qui devient une stratégie

### 3.1 Ce qu'on sait, et sa fiabilité

| Compte | Plafond mensuel | Fiabilité |
|---|---|---|
| Compte marchand **Orange Money** | ~ **20 M F** | `[T]` |
| Compte marchand **Wave** | ~ **15 M F** | `[T]` |
| Orange standard vérifié | 2 M par opération, **10 M/mois** | `[T]` |
| Monnaie électronique — palier de base BCEAO | **100 000 F/mois** | `[T]` |
| Palier standard | **500 000 F/mois** | `[T]` |
| Palier renforcé | **5 M F/mois** | `[T]` |

**Aucun de ces chiffres n'est vérifié en source primaire.** Ils orientent, ils ne
décident pas. Et une instruction BCEAO récente — **n° 003-03-2025 du 18 mars
2025**, relative à l'identification et à la connaissance du client — a modifié le
cadre KYC : à lire avant de figer quoi que ce soit.

### 3.2 Le retournement

Si un compte marchand plafonne à ~20 M par mois, **une seule réserve plafonne
tout le système à 20 M par opérateur**. Sur 400 PME, c'est un mur immédiat.

Mais dans le montage où **chaque marchand garde son propre compte** (`16` §3), le
plafond est **par marchand**. 400 marchands × 20 M = **8 milliards de capacité
mensuelle**, sans rien demander à personne.

> **Le plafond n'est pas une limite du modèle : c'est une raison de distribuer.**

Ce qui donne trois architectures, et il faut choisir en connaissance :

| | Réserve unique SwimPay | **Comptes des marchands** | Mixte |
|---|---|---|---|
| Netting possible | **oui, total** | non — chacun est isolé | **oui, sur la part en réserve** |
| Capacité mensuelle | ~20 M par opérateur | **quasi illimitée** | les deux |
| Agrément | **oui** — soldes détenus | **aucun** | oui, sur la part en réserve |
| Complexité | faible | forte (N comptes à piloter) | forte |

### 3.3 Et la contrainte qu'il ne faut pas contourner

Un **sous-compte SwimPay qui porte un solde utilisateur, c'est de la monnaie
électronique.** Ça ne se discute pas : c'est ce que la BCEAO encadre.

Trois voies, et une seule est fermée :

1. **Agent ou distributeur d'un émetteur licencié** — les soldes vivent chez lui,
   on tient le sous-registre et on pilote. **Zéro capital.** C'est le modèle
   sponsor déjà retenu (`00_VISION` §3), et **le netting y reste possible** :
   c'est une technique de trésorerie, pas un statut juridique.
2. **Agrément propre** — 100 M de capital pour un établissement de paiement,
   300 M pour un émetteur de monnaie électronique.
3. ~~Tenir des soldes sans agrément~~ — fermée, et il ne faut pas essayer de la
   contourner : c'est exactement ce que l'article 9 interdit, et c'est le genre
   de raccourci qui coûte l'entreprise entière.

---

## 4. Le moteur déterministe

LO : *« on peut créer une IA déterministe pour faire des opérations
programmatiques. »* C'est exactement le bon mot, et **la brique existe déjà** :
c'est le **Routeur**, quatrième module du Cerveau, aujourd'hui dormant.

Ce qu'il doit décider, à chaque mouvement :

1. **Quelle réserve créditer** — celle de l'opérateur d'entrée, toujours.
2. **Quelle réserve débiter** — celle de l'opérateur de destination.
3. **Cette réserve tient-elle ?** Si non : refuser, ou déclencher un
   rééquilibrage d'urgence, ou router autrement. Jamais deviner.
4. **Faut-il rééquilibrer maintenant ?** Selon les seuils, le coût du mouvement,
   et **la prévision issue des factures émises** (§2.1).
5. **Par quel chemin rééquilibrer ?** Le moins cher disponible aujourd'hui, le
   PI-SPI demain.

Ce n'est pas un modèle de langage. C'est une fonction pure, testable, avec des
invariants — comme le reste du Cerveau. Et elle se prête très bien à l'écriture
de règles qui s'affinent avec les données réelles : **le taux de compensation
observé par opérateur, par jour de la semaine, par heure.**

---

## 5. Ce qu'il faut mesurer avant de figer

Nommément, et par ordre d'importance :

1. **Le taux de compensation réel.** Tout le modèle en dépend. Il ne se devine
   pas : il se mesure sur les flux des 400 PME. **Sans ce chiffre, l'économie du
   netting est une hypothèse, pas un plan.**
2. **Les plafonds réels**, opérateur par opérateur, compte marchand par compte
   marchand — en source primaire, pas en blog.
3. **Les opérations que chaque API autorise** : dépôt, retrait, paiement de
   masse, paiement marchand, interrogation de solde, webhook d'arrivée. Orange
   les annonce toutes ; Wave et MTN restent à vérifier.
4. **Le tarif de la puce marchande Orange** — non publié.
5. **L'instruction BCEAO 003-03-2025** sur le KYC, qui a changé le cadre en
   mars 2025.
6. **Le délai de règlement** de chaque opérateur : un rééquilibrage qui met trois
   jours n'est pas le même outil qu'un rééquilibrage instantané.

---

## 6. Ce que je retiens de cette séance

L'idée du netting est de LO. Je ne l'avais pas, et j'avais même écrit le
contraire une heure plus tôt — en calculant la marge sur le brut, comme si chaque
franc devait traverser. **C'était une erreur de modèle, pas de chiffre.**

Ce que j'y ajoute et qui n'était pas dans l'idée initiale :

- **la facture comme prévision de trésorerie** (§2.1), qui relie les deux moitiés
  du produit et que personne d'autre ne peut avoir ;
- **le PI-SPI comme allié** (§2.3), alors qu'il est présenté partout comme le
  fossoyeur du métier ;
- **le plafond comme argument de distribution** (§3.2) plutôt que comme mur ;
- et la limite qu'il ne faut pas franchir (§3.3), parce qu'un raccourci
  réglementaire ici ne coûte pas une amende, il coûte l'entreprise.
