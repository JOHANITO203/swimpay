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

Dans le tableau de bord — *Workers & Pages → Create → Connect to Git* — choisir
le dépôt, la branche `cloudflare`, puis renseigner **trois champs** :

| champ | valeur |
|---|---|
| Root directory | `deploy` |
| Build command | *(vide — effacer ce qui est proposé)* |
| Deploy command | `npx wrangler deploy --config wrangler.jsonc` |

Chaque poussée sur cette branche redéploie.

### Pourquoi ces trois champs, et pas « rien à configurer »

Premier essai, `wrangler.jsonc` à la racine du dépôt. Cloudflare l'a trouvé,
mais la racine porte le `package.json` du monorepo, avec ses *workspaces*. Deux
conséquences :

    22:07:43  Installing project dependencies: npm clean-install
    22:07:55  added 351 packages
    22:07:56  Executing user build command: npm run build  →  tsc -b
    22:08:24  ✘ [ERROR] The Cloudflare application detection logic has been run
              in the root of a workspace instead of targeting a specific
              project. Change your working directory to one of the
              applications in the workspace and try again.

351 paquets installés et tout le projet compilé pour publier trois fichiers
statiques — puis un refus. Les trois champs corrigent la cause :

- **Root directory `deploy`** met Cloudflare dans un dossier sans
  `package.json` : plus d'installation, plus de `tsc -b`, plus de racine de
  workspace ;
- **Build command vide** parce qu'il n'y a rien à construire — `index.html` est
  généré ici, par `design/pivot/sondes/site.py`, et versionné tel quel ;
- **`--config wrangler.jsonc`** coupe court à la détection de projet : wrangler
  prend ce fichier et ne remonte pas chercher un workspace.

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
