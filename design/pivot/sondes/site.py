# -*- coding: utf-8 -*-
# ═══════════ LE SITE SWIMPAY ═══════════
#
# Une page marketing, pas une app : elle DONNE ACCÈS à l'app, elle ne la
# remplace pas. L'expérience complète vit dans la PWA ; le web sert à
# comprendre, à s'inscrire, et à faire les gestes qui se font bien au clavier.
#
# Cinq pages, une seule page HTML, routées par ancre — même mécanique que le
# prototype, qui a fait ses preuves, et qui reste autonome (aucun appel
# extérieur, tout est embarqué).
#
# La matière vient de l'app : même grain, même acide, même typo. Une page qui
# présente un produit doit être DE ce produit.
import io, os, sys, base64, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

A = r"d:\Dev\Projects\swimpay\design\pivot\assets"
APP = r"d:\Dev\Projects\swimpay\design\pivot\ecran3-personnel-v6-acide.html"
OUT = r"d:\Dev\Projects\swimpay\design\pivot\site.html"
LIEN_APP = "https://claude.ai/code/artifact/359591a7-0b77-4707-aa3d-38d3260d280d"

def b64(chemin, mime):
    d = open(os.path.join(A, chemin), "rb").read()
    print(f"  {chemin[:38]:40} {len(d)//1024:5} Ko")
    return f'url("data:{mime};base64,{base64.b64encode(d).decode()}")'

def brut(chemin, mime):
    d = open(os.path.join(A, chemin), "rb").read()
    print(f"  {chemin[:38]:40} {len(d)//1024:5} Ko")
    return f"data:{mime};base64,{base64.b64encode(d).decode()}"

app = open(APP, encoding="utf-8").read()
def jeton(nom):
    m = re.search(r"--" + nom + r":\s*(url\(\"data:[^\"]+\"\))", app)
    assert m, "jeton introuvable : " + nom
    return m.group(1)

print("assets embarqués :")
grain = jeton("grain")
logo = jeton("carte-logo")
photo = b64("hero-personne.jpg", "image/jpeg")
photo_tel = b64("hero-personne-tel.jpg", "image/jpeg")
sujet = b64("hero-sujet.webp", "image/webp")
sujet_tel = b64("hero-sujet-tel.webp", "image/webp")
fond_flou = b64("hero-fond.webp", "image/webp")
video = brut("hero-anim.mp4", "video/mp4")
affiche = brut("hero-anim-poster.jpg", "image/jpeg")

# ── les rails, pour le Caméléon : l'accent n'est jamais fixe, il vient du
#    rail actif. Sur la page, le montrer EN LE FAISANT est plus juste que
#    l'expliquer. ──
RAILS = [
    ("SwimPay", "82 100% 50%", "#141414"),
    ("Orange Money", "24 100% 50%", "#FFFFFF"),
    ("Wave", "196 92% 48%", "#FFFFFF"),
    ("MTN MoMo", "48 100% 50%", "#141414"),
    ("Moov Money", "212 88% 52%", "#FFFFFF"),
]

def cartes(items, classe="grille"):
    out = []
    for titre, texte, detail in items:
        d = f'<em>{detail}</em>' if detail else ""
        out.append(f"""      <article class="fiche">
        <h3>{titre}</h3><p>{texte}</p>{d}
      </article>""")
    return f'<div class="{classe}">\n' + "\n".join(out) + "\n    </div>"

PERSONNEL = [
    ("Envoyer et recevoir",
     "Vers un numéro Mobile Money ou un compte bancaire, au Sénégal comme à "
     "Abidjan. L'application compare les routes et vous dit laquelle coûte le "
     "moins cher avant que vous ne validiez.",
     "Orange Money · MTN MoMo · Moov · Wave · virement bancaire"),
    ("Payer sans contact",
     "Votre carte vit dans votre téléphone. Au comptoir, vous approchez et "
     "vous payez, sans code à saisir ni appoint à faire.",
     "puce EMV et sans contact sur la carte principale"),
    ("Cartes virtuelles",
     "Un numéro à usage unique pour un abonnement ou un achat en ligne. Vous le "
     "régénérez quand vous voulez, l'ancien cesse aussitôt d'être accepté.",
     "plafond mensuel réglable · destruction définitive"),
    ("Épargner sans se bloquer",
     "Le coffre met votre argent de côté sur un sous-compte. Verrouillez-le "
     "jusqu'à une date, personne ne peut l'ouvrir avant, pas même vous.",
     "verrou daté · frais de commission coupés à l'entrée"),
]

BUSINESS = [
    ("Commerçant de quartier",
     "Encaisser au comptoir avec un code fixe ou un QR, et clôturer sa caisse "
     "le soir. L'écart entre le compté et l'encaissé se voit tout de suite.",
     "boutique · kiosque · restaurant"),
    ("PME qui paie des salaires",
     "Importez votre fichier de paie au format CSV ou Excel. L'application "
     "trouve la route de chaque employé et affiche ce que coûte chaque "
     "virement avant que vous ne signiez.",
     "double signature · coffre daté pour l'échéance"),
    ("Commerce en ligne",
     "Un lien de paiement à envoyer, ou un checkout intégré au site. Le "
     "reversement tombe sur le compte de l'entreprise, chaque jour.",
     "lien · checkout · SDK"),
    ("Cabinet comptable",
     "Plusieurs dossiers clients depuis une seule console, avec le "
     "rapprochement fait d'avance et les exports au format attendu.",
     "rapprochement automatique · export comptable"),
]

CODE_SDK = """&lt;script src="https://sdk.swimpay.pro/v1/checkout.js"&gt;&lt;/script&gt;
&lt;script&gt;
  SwimPay.checkout({
    cle: "pk_live_votre_cle",
    montant: 25000,
    devise: "XOF",
    reference: "CMD-2041",
    surSucces: (paiement) =&gt; console.log(paiement.reference),
  });
&lt;/script&gt;"""

HTML = f"""<meta charset="utf-8">
<title>SwimPay</title>
<!-- Sans ce meta, un telephone met la page en page a 980 px et la reduit :
     aucune de nos regles <= 880 px ne s applique, la bande photo du heros
     fait 0x0, et une sonde qui demande 390 px MESURE 980 sans le dire.
     Le charset au-dessus n est pas decoratif non plus : sans lui, Chrome
     DEVINE l encodage, et il a devine faux — Integration s affichait
     IntEgration des que le debut du fichier a change de quelques octets. -->
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap">
<style>
/* La matière vient de l'app : même grain, même acide, même typo.
   Une page qui présente un produit doit être DE ce produit. */
:root {{
  --fond: #FFFFFF;
  --fond-2: #F4F4F2;
  --encre: #141414;
  --sourd: #63635F;
  --trait: #E4E4E0;
  --trait-fort: #C9C9C3;
  --acide: #A2FF01;
  --noir: #141414;
  --grain: {grain};
  --logo: {logo};
  --photo: {photo};
  --photo-tel: {photo_tel};
  --sujet: {sujet};
  --sujet-tel: {sujet_tel};
  --fond-flou: {fond_flou};
  --sortie: cubic-bezier(.23, 1, .32, 1);
  --deux-sens: cubic-bezier(.77, 0, .175, 1);
  /* le Caméléon : une seule teinte pilote toute la section, et elle change */
  --h: 82; --s: 100%; --l: 50%;
  --cam: hsl(var(--h) var(--s) var(--l));
  --cam-encre: #141414;
}}
* {{ box-sizing: border-box; }}
html {{ scroll-behavior: smooth; }}
body {{
  margin: 0; background: var(--fond); color: var(--encre);
  font-family: "Outfit", ui-sans-serif, system-ui, "Segoe UI", sans-serif;
  font-size: 17px; line-height: 1.6; font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased; overflow-x: clip;
}}
img, svg, video {{ max-width: 100%; display: block; }}
a {{ color: inherit; text-decoration: none; }}
.dedans {{ width: min(100% - 40px, 1180px); margin-inline: auto; }}

/* ─── NAVIGATION ─── */
:root {{ --h-nav: 68px; }}
.nav {{
  position: sticky; top: 0; z-index: 40;
  background: color-mix(in srgb, var(--fond) 86%, transparent);
  backdrop-filter: blur(14px); border-bottom: 1px solid var(--trait);
  transition: background-color 220ms ease, border-color 220ms ease;
}}
/* sur le heros, la barre s efface pour laisser l image commencer au premier
   pixel ; elle se repose des qu on defile */
.nav[data-pose="non"] {{
  background: transparent; backdrop-filter: none; border-bottom-color: transparent;
}}
.nav[data-pose="non"] a.onglet {{ color: rgba(20, 20, 20, .72); }}
.nav[data-pose="non"] a.onglet[aria-current="page"] {{
  color: var(--noir); background: rgba(20, 20, 20, .08);
}}
.nav[data-pose="non"] .bouton.creux {{ border-color: rgba(20, 20, 20, .34); }}
.nav-in {{ display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-height: 68px; }}
/* display:contents fait disparaitre le conteneur de la mise en page : les trois
   onglets restent des items du meme flex qu avant. En telephone il redevient
   une boite, et passe a la ligne. */
.onglets {{ display: contents; }}
.logo {{ display: flex; align-items: center; gap: 10px; margin-right: 28px; }}
.logo i {{ width: 24px; height: 27px; background: var(--logo) center / contain no-repeat; filter: brightness(0); }}
.logo b {{ font-size: 19px; font-weight: 600; letter-spacing: -.02em; }}
.nav a.onglet {{
  padding: 10px 14px; border-radius: 999px; font-size: 15.5px; font-weight: 500;
  color: var(--sourd); transition: color 180ms ease, background-color 180ms ease;
}}
.nav a.onglet[aria-current="page"] {{ color: var(--encre); background: var(--fond-2); }}
.nav .grow {{ flex: 1; }}
.bouton {{
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  min-height: 46px; padding: 0 20px; border-radius: 999px; border: 0; cursor: pointer;
  font-family: inherit; font-size: 15.5px; font-weight: 500;
  transition: transform 140ms var(--sortie), background-color 180ms ease;
}}
.bouton.plein {{ background: var(--noir); color: #FFFFFF; }}
.bouton.acide {{ background: var(--acide); color: var(--noir); font-weight: 600; }}
.bouton.creux {{ background: none; border: 1px solid var(--trait-fort); color: var(--encre); }}
.bouton.grand {{ min-height: 56px; padding: 0 28px; font-size: 17px; }}
.bouton:active {{ transform: scale(.97); }}
.burger {{ display: none; }}

/* ─── PAGES ─── */
.page {{ display: none; }}
.page.active {{ display: block; }}

/* ─── HÉROS ───
   Bord a bord, et l image commence AU PREMIER PIXEL : elle passe SOUS la barre
   de navigation, qui devient transparente tant qu on est dessus. */
.heros {{
  position: relative; overflow-x: clip; overflow-y: visible; z-index: 2;
  background: var(--acide);
  margin-top: calc(-1 * var(--h-nav));
  padding-top: var(--h-nav);
}}
/* Le sujet occupe la droite du cadre ; le texte tient sur le vert de gauche.
   Un voile tres court renforce ce cote sans ternir la photo : sans lui, un
   texte pose sur une image est une loterie de contraste. */
.heros::before {{
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(96deg,
    hsl(82 100% 50% / .96) 0%, hsl(82 100% 50% / .82) 28%,
    hsl(82 100% 50% / .18) 52%, transparent 68%);
}}
.heros-in {{
  position: relative; z-index: 1;
  display: grid; grid-template-columns: minmax(0, 1fr);
  align-items: center; min-height: min(86vh, 780px); padding: 72px 0 80px;
}}
.heros-in {{ position: relative; z-index: 3; }}
.heros-in > div {{ max-width: min(46ch, 52%); }}
/* ─── LES TROIS COUCHES DU HÉROS ───
   Le fond flou pose la profondeur, le sujet net la traverse. On les DÉCALE
   nettement (échelle et position) : superposés au même endroit, les deux
   silhouettes se doubleraient et l'effet tomberait à plat. */
.heros-fond {{
  position: absolute; inset: -22% -18% -22% auto; width: 88%;
  background: var(--fond-flou) center / cover no-repeat;
  opacity: .82; pointer-events: none;
  -webkit-mask-image: radial-gradient(74% 66% at 72% 48%, #000 0%, transparent 68%);
          mask-image: radial-gradient(74% 66% at 72% 48%, #000 0%, transparent 68%);
}}
/* Le sujet déborde le bas du héros et empiète sur la section suivante :
   c'est ce débord qui le fait sortir de l'image. */
.heros-sujet {{
  position: absolute; right: -3%; bottom: -9%; width: 68%; aspect-ratio: 1.79;
  background: var(--sujet) center bottom / contain no-repeat;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(to bottom, #000 76%, transparent 99%);
          mask-image: linear-gradient(to bottom, #000 76%, transparent 99%);
  filter: drop-shadow(0 30px 60px rgba(20, 20, 20, .28));
}}
@media (prefers-reduced-motion: no-preference) {{
  /* Le défilement écarte les deux couches. En CSS seul : pas de gestionnaire
     de scroll, donc rien à désynchroniser. Sans prise en charge, tout reste
     simplement en place — la page ne perd rien. */
  @supports (animation-timeline: scroll()) {{
    .heros-fond, .heros-sujet {{
      animation: linear both; animation-timeline: scroll(root);
      animation-range: 0 620px;
    }}
    .heros-fond {{ animation-name: derive-fond; }}
    .heros-sujet {{ animation-name: derive-sujet; }}
  }}
}}
@keyframes derive-fond {{ to {{ transform: translateY(74px) scale(1.07); }} }}
@keyframes derive-sujet {{ to {{ transform: translateY(-26px); }} }}
.heros h1 {{
  margin: 0; font-size: clamp(40px, 6.4vw, 85px); line-height: 1;
  font-weight: 500; letter-spacing: -.024em; color: var(--noir); text-wrap: balance;
}}
.heros h1 em {{ font-style: normal; display: block; }}
.heros .dit {{
  margin: 26px 0 0; max-width: 44ch; font-size: clamp(16.5px, 1.4vw, 18px);
  line-height: 1.34; color: rgba(20, 20, 20, .78);
}}
.heros .gestes {{ display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; }}
.heros .sous {{ margin: 18px 0 0; font-size: 14px; color: rgba(20, 20, 20, .6); }}
/* Sur telephone, couvrir une image de ratio 1,79 dans un cadre etroit
   couperait le sujet en deux : elle devient une bande haute, et le texte
   reprend sa place sur l acide en dessous. */
@media (max-width: 880px) {{
  .heros {{
    background-image: none; background-color: var(--acide);
    padding-top: 0; margin-top: 0;
    /* Le heros rogne son debord au bureau (le voile). En telephone, ce meme
       overflow COUPAIT les 122 px que la bande remonte sous la barre : la
       boite disait « haut 0 », et la peinture commencait a 122.
       On coupe donc les COTES seulement : « overflow: visible » tout court
       ecrasait le clip lateral, et le sujet decoupe poussait la page a 441 px
       de large sur un ecran de 390. */
    overflow-x: clip; overflow-y: visible;
  }}
  .heros::before {{ content: none; }}
  .heros-fond {{ display: none; }}
  /* Au telephone il n'y a pas de place pour deux colonnes : le sujet decoupe
     tient TOUTE la bande, sur l'acide, et deborde sur le texte en dessous. */
  .heros-bande {{
    height: 300px;
    margin-top: calc(-1 * var(--h-nav));
    background: none;
  }}
  /* La barre garde son sol acide sur les 122 premiers pixels : un sujet pose
     a top 0 y perd sa tete. Il commence donc SOUS elle, et deborde en bas sur
     l'acide — c'est la, au telephone, qu'il sort de l'image. */
  .heros-sujet {{
    position: absolute; left: 50%; right: auto; top: var(--h-nav); bottom: auto;
    width: 152%; height: 340px; aspect-ratio: auto; margin-left: -76%;
    background-image: var(--sujet-tel);
    background-size: contain; background-position: center top;
    filter: drop-shadow(0 16px 30px rgba(20, 20, 20, .20));
  }}
  /* Mesure : le titre pose sur le tailleur et l'ombre du bras tombait a
     1,00:1 — du noir sur du noir. Il commence donc la ou le fondu a deja
     eteint le sujet. Le chevauchement reste, la lisibilite aussi. */
  .heros-in {{ min-height: 0; padding: 196px 0 56px; }}
  .heros-in > div {{ max-width: none; }}
}}
@media (min-width: 881px) {{ .heros-bande {{ display: none; }} }}

/* ─── SECTIONS ─── */
.sect {{ padding: clamp(72px, 9vw, 128px) 0; }}
.sect.sombre {{ background: var(--noir); color: #FFFFFF; }}
.sect.sombre .para {{ color: rgba(255, 255, 255, .68); }}
.sect.gris {{ background: var(--fond-2); }}
h2 {{
  margin: 0 0 20px; font-size: clamp(30px, 4.4vw, 50px); line-height: 1;
  font-weight: 500; letter-spacing: -.012em; max-width: 16ch; text-wrap: balance;
}}
.para {{ margin: 0; max-width: 58ch; font-size: 18px; line-height: 1.34; color: var(--sourd); }}
.para b {{ color: inherit; font-weight: 500; }}
.sect.sombre .para b {{ color: #FFFFFF; }}

/* ─── LE CAMÉLÉON ───
   L'accent n'est jamais fixe : il vient du rail actif. Sur la page, on le
   MONTRE en le faisant — la teinte passe d'un rail à l'autre, et toute la
   section suit. Expliquer « l'app s'adapte » convainc moins que le voir. */
.cam-duo {{ display: grid; grid-template-columns: 1fr .8fr; gap: clamp(32px, 5vw, 72px); align-items: center; }}
.cam-video {{
  border-radius: 28px; overflow: hidden; aspect-ratio: 9 / 16;
  max-height: 560px; margin-inline: auto; position: relative;
  box-shadow: 0 30px 80px rgba(0, 0, 0, .5);
  outline: 1px solid color-mix(in srgb, var(--cam) 34%, transparent);
}}
.cam-video video {{ width: 100%; height: 100%; object-fit: cover; }}
.cam-video::after {{
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: hsl(var(--h) var(--s) var(--l) / .30); mix-blend-mode: color;
  transition: background-color 900ms var(--deux-sens);
}}
.rails {{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 30px; }}
.rail {{
  padding: 9px 16px; border-radius: 999px; font-size: 14.5px; font-weight: 500;
  border: 1px solid rgba(255, 255, 255, .18); color: rgba(255, 255, 255, .6);
  background: none; cursor: pointer; font-family: inherit;
  transition: color 260ms ease, background-color 260ms ease, border-color 260ms ease,
              transform 140ms var(--sortie);
  min-height: 44px;
}}
.rail[aria-pressed="true"] {{
  background: var(--cam); border-color: var(--cam); color: var(--cam-encre); font-weight: 600;
}}
.rail:active {{ transform: scale(.97); }}
.cam-quoi {{ margin-top: 22px; font-size: 15.5px; color: rgba(255, 255, 255, .62); }}
.cam-quoi b {{ color: var(--cam); font-weight: 600; }}

/* ─── FICHES ─── */
.grille {{ display: grid; gap: 16px; margin-top: 44px; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); }}
.fiche {{
  padding: 30px; border-radius: 24px; background: var(--fond);
  border: 1px solid var(--trait);
  transition: transform 160ms var(--sortie), border-color 200ms ease, box-shadow 200ms ease;
}}
.sect.sombre .fiche {{ background: #1C1C1C; border-color: #2A2A2A; }}
.fiche h3 {{ margin: 0 0 10px; font-size: 22px; font-weight: 500; letter-spacing: -.01em; }}
.fiche p {{ margin: 0; font-size: 16px; color: var(--sourd); }}
.sect.sombre .fiche p {{ color: rgba(255, 255, 255, .64); }}
.fiche em {{ display: block; margin-top: 16px; font-style: normal; font-size: 13.5px; color: var(--sourd); }}
.sect.sombre .fiche em {{ color: var(--acide); }}
@media (hover: hover) and (pointer: fine) {{
  .fiche:hover {{ transform: translateY(-3px); border-color: var(--trait-fort); box-shadow: 0 16px 40px rgba(20, 20, 20, .07); }}
  .bouton:hover {{ transform: translateY(-1px); }}
  .nav a.onglet:hover {{ color: var(--encre); }}
}}

/* ─── CODE ─── */
.code {{
  margin-top: 32px; padding: 26px 28px; border-radius: 22px; overflow-x: auto;
  background: var(--noir); color: #E8E8E4; border: 1px solid #2A2A2A;
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 14px; line-height: 1.75;
}}
.code b {{ color: var(--acide); font-weight: 400; }}
.code i {{ color: #7E7E78; font-style: normal; }}

/* ─── FORMULAIRES ─── */
.form-hote {{ display: grid; grid-template-columns: 1fr 1fr; min-height: 78vh; }}
.form-cote {{
  background: var(--acide) var(--photo) center / cover no-repeat;
  background-blend-mode: luminosity; position: relative;
}}
.form-cote::after {{
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(160deg, hsl(82 100% 50% / .55), hsl(82 100% 32% / .75));
  mix-blend-mode: multiply;
}}
.form-corps {{ display: flex; align-items: center; padding: clamp(36px, 6vw, 84px); }}
.form-corps > div {{ width: min(100%, 420px); margin-inline: auto; }}
.champ-l {{ display: block; margin: 20px 0 7px; font-size: 14.5px; font-weight: 500; }}
.champ {{
  width: 100%; min-height: 52px; padding: 0 16px; border-radius: 14px;
  border: 1px solid var(--trait-fort); background: var(--fond); color: var(--encre);
  font-family: inherit; font-size: 16px;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}}
.champ:focus-visible {{
  outline: none; border-color: var(--encre);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--acide) 52%, transparent);
}}
.aide {{ margin: 8px 0 0; font-size: 13.5px; color: var(--sourd); }}
.form-note {{
  margin-top: 26px; padding: 16px 18px; border-radius: 16px;
  background: var(--fond-2); font-size: 14px; color: var(--sourd);
}}

/* ─── PIED ─── */
footer {{ background: var(--noir); color: rgba(255, 255, 255, .6); padding: 70px 0 46px; }}
.pied {{ display: grid; grid-template-columns: 1.4fr repeat(3, 1fr); gap: 40px; }}
.pied h4 {{ margin: 0 0 14px; font-size: 12.5px; letter-spacing: .01em; text-transform: none; color: rgba(255, 255, 255, .52); font-weight: 600; }}
.pied ul {{ list-style: none; margin: 0; padding: 0; display: grid; font-size: 15px; }}
/* 44 px de cible jusque dans le pied : la regle ne s arrete pas la ou l on
   croit que plus personne ne clique */
.pied li {{ display: flex; }}
.pied ul a, .pied li {{ min-height: 44px; display: inline-flex; align-items: center; }}
.logo {{ min-height: 44px; }}
.pied a {{ transition: color 180ms ease; }}
.pied .logo b {{ color: #FFFFFF; }}
.pied .logo i {{ filter: none; }}
.pied .mot {{ margin: 16px 0 0; max-width: 34ch; font-size: 15px; }}
.pied-bas {{
  display: flex; flex-wrap: wrap; gap: 14px; justify-content: space-between;
  margin-top: 54px; padding-top: 26px; border-top: 1px solid #262626; font-size: 14px;
}}
@media (hover: hover) and (pointer: fine) {{ .pied a:hover {{ color: #FFFFFF; }} }}

/* ─── FORMATS ─── */
@media (max-width: 980px) {{
  .heros-in {{ grid-template-columns: 1fr; gap: 34px; }}
  .cam-duo {{ grid-template-columns: 1fr; }}
  .form-hote {{ grid-template-columns: 1fr; }}
  .form-cote {{ min-height: 200px; }}
  .pied {{ grid-template-columns: 1fr 1fr; }}
}}
@media (max-width: 720px) {{
  /* La barre passe sur DEUX lignes : identite et compte en haut, les trois
     sections en dessous. Les cacher — ce qu on faisait — rendait trois pages
     sur cinq inatteignables au telephone, et laissait quand meme la premiere
     ligne deborder de 8 px. */
  :root {{ --h-nav: 122px; }}   /* repli : le script mesure la vraie hauteur */
  .nav-in {{ padding-top: 9px; padding-bottom: 9px; }}
  /* Le nom ecrit coute 86 px et fait tomber « S'inscrire » sur une troisieme
     ligne. Le symbole seul suffit en haut d un telephone ; le mot reste lu
     par les lecteurs d ecran, hors du flux donc sans largeur. */
  .logo {{ margin-right: 0; min-width: 44px; justify-content: center; }}
  .logo b {{
    position: absolute; width: 1px; height: 1px;
    overflow: hidden; clip-path: inset(50%); white-space: nowrap;
  }}
  .onglets {{
    display: flex; order: 3; flex-basis: 100%; gap: 4px;
    margin: 0 -4px; overflow-x: auto; scrollbar-width: none;
  }}
  .onglets::-webkit-scrollbar {{ display: none; }}
  /* Au bureau la barre peut rester transparente sur le heros : le sujet est
     decale a droite, le texte de la barre vit sur l acide du fond de studio.
     Au telephone le sujet occupe le CENTRE — « Se connecter » tombait sur des
     cheveux noirs. La barre reprend donc un sol, dans l acide meme du fond de
     la photo : le raccord reste invisible, l image part toujours du pixel 0. */
  .nav[data-pose="non"] {{
    background: hsl(82 100% 50% / .93); backdrop-filter: blur(10px);
  }}
  .nav[data-pose="non"] a.onglet {{ color: rgba(20, 20, 20, .74); }}
  .nav a.onglet {{ padding: 12px 12px; white-space: nowrap; }}
  .bouton {{ padding: 0 15px; }}
  .pied {{ grid-template-columns: 1fr; gap: 30px; }}
}}

/* ─── MOUVEMENT ───
   Court, et seulement là où il dit quelque chose. Coupé si l'on n'en veut pas. */
@media (prefers-reduced-motion: no-preference) {{
  .page.active .dedans > *, .page.active .heros-in > * {{
    animation: parait 520ms var(--sortie) backwards;
  }}
  @keyframes parait {{ from {{ opacity: 0; transform: translateY(14px); }} }}
  .page.active .heros-in > *:nth-child(2) {{ animation-delay: 90ms; }}
  .fiche {{ animation: parait 520ms var(--sortie) backwards; }}
  .fiche:nth-child(2) {{ animation-delay: 60ms; }}
  .fiche:nth-child(3) {{ animation-delay: 120ms; }}
  .fiche:nth-child(4) {{ animation-delay: 180ms; }}
}}
@media (prefers-reduced-motion: reduce) {{
  html {{ scroll-behavior: auto; }}
  .page.active .dedans > *, .page.active .heros-in > *, .fiche {{ animation: none; }}
  .cam-video::after {{ transition: none; }}
}}
</style>

<nav class="nav">
  <div class="dedans nav-in">
    <a class="logo" href="#accueil"><i aria-hidden="true"></i><b>SwimPay</b></a>
    <span class="onglets">
      <a class="onglet" href="#personnel">Personnel</a>
      <a class="onglet" href="#business">Business</a>
      <a class="onglet" href="#integration">Intégration</a>
    </span>
    <span class="grow"></span>
    <a class="bouton creux" href="#connexion">Se connecter</a>
    <a class="bouton acide" href="#inscription">S'inscrire</a>
  </div>
</nav>

<main>
<!-- ══════════ ACCUEIL ══════════ -->
<div class="page" id="accueil">
  <header class="heros">
    <div class="heros-fond" aria-hidden="true"></div>
    <div class="heros-sujet" role="img" aria-label="Une utilisatrice de SwimPay"></div>
    <div class="heros-bande" role="img" aria-label="Une utilisatrice de SwimPay"></div>
    <div class="dedans heros-in">
      <div>
        <h1>Bien plus qu'une <em>application</em></h1>
        <p class="dit">Envoyez de l'argent à vos proches, recevez votre salaire et
          payez vos employés depuis un seul compte. Émettez vos factures FNE et
          automatisez vos paiements récurrents en une minute.</p>
        <div class="gestes">
          <a class="bouton plein grand" href="#telecharger">Télécharger l'application</a>
          <a class="bouton creux grand" href="{LIEN_APP}#accueil" target="_blank" rel="noopener">Voir l'application</a>
        </div>
      </div>
    </div>
  </header>

  <!-- ── section 1 : le gain de temps, et le Caméléon ── -->
  <section class="sect sombre" id="temps">
    <div class="dedans">
      <div class="cam-duo">
        <div>
          <h2>Émettez vos factures en une minute</h2>
          <p class="para">Vos opérations et vos <b>factures FNE approuvées par la
            DGI</b> partent en une minute. Le numéro, le QR de contrôle et
            l'archive légale les accompagnent, vous n'avez rien à ressaisir
            ailleurs.</p>
          <div class="rails" role="group" aria-label="Réseaux pris en charge">
            {"".join(f'<button class="rail" data-h="{h}" data-encre="{e}"{" aria-pressed=~true~" if i == 0 else ""}>{n}</button>' for i, (n, h, e) in enumerate(RAILS)).replace("~", chr(34))}
          </div>
          <p class="cam-quoi">L'application prend la couleur du réseau que vous
            utilisez. <b>Un seul compte</b> pour Orange Money, Wave, MTN et Moov.</p>
        </div>
        <div class="cam-video">
          <video src="{video}" poster="{affiche}" muted loop playsinline
                 preload="metadata" aria-label="Animation SwimPay"></video>
        </div>
      </div>
    </div>
  </section>

  <!-- ── section 2 : l'épargne ── -->
  <section class="sect">
    <div class="dedans">
      <h2>Mettez de l'argent de côté</h2>
      <p class="para">Rangez votre argent dans un coffre et récupérez-le quand vous
        voulez. Verrouillez-le jusqu'à une date si vous préférez ne pas y toucher
        avant, <b>personne ne peut l'ouvrir entre-temps</b>.</p>
      {cartes([
        ("Le coffre", "Rangez de l'argent de côté en un geste depuis votre compte principal.", "les frais de commission sont coupés à l'entrée"),
        ("Le verrou daté", "Choisissez une échéance. Le coffre refuse de s'ouvrir avant, et vous dit jusqu'à quand.", "7 jours · 30 jours · 3 mois · 6 mois"),
        ("Reprendre quand vous voulez", "Sans verrou, votre argent revient sur le compte principal tout de suite.", "aucun délai, aucun frais de sortie"),
      ])}
    </div>
  </section>

  <!-- ── section 3 : la sécurité ── -->
  <section class="sect gris">
    <div class="dedans">
      <h2>Votre argent est en sécurité</h2>
      <p class="para">Chaque compte repose sur un <b>compte de dépôt réel</b>. Chaque
        mouvement y est inscrit avec sa date, sa référence et ses frais.</p>
      {cartes([
        ("Une identité vérifiée", "Votre compte suit votre identité. Changer de puce ne vous fait pas perdre votre compte.", "un citoyen · plusieurs téléphones · un compte"),
        ("Chaque geste se confirme", "Code, empreinte ou visage avant qu'un montant ne parte. Une entreprise peut exiger deux signatures.", "PIN · biométrie · double validation"),
        ("Tout est tracé", "Date, référence, frais, route empruntée. Un reçu complet pour chaque opération.", "grand livre · exports comptables"),
      ])}
    </div>
  </section>

  <!-- ── téléchargement ── -->
  <section class="sect sombre" id="telecharger">
    <div class="dedans" style="text-align: center">
      <h2 style="margin-inline: auto">Installez SwimPay en un geste</h2>
      <p class="para" style="margin-inline: auto">L'application s'installe depuis
        votre navigateur, sans passer par un magasin. Elle fonctionne hors connexion
        et se synchronise dès que le réseau revient.</p>
      <div class="gestes" style="justify-content: center; margin-top: 34px; display: flex; gap: 12px; flex-wrap: wrap">
        <button class="bouton acide grand" id="installer">Installer l'application</button>
        <a class="bouton creux grand" href="{LIEN_APP}#accueil" target="_blank" rel="noopener"
           style="border-color: #3A3A3A; color: #FFFFFF">Essayer sur le web</a>
      </div>
      <p class="para" id="installer-mot" style="margin-inline: auto; margin-top: 20px; font-size: 14.5px"></p>
    </div>
  </section>
</div>

<!-- ══════════ PERSONNEL ══════════ -->
<div class="page" id="personnel">
  <section class="sect">
    <div class="dedans">
      <h2>Tout votre argent au même endroit</h2>
      <p class="para">Votre compte s'ouvre avec votre <b>numéro de téléphone</b>.
        Vous envoyez, vous recevez et vous épargnez sans changer d'application.</p>
      {cartes(PERSONNEL)}
      <div class="gestes" style="margin-top: 44px; display: flex; gap: 12px; flex-wrap: wrap">
        <a class="bouton acide grand" href="#inscription">Ouvrir un compte</a>
        <a class="bouton creux grand" href="{LIEN_APP}#accueil" target="_blank" rel="noopener">Voir ces écrans</a>
      </div>
    </div>
  </section>
</div>

<!-- ══════════ BUSINESS ══════════ -->
<div class="page" id="business">
  <section class="sect">
    <div class="dedans">
      <h2>Un compte pour quatre métiers</h2>
      <p class="para">Un commerçant, une PME, une boutique en ligne et un cabinet
        comptable ne font pas le même travail. Chacun retrouve ses écrans, sur la
        même chaîne de paiement.</p>
      {cartes(BUSINESS)}
      <div class="gestes" style="margin-top: 44px; display: flex; gap: 12px; flex-wrap: wrap">
        <a class="bouton acide grand" href="#inscription">Ouvrir un compte professionnel</a>
        <a class="bouton creux grand" href="{LIEN_APP}#b-pme" target="_blank" rel="noopener">Voir la console PME</a>
      </div>
    </div>
  </section>
</div>

<!-- ══════════ INTÉGRATION ══════════ -->
<div class="page" id="integration">
  <section class="sect">
    <div class="dedans">
      <h2>Encaissez depuis votre site</h2>
      <p class="para">Le SDK ouvre une page de paiement hébergée par SwimPay. Les
        identifiants de vos clients ne passent jamais par votre serveur.</p>
      <div class="code"><pre style="margin:0">{CODE_SDK}</pre></div>
      {cartes([
        ("Le checkout est hébergé", "Il s'ouvre par-dessus votre page. Les informations de paiement ne transitent pas chez vous.", "aucune donnée sensible sur votre serveur"),
        ("Il parle la devise du client", "Le montant est affiché dans la devise que l'acheteur comprend, converti au taux du jour.", "XOF · EUR · USD"),
        ("Un webhook confirme", "Votre serveur reçoit la confirmation signée. C'est elle qui fait foi, pas le retour navigateur.", "signature HMAC · rejeu idempotent"),
      ])}
      <div class="gestes" style="margin-top: 44px; display: flex; gap: 12px; flex-wrap: wrap">
        <a class="bouton acide grand" href="#inscription">Obtenir une clé</a>
        <a class="bouton creux grand" href="{LIEN_APP}#ec-checkout" target="_blank" rel="noopener">Voir le checkout</a>
      </div>
    </div>
  </section>
</div>

<!-- ══════════ CONNEXION ══════════ -->
<div class="page" id="connexion">
  <div class="form-hote">
    <div class="form-cote" aria-hidden="true"></div>
    <div class="form-corps">
      <div>
        <h2 style="font-size: clamp(28px, 3.4vw, 40px)">Se connecter</h2>
        <p class="para">Retrouvez votre espace personnel.</p>
        <form id="f-connexion" novalidate>
          <label class="champ-l" for="c-tel">Numéro de téléphone</label>
          <input class="champ" id="c-tel" name="tel" type="tel" inputmode="tel"
                 autocomplete="tel" placeholder="+225 07 07 12 34 56" required>
          <label class="champ-l" for="c-code">Code à 4 chiffres</label>
          <input class="champ" id="c-code" name="code" type="password" inputmode="numeric"
                 autocomplete="current-password" maxlength="4" placeholder="••••" required>
          <p class="aide">Le même code que dans l'application.</p>
          <button class="bouton plein grand" type="submit" style="width: 100%; margin-top: 26px">Se connecter</button>
        </form>
        <div class="form-note">Pas encore de compte ?
          <a href="#inscription" style="color: var(--encre); font-weight: 500">S'inscrire</a></div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════ INSCRIPTION ══════════ -->
<div class="page" id="inscription">
  <div class="form-hote">
    <div class="form-cote" aria-hidden="true"></div>
    <div class="form-corps">
      <div>
        <h2 style="font-size: clamp(28px, 3.4vw, 40px)">Ouvrir un compte</h2>
        <p class="para">Comptez quelques minutes et une pièce d'identité.</p>
        <form id="f-inscription" novalidate>
          <label class="champ-l" for="i-nom">Nom et prénoms</label>
          <input class="champ" id="i-nom" name="nom" autocomplete="name" placeholder="Camille Laurent" required>
          <label class="champ-l" for="i-tel">Numéro de téléphone</label>
          <input class="champ" id="i-tel" name="tel" type="tel" inputmode="tel"
                 autocomplete="tel" placeholder="+225 07 07 12 34 56" required>
          <p class="aide">C'est lui qui identifiera votre compte.</p>
          <label class="champ-l" for="i-usage">Vous ouvrez ce compte pour</label>
          <select class="champ" id="i-usage" name="usage">
            <option value="perso">Moi-même</option>
            <option value="commercant">Mon commerce</option>
            <option value="pme">Mon entreprise</option>
            <option value="ecommerce">Ma boutique en ligne</option>
            <option value="comptable">Mon cabinet comptable</option>
          </select>
          <button class="bouton acide grand" type="submit" style="width: 100%; margin-top: 26px">Continuer</button>
        </form>
        <div class="form-note">La vérification d'identité se fait dans l'application :
          pièce, selfie, et le compte est ouvert.</div>
      </div>
    </div>
  </div>
</div>
</main>

<footer>
  <div class="dedans">
    <div class="pied">
      <div>
        <a class="logo" href="#accueil"><i aria-hidden="true"></i><b>SwimPay</b></a>
        <p class="mot">SwimPay détient vos fonds sur un compte de dépôt réel. Votre
          compte s'ouvre avec votre numéro de téléphone.</p>
      </div>
      <div>
        <h4>Produit</h4>
        <ul>
          <li><a href="#personnel">Personnel</a></li>
          <li><a href="#business">Business</a></li>
          <li><a href="#integration">Intégration</a></li>
          <li><a href="#telecharger">Télécharger</a></li>
        </ul>
      </div>
      <div>
        <h4>Compte</h4>
        <ul>
          <li><a href="#connexion">Se connecter</a></li>
          <li><a href="#inscription">S'inscrire</a></li>
          <li><a href="{LIEN_APP}#accueil" target="_blank" rel="noopener">Voir l'application</a></li>
        </ul>
      </div>
      <div>
        <h4>Cadre</h4>
        <ul>
          <li>Facturation FNE · DGI</li>
          <li>Côte d'Ivoire · zone UEMOA</li>
          <li>Fonds détenus en compte de dépôt</li>
        </ul>
      </div>
    </div>
    <div class="pied-bas">
      <span>© 2026 SwimPay</span>
      <span>Prototype d'interface. Aucun service n'est encore branché.</span>
    </div>
  </div>
</footer>

<script>
/* ─── LE ROUTAGE ───
   Cinq pages, une seule page HTML, routées par ancre. Même mécanique que le
   prototype : elle a fait ses preuves, et la page reste autonome. */
const PAGES = ["accueil", "personnel", "business", "integration", "connexion", "inscription"];
const va = (id) => {{
  const cible = PAGES.includes(id) ? id : "accueil";
  PAGES.forEach((p) => {{
    const e = document.getElementById(p);
    if (e) e.classList.toggle("active", p === cible);
  }});
  document.querySelectorAll(".nav a.onglet").forEach((a) => {{
    const est = a.getAttribute("href") === "#" + cible;
    if (est) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  }});
  document.title = cible === "accueil" ? "SwimPay"
    : "SwimPay · " + cible.charAt(0).toUpperCase() + cible.slice(1);
  window.scrollTo({{ top: 0, behavior: "instant" }});
}};
addEventListener("hashchange", () => {{
  const h = location.hash.slice(1);
  /* une ancre INTERNE à la page courante (#telecharger) fait défiler, elle ne
     change pas de page — sans ce partage, le lien du pied ramenait à l'accueil
     puis y restait sans rien montrer */
  if (!PAGES.includes(h) && document.getElementById(h)) {{
    const cible = document.getElementById(h);
    if (cible.closest(".page.active")) {{ cible.scrollIntoView({{ behavior: "smooth" }}); return; }}
    va("accueil");
    requestAnimationFrame(() => cible.scrollIntoView({{ behavior: "smooth" }}));
    return;
  }}
  va(h);
}});
va(location.hash.slice(1));

/* ─── LE CAMÉLÉON ───
   L'accent n'est jamais fixe : il vient du rail actif. On le montre en le
   faisant. Le cycle s'arrête dès que l'on choisit soi-même — reprendre la main
   à quelqu'un qui vient d'agir est le plus sûr moyen de l'agacer. */
/* ─── LA BARRE SUR LE HÉROS ───
   Elle ne se pose qu'une fois qu'on a quitté le haut : au premier pixel,
   l'image doit être entière. On lit la position réelle plutôt que de deviner. */
const nav = document.querySelector(".nav");
/* --h-nav pilote le decalage du heros bord a bord. Une constante ecrite a la
   main devient fausse des que la barre change de forme — elle passe a deux
   lignes en telephone. On MESURE, et le CSS ne sert plus que de repli. */
const hauteurBarre = () =>
  document.documentElement.style.setProperty("--h-nav", Math.round(nav.getBoundingClientRect().height) + "px");
new ResizeObserver(hauteurBarre).observe(nav);
hauteurBarre();
const surHeros = () => {{
  const h = document.querySelector(".page.active .heros");
  const dessus = !!h && scrollY < 24;
  nav.setAttribute("data-pose", dessus ? "non" : "oui");
}};
addEventListener("scroll", surHeros, {{ passive: true }});
addEventListener("hashchange", () => requestAnimationFrame(surHeros));
surHeros();

const rails = [...document.querySelectorAll(".rail")];
const poseRail = (b) => {{
  rails.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  document.documentElement.style.setProperty("--h", b.dataset.h.split(" ")[0]);
  document.documentElement.style.setProperty("--s", b.dataset.h.split(" ")[1]);
  document.documentElement.style.setProperty("--l", b.dataset.h.split(" ")[2]);
  document.documentElement.style.setProperty("--cam-encre", b.dataset.encre);
}};
let cycle = null, k = 0;
const lance = () => {{
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  cycle = setInterval(() => {{ k = (k + 1) % rails.length; poseRail(rails[k]); }}, 2600);
}};
rails.forEach((b, i) => b.addEventListener("click", () => {{
  clearInterval(cycle); cycle = null; k = i; poseRail(b);
}}));
if (rails.length) {{
  poseRail(rails[0]);
  /* le cycle ne tourne que quand la section est VISIBLE : animer hors de
     l'écran consomme sans rien montrer */
  const sect = document.getElementById("temps");
  const video = document.querySelector(".cam-video video");
  new IntersectionObserver((entrees) => entrees.forEach((e) => {{
    if (e.isIntersecting) {{ if (!cycle) lance(); if (video) video.play().catch(() => {{}}); }}
    else {{ clearInterval(cycle); cycle = null; if (video) video.pause(); }}
  }}), {{ threshold: .25 }}).observe(sect);
}}

/* ─── L'INSTALLATION ───
   On n'affiche pas un bouton qui ne fait rien : tant que le navigateur ne
   propose pas l'installation, on dit ce qu'il faut faire à la place. */
let invite = null;
const mot = document.getElementById("installer-mot");
const bouton = document.getElementById("installer");
addEventListener("beforeinstallprompt", (e) => {{
  e.preventDefault(); invite = e;
  if (mot) mot.textContent = "";
}});
if (bouton) bouton.addEventListener("click", async () => {{
  if (invite) {{
    invite.prompt();
    const r = await invite.userChoice;
    invite = null;
    if (mot) mot.textContent = r.outcome === "accepted"
      ? "Installation en cours…" : "Vous pourrez l'installer plus tard depuis le menu du navigateur.";
    return;
  }}
  if (mot) mot.textContent = navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad")
    ? "Sur iPhone : bouton Partager, puis « Sur l'écran d'accueil »."
    : "Ce navigateur n'a pas proposé l'installation. Cherchez « Installer » ou « Ajouter à l'écran d'accueil » dans son menu.";
}});

/* ─── LES FORMULAIRES ───
   Rien n'est envoyé : aucun serveur n'existe. On le DIT au lieu de simuler un
   succès — un formulaire qui prétend avoir enregistré ce qu'il a jeté est un
   mensonge, et celui-là se paie à la première démonstration. */
[["f-connexion", "Aucun service n'est branché : ce formulaire ne transmet rien."],
 ["f-inscription", "Aucun service n'est branché : ce formulaire ne transmet rien."]].forEach(([id, texte]) => {{
  const f = document.getElementById(id);
  if (!f) return;
  f.addEventListener("submit", (e) => {{
    e.preventDefault();
    let n = f.querySelector(".form-reponse");
    if (!n) {{
      n = document.createElement("p");
      n.className = "aide form-reponse";
      n.setAttribute("role", "status");
      n.style.cssText = "margin-top:14px;color:var(--encre);font-weight:500";
      f.append(n);
    }}
    n.textContent = texte;
  }});
}});
</script>
"""

open(OUT, "w", encoding="utf-8").write(HTML)
print(f"\nsite écrit · {len(HTML) // 1024} Ko · {OUT}")
