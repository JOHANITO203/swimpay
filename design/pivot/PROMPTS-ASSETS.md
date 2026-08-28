# Prompts de génération — les assets qui portent l'app

État actuel : **un seul fond**, `Textured_dark_mobile_background_…_202608282054.jpeg`,
posé sur le corps. Le hero est encore le dégradé acide en CSS. Il sera remplacé
par le fond deux tons ci-dessous dès qu'il sera généré, et la carte de solde par
l'asset Rodin dès qu'il sera prêt.

---

## 1 · Le fond deux tons — même texture que le fond sombre actuel

### Ce que la texture actuelle est, mesuré sur le fichier

Ces valeurs viennent du fichier, pas d'une impression :

| grandeur | valeur |
|---|---|
| sol moyen | `#262626` (luma 30,9 / 255) |
| grain | écart-type **16 niveaux** — dense, fin, nettement visible |
| variation lente | de 3 à 64 sur 255, soit une **amplitude de 61** |
| format | 1536 × 2752, ratio 0,558 (portrait téléphone) |

Autrement dit : un charbon mat, **très finement grenu** comme un papier abrasif
fin ou un feutre, traversé de **larges balayages de lumière diagonaux et très
doux** — pas un fond plat, pas un dégradé non plus.

### La méthode qui donnera le meilleur résultat

Si l'outil accepte une **image de référence de style** (ou un img2img à faible
force), donnez-lui `Textured_dark_mobile_background_…_202608282054.jpeg` **en
plus** du prompt. Le grain se reproduit beaucoup plus fidèlement par référence
que par description. Le prompt ci-dessous est écrit pour fonctionner dans les
deux cas.

### Le prompt

```
A vertical mobile app background, 1536 x 2752, flat 2D, no perspective, no
objects, no text, no user interface, no logo.

TWO ZONES, nothing else.

TOP ZONE — the upper 38 percent of the frame is a single flat mass of saturated
acid green, hex A2FF01. Its lower boundary is ONE continuous organic curve: a
slow, wide, gentle wave running across the full width, staying broadly
horizontal, dipping and rising by no more than 8 percent of the frame height.
No spikes, no bubbles, no detached blobs, no shape that reads as a separate
object.

BOTTOM ZONE — the remaining 62 percent is a dark charcoal, base hex 262626.

SURFACE — and this is the most important part. BOTH zones share the exact same
material, as if one single sheet were photographed and only its colour changed
across the boundary:

  - a very fine, dense, uniform speckle grain over the entire frame, like fine
    abrasive paper or matte felt seen up close. Strong enough to be clearly
    visible, never smooth, never clean. Identical grain size and identical
    density in the green zone and in the charcoal zone.
  - broad, very soft diagonal sweeps of light raking across the surface from
    upper left to lower right, like a large soft studio light on a matte
    material. Slow and cloudy, never a hard gradient, never a beam. The
    lightest and darkest parts of these sweeps differ by roughly 24 percent of
    the tonal range.
  - matte throughout: no gloss, no sheen, no specular highlight, no reflection.

The boundary between green and charcoal is clean and hard — no blur, no
feather, no halo, no glow spilling across it. The grain and the light sweeps
cross that boundary uninterrupted, as one continuous surface.

The left and right edges must match so the image can tile horizontally.

No vignette, no lens flare, no bokeh, no depth of field, no 3D, no shadow, no
object, no border, no frame.
```

### Variante thème clair

Le même prompt, deux valeurs changées :

```
BOTTOM ZONE — the remaining 62 percent is a warm off-white, base hex F4F4F2.
SURFACE — identical grain and identical light sweeps, but the sweeps are
inverted in polarity: the material is light, so the sweeps read as soft shading
rather than soft illumination. Same amplitude, roughly 24 percent of the range.
```

### Ce que ce fond supprime

Quand il arrive, le dégradé acide en CSS du hero disparaît : le second ton est
**dans** l'image. Il ne reste qu'un fond, et rien par-dessus.

---

## 2 · La carte 3D — Rodin (hyper3d.ai)

### L'image d'entrée

`design/pivot/assets/carte-entree-rodin.png` — 2342 × 1583, déjà générée.

Carte vierge aux proportions **ISO/IEC 7810 ID-1** (85,60 × 53,98 mm, ratio
1,5857:1), coins à 3,18 mm, puce placée selon **ISO/IEC 7816-2** (bord gauche à
19 mm, bord haut à 23,3 mm). Vue de face, sans perspective, sans ombre portée,
sur blanc pur, corps en gris neutre — Rodin lit la **silhouette et le relief** ;
une couleur neutre l'empêche de cuire une teinte dans le matériau.

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

- **Quality : High** — le biseau fait 0,15 mm ; en qualité basse il disparaît, et
  c'est lui qui détache la carte du fond.
- **Material : PBR** — il faut la carte de transmission/rugosité séparée, sinon
  la translucidité est cuite dans l'albédo et ne s'adapte plus au fond.
- **Symmetry : off** — la puce est sur un seul côté ; une symétrie forcée en
  poserait deux.

### Ce qui reste piloté par les données réelles

L'asset ne porte **que** la puce. Numéro de compte, solde, variation, nom du
titulaire, rail : tout cela vient du compte, jamais de l'image.

---

## La règle qui tient les deux

**Une page ne porte qu'un seul fond.** Le second ton n'est pas une seconde image
posée par-dessus : il est *dans* l'image du fond. La carte n'est pas un fond,
c'est un objet détouré — et comme elle est translucide, elle prend la couleur de
ce qu'il y a derrière elle.
