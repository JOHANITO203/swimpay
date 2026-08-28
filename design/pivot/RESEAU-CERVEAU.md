# Le réseau du Cerveau — carte complète de l'app

Ce document est écrit AVANT de construire : il est la référence contre
laquelle la complétude se vérifie. Tout écran, flow ou état absent d'ici
mais présent dans l'app (ou l'inverse) est un défaut de boucle.

## 0. Les quatre modules, et où ils s'incarnent à l'écran

| module | ce qu'il fait | où on le VOIT |
|---|---|---|
| **Annuaire d'identité** | 1 personne → N numéros → N comptes (mobile money, **plusieurs banques**), tous sur la même identité vérifiée ; identité vérifiée ; les profils business appartiennent à une personne physique | « Identité vérifiée · un seul compte » sur tout destinataire ; « Il/Elle reçoit sur » ; le gérant nommé dans chaque panneau business ; « Mes profils » dans le Profil personnel |
| **Routeur** | pour chaque mouvement : origine → rails possibles → délai · frais → choix | le sélecteur de moyen + le récap « Par X · délai · Frais — aucun » sur CHAQUE flux d'argent |
| **Rapprocheur** | chaque mouvement devient une écriture rapprochée | activité (perso, PME, caisse, commandes) mise à jour en tête ; console comptable (auto 92 %, à décider) |
| **Moteur de factures** | factures, reçus, statuts, relances ; les paiements SwimPay se facturent SEULS — la saisie manuelle sert aux ventes en espèces (compta complète) | facturation PME (créer → aperçu → envoyer → statuts → lire/imprimer/partager) ; reçus signés partout |

## 1. La chaîne canonique d'un mouvement d'argent

> origine (compte débité) → destinataire résolu (Annuaire) → moyen choisi
> (Routeur : délai · frais) → montant → récap → confirmation → clôture
> (reçu portant TOUTE la chaîne) → grand livre + activité.

Un flux qui saute une étape est un défaut. Vérifié par sonde sur : envoyer
perso, payer marchand, swap, vers-banque, envoyer PME, dépôt PME, salaires,
retrait commerçant, encaisser QR, scan client, lien e-commerce, checkout.

## 2. Le réseau par profil — nœuds · arêtes · états · panneau

### Personnel (14 nœuds)
- **Nœuds** : accueil · **recharger** (mobile money / banque → crédit du
  compte SwimPay) · envoyer · clôture · activité · ma carte · recevoir ·
  demander · scanner · payer · **transférer** (le widget : depuis le compte
  SwimPay vers TOUS les réseaux, vers un compte SwimPay, vers une banque) ·
  **vers MA banque** (mes banques listées, AJOUT d'une banque — une banque
  ajoutée devient aussi une source de recharge) · reçus · profil
  (+ notifs, appareils, sheet détail).
- **États vivants** : solde (crédité par la recharge, débité par les
  envois), activité, tuiles, plafonds.
- **Panneau** : `profil` — identité, sécurité (PIN → écran PIN, biométrie,
  appareils), plafonds, préférences, **Mes profils** (pont Annuaire vers
  les mondes business), changer de profil, revoir l'onboarding, déconnexion.

### Commerçant (9 nœuds)
- **Nœuds** : hub (caisse vivante) · encaisser · QR/reçu · scan client ·
  client vérifié · ventes (remboursement) · code du comptoir · retirer
  (vers la banque OU vers un mobile money du gérant) ·
  fin de journée · **paramètres boutique**.
- **États** : caisse du jour, nb paiements, ventes[], remboursements.
- **Panneau `bc-params`** : identité boutique (nom, gérant = personne
  vérifiée), compte de retrait, **personnel autorisé à encaisser**
  (liste + ajout — permissions), préférences (son d'encaissement,
  reçu imprimé, clôture auto).

### PME (11 nœuds)
- **Nœuds** : hub (trésorerie vivante) · salaires (équipes, édition, moyen
  de réception par employé) · envoyer (motif) · facturer · aperçu (création
  ET lecture) · factures (statuts, relance, **lire / imprimer / télécharger /
  partager**) · équipe · import CSV · dépôt · **paramètres entreprise**.
- **États** : trésorerie, employés[], factures[], activité.
- **Panneau `pme-params`** : identité (nom d'entreprise ÉDITABLE — se
  propage partout, n° d'enregistrement, compte lié), **rôles & accès**
  (gérant, comptable connecté/révocable, double validation au-delà d'un
  seuil), facturation (préfixe, échéance par défaut).

### Comptable (5 nœuds)
- **Nœuds** : console · client (rapprochements, demander la pièce) ·
  exports · inviter · **paramètres cabinet**.
- **États** : rapprochements[], compteurs à-valider.
- **Panneau `cpt-params`** : cabinet (nom), **membres du cabinet**
  (liste + ajout), clients connectés (révoquer), exports par défaut.

### E-commerce (6 nœuds)
- **Nœuds** : hub (boutique vivante) · lien de paiement · commandes
  (remboursement) · **retirer** (l'encaissé part librement : banque OU
  mobile money du gérant) · intégration (clés, SDK, webhook) · checkout ·
  **paramètres boutique en ligne**.
- **États** : encaissé du jour, commandes[].
- **Panneau `ec-params`** : boutique (nom, domaine autorisé), règlement
  (compte de reversement, fréquence), notifications de paiement.

## 2 bis. Les rails nommés (décision commanditaire, 2026-08-28)

Les réseaux portent leurs **vrais noms du paysage ivoirien** partout où un
rail apparaît : **Orange Money · MTN MoMo · Moov Money · Wave** (+ Banque,
+ compte SwimPay). Pastilles aux couleurs des marques, sans logos.
Le cycle de l'argent du client : recharge (rail → SwimPay) → circulation
(SwimPay → tout rail, via le widget Transférer) → réception (tout rail →
SwimPay).

## 2 ter. Les comptes liés (bindings, décision commanditaire)

Chaque profil porte ses **Comptes liés** — mobile money et banques —
gérés dans son panneau (liste + « Lier un compte »). Un compte lié
ALIMENTE aussitôt les flux du profil : recharge (perso), retraits
(commerçant, e-commerce), dépôts (PME). Un seul registre `liaisons`
par profil ; les écrans de flux se rendent depuis ce registre.

## 2 quater. Qui reçoit — l'Annuaire décide de ce que le Routeur propose

Deux écrans, une même règle : **on ne route que vers un compte qu'on a
désigné**, et c'est l'Annuaire qui dit ce qu'on sait de lui.

**Perso — `destinataire`** (depuis Envoyer › Changer)
- *Mes contacts* : recherche par nom OU par numéro ; chaque contact affiche
  combien de comptes lui sont rattachés (la thèse : 1 personne → N comptes).
- Choisir un contact **repeuple la liste « reçoit sur »** avec SES comptes —
  le Routeur n'invente rien, il propose ce que l'Annuaire connaît.
- *Pas dans la liste* : un numéro se saisit. S'il est déjà à l'Annuaire, il
  est reconnu (« déjà dans l'Annuaire »). Sinon : **hors Annuaire** — pas
  d'identité garantie, et c'est l'utilisateur qui désigne le rail parmi les
  quatre mobile money. Le numéro entre alors au carnet.
- Le reçu et le grand livre portent le destinataire réel, pas un nom figé.

**Business — `destination`** (depuis Retirer bc/ec et Envoyer PME)
- Trois origines : *mes comptes liés* (registre `liaisons`), *bénéficiaires
  enregistrés* (registre `beneficiaires`, propre au profil), *autre compte*
  (type de rail, titulaire, numéro — l'Annuaire confirme le nom s'il connaît).
- Un compte neuf peut être **enregistré comme bénéficiaire** au passage.
- Retour dans le flux appelant : commerçant et e-commerce reçoivent une
  rangée « hors comptes liés » **déjà sélectionnée** ; la PME voit son
  destinataire, son numéro et son rail remplis. Frais et délai suivent le
  type de rail (`fraisType` : SwimPay gratuit, banque 200, mobile money 1 %).

## 3. Le pont entre profils (l'Annuaire au sens fort)

- Chaque panneau business nomme son **gérant** : la même personne physique
  vérifiée que le profil Personnel.
- Le Profil personnel liste **Mes profils** : les entités business de la
  personne, en un geste.
- `profils` reste le carrefour ; chaque hub y retourne.

## 4. Ce que la sonde vérifie (complétude mécanique)

1. Structure : chaque écran atteignable, aucune cible cassée, aucun débord
   (390 et 1280).
2. Chaînes : les 12 flux d'argent portent Annuaire + Routeur + reçu complet.
3. Panneaux : chaque profil a son panneau atteignable depuis son hub ; le
   nom d'entreprise édité se propage (hub, badge, papier de facture) ;
   l'ajout d'un membre (boutique, cabinet) s'affiche ; une facture ouverte
   depuis la liste porte son numéro et ses actions.
4. Régressions : parcours 1, 2, 3 entiers.

## 4 bis. Conformité incarnée (boucles 9-12)

KYC à l'onboarding (étape 4/5, pièce lue → « identité vérifiée » gagnée) ;
plafonds BCEAO APPLIQUÉS (solde 2M à la recharge, 10M mensuel aux débits,
jauges vivantes, refus expliqué avec la marge) ; PIN exigé au-delà de
100 000 ; double validation PME réelle au-delà du seuil configuré — la 2e
signature est une APPROBATION depuis le compte externe du cosignataire,
par PIN ou biométrie (écran « vue du cosignataire ») ;
demande de paiement entrante (payer / refuser sans débit) ; réception
simulable ; frais différenciés par rail (externes 1 %, SwimPay gratuit,
banque 200) jusque dans le reçu ; résolution du numéro en identité
vérifiée sur le widget ; la vente espèces atteint la console comptable.

## 4 ter. Le cerveau confronté aux écrans (audit, mesuré)

**Couverture des nœuds : complète.** Les 41 nœuds décrits en §2 existent
tous à l'écran. Le cerveau n'a pas de trou de STRUCTURE.

**Le trou est ailleurs, et il se mesure.** Densité d'information relevée
à 1440 px (cartes · rangées · actions · chiffres · graphes) :

| écran | cartes | rangées | actions | chiffres | graphes | hauteur |
|---|---|---|---|---|---|---|
| accueil perso | 2 | 7 | 26 | 1 | 0 | 880 |
| activité perso | 3 | 10 | 15 | 3 | 3 | 831 |
| **b-commercant** | **1** | **3** | 10 | 4 | **0** | **489** |
| **b-pme** | **1** | **3** | 9 | 4 | **0** | **508** |
| **b-ecommerce** | **1** | **3** | 8 | 3 | **0** | **437** |
| b-comptable | 3 | 8 | 11 | 2 | 0 | 589 |

Un hub business porte **la moitié** de l'accueil personnel et **aucune
visualisation**. Le cerveau décrit ce que chaque monde SAIT ; les écrans
n'en montrent presque rien.

**Ce que le cerveau ne dit pas du tout** : les plans payants. Absents du
document comme de l'app.

## 4 quater. Ce que chaque module PERMET et qu'on n'a pas encore fait

Raisonnement : un module qui sait X doit pouvoir proposer tout ce qui
découle de X. Deux questions à chaque fois — **qu'est-ce qui prend trop
de gestes aujourd'hui**, et **qu'est-ce que l'app pourrait décider à la
place de l'utilisateur**.

### Annuaire d'identité — il sait qui, et sur quels comptes
| ce qu'il permet | aujourd'hui | ce qu'on en fait |
|---|---|---|
| une opération déjà faite se refait | 5 gestes (Envoyer → Changer → chercher → choisir → montant) | **Refaire** depuis toute rangée du grand livre : 1 geste, destinataire ET rail repris |
| un client de comptoir est une identité | le scan résout, puis oublie | **widget Clients fidèles** : qui revient, combien de fois |
| un fournisseur revient | bénéficiaire enregistré, sans mémoire | **paiement récurrent** proposé au 3e paiement identique |
| un employé a un compte vérifié ou non | la liste ne le dit pas | **drapeau** sur l'employé non vérifié : son virement sera plus lent |
| une personne a N comptes | on choisit à chaque fois | **compte préféré** mémorisé par destinataire |

### Routeur — il sait les rails, les délais et les frais
| ce qu'il permet | aujourd'hui | ce qu'on en fait |
|---|---|---|
| comparer les rails | il les liste à plat | **conseil** : le moins cher et le plus rapide sont marqués |
| cumuler les frais | invisible | **widget Frais du mois** + ce qu'un autre rail aurait coûté |
| connaître les heures bancaires | « sous 3 heures », vague | **heure d'arrivée réelle** annoncée |
| connaître les plafonds par rail | seulement les plafonds BCEAO globaux | **découpe proposée** quand le montant dépasse le rail |
| le plan change le tarif | pas de plan | **les frais annoncés dépendent du plan** — le lien entre offre et produit |

### Rapprocheur — il sait que chaque mouvement est une écriture
| ce qu'il permet | aujourd'hui | ce qu'on en fait |
|---|---|---|
| comparer espèces et électronique | la clôture ne compte que le SwimPay | **écart de caisse** : on saisit les espèces, l'écart s'affiche |
| lire un rythme | rien | **courbe du jour** (commerçant, e-commerce) |
| projeter | rien | **couverture des salaires** : la trésorerie tient-elle jusqu'au 30 |
| apparier commande et encaissement | rien côté e-commerce | **rapprochement des commandes** : payées sans encaissement |
| mesurer sa propre charge | 92 % annoncé sans détail | **ce qui reste, et pourquoi** |

### Moteur de factures — il sait qui doit quoi, et depuis quand
| ce qu'il permet | aujourd'hui | ce qu'on en fait |
|---|---|---|
| relancer | un bouton « Relancer » sans flow | **relance pré-écrite**, envoyée en un geste |
| voir venir | statuts à plat | **encours client** + **échéances à 30 jours** |
| répéter | rien | **facture récurrente** |
| encaisser en deux fois | rien | **paiement partiel** (dit, non construit) |

## 5. Trous connus et assumés (dits, pas cachés)

Aide/support, recherche globale, multi-boutiques par gérant, détail des
2 autres clients comptables, permissions fines, export réel de fichiers
(sandbox artifact), notifications par monde business (le mécanisme est
démontré côté Personnel), états vides (choix : la démo se joue sur un
compte vécu ; un « mode compte neuf » serait un chantier à part).
À prioriser sur demande.
