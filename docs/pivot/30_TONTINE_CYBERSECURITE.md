# SwimPay Tontine — la cybersécurité technique

> Étape 4 sur 4 du plan de LO (29/09/2026). L'étape 3 (`29`) protège contre les
> escrocs qui trompent des **personnes**. Celle-ci protège contre ceux qui attaquent
> **la machine** : l'application, le serveur, les données, les liaisons avec les
> partenaires.
>
> Tout vaut pour SwimPay en entier, pas seulement pour la tontine. `[H]` = à vérifier
> avant de construire. Rien n'est codé.

---

## Le principe

**Même si un attaquant réussit à entrer quelque part, il ne doit pas pouvoir faire
sortir l'argent.** Chaque couche suppose que la couche d'avant peut tomber. Et une
opération d'argent n'est acceptée que si elle est **signée par l'appareil du
membre** et **conforme aux règles de la tontine** : voler un mot de passe, ou même
entrer dans le serveur, ne suffit pas.

---

## Les huit couches

| # | Couche | L'attaque | La défense |
|---|---|---|---|
| 1 | **L'application sur le téléphone** | Une fausse copie de l'application ; un virus qui lit l'écran ou se superpose au clavier pour voler le code ; un téléphone piraté | L'application vérifie qu'elle est **l'originale** et que le téléphone n'est pas trafiqué (service d'intégrité de Google) `[H]`. Les écrans de code et de montant **ne peuvent pas être capturés ni filmés**. Si une application espionne l'écran, les retraits sont refusés |
| 2 | **La clé de l'appareil** | Voler le mot de passe et se connecter d'ailleurs | À l'inscription, le téléphone crée **une clé secrète qui ne quitte jamais sa puce de sécurité**. Chaque retrait et chaque cotisation est **signé** par cette clé. Sans le téléphone, rien ne passe. Nouveau téléphone : 72 heures d'attente (`29`) |
| 3 | **La liaison téléphone ↔ serveur** | Intercepter ou rejouer une demande (« verse la prise » envoyé deux fois) | Liaison chiffrée, et l'application **ne parle qu'au vrai serveur de SwimPay** (certificat épinglé). Chaque demande d'argent porte **un numéro unique et une heure** : une demande rejouée est refusée. Un versement ne part **qu'une seule fois**, même demandé deux fois (`27`, exécution unique) |
| 4 | **Le serveur** | Envoyer des milliers de demandes ; injecter des données piégées ; exploiter une faille | Protection contre l'inondation en amont (Cloudflare, déjà en place pour le site). Nombre de demandes limité par compte et par appareil. Toute donnée reçue est vérifiée avant d'être lue. **Le serveur n'a pas le droit de déplacer de l'argent hors des règles** : le moteur de la tontine refuse tout ce qui viole un invariant (`27` §2) |
| 5 | **Les données** | Voler la base : pièces d'identité, numéros, soldes | Tout est **chiffré**. Les photos de pièces d'identité sont **à part**, chiffrées avec leur propre clé. Les numéros de téléphone sont masqués et transformés pour la comparaison, jamais stockés en clair quand ce n'est pas nécessaire. On ne garde que le nécessaire, le temps nécessaire |
| 6 | **Le registre de l'argent** | Modifier une ligne pour se créditer, ou effacer une trace | Le registre est **en ajout seul** : on n'efface ni ne modifie jamais une ligne, on corrige par une nouvelle. Chaque ligne est **chaînée** à la précédente : toucher à une ligne casse la chaîne et se voit. Chaque jour, le total doit égaler le solde réel chez le partenaire EME (`28` §5, ligne 21) |
| 7 | **Les partenaires** (EME, opérateurs Mobile Money, banques) | Un faux message « paiement reçu » envoyé à SwimPay ; une clé d'accès volée | Chaque message d'un partenaire est **vérifié par sa signature**, puis **confirmé en redemandant au partenaire**. Un « paiement reçu » ne compte qu'après cette confirmation. Les clés d'accès sont dans un coffre, jamais dans le code |
| 8 | **Les accès de l'équipe** | Un compte d'employé piraté ; un employé malveillant | Aucun employé ne peut écrire dans la base de production ni toucher l'argent (`29`, surface 8). Connexion de l'équipe par **clé physique**. Une modification du code passe par une relecture et les tests avant d'être en ligne. Tout accès est enregistré |

---

## Quand une attaque réussit quand même

| Ce qui arrive | Ce que fait le système, tout seul |
|---|---|
| Un invariant est violé (l'argent ne tombe plus juste) | Les versements de la tontine concernée s'arrêtent, la tontine passe en **Suspendu**, personne n'est compté en retard (`27`, I10). La réserve d'incidents comble l'écart prouvé |
| Des retraits anormaux en série (beaucoup de comptes, peu de temps) | Les retraits de tontine sont **ralentis pour tous** automatiquement, le temps que le flux redevienne normal |
| Une clé de partenaire est compromise | Elle est révoquée et remplacée ; les messages signés avec l'ancienne sont refusés |
| La base est volée | Elle est chiffrée ; les pièces d'identité ont leur propre clé ; les personnes concernées et l'autorité sont prévenues selon la loi |

---

## Avant le lancement

- [ ] **Un test d'intrusion** par une société extérieure, sur l'application et le
      serveur.
- [ ] **La déclaration à l'ARTCI**, l'autorité ivoirienne des données personnelles
      (loi n° 2013-450) `[H]`.
- [ ] **Les exigences de sécurité du partenaire EME** et de la BCEAO pour la monnaie
      électronique, à obtenir et à suivre `[H]`.
- [ ] Un **exercice de restauration** : prouver qu'on sait tout remettre en route à
      partir des sauvegardes.

Plus tard : une prime pour ceux qui signalent une faille (bug bounty).
