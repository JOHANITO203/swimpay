# Mettre le site en ligne — Cloudflare Worker

Trois fichiers dans `public/`, servis par un Worker qui n'existe que pour poser
les en-têtes de sécurité.

| | |
|---|---|
| `public/index.html` | le site entier, tout incrusté |
| `public/og.jpg` | l'image de partage, 1200 × 630 |
| `public/favicon.ico` | pour les clients qui la cherchent en dur |
| `worker.js` | les en-têtes ; il ne fabrique aucune page |
| `wrangler.jsonc` | le nom du Worker et le dossier d'assets |

Poids réel transféré : **1406 Ko** une fois compressé.

## Ce qu'il faut, et qui n'est pas sur cette machine

Ni `wrangler`, ni identifiants Cloudflare. Deux chemins.

### Par jeton d'API — sans navigateur

Créer un jeton sur `dash.cloudflare.com/profile/api-tokens` avec le modèle
**Edit Cloudflare Workers**, puis :

    export CLOUDFLARE_API_TOKEN=...
    export CLOUDFLARE_ACCOUNT_ID=...
    cd deploy && npx wrangler deploy

### Par connexion interactive

    cd deploy && npx wrangler login && npx wrangler deploy

`npx` télécharge wrangler le temps de la commande : rien n'est installé dans le
dépôt, et aucune dépendance n'entre dans le projet.

## Après la première mise en ligne

Le Worker répond sur `swimpay-site.<sous-domaine>.workers.dev`. Deux valeurs à
mettre à jour dans `design/pivot/sondes/site.py`, puis régénérer :

    SITE_URL   l'adresse publique réelle — les balises canonique et og:
               l'exigent absolue, sinon le partage WhatsApp reste muet
    LIEN_APP   l'adresse de l'application quand elle en aura une ;
               aujourd'hui elle pointe une prévisualisation

## Ce que ce site n'a pas

Mesuré par `design/pivot/sondes/audit-prod.mjs` : **7 manques graves**.

Quatre demandent du contenu — mentions légales, politique de confidentialité,
conditions générales, et un contact. Le site collecte nom et téléphone dans ses
formulaires : ces pages ne sont pas une finition.

Trois sont structurelles — les 1,9 Mo en un fichier, les six pages sur une seule
adresse, et la page vide sans JavaScript.

Bon pour montrer à des partenaires. Pas pour être présenté comme le site public
d'une société qui manipule de l'argent.
