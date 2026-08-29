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

---

## 7. La simulation — résultats, et ce qu'elle casse

> Outil : `design/pivot/sondes/netting.mjs`, sans dépendance, déterministe.
> **Les profils de clients sont des hypothèses, aucun n'est mesuré.** La
> simulation ne prédit rien : elle montre où le modèle bascule.

### 7.1 La première version était fausse, et elle annonçait un triomphe

Elle donnait **99,88 % de compensation et zéro échec partout**. C'était un bug :
chaque client encaissait deux fois plus qu'il ne sortait, donc les réserves ne
faisaient que gonfler. **Un système où l'argent entre et ne ressort jamais n'a
évidemment aucun problème de trésorerie.**

Corrigé par la **conservation** — sur le mois, ce qui sort égale ce qui entre,
moins le solde laissé — et par un **étalonnage** sur deux cas dont la réponse
est connue d'avance :

| Cas d'étalonnage | Attendu | Obtenu |
|---|---|---|
| Chacun sort sur les mêmes opérateurs qu'il encaisse | ~0 % de déséquilibre | **1,63 %** |
| Tout entre sur Wave, tout sort sur Orange | ~50 % | **50,00 %** |

Sans ces deux lignes, tout le reste serait à jeter.

### 7.2 Le résultat central

Sur 400 clients, 30 jours, 3 M F par boîte :

| | |
|---|---|
| Flux brut | **2 205 746 947 F** |
| Réellement déplacé | **226 803 896 F** |
| **Taux de compensation** | **89,7 %** |
| Plancher structurel | 8,2 % — ce qui doit traverser quoi qu'on fasse |
| Frais réels | **2 268 039 F**, soit **0,10 % du brut** |
| Frais si chaque franc traversait à 2 % | 44 114 939 F |
| **Économie** | **≈ 41,8 M F par mois** |
| Float immobilisé | 15 M F |

> **0,10 % contre 2 % : vingt fois moins cher.**

### 7.3 La surprise : l'échelle ne compte pas

| Clients | Compensation |
|---|---|
| 10 | 87,2 % |
| 50 | 86,7 % |
| 100 | 90,4 % |
| 400 | 89,7 % |
| 800 | 89,9 % |

**J'avais annoncé une courbe en J — « les premiers clients coûtent cher, ça
s'améliore en montant ». C'est faux.** La compensation vient de la **structure
des flux**, pas du nombre de clients. Un client encaisse et redépense sur des
opérateurs qui se recouvrent largement : ça s'annule tout seul, même à dix.

**Bonne nouvelle, et elle change le plan** : le modèle est bon **dès le premier
jour**, sans attendre la masse.

*Réserve honnête* : la simulation donne la **moyenne**. À dix clients, un seul
gros mouvement peut vider une boîte, ce qui n'arrive plus à quatre cents. La
moyenne est la même, **la variance ne l'est pas.**

### 7.4 Ce qui casse — la vague de retraits

Au jour 15, tout le monde retire en même temps :

| Float par boîte | Échecs | Montant non servi |
|---|---|---|
| 1 M | **191** | 181,9 M F |
| 3 M | 186 | 172,9 M F |
| 6 M | 171 | 160,6 M F |
| 12 M | 154 | 133,9 M F |
| **25 M** (125 M immobilisés) | **88** | 71,8 M F |

> **Multiplier le float par 25 ne supprime pas les échecs.**

**C'est le vrai point faible, et il n'est pas de nature financière au sens où je
le croyais.** Pendant une vague, toutes les boîtes se vident **en même temps** :
le netting croisé n'a plus rien à prendre nulle part. Ajouter de l'argent dans
les boîtes ne fait que retarder le mur.

**Les seules réponses réelles**, et ce sont des décisions produit, pas des
réglages :

1. **Une source de liquidité extérieure** — ligne de crédit bancaire, ou tirage
   immédiat sur le partenaire licencié. C'est ce qui manque au modèle.
2. **Ralentir les retraits sous stress** — les mettre en file quelques heures,
   annoncé et contractuel. Instantané en temps normal, différé en vague.
3. **Détecter la vague avant** — et là, la facture aide encore (§2.1).

Un modèle qui promet le retrait instantané sans ligne de crédit **ment un jour
sur trente**. Il faut choisir lequel des trois on assume, et l'écrire dans les
conditions.

### 7.5 Le cas défavorable reste vivable

Tous les flux dans le même sens — tout entre Wave, tout sort Orange :

| | |
|---|---|
| Compensation | **53,8 %** au lieu de 89,7 |
| Coût | **0,46 %** au lieu de 0,10 |

**Toujours quatre fois moins cher que 2 %.** Le pire cas ne tue pas le modèle,
il le ramène à « bon » au lieu de « excellent ».

### 7.6 Le PI-SPI confirme

Même volume déplacé, **frais à zéro**. Le seul coût résiduel du modèle disparaît
en 2026.

### 7.7 Ce que la simulation ne dit pas

- Les profils sont **inventés**. Le taux de compensation réel se mesurera sur
  les flux des 400 PME, pas ici.
- Les plafonds des comptes marchands sont des **hypothèses tierces**.
- Elle ignore les **délais de règlement** : un rééquilibrage qui met trois jours
  n'est pas le même outil qu'un instantané. À modéliser ensuite — et c'est
  probablement ce qui aggrave la vague.
