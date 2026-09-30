# La tontine classique : la position de LO, figée

> **Figée par LO le 30 septembre 2026.** Ce document fait foi. Il prime sur tout
> document antérieur qui le contredit (`23` à `34`). Détail des règles de situation
> et de sécurité : `31_TONTINE_CLASSIQUE_SPEC.md`. Chiffres calculés par
> `design/pivot/sondes/tontine-v3.py`, en entiers XOF, argent conservé au franc près.

---

## 1. Le principe : zéro confiance

- **Personne n'a jamais l'argent des autres en main.** Ni un membre, ni
  l'organisateur, ni SwimPay.
- **SwimPay ne finance aucun fonds** et ne porte aucun risque de fuite.
- **Aucun partenaire prêteur.** La tontine ne fait pas crédit.
- **Aucun humain ne décide.** La même règle pour tous, sans niveaux, appliquée par le
  code.
- **La tontine se vend par sa sûreté et son mécanisme.** Elle vise ceux qui veulent la
  certitude d'être payés, pas ceux qui cherchent la facilité.

**Pistes écartées par LO** (ne pas les reproposer) : avance au gagnant, fonds de
garantie commun, prime de garantie, partenaire prêteur, caution sous 25 % (`34`,
rejeté).

---

## 2. Les paramètres, tous en pourcentage de la cagnotte

C = cagnotte brute (mises de tous les tours), T = nombre de tours, une mise = C ÷ T.
**Aucun montant fixe** : tout suit la taille de chaque tontine.

| Élément | En % de C | Quand |
|---|---|---|
| **Caution** | **25 %** | versée à l'entrée, gardée pour les mises restantes, rendue au fil des mises |
| Frais du système (revenu SwimPay) | 3 % | pris au gain |
| Réserve | 2 % | prise au gain, rendue à la clôture à ceux qui ont tout payé |
| **Cagnotte nette** | **95 %** | |
| Bonus du dernier tiers | 3 % | à chaque gagnant du dernier tiers des tours, payé par la réserve |
| Pénalité | 5 % de chaque mise couverte | versée à la réserve, prise sur l'argent du défaillant |

---

## 3. La règle adaptative

> **Le jour du gain, SwimPay garde exactement les mises qui restent à payer au
> gagnant, prises d'abord sur sa caution, puis sur sa cagnotte. Tout le reste lui est
> rendu, tout de suite. Ensuite, à chaque mise qu'il paie, on lui rend une mise.**

Pour le gagnant du tour t, en % de C :

    gardé    =  (T − t) ÷ T                      caution d'abord, puis cagnotte
    rendu    =  95 % + 25 % − (T − t) ÷ T
    versé    =  25 % + t ÷ T                     caution comprise
    position =  rendu − versé  =  −5 %

**Le jour de son gain, chaque membre est à −5 % de la cagnotte, quels que soient sa
place, le nombre de membres et le montant.** La seule différence entre les places est
le moment où l'on touche.

---

## 4. L'exemple : cagnotte de 330 000 F

11 membres, 11 tours mensuels, mise de 30 000 F. Caution 82 500 F, frais 9 900 F,
réserve 6 600 F, cagnotte nette 313 500 F.

| Gagne au tour | A versé (caution comprise) | Gardé (caution / cagnotte) | **Rendu le jour du gain** | Position |
|---|---|---|---|---|
| 1 | 112 500 | 300 000 (82 500 / 217 500) | **96 000** | −16 500 |
| 3 | 172 500 | 240 000 (82 500 / 157 500) | **156 000** | −16 500 |
| 6 | 262 500 | 150 000 (82 500 / 67 500) | **246 000** | −16 500 |
| 8 | 322 500 | 90 000 (82 500 / 7 500) | **306 000** | −16 500 |
| 9 | 352 500 | 60 000 (60 000 / 0) | **336 000** | −16 500 |
| 11 | 412 500 | 0 | **396 000** | −16 500 |

−16 500 F = −5 % de 330 000 F, à chaque place.

**À la clôture, si tout le monde paie** : la réserve (72 600 F) verse 9 900 F à
chacun des 3 derniers, puis partage le reste (42 900 F) entre les 11 membres, soit
3 900 F chacun.

| Places | Résultat final | En % de C |
|---|---|---|
| 1 à 8 | −12 600 F | −3,8 % |
| 9 à 11 | −2 700 F | −0,8 % |
| SwimPay | +108 900 F | 3 % de chaque cagnotte |

---

## 5. Ce qui est prouvé

Les 260 épreuves de `tontine-v3.py` (tous les formats de 2 à 30 membres, 1 à 3
gagnants par tour, 5 scénarios de défaut dont « tous les gagnants fuient »),
rejouées avec la caution de 25 % :

| Mesure | Résultat |
|---|---|
| Perte de SwimPay | **0 F** |
| Membres honnêtes lésés par les autres | **0** |
| Fuites qui rapportent plus que rester honnête | **0** |
| Argent des autres qu'un membre a eu en main, au plus | **0 F** |

Sur l'exemple de 330 000 F : perte de SwimPay 0, argent des autres en main 0.

---

## 6. Ce qui reste ouvert

1. La qualification juridique de l'activité, avec le partenaire EME et un avocat
   (`31` §13).
2. L'autorisation de prélèvement et la proportionnalité de la pénalité de 5 %.
3. Les délais de grâce et de suspension `[H]`.
4. Les scénarios chiffrés du `31` §11.1 datent de la caution à 30 % ; les épreuves du
   §5 passent à 25 %.
