# DGI — API FNE : référence technique vérifiée

> **Verdict : l'API officielle existe.** Source primaire : « Procédure
> d'interfaçage des entreprises par API » (DGI, mai 2025, 26 p.), téléchargée
> depuis le portail officiel `fne.dgi.gouv.ci/documents/FNE-procedureapi.pdf`
> et **copiée dans** `assets/FNE-procedureapi-mai-2025.pdf`. Tout ce qui suit en
> est extrait — [V] primaire.

## 1. L'essentiel

- **REST + JSON**, méthode **POST** uniquement. Auth : **Bearer token** — la
  clé API apparaît dans l'espace FNE de l'entreprise (onglet « Paramétrage »),
  visible **uniquement par le gestionnaire principal, après validation DGI**.
- **Environnement de test public** : `http://54.247.95.108/ws` (IP brute, HTTP
  sans TLS — c'est l'officiel tel quel). Inscription test :
  `http://54.247.95.108`. **URL de production : transmise par la DGI après
  validation** de l'intégration.
- La loi de finances 2025 prévoit explicitement, **sur option**, que les
  entreprises disposant de leur propre système de facturation le fassent
  certifier **par API** — notre cas d'usage est prévu par le texte.
- Le portail liste aussi un programme **« Intégrateurs et éditeurs »**
  (partenaires agréés) — la voie pour valider SwimPay UNE fois comme éditeur
  plutôt que marchand par marchand. À clarifier avec le support
  (`support.fne@dgi.gouv.ci`, `infos.fne@dgi.gouv.ci`, tél. 25 21 01 86 60).

## 2. Le chemin d'accès (officiel, 8 étapes)

1. Inscription de l'entreprise sur la plateforme FNE **de test** ;
2. Configuration/paramétrage de l'environnement de test ;
3. Développement de l'interfaçage ;
4. Tests de génération (vente, **avoir**, **bordereau**) ;
5. Envoi de **spécimens de factures** à `support.fne@dgi.gouv.ci` ;
6. Analyse de conformité par la DGI ;
7. La DGI transmet l'**URL de production** ;
8. La **clé API** apparaît dans l'espace de l'entreprise.

Pré-requis déclarés du logiciel : HTTP/REST, JSON, auth OAuth 2.0 ou
certificat (en pratique : clé API en Bearer), connexion stable.

## 3. Les trois opérations

| Opération | Endpoint | Corps |
|---|---|---|
| **Certifier une facture de vente** | `POST $url/external/invoices/sign` | `invoiceType:"sale"` + schéma §4 |
| **Certifier une facture d'avoir** | `POST $url/external/invoices/{id}/refund` | `items:[{id, quantity}]` — `id` = id d'article de la facture d'origine |
| **Certifier un bordereau d'achat** (produits agricoles) | `POST $url/external/invoices/sign` | `invoiceType:"purchase"` |

## 4. Schéma de la requête « vente » (champs clés)

- `invoiceType` : `sale` \| `purchase` — **O**
- `paymentMethod` : `cash` \| `card` \| `check` \| `mobile-money` \| `transfer`
  \| `deferred` — **O** *(→ nos ventes cash/virement passent nativement)*
- `template` : `B2B` (client à NCC) \| `B2C` (particulier) \| `B2G`
  (institution) \| `B2F` (international) — **O**
- `isRne` (bool) + `rne` (n° du reçu si lié) — **O**
- Client : `clientNcc` (**obligatoire si B2B**), `clientCompanyName`,
  `clientPhone`, `clientEmail`, `clientSellerName`
- `pointOfSale`, `establishment` — **O** ; `commercialMessage`, `footer` — N
- `foreignCurrency` (XOF/USD/EUR/JPY/CAD/GBP/AUD/CNH/CHF/HKD/NZD) +
  `foreignCurrencyRate` — obligatoires en **B2F**
- `items[]` : `taxes` (`TVA` 18 % \| `TVAB` 9 % \| `TVAC` 0 % exo. conv \|
  `TVAD` 0 % exo. lég.) — **O** ; `customTaxes[]` (`name`,`amount` — ex. GRA,
  AIRSI, DTD) ; `reference`, `description`, `quantity`, `amount` (PU **HT**),
  `discount` (%), `measurementUnit`
- `discount` global (%)

## 5. La réponse (200)

```json
{
  "ncc": "9606123E",
  "reference": "9606123E25000000019",
  "token": "http://…/fr/verification/019465c1-…",
  "warning": false,
  "balance_sticker": 179,
  "invoice": { …facture complète, "source": "api"… }
}
```

- `reference` = **le numéro officiel de la facture** (série annuelle
  ininterrompue, préfixée NCC ; avoir préfixé `A`).
- `token` = **l'URL de vérification à convertir en QR code** (le « sticker »
  visuel sur la facture imprimée/PDF).
- `balance_sticker` + `warning` = **le stock de stickers électroniques du
  marchand** — chaque certification en consomme un.
- Erreurs : 400 (requête invalide, ex. « Point of sale is not valid »), 401
  (« Invalid API Key »), 500.

## 6. Découvertes opérationnelles (à intégrer au produit)

1. **L'économie du sticker** : chaque facture consomme un sticker et la
   réponse donne le solde restant → **fonctionnalité gratuite et différenciante** :
   suivi du stock de stickers + alerte avant rupture (le marchand découvre
   sinon la panne au moment de facturer).
2. **La clé API est PAR entreprise (par NCC)** : notre `DgiAdapter` stocke une
   clé par marchand (chiffrée). La **validation DGI fait partie de
   l'onboarding marchand** — sauf si le statut « éditeur/intégrateur » permet
   une validation unique de SwimPay (à clarifier, cf. §1).
3. **Pas d'endpoint de statut/lecture documenté, pas d'idempotence** : un
   timeout après `POST /sign` peut avoir consommé un sticker sans qu'on ait la
   référence. Règles de l'adapter : **jamais de retry aveugle**, single-flight
   par facture, persistance de la requête et de la réponse brute
   (`external_event`), file d'exception + vérification manuelle dans l'espace
   FNE en cas de doute.
4. **Env de test en HTTP sur IP brute** : ne jamais y envoyer de vraies
   données clients ; jeux de données fictifs uniquement.
5. `paymentMethod` couvre cash/virement/mobile-money → notre « bouton facture
   pour toute vente » correspond exactement au modèle DGI.

## 7. Impact sur la spec V1 (`07_SPEC_CERVEAU_V1.md`)

- Module 2 : **`DgiAdapter` API officielle** (le plan RPA est abandonné ; il ne
  reste qu'un mode dégradé manuel en cas d'indisponibilité).
- Dès S1 : inscription d'une entreprise de test sur l'env. de test + email au
  support pour clarifier le statut **éditeur/intégrateur** (une validation pour
  tous nos marchands vs une par marchand — ça change l'onboarding).
- Nouveau champ produit : stock de stickers par marchand (affichage + alerte).
