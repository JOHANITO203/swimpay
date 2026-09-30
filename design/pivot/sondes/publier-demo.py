# -*- coding: utf-8 -*-
"""Publie la demo DANS le site, au lieu de renvoyer vers un artifact Claude.

   Decision de LO (29/09/2026) : « les elements de la demo doivent faire partie
   du site, pas d'un artifact claude ». Les prototypes sont ecrits pour le
   visualiseur d'artifacts, qui les enveloppe d'un squelette (doctype, charset,
   viewport, remise a zero). Sur le site, personne ne le fait : ce script pose
   cette enveloppe lui-meme, puis copie chaque page et ses fichiers dans
   deploy/public/demo/.

     deploy/public/demo/index.html     le prototype en scenarios
     deploy/public/demo/photo.jpg      le hero photo des scenarios
     deploy/public/demo/grain.png      la tuile de grain
     deploy/public/demo/tontine/       la demo de la tontine classique

   A relancer apres chaque modification d'un prototype, avant de pousser."""
import io, os, re, shutil, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

RACINE = r"D:/Dev/Projects/swimpay"
PIVOT = RACINE + "/design/pivot/"
SORTIE = RACINE + "/deploy/public/demo/"

# Ce que le visualiseur d'artifacts ajoute d'office, et dont les pages
# dependent : sans la regle [hidden], les feuilles et la barre de navigation
# masquees restent visibles.
ENVELOPPE = """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<style>
:root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
body { margin: 0; }
img { max-width: 100%; }
[hidden] { display: none !important; }
</style>
"""

def envelopper(corps, retour):
    """Le corps de l'artifact, dans une vraie page, avec un lien de retour au site."""
    # le visualiseur a pu laisser sa propre enveloppe dans le fichier lu
    i = corps.find("<title>")
    if i > 0:
        corps = corps[i:]
    corps = re.sub(r"</body>\s*</html>\s*$", "", corps.strip())
    lien = ('<a href="/" style="position:fixed;right:16px;top:calc(16px + env(safe-area-inset-top,0px));'
            'z-index:100;font:600 13px Outfit,system-ui,sans-serif;color:#141414;background:#A2FF01;'
            'border-radius:999px;padding:10px 16px;text-decoration:none">' + retour + '</a>\n')
    return ENVELOPPE + corps + "\n" + lien + "</html>\n"

os.makedirs(SORTIE, exist_ok=True)

# 1. le prototype en scenarios
sc = open(PIVOT + "swimpay-scenarios.html", encoding="utf-8").read()
open(SORTIE + "index.html", "w", encoding="utf-8").write(envelopper(sc, "← Retour au site"))

# 2. les fichiers des scenarios
shutil.copyfile(PIVOT + "assets/hero-personne.jpg", SORTIE + "photo.jpg")
shutil.copyfile(PIVOT + "assets/grain-tuile.png", SORTIE + "grain.png")

# 3. la tontine classique (30/09/2026), sa propre page
os.makedirs(SORTIE + "tontine/", exist_ok=True)
to = open(PIVOT + "tontine-demo.html", encoding="utf-8").read()
open(SORTIE + "tontine/index.html", "w", encoding="utf-8").write(envelopper(to, "← Retour au site"))
print("  %-14s %6d Ko" % ("tontine/", os.path.getsize(SORTIE + "tontine/index.html") // 1024))

for f in sorted(os.listdir(SORTIE)):
    if os.path.isdir(SORTIE + f): continue
    print("  %-14s %6d Ko" % (f, os.path.getsize(SORTIE + f) // 1024))
print("demo publiee dans deploy/public/demo/")
