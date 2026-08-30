/* Monter la planche des assets generes : une page autonome, images incrustees
   en data URI, avec le verdict de chacune.

   L'artifact interdit toute requete vers un hote externe : les images DOIVENT
   etre embarquees. Elles sont donc reduites par ffmpeg avant d'etre encodees,
   sinon la page depasse la limite de 16 Mo.

   Aucune dependance : ffmpeg + Node.
   usage : node planche-assets.mjs                                          */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const A = resolve("../assets");
const SORTIE = resolve("../planche-assets.html");
const tmp = mkdtempSync(join(tmpdir(), "planche-"));
process.on("exit", () => { try { rmSync(tmp, { recursive: true, force: true }); } catch {} });

/* Classes par utilisabilite reelle, pas par gout. */
const ASSETS = [
  {
    f: "SwimPay_coins_tumbling_and_stacking_202608301800.jpeg",
    titre: "Moins de frais",
    sujet: "l'argent qu'on ne paie pas reste au client",
    etat: "pret",
    format: "1536 × 2752 — story, vertical",
    note: `Le meilleur du lot, et le seul dont le texte est sorti juste du premier coup :
      « Moins de frais. Plus pour vous. » sans une faute. Le sens du mouvement est
      correct — les pieces arrivent et s'empilent, elles ne tombent pas dans un trou.
      C'est la contrainte qui decidait de tout et elle a tenu.`,
    reserve: null,
  },
  {
    f: "Green_resin_padlock_on_plinth_202608301825.jpeg",
    titre: "Le cadenas",
    sujet: "l'argent est lie a une personne verifiee, et a elle seule",
    etat: "pret",
    format: "2048 × 2048 — carre",
    note: `La resine marbree est la : la lumiere entre dans la masse, les volutes sont
      suspendues dedans, l'anse noire fait miroir. C'etait le point le plus difficile
      du brief et c'est reussi. Le socle de pierre le fait passer du gadget a la piece
      exposee.`,
    reserve: `L'empreinte tire vers le jaune plutot que vers le A2FF01. Detail.`,
  },
  {
    f: "socle-eclate-rendu.jpeg",
    titre: "Le socle éclaté",
    sujet: "quatre couches usinees pour aller ensemble",
    etat: "pret",
    format: "1792 × 2400 — portrait",
    note: `Tres au-dessus de ce que le CSS sait faire : moleture fine sur la tranche,
      verre reellement transparent, plaque acide qui diffuse de l'interieur, contours
      filaires blancs dans le vide. La marque apparait dans trois matieres
      differentes, comme dans la reference.`,
    reserve: `Rendu APLATI : les quatre plateaux sont fondus en une seule image, donc
      inanimable tel quel. Pour le mouvement il faut les quatre plateaux rendus
      SEPAREMENT sur fond transparent.`,
  },
  {
    f: "Open_3D_safe_icon_2K_202608301818.jpeg",
    titre: "Le coffre",
    sujet: "l'epargne, gardee mais accessible",
    etat: "pret",
    format: "2048 × 2048 — carre",
    note: `Porte entrouverte, interieur visible : le message « accessible » passe. Deux
      matieres seulement, acier brosse et plastique satine, exactement comme demande.
      Les pieces portent la marque frappee.`,
    reserve: `Sur fond noir. Pour une carte claire il faudra la version pale.`,
  },
  {
    f: "Phone_connecting_operator_logos_2K_202608301752.jpeg",
    titre: "L'anneau",
    sujet: "n'importe quel reseau vers n'importe quel autre",
    etat: "retoucher",
    format: "2752 × 1536 — paysage",
    note: `Le message passe sans un mot : quatre operateurs, un anneau, le telephone au
      centre. C'est la seule image du lot qui raconte le produit d'un coup d'oeil.`,
    reserve: `Les quatre logos n'ont pas la meme forme — deux pastilles rondes, deux
      carres durs. Le brief demandait quatre disques blancs identiques, justement pour
      qu'aucune marque ne prenne le pas. Et l'anneau est un tube neon la ou il fallait
      un filet. A regenerer en durcissant ces deux points.`,
  },
  {
    f: "SwimPay_smartphone_transfer_grap…_2K_202608301752.jpeg",
    titre: "Transfert reussi",
    sujet: "Orange vers MTN, en un geste",
    etat: "retoucher",
    format: "2752 × 1536 — paysage",
    note: `Le pave numerique cede la place a un ecran de confirmation, ce qui est plus
      lisible. Le logotype tient : la marque sert de S a « SwimPay ».`,
    reserve: `Deux vrais problemes. L'ecran est en ANGLAIS — « SUCCESSFUL TRANSFER » sur
      un marche francophone. Et il affiche 100 000 qui arrivent 100 000 : c'est une
      promesse de gratuite totale, qu'aucun de nos chiffres ne soutient.`,
  },
  {
    f: "Advertising_dynamic_speed_variation_2K_202608301714.jpeg",
    titre: "L'accueil",
    sujet: "le solde et les operations, d'un coup d'oeil",
    etat: "refaire",
    format: "1792 × 2400 — portrait",
    note: `L'objet est beau : la plaque acide a encre sombre est exactement la direction
      validee, et le halo vert derriere la main tient bien.`,
    reserve: `Le contenu est faux de bout en bout. Ecran en anglais. Montants a DECIMALES
      — le franc CFA n'a pas de centime, c'est une regle du code, pas un detail. Deux
      lignes « Coffee » dont une en recette. Et la main est une vraie peau la ou la
      direction demandait une silhouette. A refaire, ou a recouvrir par une vraie
      capture de l'app.`,
  },
  {
    f: "Hand_swiping_glowing_ribbon_2K_202608301750.jpeg",
    titre: "Le ruban",
    sujet: "les reseaux relies par un seul geste",
    etat: "refaire",
    format: "2752 × 1536 — paysage",
    note: `Le ruban vert a de la matiere et la main en silhouette est juste.`,
    reserve: `Le plus faible du lot. Les logos sont poses en texte blanc flottant, sans
      support ; MTN et Moov recouvrent l'ecran du telephone et le rendent illisible ;
      et « W wave » est un logo INVENTE — Wave, c'est le pingouin. Une marque
      redessinee est un faux, on ne la publie pas.`,
  },
];

const ETATS = {
  pret:      { texte: "prêt à poser", classe: "e-pret" },
  retoucher: { texte: "à régénérer",  classe: "e-retoucher" },
  refaire:   { texte: "à refaire",    classe: "e-refaire" },
};

/* ── reduction + encodage ──────────────────────────────────────────────── */
function vignette(fichier, largeur = 1000) {
  const src = join(A, fichier);
  if (!existsSync(src)) { console.log("  MANQUANT :", fichier); return null; }
  const dst = join(tmp, fichier.replace(/[^a-z0-9]/gi, "_") + ".jpg");
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-i", src,
    "-vf", `scale='min(${largeur},iw)':-2:flags=lanczos`,
    "-q:v", "4", dst,
  ]);
  const b = readFileSync(dst);
  console.log("  " + fichier.slice(0, 46).padEnd(48) + (b.length / 1024).toFixed(0) + " Ko");
  return "data:image/jpeg;base64," + b.toString("base64");
}

const ech = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const nettoie = (s) => s.replace(/\s+/g, " ").trim();

console.log("\nVignettes :");
const cartes = ASSETS.map((a, i) => {
  const uri = vignette(a.f);
  if (!uri) return "";
  const e = ETATS[a.etat];
  return `
    <article class="carte">
      <div class="vue"><img src="${uri}" alt="${ech(a.titre)}" loading="lazy"></div>
      <div class="corps">
        <div class="tete">
          <p class="rang">${String(i + 1).padStart(2, "0")}</p>
          <span class="etat ${e.classe}">${e.texte}</span>
        </div>
        <h2>${ech(a.titre)}</h2>
        <p class="sujet">${ech(a.sujet)}</p>
        <p class="note">${ech(nettoie(a.note))}</p>
        ${a.reserve ? `<p class="reserve"><span>réserve</span>${ech(nettoie(a.reserve))}</p>` : ""}
        <p class="format">${ech(a.format)}</p>
      </div>
    </article>`;
});

const nbPret = ASSETS.filter((a) => a.etat === "pret").length;
const nbRet  = ASSETS.filter((a) => a.etat === "retoucher").length;
const nbRef  = ASSETS.filter((a) => a.etat === "refaire").length;

const html = `<title>Planche des assets</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">

<style>
  :root {
    --fond:    #0D0E0A;
    --surface: #16170F;
    --bord:    #2A2C1E;
    --encre:   #EDEDE4;
    --encre-2: #8E9083;
    --acide:   #A2FF01;
    --ambre:   #FFC53D;
    --brique:  #FF6B4A;
  }

  :root[data-theme="light"] {
    --fond:    #F2F2EC;
    --surface: #FFFFFF;
    --bord:    #DCDCD2;
    --encre:   #14150F;
    --encre-2: #5A5C50;
  }

  @media (prefers-color-scheme: light) {
    :root:not([data-theme="dark"]) {
      --fond:    #F2F2EC;
      --surface: #FFFFFF;
      --bord:    #DCDCD2;
      --encre:   #14150F;
      --encre-2: #5A5C50;
    }
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--fond);
    color: var(--encre);
    font-family: Archivo, "Segoe UI", system-ui, sans-serif;
    font-size: 15px; line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }

  .page {
    width: min(100% - 32px, 1180px);
    margin: 0 auto; padding: 44px 0 80px;
    display: flex; flex-direction: column; gap: 34px;
  }

  header { display: flex; flex-direction: column; gap: 10px; }

  .sur {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 11px; letter-spacing: .14em; text-transform: uppercase;
    color: var(--encre-2);
  }

  h1 {
    margin: 0; font-size: clamp(30px, 5.5vw, 46px);
    font-weight: 700; letter-spacing: -.025em; text-wrap: balance;
  }

  .chapo { margin: 0; max-width: 66ch; color: var(--encre-2); font-size: 16px; }
  .chapo b { color: var(--encre); font-weight: 600; }

  .compte {
    display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px;
  }

  .puce {
    font-family: "IBM Plex Mono", monospace; font-size: 11.5px;
    letter-spacing: .04em; padding: 6px 12px; border-radius: 999px;
    border: 1px solid var(--bord); color: var(--encre-2);
  }
  .puce b { color: var(--encre); font-weight: 500; }

  .grille {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 430px), 1fr));
    gap: 22px;
  }

  .carte {
    display: flex; flex-direction: column;
    background: var(--surface);
    border: 1px solid var(--bord);
    border-radius: 14px;
    overflow: hidden;
  }

  .vue {
    background: #000;
    display: grid; place-items: center;
    border-bottom: 1px solid var(--bord);
  }

  .vue img {
    display: block; width: 100%; height: auto;
    max-height: 460px; object-fit: contain;
  }

  .corps { padding: 20px 22px 22px; display: flex; flex-direction: column; gap: 9px; }

  .tete { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

  .rang {
    margin: 0;
    font-family: "IBM Plex Mono", monospace; font-size: 12px;
    color: var(--encre-2); letter-spacing: .08em;
  }

  .etat {
    font-family: "IBM Plex Mono", monospace; font-size: 11px;
    letter-spacing: .05em; padding: 4px 10px; border-radius: 999px;
    white-space: nowrap;
  }
  .e-pret      { background: var(--acide);  color: #0A0A0A; font-weight: 500; }
  .e-retoucher { background: var(--ambre);  color: #0A0A0A; font-weight: 500; }
  .e-refaire   { background: var(--brique); color: #FFFFFF; font-weight: 500; }

  h2 { margin: 0; font-size: 21px; font-weight: 600; letter-spacing: -.015em; }

  .sujet {
    margin: 0; font-size: 13.5px; color: var(--encre-2);
    font-style: italic;
  }

  .note { margin: 4px 0 0; font-size: 14px; }

  .reserve {
    margin: 6px 0 0; padding: 12px 14px;
    border-radius: 9px;
    background: color-mix(in srgb, var(--brique) 10%, transparent);
    border-left: 2px solid var(--brique);
    font-size: 13.5px; color: var(--encre);
  }
  .reserve span {
    display: block;
    font-family: "IBM Plex Mono", monospace; font-size: 10.5px;
    letter-spacing: .1em; text-transform: uppercase;
    color: var(--brique); margin-bottom: 4px;
  }

  .format {
    margin: 8px 0 0;
    font-family: "IBM Plex Mono", monospace; font-size: 11.5px;
    color: var(--encre-2);
  }

  footer {
    border-top: 1px solid var(--bord); padding-top: 24px;
    display: flex; flex-direction: column; gap: 10px;
  }
  footer h2 { font-size: 18px; }
  footer p { margin: 0; color: var(--encre-2); max-width: 70ch; font-size: 14px; }
  footer p b { color: var(--encre); font-weight: 600; }
</style>

<div class="page">

  <header>
    <p class="sur">Assets générés · 30 août 2026</p>
    <h1>Planche des assets</h1>
    <p class="chapo">
      Les huit images sorties des prompts, classées par <b>utilisabilité réelle</b>
      et non par goût. La règle est la même que partout ailleurs ici : un logo
      redessiné est un faux, un montant à décimales est une erreur, et une
      promesse que les chiffres ne soutiennent pas ne se publie pas.
    </p>
    <div class="compte">
      <span class="puce"><b>${nbPret}</b> prêtes à poser</span>
      <span class="puce"><b>${nbRet}</b> à régénérer</span>
      <span class="puce"><b>${nbRef}</b> à refaire</span>
    </div>
  </header>

  <div class="grille">${cartes.join("")}</div>

  <footer>
    <h2>Ce qui bloque encore l'animation</h2>
    <p>
      Le socle éclaté est un <b>rendu aplati</b> : les quatre plateaux sont fondus
      dans une seule image. Le mouvement mesuré à 4,233 s ne peut pas s'y appliquer.
      Il faut les <b>quatre plateaux rendus séparément</b>, chacun seul sur fond
      transparent, au même cadrage et au même éclairage — après quoi ils se
      substituent aux tenants-lieu CSS sans que le mouvement bouge d'un millième.
    </p>
  </footer>

</div>
`;

writeFileSync(SORTIE, html, "utf8");
console.log("\nPlanche ->", SORTIE, (Buffer.byteLength(html) / 1024 / 1024).toFixed(2), "Mo\n");
