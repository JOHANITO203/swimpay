# Les zones où SwimPay peut apporter une solution

> Écrit le 28 septembre 2026, après une critique de LO : la première liste
> d'idées partait de ce qu'on avait déjà construit (FNE, paie, annuaire) et
> cherchait où le réutiliser. Celle-ci part dans l'autre sens : **là où l'argent
> fait mal aux gens en Côte d'Ivoire**, puis ce que SwimPay y apporte.
>
> Elle complète `04_PROBLEM_MAP.md` (la carte notée du 27 août), sans la
> remplacer.
>
> **Fiabilité** : `[V]` source primaire, `[T]` source tierce, `[H]` hypothèse
> à vérifier sur le terrain. Sources en fin de document.

---

## 1. Décision de LO associée

**SwimPay sert aussi un SDK aux commerces en ligne**, pour élargir sa zone
d'action. La brique existe déjà dans le repo (checkout, API marchand, webhooks,
`packages/swimpay-node`), héritée de l'ancien produit.

---

## 2. Les zones, par acteur

| Zone | Le problème concret | Ce que SwimPay y apporte |
|---|---|---|
| **Commerce en ligne et sur les réseaux sociaux** | Une grande part des commandes se paie à la livraison ; cela produit beaucoup d'annulations et oblige le livreur à transporter l'argent du vendeur `[T]` | Le **SDK** pour les sites, un **lien de paiement** pour les ventes par WhatsApp ou TikTok, et un **paiement bloqué jusqu'à la livraison** : l'acheteur paie à la commande, le vendeur est payé à la remise du colis, confirmée par le scan d'un QR |
| **Filière cacao et café** | Depuis le **1er septembre 2026**, tout paiement aux planteurs passe obligatoirement par la **carte du producteur** (puce bancaire, QR code). Plus de **1,11 million de producteurs** recensés fin 2025 `[T]` | Pour les coopératives : payer les planteurs, émettre le **bordereau d'achat de produits agricoles** (déjà prévu dans l'API FNE de la DGI, `08_DGI_FNE_API.md`) et rapprocher les deux. Pour les planteurs : utiliser l'argent reçu, l'envoyer à la famille. **À vérifier** : qui opère le paiement par carte, et si le dispositif est ouvert à un acteur comme SwimPay |
| **Cotisations collectives** : tontines, associations de ressortissants, mutuelles, funérailles, mariages | L'argent de plusieurs personnes est tenu par une seule, sans preuve ; disputes, et parfois un trésorier qui disparaît `[H]` | Une **cagnotte transparente** : chacun voit qui a payé quoi, les règles sont inscrites (tour de rôle, montant), les sorties sont validées à plusieurs |
| **Recettes des transporteurs** : gbaka, wôrô-wôrô, taxis | Chaque soir, le chauffeur remet la recette au propriétaire en espèces : écarts et soupçons `[H]` | Les passagers paient au QR du véhicule ; le propriétaire reçoit automatiquement sa part chaque soir, le chauffeur garde la sienne |
| **Loyers** | Paiement en espèces, peu de quittances, cautions litigieuses `[H]` | Le loyer du mois par lien de paiement, la quittance émise, les rappels, la caution conservée à part |
| **Frais de scolarité** | Paiement par tranches, files d'attente à la caisse de l'école, rapprochement manuel `[H]` | Un paiement par numéro d'élève, depuis n'importe quel réseau, avec reçu ; la vue « qui a payé » côté école |
| **Argent de la diaspora avec un but** | L'argent envoyé « pour l'école » ou « pour les médicaments » n'arrive pas toujours à destination `[H]` | Payer directement l'école, la pharmacie ou le propriétaire, depuis l'étranger ou un autre pays de l'UEMOA (PI-SPI) |
| **Crédit fournisseur chez les grossistes** | La marchandise est donnée à crédit et notée dans un cahier ; le recouvrement se fait de mémoire `[H]` | Un cahier de dettes numérique : échéance, rappel automatique, paiement en un lien. Et la donnée qui permettra de prêter |
| **Trésorerie des agents Mobile Money** | L'agent tombe à court d'argent électronique ou d'espèces au mauvais moment `[H]` | SwimPay rééquilibre déjà ses propres réserves (`treasury/reequilibre.ts`) ; le même savoir-faire, appliqué aux agents, serait un service à part entière |
| **Protection sociale des indépendants** | Les travailleurs informels cotisent peu à la CNPS, faute de moyen simple `[H]` | Des micro-cotisations automatiques sur chaque encaissement : un pourcentage mis de côté pour la CNPS ou la CMU |

Restent valables, issues de la réflexion précédente :

- **L'avance sur facture FNE** : une facture émise et certifiée est une créance
  prouvée par l'État ; on peut prêter sur cette donnée plutôt que sur un
  historique que la PME n'a pas. Suppose un partenaire microfinance (SFD).
- **Les déclarations CNPS et ITS tirées de la paie** : le fichier de paie passe
  déjà par SwimPay chaque mois (`21_LA_PAIE_B2B.md`). À vérifier sur les vrais
  exports.
- **Payer ses fournisseurs depuis les factures reçues** : la plateforme FNE
  notifie chaque facture reçue et personne ne les lit (`14_ALGORITHME_V1.md`,
  fait n°4).

---

## 3. Ce que la carte révèle : un moteur, pas une liste de produits

Trois mécanismes reviennent dans presque toutes les zones, et SwimPay a déjà la
matière des trois.

1. **Tenir** — l'argent gardé pour le compte de quelqu'un jusqu'à une condition :
   la livraison, la caution, la cotisation, le salaire réservé 24 h. C'est un
   **séquestre** ; la paie le fait déjà.
2. **Répartir** — l'argent partagé automatiquement à l'encaissement : la recette
   du chauffeur, la part du livreur, la cotisation sociale. C'est une **règle de
   répartition** ; le Cerveau sait déjà router (`router/chemin.ts`).
3. **Flécher** — l'argent qui va vers un bénéficiaire précis : la diaspora vers
   l'école, la coopérative vers le planteur. C'est l'**annuaire vérifié**,
   l'avantage concurrentiel.

> **SwimPay est un moteur « tenir, répartir, flécher », qu'on habille selon le
> secteur.** Chaque zone est un habillage de plus sur le même moteur, pas un
> nouveau produit à construire de zéro.

---

## 4. Ce qu'on approfondit d'abord (proposition, à trancher par LO)

1. **Le commerce social avec paiement bloqué jusqu'à la livraison** — il
   prolonge directement le SDK, la douleur est documentée, et il touche vendeurs
   et acheteurs à la fois.
2. **Les cotisations collectives** — très ivoiriennes, et chaque membre d'une
   cagnotte devient un client SwimPay : un moteur d'acquisition autant qu'un
   produit.
3. **La filière cacao** — le plus gros volume et un calendrier imposé par l'État,
   comme la FNE ; à condition que le dispositif de la carte du producteur soit
   ouvert.

## 5. À vérifier avant d'aller plus loin

- [ ] La part réelle du paiement à la livraison et les taux d'annulation (chiffres absents des sources trouvées).
- [ ] L'opérateur et l'ouverture du paiement par carte du producteur (Conseil Café-Cacao, banques partenaires).
- [ ] Le cadre réglementaire du **séquestre** pour un établissement adossé à un EME : durée, cantonnement des fonds (cf. la règle des 24 h de la paie).
- [ ] Les hypothèses `[H]` du tableau, auprès des 400 PME démarchées et de quelques utilisateurs par zone.

---

## Sources

- Delifast, *Tout savoir sur le paiement à la livraison en Côte d'Ivoire* — https://blog.delifast.co/le-paiement-a-la-livraison-en-cote-divoire/ `[T]`
- Systalink, *E-commerce en Côte d'Ivoire, guide 2026* — https://systalink.com/e-commerce-en-cote-divoire/ `[T]`
- IvoirRapid, *Livraison e-commerce en Côte d'Ivoire* — https://ivoirrapid.ci/blog/livraison-ecommerce-cote-divoire `[T]`
- BrivoX, *Paiement à la livraison au Bénin et en Côte d'Ivoire* — https://getbrivox.com/blog/paiement-a-la-livraison-comment-ca-marche `[T]`
- Conseil Café-Cacao, *La carte du producteur effective et opérationnelle* — https://conseilcafecacao.ci/index.php?id=1286%3Ala-carte-du-producteur-de-cafe-cacao-effective-et-operationnelle&option=com_k2&view=item `[V]`
- Ivoire Matin, *Vente normalisée et paiement via carte obligatoire dès septembre 2026* — https://www.ivoirematin.com/fr/news/Economie/cacao-en-cote-divoire-vente-normalisee-et-paiement-via-carte-obligatoire-des-septembre-2026_n_118767.html `[T]`
- NotreAfrik, *Carte du producteur cacao obligatoire en 2026* — https://notreafrik.com/cacao-carte-producteur-cote-ivoire/ `[T]`
- 7info, *La carte du producteur indispensable dès la campagne 2026-2027* — https://7info.ci/webpress/article/la-carte-du-producteur-devient-indispensable-pour-toutes-les-transactions-des-la-campagne-2026-2027 `[T]`
- Sika Finance, *La Côte d'Ivoire muscle sa traçabilité café-cacao* — https://www.sikafinance.com/marches/filiere-cafe-cacao-la-cote-divoire-muscle-sa-tracabilite-pour-conquerir-les-marches-europeens_62348 `[T]`
- Mongabay, *Les producteurs se préparent pour la carte obligatoire* — https://fr.mongabay.com/2026/06/cote-divoire-les-producteurs-se-preparent-pour-obtenir-la-carte-obligatoire-pour-commercialiser-le-cacao-et-le-cafe/ `[T]`
