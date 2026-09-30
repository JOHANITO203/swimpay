# Le document de présentation

Trois formats du même document, celui qu'on montre à quelqu'un qui ne connaît
rien au projet.

| Fichier | Pour quoi |
|---|---|
| `SwimPay-en-clair.pdf` | l'envoyer tel quel, 16 pages, mise en page fidèle |
| `SwimPay-en-clair.docx` | le modifier dans Word, texte et tableaux éditables, schémas en images |
| `SwimPay-en-clair.html` | la source, qui sert à régénérer les deux autres |

Version en ligne, toujours à jour :
<https://claude.ai/code/artifact/ff079e0b-901e-4f69-8592-347d4b544965>

## Ce qu'il contient

Les trois profils et leurs actions, les problèmes et les réponses, pourquoi
c'est le bon moment, la machine à revenus avec les calculs, les concurrents
terrain par terrain, ce qu'un portefeuille de clients rapporte, la carte des
modules construits, et le schéma de l'algorithme.

## Le régénérer après une modification

Les deux outils vivent dans `design/pivot/sondes/`, sans aucune dépendance
installée : le PDF sort de Chrome, le `.docx` est un ZIP d'XML écrit à la main.

```
node design/pivot/sondes/export-doc.mjs  <source.html> <sortie.pdf> <dossier-travail>
node design/pivot/sondes/build-docx.mjs  <dossier-travail> <sortie.docx>
```

Le premier rend le PDF, capture chaque schéma en image et extrait la structure
du contenu. Le second assemble le `.docx` à partir de cette structure.

## Ce qu'il faut savoir avant de l'envoyer

- Les **prix** (abonnements, pourcentages) sont des propositions justifiées par
  le marché, **ni négociées ni testées** sur un vrai client.
- Les **volumes** des exemples chiffrés illustrent la méthode, ils ne mesurent
  rien.
- Les tarifs concurrents sont **vérifiés en source primaire** pour PayDunya,
  Julaya et CinetPay ; **estimés** pour Wave, Orange, MTN, Moov et Hub2.
- Le **montant recherché** n'est pas dans le document : à ajouter avant de
  l'adresser à un investisseur.
