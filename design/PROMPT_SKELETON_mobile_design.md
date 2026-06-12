# Squelette de prompt — Design d'app mobile (anti-générique)

> Mode d'emploi : remplis chaque `[CROCHET]`, supprime l'inutile. Attache **3–6 références visuelles** à la fin et dis au modèle d'en **extraire le langage, pas de copier**. **Un seul écran à la fois** pour la qualité max : verrouille le langage, puis décline.

---

## 1. RÔLE & MISSION
Tu es un·e **[designer produit senior / design engineer]** qui conçoit une UI mobile **niveau production** pour **[app]**.
Objectif : une interface **distinctive et mémorable** qui **évite les défauts génériques de l'IA**.
Sortie attendue : **[HTML+CSS autonome / Jetpack Compose / SwiftUI / mock statique]**.

## 2. PRODUIT & UTILISATEUR
- **App** : [une ligne — ce qu'elle fait]
- **Utilisateur** : [qui, contexte d'usage, ce qu'il ressent]
- **Cœur émotionnel de CET écran** (le seul job) : [ex. « le marchand voit que l'argent est arrivé et y fait confiance »]
- **Action(s) primaire(s)** : [...]

## 3. DIRECTION ARTISTIQUE  ← la section qui décide du « pas générique »
- **Parti pris esthétique (UN seul, assumé, extrême)** : [ex. éditorial chaud / brutaliste utilitaire / luxe minimal / tactile joueur]
- **Références nord** : [App A, App B, App C] — extraire leur **[typo / espace / motion / retenue]**, **ne pas cloner**.
- **ÉLÉMENT SIGNATURE** (la seule chose qu'on retient) : [ex. un sceau de provenance, un traitement de chiffre unique, un motif lié à l'essence du produit]
- **Mots de ton** : [3–5 adjectifs]
- **À PROSCRIRE (marqueurs du générique)** : Inter/Roboto/polices système · dégradés violet-sur-blanc · palettes grises tièdes et équiréparties · composants Material/iOS par défaut non retravaillés · héro centré + 3 cartes · icônes stock · absence de motion.

## 4. DESIGN SYSTEM
- **Typographie** : display = [police distinctive + pourquoi], corps = [police] ; chiffres = **tabulaires** (montants) ; échelle + graisses.
- **Couleur** : fond [] · encre [] · dominante [] · accents [sémantiques : succès / attention] ; **règle d'usage** : une dominante + accents francs (pas de répartition timide).
- **Espace & grille** : unité de base [8px], marges, densité [aérée / dense].
- **Forme & profondeur** : rayons [] · philosophie d'ombre [douce en couches / plat / filet] · bordures.
- **Iconographie** : [épaisseur de trait, style, custom vs set].

## 5. MOTION
- **Entrée** : [montée étagée, ressort] · **micro-interactions** : [press, toggle] · **moment signature** : [la seule anim qui mérite du soin]. (CSS pur / lib Motion.)

## 6. SPÉCIFICATION ÉCRAN (par écran)
- **Écran** : [nom + rôle]
- **Layout (haut→bas)** : [liste des zones]
- **Hiérarchie** : [ce qui est le plus gros / focal]
- **Contenu = formes de données RÉELLES** (pas de lorem, pas de chiffres inventés s'ils sous-entendent une vraie feature) : [champs]
- **États** : vide [] · chargement [skeleton] · erreur [] · succès.
- **Composants réutilisés** : [...]

## 7. PLATEFORME & CONTRAINTES
- Mobile **[390×844]**, zones sûres / notch, portée du pouce, pattern de nav natif.
- **Accessibilité** : contraste AA, cible tactile ≥ 44px, type dynamique.
- Contraintes techno / perf : [...]

## 8. RÉFÉRENCES VISUELLES
[Attache 3–6 images.] Pour chacune : « **Prends [X] de celle-ci ; ignore [Y].** » Extraire le langage, jamais copier le layout au pixel.

## 9. SORTIE
- **Livrer** : [un fichier HTML autonome / un composable Compose / …]
- **Fidélité** : espacements soignés au pixel, vraies polices via [CDN/embarquées], adapté au cadre du téléphone.
- **Fournir aussi** : [l'écran + les valeurs de tokens choisies].

## 10. BARRE DE QUALITÉ (auto-check avant de rendre)
- Un inconnu se souviendrait-il de l'**élément signature** ?
- Est-ce que ça pourrait être **n'importe quelle autre app** ? Si oui → pousser la direction artistique plus loin.
- Chaque nombre/label est-il **réel** ? Espacements sur grille ? Motion intentionnelle ? Typo distinctive ?

---

### Mini-version (si prompt court)
> Conçois l'écran **[X]** de **[app]** pour **[user]**. Parti pris : **[1 direction]**, façon **[réf A/B/C]** sans copier. Signature mémorable : **[élément]**. Typo **[display/corps]** (chiffres tabulaires), couleur **[dominante + accents sémantiques]**, profondeur **[philosophie]**, motion **[entrée + 1 moment]**. Mobile 390×844, données **réelles** (champs : [...]), états vide/chargement/erreur. **Interdits** : Inter/Roboto, violet-sur-blanc, composants par défaut, héro centré + 3 cartes. Sortie : **[HTML autonome / Compose]**. Réfs visuelles jointes — extraire le langage, pas copier.
