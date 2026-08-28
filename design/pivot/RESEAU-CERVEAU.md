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

## 5. Trous connus et assumés (dits, pas cachés)

Écrans d'erreur (réseau coupé, paiement refusé), aide/support, recherche
globale, multi-boutiques par gérant, détail des 2 autres clients comptables,
gestion fine des permissions (au-delà de la liste), export réel de fichiers
(bloqué par la sandbox de l'artifact). À prioriser sur demande.
