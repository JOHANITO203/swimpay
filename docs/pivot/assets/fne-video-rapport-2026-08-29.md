---
source: C:/Users/Lenovo/Downloads/video_2026-08-29_19-52-53.mp4
title: video_2026-08-29_19-52-53.mp4
duration: 05:35
watched_at: 2026-08-29T19:57:12.468343+03:00
intent: Plateforme FNE DGI : parcours d emission, code TVA du non assujetti, FNE ou RNE au forfait, inscription, stickers, champs obligatoires
hero_frames: [frame_0001.jpg, frame_0009.jpg, frame_0017.jpg, frame_0025.jpg, frame_0033.jpg]
transcript_source: none
---

# video_2026-08-29_19-52-53.mp4

## TL;DR

- **La consultation d'un NCC renvoie le statut d'assujettissement a la TVA.** A
  00:46, la fiche de `2500736C` affiche : raison sociale, date de debut d'activite,
  statut « En activite », activite, **« Statut d'assujettissement a la TVA :
  Assujetti »** et la periode de derniere declaration TVA. C'est exactement la
  donnee dont le moteur de factures a besoin, et je la croyais indisponible.
- **Le nom d'utilisateur de la plateforme FNE est le NCC lui-meme** (01:16), sur
  `services.fne.dgi.gouv.ci/fr/login` — un domaine distinct du portail
  `fne.dgi.gouv.ci`.
- **Une entreprise porte un IDU ET un NCC** (01:31) : `CI-2025-0027163 N` et
  `2500736C`. Le tableau de bord affiche aussi le regime (RSI), la direction de
  rattachement et le centre d'impots.
- **Le formulaire confirme le guide** : quatre champs obligatoires seulement
  (type de facture, mode de paiement, type de facturation, nom du client), une
  case RNE sur le meme ecran, et un resume qui explicite **« Total HT apres
  remise »** avant la TVA.
- **La plateforme tient les factures RECUES et notifie a chaque reception** —
  une source de rapprochement des achats qu'on n'avait pas identifiee.


## Key moments

- **[00:00] Bureau Windows** — poste reel d'un cabinet, avec SAGE 100 installe.
  Le contexte est celui d'un expert-comptable en exercice.
- **[00:23] `e-impots.gouv.ci`** — le portail est segmente : *Immat. entreprises
  non residentes · Entreprises · **Experts-comptables** · CGA · Particuliers ·
  FNE*. L'acces entreprise demande adresse email + **numero de teledeclarant** +
  mot de passe saisi sur un pave numerique.
- **[00:46] Consultation d'un NCC — le moment le plus important** — le resultat
  liste sept informations dont **le statut d'assujettissement a la TVA** et la
  periode de derniere declaration. Protege par reCAPTCHA (« Je ne suis pas un
  robot »), comme mesure precedemment.
- **[01:09] `services.fne.dgi.gouv.ci/fr/login`** — la plateforme de service, a
  distinguer du portail d'information.
- **[01:16] Connexion** — **nom d'utilisateur = `2500736C`**, soit le NCC.
- **[01:31] Tableau de bord** — regime RSI, secteur AUTRE, **IDU
  `CI-2025-0027163 N`**, NCC `2500736C`, direction DRAS I, centre 836 Impots de
  Treichville II. Menu : tableau de bord, gestion des stickers, reçus et factures
  (emis / receptionnes), parametrage, gestion des utilisateurs, nomenclature.
- **[01:54] Generer la facture** — *Type de facturation* deroule :
  **B2B (Entreprise), B2C (Consommateur final), B2F (Client International),
  B2G (Etat et collectivites)**.
- **[02:17] Informations du client** — seul *Nom de la societe / du client* est
  obligatoire ; telephone et email sont facultatifs. Le champ *Autres Mentions*
  arrive prerempli avec les coordonnees bancaires du cabinet.
- **[02:40] Article** — quantite, reference, designation, unite, PU HT, remise %,
  total hors TVA, **taux d'imposition**, autres taxes.
- **[02:55] Resume** — Total HT · Remise · **Total HT apres remise** · Total TVA ·
  Total TTC · Autres taxes · Net a payer. Deux boutons : *Sauvegarder la facture*
  et *Generer la facture*.
- **[04:19] Factures receptionnees** — agregats sur 14 jours : 400 000 CFA hors
  TVA, **Total TVA = 0**. Un cas reel de facture recue sans TVA.
- **[04:42] Notifications** — « Vous avez reçu une nouvelle facture », jusqu'a
  219 jours d'anciennete, non lues. Le flux existe et n'est pas exploite.


## Hook microscope (0-10s)

- Frames: 20 at 2 fps

Sans objet : ce n'est pas une video editorialisee mais un **enregistrement
d'ecran** de navigation reelle. Les dix premieres secondes montrent le bureau
Windows puis l'ouverture de Chrome. Aucun procede d'accroche a analyser.

**Avertissement de methode** : l'echantillonnage par detection de plans a
d'abord rendu 18 images toutes situees avant 01:43, sur 05:35 de video — le
detecteur decroche sur un enregistrement d'ecran, dont les changements sont
lents et locaux. Relance en echantillonnage **uniforme** (44 images sur toute
la duree). Une couverture qui s'arrete au tiers ne se voit que si on la
regarde.


## Editorial profile

_No scene-change data — likely a static/screen-recorded source._

Capture d'ecran brute, 1280x712, sans montage ni texte incruste : navigation
continue dans un navigateur, rythme dicte par l'operatrice et non par un
monteur.


## Quotable moments

**Aucune citation disponible.** La bande son n'a pas pu etre transcrite : la
cle OpenAI configuree dans `~/.config/watch/.env` est refusee (HTTP 401,
`invalid_api_key`), et aucune cle Groq n'est presente.

C'est une perte reelle : la personne qui filme **repond oralement** aux
questions posees. Tout ce qui suit provient donc des seules images. Une cle
Groq valide permettrait de relancer la transcription sans reextraire les
images.


## Entities mentioned

- People: (non identifiees — pas de transcription)
- Companies: [[cabinet-topo-benhiba]] (NCC 2500736C, IDU CI-2025-0027163 N, regime RSI, assujetti TVA), [[dgi-cote-divoire]], [[bank-of-africa-ci]]
- Tools / products: [[plateforme-fne]], [[e-impots-gouv-ci]], [[sage-100]]
- Places: [[abidjan]], [[treichville]] (centre 836), DRAS I

## Concepts surfaced

- **Assujettissement lisible par NCC** : le statut TVA d'une entreprise est une
  donnee publique consultable, pas une declaration a recueillir aupres du client.
- **Double identifiant NCC / IDU** : une entreprise porte les deux ; le NCC sert
  d'identifiant de connexion, l'IDU est le nouveau format national.
- **Facture emise / facture receptionnee** : la plateforme tient les deux cotes,
  ce qui en fait un graphe et pas un registre a sens unique.
- **Sauvegarder contre generer** : deux etats, un seul certifie. Le brouillon n'a
  ni QR ni numero de serie.
- **Remise avant TVA** : l'ordre de calcul est explicite a l'ecran, ligne
  « Total HT apres remise ».


## Transcript

_No transcript available._

## All frames

_Total: 44. Hero frames flagged with star._

* `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0001.jpg` (t=00:00)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0002.jpg` (t=00:08)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0003.jpg` (t=00:15)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0004.jpg` (t=00:23)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0005.jpg` (t=00:30)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0006.jpg` (t=00:38)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0007.jpg` (t=00:46)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0008.jpg` (t=00:53)
* `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0009.jpg` (t=01:01)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0010.jpg` (t=01:09)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0011.jpg` (t=01:16)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0012.jpg` (t=01:24)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0013.jpg` (t=01:31)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0014.jpg` (t=01:39)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0015.jpg` (t=01:47)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0016.jpg` (t=01:54)
* `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0017.jpg` (t=02:02)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0018.jpg` (t=02:10)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0019.jpg` (t=02:17)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0020.jpg` (t=02:25)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0021.jpg` (t=02:32)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0022.jpg` (t=02:40)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0023.jpg` (t=02:48)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0024.jpg` (t=02:55)
* `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0025.jpg` (t=03:03)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0026.jpg` (t=03:10)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0027.jpg` (t=03:18)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0028.jpg` (t=03:26)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0029.jpg` (t=03:33)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0030.jpg` (t=03:41)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0031.jpg` (t=03:49)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0032.jpg` (t=03:56)
* `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0033.jpg` (t=04:04)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0034.jpg` (t=04:11)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0035.jpg` (t=04:19)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0036.jpg` (t=04:27)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0037.jpg` (t=04:34)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0038.jpg` (t=04:42)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0039.jpg` (t=04:49)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0040.jpg` (t=04:57)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0041.jpg` (t=05:05)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0042.jpg` (t=05:12)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0043.jpg` (t=05:20)
  `D:\Temp\claude\d--Dev-Projects-swimpay\8a888eb5-632b-4238-a056-4edd917e025d\scratchpad\fne-video\frames\frame_0044.jpg` (t=05:28)
