# Prompts de génération — les deux assets qui portent l'app

Deux assets, deux rôles, aucune superposition :

| asset | rôle | qui le porte |
|---|---|---|
| **le fond deux tons** | le sol de l'app **et** le second ton, dans une seule image | `body`, un fichier par thème |
| **la carte 3D** | un objet translucide posé sur ce sol | `.plaque-verre`, un seul fichier pour les deux thèmes |

La règle qui a manqué jusqu'ici : **une page ne porte qu'un seul fond**. Le
second ton n'est pas une seconde image posée par-dessus — il est **dans**
l'image du fond. La carte n'est pas un fond : c'est un objet détouré, et comme
elle est translucide, elle prend la couleur de ce qu'il y a derrière elle.

---

## 1 · La carte 3D — Rodin (hyper3d.ai)

### L'image d'entrée

`design/pivot/assets/carte-entree-rodin.png` — 2342 × 1583, déjà générée.

Carte vierge aux proportions normalisées **ISO/IEC 7810 ID-1** (85,60 × 53,98 mm,
soit 1,5857:1), coins à 3,18 mm, puce placée selon **ISO/IEC 7816-2** (bord
gauche à 19 mm, bord haut à 23,3 mm). Vue de face, sans perspective, sans ombre
portée, sur blanc pur, corps en gris neutre — Rodin lit la **silhouette et le
relief** ; une couleur neutre l'empêche de cuire une teinte dans le matériau.

### Le prompt

```
A frosted translucent payment card. Proportions ISO/IEC 7810 ID-1: 85.6 x 54 mm,
ratio 1.586 to 1. Thickness 0.9 mm. Corner radius 3.18 mm. Perfectly flat, no warp.

MATERIAL — the most important part. Colourless frosted glass: heavily sandblasted
satin surface, fine even etch, high light transmission, strong subsurface
scattering, soft internal diffusion. The glass has NO tint and NO colour of its
own — it is optically neutral so it takes on the colour of whatever sits behind
it. Matte diffuse face, not glossy.

EDGE — a polished optically clear micro-bevel, 45 degrees, 0.15 mm, running all
the way around both faces. This bevel is the only specular highlight on the
object; it is what separates the card from its background.

FACE — completely blank except ONE element: a single EMV contact chip, brushed
gold, six contact pads, flush mounted and standing 0.1 mm proud of the surface,
positioned on the left side of the upper third per ISO/IEC 7816-2.

EXCLUDE — no printed text, no embossed numbers, no cardholder name, no expiry,
no bank logo, no network logo, no magnetic stripe, no signature panel, no
hologram, no contactless symbol, no pattern, no gradient printed on the face.

LIGHTING — flat neutral studio light, even and white, no coloured spill, no
coloured rim light, no environment reflection baked into the texture, no cast
shadow, no ground plane, no background.

PRESENTATION — one single object, floating and isolated, front face parallel to
camera, centred, on pure white.
```

### Réglages Rodin

- **Quality : High** — le biseau est une arête de 0,15 mm ; en qualité basse elle
  disparaît, et c'est elle qui fait tenir la carte sur le fond.
- **Material : PBR** — il faut la carte de transmission/rugosité séparée, sinon
  la translucidité est cuite dans l'albédo et ne s'adapte plus au thème.
- **Symmetry : off** — la puce est sur un seul côté ; une symétrie forcée en
  poserait deux.

### Ce que je fais de la sortie

J'exporte un rendu de face en PNG à alpha, à **deux luminosités** (une par
thème) depuis le même mesh — la géométrie et le matériau ne changent pas, seule
la lumière. C'est ce qui rend la carte réellement adaptable : un seul objet,
deux éclairages, jamais deux cartes différentes.

**Ce qui reste piloté par les données réelles du compte**, jamais par l'asset :
numéro de compte, solde, variation, nom du titulaire, rail. L'asset ne porte
**que** la puce.

---

## 2 · Le fond deux tons — un fichier par thème

Une seule image contient le sol **et** le second ton. Le second ton occupe le
haut (en-tête + solde) et se termine par une courbe organique.

### Contraintes techniques à ne pas perdre

Elles ne sont pas cosmétiques — chacune vient d'un défaut déjà payé :

- **La courbe reste globalement horizontale.** L'image est recadrée en `cover` :
  sur bureau elle est rognée sur les côtés. Une forme qui n'a de sens qu'à une
  seule largeur se casse au recadrage.
- **Aucun point chaud, aucune vignette.** Une tache lumineuse atterrit à un
  endroit arbitraire après recadrage.
- **Le grain est uniforme sur toute l'image.** Un grain qui varie révèle la
  couture du recadrage.
- **Aucun objet, aucun texte, aucune interface** dans l'image.
- **Les bords gauche et droit se raccordent**, pour tenir sur les très grands
  écrans.

### Prompt — thème sombre

```
A vertical mobile app background, 2048 x 3072, flat 2D, no perspective, no
objects, no text, no user interface.

Two zones and nothing else.

TOP ZONE — the upper 38 percent of the frame is a single flat surface of
saturated acid green, hex A2FF01. Its lower boundary is ONE continuous organic
curve: a slow, wide, gentle wave that stays broadly horizontal across the whole
width, dipping and rising by no more than 8 percent of the frame height. No
spikes, no bubbles, no separate blobs, no shapes detached from the mass. Within
the green, a very subtle darkening toward the top edge only, no more than 12
percent — flat, even, no glow, no hotspot, no light source.

BOTTOM ZONE — the remaining 62 percent is a near-black charcoal, hex 141414,
completely even edge to edge. No gradient, no vignette, no glow, no colour
bleeding up from the green.

TEXTURE — fine uniform film grain over the ENTIRE frame, both zones, identical
density and size everywhere, like 400 ISO film. Visible but restrained. Plus a
faint matte paper tooth in the dark zone only.

The boundary between the two zones is clean and hard — no blur, no feather, no
halo, no glow spilling across it.

The left and right edges must match so the image can tile horizontally.

No lighting, no shadow, no depth, no 3D, no bokeh, no lens flare, no vignette.
```

### Prompt — thème clair

Le même, deux valeurs changées :

```
…identical, except:
BOTTOM ZONE — the remaining 62 percent is a warm off-white, hex F4F4F2,
completely even edge to edge.
TEXTURE — the same uniform film grain, plus a faint matte paper tooth in the
light zone only.
```

Et une seule correction propre au clair : sur du blanc, l'acide pur reste le
même **remplissage** (l'identité ne bouge pas), mais tout ce qui est **écrit**
ou porte une **donnée** utilise déjà ses propres verts assombris — `#4D7A00`
pour le texte, `#66A300` pour les marques de données. C'est mesuré, c'est en
place, l'asset n'a pas à s'en occuper.

---

## Ce que ces deux assets suppriment

Trois couches disparaissent le jour où ils arrivent :

1. la texture du corps (`--fond-corps`) — absorbée par le fond deux tons ;
2. la surface verte découpée (`--fond-hero` + `--decoupe`) — absorbée aussi ;
3. le masque SVG et le calcul de hauteur de nappe en JavaScript.

Il ne reste alors qu'**un fond** et **un objet**. C'est la règle demandée.
