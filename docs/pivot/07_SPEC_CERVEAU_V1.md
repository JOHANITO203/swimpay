# V1 — Le Cerveau : spec détaillée des 4 modules

> Spec de validation du sous-projet V1 (cf. mandat : une validation par
> sous-projet, puis exécution complète). Contexte : `05_BUILD_STRATEGY.md`,
> `06_PROJET_SWIMPAY.md`.

## 0. Cadre et décisions d'implantation

**But V1** : les 4 modules du cerveau construits, testés, et prêts à recevoir
les bras — avec, dès la semaine 4, une **démo facturation** utilisable pour
pitcher (import des listes clients du partenaire + génération de factures).

**Contraintes gelées** : pass-through strict (aucun solde client stocké ni
affiché) · montants en **entiers XOF** · idempotence sur toute opération ·
horodatage UTC (affichage heure d'Abidjan) · chaque module applique la règle
d'or : *tout enregistrer dès J1, apprendre des données, conçu pour être
accéléré/autonomisé plus tard*.

**Implantation dans le monorepo** (proposition à valider) :
- **Schéma Postgres neuf `core`** (isolé des tables du produit historique),
  migrations dans `packages/database/migrations/` en continuant la numérotation
  (037+).
- **`packages/brain`** — les 4 modules (matcher, invoicer, directory, router),
  logique pure + accès DB, zéro dépendance à un fournisseur.
- **`packages/rails`** — l'interface `RailAdapter` + adapters (`simulated`,
  `paydunya`).
- **Surfaces** : routes `/v2/*` dans `apps/api` (Fastify existant) ; app
  PME/marchand = pages server-rendered + PWA dans `apps/web`.
- **Pas de NATS en V1** (moins de pièces mobiles) : pattern **outbox** en table
  pour les notifications/jobs. Valkey uniquement en cache/rate-limit.
- Tests : vitest **contre un vrai Postgres** (conteneur) pour tout ce qui
  touche le SQL — la faiblesse in-memory du produit historique ne se répète pas.

---

## 1. Fondations partagées (le socle)

### 1.1 Tables noyau (schéma `core`)

| Table | Rôle | Colonnes clés |
|---|---|---|
| `party` | Une personne ou une entreprise | `id`, `kind person\|business`, `display_name` |
| `identifier` | Un moyen de joindre/payer un party | `party_id`, `kind msisdn\|rib\|ncc\|email\|djamo`, `value_normalized` (unique par kind), `value_hash` (HMAC serveur), `wallet_operator?`, `verify_tier declared\|otp\|document\|ncc`, `verified_at`, `proof_ref` |
| `business_profile` | Données entreprise du marchand | `party_id`, `rccm`, `ncc`, `regime_fiscal`, `address` |
| `sale` | Une vente (quel que soit le moyen de paiement) | `merchant_party_id`, `amount_minor`, `channel qr_static\|qr_dyn\|link\|manual_cash\|manual_other\|api`, `reference` (portée par QR dyn/lien), `description`, `lines jsonb?`, `occurred_at`, `status pending_payment\|matched\|invoiced\|void` |
| `payment_intent` | Une tentative d'encaissement sur un rail | `sale_id?`, `rail`, `rail_ref`, `amount_minor`, `payer_msisdn_hash?`, `status initiated\|pending\|succeeded\|failed\|expired`, `idempotency_key` (unique) |
| `external_event` | **Chaque payload fournisseur, BRUT** | `source paydunya\|dgi\|whatsapp\|sim`, `kind`, `raw jsonb`, `sig_valid`, `dedupe_key` (unique), `received_at`, `processed_at` |
| `match` | Le lien vente ↔ paiement | `sale_id`, `payment_intent_id?` (null = cash), `score`, `method auto_ref\|auto_heur\|manual`, `decided_by`, `decided_at` |
| `exception_queue` | Tout ce que l'auto ne sait pas trancher | `kind unmatched_payment\|ambiguous_match\|amount_mismatch\|invoice_rejected\|payout_failed\|identity_conflict\|import_error`, `payload`, `status open\|resolved`, `resolution`, `resolved_by`, `notes` |
| `invoice` | La facture (FNE) | `sale_id?`, `merchant_party_id`, `client_party_id?`, `client_snapshot jsonb`, `lines jsonb`, `total_ht`, `total_tva`, `total_ttc`, `number_local`, `fne_status draft\|queued\|submitted\|accepted\|rejected`, `fne_ref`, `fne_proof_ref`, `error` |
| `client`, `product` | Le carnet du marchand (pour facturer vite) | client → `party` réutilisé + NCC/exonérations ; product → `name`, `unit_price_minor`, `tva_rate`, `unit` |
| `audit_event` | Journal immuable | `actor`, `action`, `entity_ref`, `reason_code`, `at` — **append-only** |
| `outbox` | Notifications/jobs à livrer | `topic`, `payload`, `status`, `attempts` |
| `limits` | Plafonds réglementaires **dormants** (2M/10M/200k) | codés, non appliqués en pass-through |
| `rail_stats` | Observations par rail | `rail`, `hour`, `op`, `success_count`, `fail_count`, `latency_ms_p50/p95` |
| `match_feedback` | Labels d'apprentissage | candidats proposés + décision humaine |

Règles transversales : montants `bigint` ; toute écriture métier passe par une
transaction qui émet son `audit_event` ; jamais de suppression sur `sale`,
`invoice`, `match`, `audit_event`, `external_event` (correction = nouvel
enregistrement + statut).

### 1.2 `RailAdapter` (packages/rails)

```ts
interface RailAdapter {
  name: string;
  capabilities(): { payin: boolean; payout: boolean; operators: string[] };
  createPayin(req: { amountMinor: number; reference: string;
    payerHint?: { operator?: string; msisdn?: string };
    idempotencyKey: string }): Promise<{ railRef: string; checkoutUrl?: string }>;
  createPayout(req: { amountMinor: number; destination: Identifier;
    idempotencyKey: string }): Promise<{ railRef: string }>;
  getStatus(railRef: string): Promise<'pending'|'succeeded'|'failed'|'expired'>;
  verifyWebhook(headers: unknown, body: unknown):
    { valid: boolean; event?: NormalizedRailEvent };
}
```

- **`SimulatedRail`** : déterministe, pilotable par les tests (succès/échec/
  timeout/duplicata), rejoue des webhooks — sert aussi de démo hors-ligne.
- **`PayDunyaRail`** : sur les endpoints vérifiés — payin
  `checkout-invoice/create` + `confirm`, payout `api/v2/disburse/submit-invoice`
  → `get-invoice` → `check-status`, sandbox `app.paydunya.com/sandbox-api/v1`,
  auth 4 clés en en-têtes, `withdraw_mode` `orange-money-ci|wave-ci|mtn-ci|
  moov-ci|djamo-ci`. Les payloads passent par `external_event` AVANT traitement.
- **Kill-switch** par rail en config ; un rail down → les demandes tombent
  proprement en `exception_queue(payout_failed)` avec retry idempotent.

### 1.3 Réconciliation quotidienne (version pass-through)

Job à 23h : Σ payins `succeeded` du jour vs confirmations rail ; payouts émis
vs statuts terminaux ; intents non-terminaux > 48h → relance `getStatus` puis
exception. Sortie : un **rapport quotidien** (stocké + digest) et des
exceptions. (La réconciliation « Σ enveloppes = solde du coffre » complète
arrive avec l'accès au relevé partenaire.)

---

## 2. Module 1 — Le Rapprocheur (matcher)

**Rôle** : relier chaque paiement à chaque vente. C'est le produit (« ta caisse
est comptée »), et le socle de la facture automatique.

**Entrées** : `sale` (UI, API, import) · événements de paiement normalisés
(depuis `external_event`) · ventes cash (auto-matchées à la saisie).
**Sorties** : `match` ou entrée en `exception_queue`.

**Pipeline** : événement → normalisation → dédup (`dedupe_key`) → recherche de
candidats (même marchand, fenêtre ±48h, statut `pending_payment`) → décision :

| Règle (v1, dans l'ordre) | Décision | Score |
|---|---|---|
| La `reference` du paiement = la `reference` d'une vente (QR dynamique / lien) | **match auto** | 100 |
| Montant exact + candidat **unique** dans la fenêtre | match auto | 95 |
| Montant exact + plusieurs candidats | `ambiguous_match` → file | — |
| Écart de montant sur candidat unique (frais, arrondi) | `amount_mismatch` → file | — |
| Aucun candidat | `unmatched_payment` → file | — |

- Paiement **partiel** : non supporté en v1 → exception (règle simple, assumée).
- Écran « À rapprocher » : la file d'exceptions, résolution en 1 geste
  (attacher à une vente / créer la vente / ignorer avec raison).
- **Apprentissage** : chaque proposition + décision humaine → `match_feedback`
  (les poids v2 s'entraîneront dessus) ; profil horaire/montants par marchand
  dans `rail_stats`-like local.

**Acceptation** : webhook dupliqué → un seul match · 2 ventes de même montant →
ambigu (jamais d'auto) · vente cash → matched immédiat · paiement orphelin →
file + apparaît dans le digest · rejeu complet depuis `external_event.raw`
reproduit le même état.

---

## 3. Module 2 — Le Moteur de factures (FNE)

**Rôle** : toute vente — payée par SwimPay, en cash, par virement — devient une
facture normalisée conforme, transmise à la DGI, avec preuve conservée.
**C'est l'argument du pitch : il doit être démontrable dès la semaine 4.**

**Carnet** : `client` + `product` du marchand. **Import Excel/CSV** : wizard de
mapping colonnes → clients/produits ; lignes invalides → `import_error` en file
avec correction guidée (jamais d'échec silencieux du fichier entier).

**Génération** :
- depuis une vente `matched` → facture **pré-remplie** (zéro saisie) ;
- **standalone** (« le bouton facture ») : client + lignes + mode de paiement
  (cash/virement/chèque) en ~30 secondes.
- Numérotation locale continue par marchand (`number_local`, format à figer) ;
  champs FNE requis portés par `business_profile` (NCC vendeur) et
  `client_snapshot` (NCC acheteur si assujetti).

**Transmission DGI** — *résolu (2026-08-28, source primaire — voir
`08_DGI_FNE_API.md`)* : la DGI expose une **API REST/JSON officielle**
(`POST $url/external/invoices/sign`, avoir via `/{id}/refund`, Bearer token par
entreprise, env. de test public `http://54.247.95.108/ws`). Le plan RPA est
**abandonné** — on code un **`DgiAdapter`** propre :
- clé API **par marchand** (chiffrée) ; la validation DGI (spécimens →
  URL prod → clé) fait partie de l'onboarding marchand, sauf si le statut
  « éditeur/intégrateur » permet une validation unique de SwimPay (à clarifier
  avec `support.fne@dgi.gouv.ci` dès S1) ;
- **jamais de retry aveugle** sur `/sign` (pas d'idempotence ni d'endpoint de
  statut documentés ; chaque certification consomme un **sticker**) :
  single-flight par facture, requête+réponse brutes en `external_event`,
  doute → `exception_queue` + vérification manuelle dans l'espace FNE ;
- la réponse porte `reference` (n° officiel), `token` (URL → QR code) et
  `balance_sticker` → **suivi du stock de stickers + alerte** intégré au
  produit ;
- mode dégradé assumé : saisie manuelle assistée si la plateforme est
  indisponible.

**États** : `draft → queued → submitted → accepted | rejected(reason)` ;
rejet → exception + la raison enrichit les **règles de validation
pré-soumission** (l'apprentissage de ce module).

**Livraison** : PDF généré ; le marchand partage par WhatsApp (bouton partager
— pas de message template par vente, maîtrise du coût) ; le **digest quotidien**
(1 seul template/jour) récapitule : encaissé, ventes, factures émises, écarts.

**API étage 3** (réservée, non exposée en V1) : `POST /v2/invoices` avec clé
API marchand — le schéma est défini dès maintenant pour ne pas se peindre dans
un coin.

**Acceptation** : import d'un fichier client réel du portefeuille partenaire →
carnet peuplé · 20 factures démo générées dont cash et virement · un rejet
simulé → correction guidée → re-soumission · chaque facture acceptée a sa
preuve archivée.

---

## 4. Module 3 — L'Annuaire d'identité

**Rôle** : 1 client = N numéros + comptes, **vérifiés**. La couche que personne
d'autre ne construit ; tout le reste s'y adosse.

- **Paliers de vérification** : `declared` (saisi) → `otp` (contrôle du numéro
  prouvé) → `document` (pièce) → `ncc` (jointure fiscale). Chaque changement de
  palier = un `verification_event` append-only avec preuve.
- **Règles** : un `identifier` actif appartient à **un seul** `party` ; un
  numéro revendiqué par deux → `identity_conflict` en file (l'OTP le plus
  récent l'emporte, l'historique est conservé).
- **Vie privée** : lookup par `value_hash` (HMAC clé serveur) ; consentement
  stocké (`consent_ref`) ; déclaration ARTCI = tâche juridique parallèle
  (champ prévu). **Pas de scan du répertoire téléphonique en V1.**
- **Usage V1** : onboarding marchand complet (wallets + RIB + NCC) ;
  vérification du destinataire avant payout (« verser à K. — confirmer »).
- **Apprentissage** : tout OTP (succès/échec), toute vérification, et le graphe
  de récurrence payeur↔marchand (hashé) — la matière du scoring futur.

**Acceptation** : onboarding marchand < 5 min avec OTP réel · conflit simulé
résolu avec historique · aucun numéro stocké en clair hors besoin d'affichage.

---

## 5. Module 4 — Le Routeur

**Rôle v1 (mono-rail, volontairement simple)** : `route(request)` → rail choisi
+ raison, depuis une table de politique (`operation, currency, rail, enabled,
cost_estimate`).

- **Garde-fou pricing** : aucun payout n'est exécuté sans grille de coût
  configurée pour son rail (la leçon « paie sous le coût » du red-team).
- **Observation** : chaque opération alimente `rail_stats` (succès, latence par
  rail/heure) — le dossier de négociation et la matière du routage intelligent.
- **Dès le rail 2** : santé par fenêtre glissante (taux d'échec) → bascule
  automatique + alerte ; kill-switch manuel par rail.
- Les plafonds dormants (`limits`) seront appliqués ici le jour du contrat
  distributeur.

**Acceptation** : rail down (simulé) → exceptions propres + retry idempotent,
zéro double payout · bascule sim→sim2 sans toucher au code des modules.

---

## 6. Surfaces V1 (ce qui consomme les modules)

**App PME/marchand** (server-rendered + PWA, mobile-first, `apps/web`) :
1. **Accueil** — le jour en un écran : encaissé, nb ventes, « à rapprocher (n) »,
   factures émises. 2. **Nouvelle vente / facture** — le bouton facture 30 s.
3. **À rapprocher** — la file, résolution 1 geste. 4. **Factures** — statuts FNE,
   preuve, partage PDF. 5. **Clients & produits** — carnet + import.
6. **Paramètres** — identifiants (wallets, RIB, NCC), vérifications.

**API interne** (`apps/api`) : `/v2/sales`, `/v2/invoices`, `/v2/match/*`,
`/v2/rails/webhook/:rail`, `/v2/directory/*` — contrats typés dans
`packages/contracts` (nouveau namespace, sans toucher à l'existant).

**Console comptable** : hors code V1 ; la table `accountant_link`
(comptable ↔ dossiers marchands, lecture) est prévue au schéma dès maintenant.

## 7. Ce que la V1 ne fait PAS (gel explicite)

Pas de solde stocké ni affiché · pas d'app native/NFC/terminal · pas de swap
public (un éventuel test bridé = décision LO séparée) · pas de paie B2B (attend
la grille payout écrite) · pas d'API publique de facturation · pas de
multi-devise · pas de NATS.

## 8. Ordre de construction (aligné sur la stratégie)

| Semaines | Livrable |
|---|---|
| S1-2 | Schéma `core` + migrations + `SimulatedRail` + squelette app/API |
| S2-4 | Rapprocheur + ventes + webhook PayDunya sandbox + écran À rapprocher |
| S3-5 | Moteur de factures : carnet, import, génération, file DGI (assistée) |
| S4-6 | Automatisation DGI (RPA/API selon investigation S1) — **démo pitch possible dès S4 en mode assisté** |
| S5-6 | Annuaire v0 (OTP, paliers) + digest quotidien |
| S6 | Routeur v1 + réconciliation quotidienne + rapport |

En parallèle (hors code) : compte business PayDunya réel, lettre de statut
conformité, pilotes prépayés — cf. `05_BUILD_STRATEGY.md` §3.

## 9. Décisions ouvertes à trancher (avant/pendant S1)

1. ~~Interface DGI exacte~~ — **résolu** : API REST officielle, `DgiAdapter`
   (cf. `08_DGI_FNE_API.md`). Reste à clarifier en S1 : le statut
   **éditeur/intégrateur** (validation unique de SwimPay vs une par marchand).
2. **Format de numérotation** des factures (série par marchand).
3. **Hébergement** : VPS existant (mutualisé avec l'ancien produit) vs projet
   Dokploy séparé — recommandation : projet séparé, base dédiée.
4. **Noms définitifs** : schéma `core`, packages `brain`/`rails` (proposés).
5. UI V1 : français uniquement, XOF uniquement (proposé : oui).
