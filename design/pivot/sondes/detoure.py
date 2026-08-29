# -*- coding: utf-8 -*-
u"""Detourage du sujet sur fond de studio vert.

La photo du heros est prise sur un fond acide. On en tire deux couches :
le fond seul, et le sujet decoupe avec son alpha. Elles se remontent ensuite
l'une sur l'autre avec un decalage au defilement — c'est ce qui donne
l'impression que la personne sort de l'image.

Trois pieges, tous payes ici :
  1. un seuil sur le vert seul mange le tailleur, qui renvoie la lumiere du
     fond. On juge sur la DOMINANCE du vert (g moins le plus fort des deux
     autres), pas sur sa valeur ;
  2. « tout ce qui est vert » decoupe aussi les reflets verts DANS le sujet.
     On ne garde que la nappe de fond qui touche le bord de l'image ;
  3. un masque binaire donne un bord en escalier et une frange verte. On
     adoucit l'alpha, et on desature le vert la ou il est partiel.

Usage : python detoure.py <source> <dossier-sortie> [largeur-max]
Ecrit  : <nom>-sujet.webp (avec alpha) et <nom>-fond.webp
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = sys.argv[1]
DEST = sys.argv[2]
LARGE = int(sys.argv[3]) if len(sys.argv) > 3 else 1500

im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(np.int16)
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]

# 1. dominance du vert : ce qui distingue le fond du tailleur clair
domine = g - np.maximum(r, b)
print(u"dominance du vert  fond attendu ~50, sujet ~5")
print(u"  centiles : 5%%=%d  25%%=%d  50%%=%d  75%%=%d  95%%=%d" % tuple(
    np.percentile(domine, [5, 25, 50, 75, 95]).astype(int)))

SEUIL = 26
vert = domine > SEUIL

# 2. Le critere n'est PAS « toucher le bord » : la poche de fond entre les
#    jambes n'en touche aucun, et elle etait comptee comme sujet — une tache
#    verte restait au milieu du personnage. C'est la TAILLE qui separe une
#    nappe de fond d'un reflet vert dans les cheveux.
etiq, combien = ndimage.label(vert)
tailles = ndimage.sum(vert, etiq, range(1, combien + 1))
MINI = max(600, a.shape[0] * a.shape[1] // 6000)
grandes = np.where(tailles >= MINI)[0] + 1
fond = np.isin(etiq, grandes)
print(u"nappes de vert : %d, dont %d font plus de %d px (= du fond)" % (combien, len(grandes), MINI))

# 3. On ne rebouche que les PETITS trous — le bruit du seuil. Un grand trou
#    est du fond vu a travers le sujet, pas un defaut a combler.
sujet = ~fond
trous = ndimage.binary_fill_holes(sujet) & ~sujet
et_t, n_t = ndimage.label(trous)
if n_t:
    t_tailles = ndimage.sum(trous, et_t, range(1, n_t + 1))
    petits = np.where(t_tailles < MINI)[0] + 1
    sujet = sujet | np.isin(et_t, petits)
    print(u"%d trous, %d rebouches (les autres sont du fond)" % (n_t, len(petits)))
etiq2, n2 = ndimage.label(sujet)
if n2 > 1:
    tailles = ndimage.sum(sujet, etiq2, range(1, n2 + 1))
    sujet = etiq2 == (int(np.argmax(tailles)) + 1)
    print(u"%d morceaux de sujet, on garde le plus grand (%d px)" % (n2, int(tailles.max())))

# 4. l'alpha : on rentre d'un pixel puis on adoucit, sinon le bord garde
#    une frange du fond
alpha = ndimage.binary_erosion(sujet, iterations=1).astype(np.float32)
alpha = ndimage.gaussian_filter(alpha, sigma=1.1)
alpha = np.clip((alpha - 0.32) / 0.42, 0, 1)   # remet du contraste dans le degrade

# 5. decontamination : la ou l'alpha est partiel, le vert du fond deteint.
#    On plafonne le vert au plus fort des deux autres canaux.
#    La bande partielle seule ne suffit pas : le vert deteint sur deux ou trois
#    pixels PLEINS juste en dedans. On elargit la bande vers l'interieur.
partiel = (alpha > 0.02) & (alpha < 0.985)
bordure = ndimage.binary_dilation(partiel, iterations=3) & (alpha > 0.02)
gg = g.copy()
plafond = np.maximum(r, b)
gg[bordure] = np.minimum(g[bordure], plafond[bordure])
print(u"decontamination sur %d px de bordure" % int(bordure.sum()))
rgb = np.stack([r, gg, b], axis=2).astype(np.uint8)

# 6. recadrage sur le sujet, avec une marge
ys, xs = np.where(alpha > 0.5)
y0, y1 = max(0, ys.min() - 8), min(a.shape[0], ys.max() + 9)
x0, x1 = max(0, xs.min() - 8), min(a.shape[1], xs.max() + 9)
print(u"sujet dans %dx%d, cadre %d,%d a %d,%d" % (im.size[0], im.size[1], x0, y0, x1, y1))

decoupe = np.dstack([rgb[y0:y1, x0:x1], (alpha[y0:y1, x0:x1] * 255).astype(np.uint8)])
sujet_im = Image.fromarray(decoupe, "RGBA")
if sujet_im.width > LARGE:
    sujet_im = sujet_im.resize((LARGE, round(sujet_im.height * LARGE / sujet_im.width)), Image.LANCZOS)

# 7. le fond seul : on bouche le trou laisse par le sujet en etirant les bords,
#    sinon la couche de fond montre une silhouette creuse quand elle glisse
fond_im = im.copy()
if fond_im.width > LARGE:
    fond_im = fond_im.resize((LARGE, round(fond_im.height * LARGE / fond_im.width)), Image.LANCZOS)
# un flou large sur le fond entier suffit : le sujet repasse par-dessus
# Un flou de w/90 laisse la silhouette LISIBLE : on voyait un fantome du
# sujet derriere le sujet. A w/12 il ne reste qu'une nappe de couleur,
# qui est tout ce qu'on lui demande.
fond_im = fond_im.filter(ImageFilter.GaussianBlur(radius=fond_im.width / 12))

base = os.path.splitext(os.path.basename(SRC))[0].replace(" ", "-").lower()
p1 = os.path.join(DEST, base + "-sujet.webp")
p2 = os.path.join(DEST, base + "-fond.webp")
sujet_im.save(p1, "WEBP", quality=88, method=6)
fond_im.save(p2, "WEBP", quality=82, method=6)
print(u"")
print(u"  %s  %dx%d  %d Ko" % (os.path.basename(p1), sujet_im.width, sujet_im.height, os.path.getsize(p1) // 1024))
print(u"  %s  %dx%d  %d Ko" % (os.path.basename(p2), fond_im.width, fond_im.height, os.path.getsize(p2) // 1024))
