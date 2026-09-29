# SwimPay Tontine — la protection contre les arnaques, surface par surface

> Étape 3 sur 4 du plan de LO (29/09/2026). L'étape 1 (le cœur, `27` et `28`) protège
> contre les **membres** qui trichent. Celle-ci protège contre les **escrocs** :
> ceux qui volent un compte, se font passer pour SwimPay, ou utilisent la tontine
> comme appât. L'étape 4 (la cybersécurité technique) viendra après.
>
> Même règle qu'au cœur : **chaque protection est automatique**, aucun humain ne
> décide. `[H]` = à vérifier avant de construire.

---

## Le principe

Une arnaque réussit quand elle trouve **un endroit où l'argent peut sortir vers
quelqu'un d'autre que son propriétaire**, ou **un endroit où la victime fait
confiance à un faux**. On liste donc chaque endroit où la tontine touche le monde
extérieur, ce qu'un escroc y tente, et la règle qui l'arrête.

---

## Les huit surfaces

| # | Surface | Ce que tente l'escroc | La règle, automatique |
|---|---|---|---|
| 1 | **L'invitation** | Une fausse tontine « SwimPay » sur WhatsApp ou Facebook, avec un faux lien, qui fait payer hors de l'application | **Une tontine SwimPay n'existe que dans l'application.** Le lien d'invitation ouvre l'application, jamais une page web de paiement. Aucune cotisation ne se paie ailleurs. L'application le dit à l'entrée : *« Si on te demande de payer hors de SwimPay, ce n'est pas une tontine SwimPay. »* |
| 2 | **Le compte** | Voler le compte d'un gagnant : téléphone volé, carte SIM dupliquée chez l'opérateur, code demandé par téléphone | Chaque retrait de la tontine demande **le code ou l'empreinte, sur l'appareil habituel**. **Nouvel appareil, ou numéro dont la carte SIM vient de changer : l'argent de la tontine ne peut pas sortir pendant 72 heures** `[H]`, le vrai propriétaire est prévenu sur son ancien appareil |
| 3 | **L'identité** | Entrer avec la pièce d'identité d'un autre, ou payer quelqu'un pour prêter son nom (un prête-nom) | Une pièce = une personne, avec **photo du visage en direct**, comparée à la pièce. Le prête-nom coûte cher : il doit déposer la caution de 35 %, et la dette d'une fuite suit **sa** pièce d'identité, sur tous ses comptes SwimPay |
| 4 | **Le retrait** | Faire sortir l'argent vers un compte Mobile Money ou bancaire d'un complice | **L'argent de la tontine ne sort que vers un compte au nom du membre**, vérifié par le nom que l'opérateur ou la banque renvoie. Un compte de retrait **ajouté récemment** n'est utilisable qu'après 72 heures `[H]` |
| 5 | **Les faux messages** | Un faux SMS « Vous avez gagné la tontine, cliquez ici », ou un faux conseiller SwimPay qui appelle et demande le code | **SwimPay n'envoie jamais de lien par SMS et n'appelle jamais pour demander un code.** Le gain s'annonce **uniquement dans l'application**. Chaque écran de code rappelle : *« SwimPay ne te demandera jamais ce code. »* |
| 6 | **Les fausses preuves** | Une capture d'écran truquée pour dire « j'ai payé », ou « c'est moi qui ai gagné » | **Seul le Carnet de la tontine fait foi.** Aucune capture n'est une preuve. Le Carnet est visible par tous les membres |
| 7 | **Le tirage** | Des faux comptes pour avoir plus de chances, ou faire croire que le tirage est truqué | Une pièce = une place. Le tirage est **vérifiable par chaque membre** dans l'application (`27`, M8). Des comptes liés comptent comme une seule personne (`28` §4) |
| 8 | **L'intérieur** | Un employé de SwimPay qui détourne de l'argent ou change un résultat | **Aucun employé ne peut déplacer l'argent d'une tontine**, ni changer un ordre ou un montant : rien ne se fait à la main (`27`, I2). Les employés ne voient que ce qu'il faut pour aider, sans pouvoir agir. Chaque consultation est enregistrée |

---

## Ce que ces règles ne couvrent pas, dit franchement

- **La contrainte.** Quelqu'un forcé de retirer son argent, sous la menace. Le délai
  de 72 heures sur un nouvel appareil aide, mais pas si la victime tient son propre
  téléphone. Piste pour plus tard : un **code de détresse**, qui a l'air de marcher
  mais bloque tout et alerte `[H]`.
- **La victime qui paie un escroc hors de l'application**, malgré les avertissements.
  SwimPay ne peut rien récupérer de ce qui n'est jamais passé par lui. Il peut
  seulement le dire clairement, partout.
- **La carte SIM dupliquée** n'est détectable que si l'opérateur donne l'information
  (certains opérateurs proposent un service qui dit si la carte SIM d'un numéro a
  changé récemment) `[H]`. Sans elle, on se repose sur la règle du nouvel appareil.

---

## À trancher

- [ ] **Le délai de sécurité** sur un nouvel appareil ou un nouveau compte de
      retrait : 72 heures, plus, moins ?
- [ ] Demander aux opérateurs (Orange, MTN, Moov) s'ils donnent **l'information de
      changement de carte SIM** `[H]`.
- [ ] Le **code de détresse** : plus tard, ou dès le début ?

Étape suivante : **la cybersécurité technique** (étape 4).
