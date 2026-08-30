# Mettre le site en ligne — Cloudflare Worker

Trois fichiers dans `public/`, servis par un Worker qui n'existe que pour poser
les en-têtes de sécurité.

| | |
|---|---|
| `public/index.html` | le site entier, tout incrusté |
| `public/og.jpg` | l'image de partage, 1200 × 630 |
| `public/favicon.ico` | pour les clients qui la cherchent en dur |
| `worker.js` | les en-têtes ; il ne fabrique aucune page |
| `../wrangler.jsonc` | **à la racine du dépôt**, là où Cloudflare le cherche |

Poids réel transféré : **1406 Ko** une fois compressé.

## La mise en ligne se fait par Git

Aucun identifiant ne traverse cette machine, et aucun outil n'est à installer.
Le dépôt est déjà lié à Cloudflare : c'est Cloudflare qui construit et publie.

**Branche à servir : `cloudflare`.**

Dans le tableau de bord — *Workers & Pages → Create → Connect to Git* — choisir
le dépôt, puis la branche `cloudflare`. Rien d'autre à renseigner :
`wrangler.jsonc` est à la racine, là où Cloudflare le cherche, et le site n'a
aucune étape de construction.

Chaque poussée sur cette branche redéploie.

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
