# Mettre le site en ligne — Cloudflare Worker

Quatre fichiers, servis par un Worker qui n'existe que pour poser les en-têtes
de sécurité.

| | |
|---|---|
| `public/index.html` | le site entier, tout incrusté |
| `public/og.jpg` | l'image de partage, 1200 × 630 |
| `public/favicon.ico` | pour les clients qui la cherchent en dur |
| `worker.js` | les en-têtes ; il ne fabrique aucune page |
| `wrangler.jsonc` | **dans CE dossier**, pas à la racine — voir plus bas |

Poids réel transféré : **1406 Ko** une fois compressé.

## La mise en ligne se fait par Git

Aucun identifiant ne traverse cette machine, et aucun outil n'est à installer.
Le dépôt est déjà lié à Cloudflare : c'est Cloudflare qui construit et publie.

**Branche à servir : `cloudflare`.**

Réglages du tableau de bord :

| champ | valeur |
|---|---|
| Root directory | `deploy` |
| Build command | *(vide)* |
| Deploy command | `npx wrangler deploy` |

Chaque poussée sur cette branche redéploie.

> **« Retry deployment » ne corrige rien.** Le bouton rejoue le MÊME commit,
> pas le dernier. Deux builds ont été perdus ainsi, à afficher des valeurs
> déjà corrigées sur la branche. On le reconnaît à trois lignes du journal :
>
>     Success: Dependencies restored from build cache.
>     No updated asset files to upload. Proceeding with deployment...
>
> Après une correction, **pousser un commit** — c'est la seule façon sûre de
> déclencher un build sur le code neuf.

## Les trois pannes déjà payées

Trois builds ont échoué avant que celui-ci passe. Chacune a laissé une trace
dans ce dossier ; ne pas défaire ces choix sans relire pourquoi.

### 1. La racine du dépôt est une racine de workspace

`wrangler.jsonc` était à la racine. Cloudflare l'a trouvé, mais la racine porte
le `package.json` du monorepo avec `workspaces: ["apps/*","packages/*"]` :

    Installing project dependencies: npm clean-install
    added 351 packages
    Executing user build command: npm run build   ->  tsc -b
    ERROR  The Cloudflare application detection logic has been run in the
           root of a workspace instead of targeting a specific project.

351 paquets installés et tout le monorepo compilé pour publier trois fichiers
statiques — puis un refus. **Correction :** `wrangler.jsonc` descend dans
`deploy/`, dossier sans `package.json`, et *Root directory* pointe dessus.

### 2. Le nom du Worker est imposé par le CI

    Failed to match Worker name. Your config file is using the Worker name
    "swimpay-site", but the CI system expected "swimpay". Overriding using
    the CI provided Worker name.

Le CI tire le nom du dépôt et écrase le nôtre — et annonce qu'il ouvrira une
pull request pour « corriger » ce fichier. **Correction :** `name` vaut
`swimpay`, celui que le CI attend.

### 3. La date de compatibilité se juge en UTC

    Can't set compatibility date in the future: 2026-08-31  [code: 10021]

Elle valait `2026-08-31`. Il était bien le 31 en heure locale, mais les
journaux du build sont horodatés `2026-08-30T22:21` UTC : pour l'API, demain.
Cet échec est arrivé **après** l'upload réussi des trois fichiers — tout le
reste marchait. **Correction :** une date franchement passée, jamais celle du
jour.

### Ce qui reste et qu'on laisse

Cloudflare installe quand même les 353 paquets de la racine avant d'appliquer
le *root directory*. Douze secondes perdues par build, sans conséquence : la
commande de construction est vide, rien n'en sort.

## Après la première mise en ligne

Le Worker répond sur `swimpay.<sous-domaine>.workers.dev`. Deux valeurs à
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
