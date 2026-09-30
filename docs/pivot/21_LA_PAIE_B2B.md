# La paie B2B — comment on paie aujourd'hui, et ce que SwimPay fait mieux

> Écrit le 28 septembre 2026, à la demande de LO, pendant la conception des
> écrans de l'app. Il fixe trois choses : les décisions produit prises ce jour,
> ce que la recherche a établi sur le terrain, et ce qui reste à obtenir avant de
> coder l'import.
>
> **Fiabilité** : `[V]` vérifié en source primaire, `[T]` source tierce,
> `[H]` hypothèse de notre part. Sources en fin de document.

---

## 1. Les décisions de LO, 28 septembre 2026

| Décision | Conséquence |
|---|---|
| **La solution est mobile.** | La paie se prépare et se valide dans l'app, pas dans une console web. Le fichier arrive sur le téléphone par le geste habituel : partager depuis WhatsApp ou l'email. |
| **Chaque bénéficiaire est payé sur SON compte SwimPay**, en 1 clic. | Il retire ensuite vers le Mobile Money ou la banque de son choix. Côté Cerveau : paiement interne = chemin ÉCRITURE, coût 0 (`router/chemin.ts`) ; retrait vers son propre numéro = 0 F (`retrait_vers_reseau`, `pricing/grille.ts`). La paie est facturée 0,5 % à l'employeur (`paie_salaires`). |
| **L'argent réservé ne dépasse pas 24 h chez SwimPay.** | Le salaire d'un bénéficiaire pas encore inscrit est réservé au plus 24 h, puis rendu au compte de l'entreprise. |
| **Les entreprises d'ici utilisent Odoo**, et le comptable travaille par fichier : importer un CSV, le traiter, agir. | On accepte le fichier qu'il produit déjà ; on ne lui en impose pas un nouveau. Le connecteur Odoo vient en plus, pas à la place. |
| **Le scan du répertoire est circonstanciel**, sur autorisation. | Tranche contre `07_SPEC_CERVEAU_V1.md` §Annuaire (« pas de scan en V1 »). Mise en œuvre par empreintes, consentement stocké, déclaration ARTCI. |

---

## 2. Le circuit de paie actuel

### 2.1 Le calcul se fait dans un logiciel `[T]`

- **Sage 100 Paie** reste le classique des entreprises moyennes et grandes. Par défaut il n'est pas paramétré pour la Côte d'Ivoire, et il coûte cher.
- Logiciels locaux : **CloudPaie, Korhi, PayFlow, IvoirePAIE (Softafrica), Akwaba Paie, AfricaPaieRH, WakriPaie**. Tous annoncent le calcul ITS, CNPS et CMU.
- **Odoo** (selon LO, sur les PME démarchées) et **Excel** pour les plus petites.

Ce que le logiciel produit chaque mois : les bulletins, les déclarations sociales et fiscales, et **le fichier de virement**.

### 2.2 Vers la banque : un fichier texte, parfois encore sur clé USB `[T]`

- Des outils dédiés (**IvoireVirement**, **EdiVirement**) transforment la paie en fichier de virement « au **format texte standard BCEAO** (SGBI, BICICI, SIB…) », ou au format propre de BOA et BNI, en TXT ou XLS.
- IvoireVirement le livre encore « **sur clé USB ou CD** ».
- EdiVirement vend précisément la **vérification du format selon les normes de chaque banque** : c'est le signe que chaque banque a ses variantes, et que les rejets pour format sont courants.
- Les virements entre banques passent par **SICA-UEMOA** (plafond 50 M par opération).

### 2.3 Vers le Mobile Money : une plateforme par opérateur `[V]`

Le contrat « paiement de salaire » d'Orange Money décrit le circuit :

1. L'entreprise **met la masse salariale plus la commission à disposition d'Orange, par chèque ou par virement** sur le compte bancaire d'Orange. Orange dépose ensuite l'équivalent en monnaie électronique sur le compte Orange Money de l'entreprise. Orange Business annonce **24 h** de délai.
2. Sur une **interface web**, l'entreprise renseigne les seules « informations obligatoires » : **numéros de téléphone et montants**. Puis elle valide.
3. Les comptes Orange Money des bénéficiaires sont crédités. **Orange n'est pas responsable** si « les informations obligatoires comportent des erreurs ».
4. Orange ouvre des comptes à « ses » bénéficiaires ; l'entreprise s'engage à **sensibiliser ses salariés à s'abonner chez Orange**.
5. Le retrait se fait en point de vente, sur pièce d'identité, et **les frais de retrait sont à la charge du salarié**, sauf si l'employeur les prend (et seul le premier retrait non fractionné est alors gratuit).

Orange Business annonce jusqu'à **5 000 paiements en un clic** et plusieurs niveaux de validation.

### 2.4 Le problème que personne ne résout `[H]`

Une PME n'a pas « tous ses salariés chez Orange » ou « tous en banque ». Elle a un **mélange** : banque, Orange, MTN, Moov, Wave, et encore des espèces. Le comptable découpe donc son fichier en autant de morceaux que de canaux, et chaque morceau a :

- son alimentation préalable (chèque, virement, attente) ;
- sa plateforme et ses identifiants ;
- sa validation ;
- son rapprochement comptable.

Et **personne ne vérifie qu'un numéro appartient à la bonne personne** : l'erreur reste à la charge de l'entreprise.

---

## 3. Ce que SwimPay fait mieux

| Aujourd'hui | Avec SwimPay |
|---|---|
| Un fichier découpé par canal | **Un seul fichier.** Chacun est payé sur son compte SwimPay et retire où il veut |
| Chèque ou virement préalable, puis 24 h d'attente | Le compte SwimPay est déjà rechargé, depuis la banque ou le Mobile Money |
| Les erreurs de numéro sont pour l'entreprise | **L'annuaire contrôle chaque ligne avant le paiement** : format, préfixe, nom, doublon, écart avec le mois dernier |
| Le salarié paie ses retraits | **Retrait gratuit** vers son propre compte |
| Rapprochement par plateforme | **Un relevé des versements**, renvoyé au comptable dans le format de son logiciel |
| Un lien ou une liste commune | **Une invitation personnelle** par salarié, liée à son matricule, numéro prouvé par SMS |

---

## 4. Le parcours mobile retenu

Constat qui fonde le parcours : **ici, les fichiers voyagent par WhatsApp et par email.** Le comptable, souvent un cabinet externe, produit le fichier sur son ordinateur et l'envoie au dirigeant.

1. **Recevoir le fichier** : « Partager → SwimPay » depuis WhatsApp, Gmail ou le gestionnaire de fichiers, ou ouvrir un fichier du téléphone, ou lire les bulletins validés d'Odoo connecté. Colonnes reconnues d'elles-mêmes, réglage gardé d'un mois à l'autre.
2. **Le contrôle** : une carte « N lignes lues · X prêtes · Y à regarder » ; on ne parcourt que les exceptions, corrigibles au doigt. Les lignes non corrigées sont mises de côté, pas payées.
3. **Les bénéficiaires** : invitations personnelles, boîte des prêts en temps réel, relance des retardataires.
4. **La validation** : celui qui prépare n'est pas celui qui valide. Le dirigeant reçoit une notification et valide avec son code.
5. **Le paiement** en un geste ; le salaire des non-inscrits est réservé 24 h au plus ; le relevé repart au comptable par WhatsApp ou email.
6. **Côté salarié** : « Salaire reçu », puis Retirer vers son Mobile Money ou sa banque, sans frais.

Prototype : `design/pivot/app-paie.html`.

---

## 5. Ce qu'il faut obtenir avant de coder l'import

Rien de ceci n'est trouvable en source publique. LO s'en charge auprès des PME démarchées :

- [ ] un **export Sage 100 Paie** du journal de paie ou des virements ;
- [ ] un **fichier de virement bancaire** au format texte BCEAO (et si possible une variante BOA ou BNI) ;
- [ ] un **export Odoo** de la paie (bulletins validés, net à payer, téléphone) ;
- [ ] le **modèle de fichier** de la plateforme de paie Orange Money, s'il en existe un ;
- [ ] un fichier Excel « maison » d'une petite structure.

Anonymisés : noms et numéros remplacés, structure et en-têtes intacts. C'est la structure qui compte.

À vérifier aussi : les champs exacts de l'API Odoo pour le net à payer et le téléphone du salarié, selon la version d'Odoo et le module de paie installé.

---

## Sources

- Orange Côte d'Ivoire, *Conditions spécifiques du service paiement de salaire d'Orange Money* — https://business.orange.ci/business/resources/other/annexes_paiement_salaire.pdf `[V]`
- Orange Business CI, *Paiement de salaires et primes* — https://business.orange.ci/fr/orange-money/paiement-de-salaires-et-primes.html `[V]`
- Softafrica, *Logiciels* (IvoireVirement, IvoirePAIE) — https://softafrica-ci.com/logiciels/ `[T]`
- Osiris Côte d'Ivoire, *EdiVirement* — https://www.groupeosiris-ci.com/edivirement/ `[T]`
- Les Éditions Cauris, *EdiVirement* — https://www.leseditionscauris.com/edivirement/ `[T]`
- AfricaPaieRH, *Comparatif des logiciels de paie en Côte d'Ivoire* — https://africapaierh.com/preparation-paie/comparatif-des-meilleurs-logiciels-de-paie-en-cote-divoire-quel-est-le-plus-adapte-a-votre-entreprise/ `[T]`
- Go Africa Online, *Quel logiciel de paie PME utiliser en Côte d'Ivoire* — https://www.goafricaonline.com/ci/articles/246-systeme-gestion-paies-cote-ivoire `[T]`
- BCEAO, *SICA-UEMOA* — https://www.bceao.int/fr/content/sica-uemoa `[V]`
- CloudPaie — https://www.cloudpaie.com/ ; Korhi — https://korhi.com/ `[T]`, relevés le 28 septembre 2026.
