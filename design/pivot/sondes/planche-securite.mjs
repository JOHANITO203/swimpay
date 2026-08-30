/* La section securite, RENDUE, avec cinq usages differents des videos.

   Premiere version : quatre videos alignees hors contexte. Insuffisant — on
   ne juge pas un effet sur une vignette isolee, on le juge DANS la section,
   au format reel, avec les vraies cartes et le vrai texte. Et « pattern
   motion » veut dire : plusieurs usages possibles du meme materiau, pas une
   galerie.

   Chaque usage est jouable. Le profil mesure de chaque video est rappele, car
   c'est lui qui dit quel usage elle supporte.

   Aucune dependance : ffmpeg + Node.
   usage : node planche-securite.mjs                                        */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const A = resolve("../assets");
const SORTIE = resolve("../planche-securite.html");

const uri = (f, mime) => {
  const b = readFileSync(join(A, f));
  return { d: `data:${mime};base64,${b.toString("base64")}`, ko: Math.round(b.length / 1024) };
};

const SRC = [
  "hf_20260830_182747_29770066-531c-4b7c-97ed-c392ec517fcb.mp4",
  "hf_20260830_183321_f4107799-db23-4828-b5af-108bb0c603b5.mp4",
  "hf_20260830_183858_514622c1-dea9-4ca5-9e89-137a9ea854ea.mp4",
  "hf_20260830_184456_798362df-92eb-42dc-babc-7fcfee2ae481.mp4",
];

/* Les trois cartes de la section, telles qu'elles sont en ligne. */
const CARTES = [
  { t: "Traçabilité",
    p: `Chaque mouvement est inscrit avec sa date, sa référence et son montant. Vous
        retrouvez n'importe quelle opération des mois plus tard, avec son reçu complet.` },
  { t: "Chiffrement",
    p: `Vos données et vos opérations circulent chiffrées, de votre téléphone jusqu'à
        nos serveurs. Personne ne les lit en chemin.` },
  { t: "Biométrie",
    p: `Votre empreinte ou votre visage confirme les gestes sensibles. Aucun montant
        ne part sans que vous l'ayez validé.` },
];

const USAGES = [
  { id: "vignette", nom: "Vignette en tête",
    quoi: `La vidéo coiffe la carte, en 16:9, coins arrondis. Le texte garde toute sa
      place et la carte reste une carte.`,
    cout: `Trois décodages simultanés dès que la section entre à l'écran.`,
    pour: `L'usage le plus sûr. Les trois vidéos ont une queue à 0,07 : elles se
      posent, donc la reprise de boucle ne se voit pas.` },
  { id: "fond", nom: "Fond de carte",
    quoi: `La vidéo remplit la carte ; le texte se pose dessus derrière un voile.
      La carte devient l'objet.`,
    cout: `Le contraste dépend de l'image. Le voile est réglé pour le pire cas.`,
    pour: `Le plus spectaculaire, et le plus risqué : trois vidéos plein cadre côte
      à côte se disputent le regard.` },
  { id: "survol", nom: "Révélé au survol",
    quoi: `La carte montre une image fixe. La vidéo ne démarre qu'au survol ou au
      focus clavier, et s'arrête en sortant.`,
    cout: `Un seul décodage à la fois. De loin le moins cher.`,
    pour: `Le mouvement devient une récompense au lieu d'un bruit de fond. Sur
      téléphone, où il n'y a pas de survol, il faut un repli — au premier tap.` },
  { id: "detoure", nom: "Objet détouré",
    quoi: `Pas de carte : la vidéo est masquée en pastille et flotte au-dessus du
      texte, avec son ombre. Le fond du rendu disparaît dans celui de la section.`,
    cout: `Le masque impose un fond de rendu clair et uni — c'est le cas ici.`,
    pour: `Le plus graphique. Il marche parce que les quatre rendus partagent le
      même sol pâle que la section.` },
  { id: "ambiance", nom: "Ambiance de section",
    quoi: `Une seule vidéo, très agrandie et très pâle, derrière toute la section.
      Les trois cartes restent nettes par-dessus.`,
    cout: `Un seul décodage, mais plein écran.`,
    pour: `Sa queue à 0,382 dit que l'ORBITE ne s'arrête jamais : au premier plan
      sa reprise se verrait. Noyée et floue, elle passe.` },
  { id: "scrub", nom: "Piloté au défilement",
    quoi: `Rien ne joue tout seul. La section se colle en haut de l'écran et
      c'est LE DÉFILEMENT qui avance les trois vidéos, image par image. On
      remonte, elles reviennent en arrière.`,
    cout: `Il faut une image-clé PAR IMAGE, sinon chaque saut décode tout
      l'intervalle et ça saccade. Mesuré : 3080 Ko contre 1284, soit 2,4 fois
      plus lourd — et encore, en descendant de 720 à 560 px.`,
    pour: `Le seul usage où la QUEUE ne compte plus : il n'y a pas de boucle,
      donc l'orbite cesse d'être un problème. Et l'empreinte, dont la lumière
      culmine à 9,92 s, récompense enfin celui qui descend jusqu'au bout.` },
];

console.log("\nprofils mesurés sur les originaux :");
const V = SRC.map((s, i) => {
  const p = JSON.parse(execFileSync("node", ["profil-motion.mjs", join(A, s), "2"], { encoding: "utf8" }));
  console.log("  " + String(i + 1) + " · pic mvt " + String(p.pic_mouvement_s).padStart(5) +
    " s   pic lum " + String(p.pic_lumiere_s).padStart(5) + " s   queue " + p.queue);
  const v = uri(`sec-${i + 1}.mp4`, "video/mp4");
  /* L'encodage du scrub est un fichier A PART : une image-cle par image, ce
     qui le rend cherchable instantanement mais 2,4 fois plus lourd. Le poser
     partout ferait payer ce surcout aux usages qui n'en tirent rien. */
  const s2 = uri(`scrub-${i + 1}.mp4`, "video/mp4");
  return { p, video: v.d, ko: v.ko, scrub: s2.d, scrubKo: s2.ko,
           affiche: uri(`sec-${i + 1}-poster.jpg`, "image/jpeg").d };
});

const ech = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const net = (s) => s.replace(/\s+/g, " ").trim();
const totalKo = V.reduce((s, x) => s + x.ko, 0);
const totalScrubKo = V.reduce((s, x) => s + x.scrubKo, 0);
const totalSrc = V.reduce((s, x) => s + x.p.poids_ko, 0);

function courbe(vals, w, h) {
  const max = Math.max(...vals, 1e-6);
  return vals.map((v, i) => (i / (vals.length - 1) * w).toFixed(1) + "," + (h - v / max * h).toFixed(1)).join(" ");
}

const html = `<title>Motion · section sécurité</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">

<style>
  :root {
    /* la coque de l'outil */
    --o-fond: #0D0E0A; --o-surface: #16170F; --o-bord: #2A2C1E;
    --o-encre: #EDEDE4; --o-encre-2: #8E9083;
    /* la section, telle qu'elle est en ligne */
    --fond: #FFFFFF; --fond-2: #F4F4F2; --encre: #141414; --sourd: #63635F;
    --trait: #E4E4E0; --acide: #A2FF01;
    --sortie: cubic-bezier(.23, 1, .32, 1);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--o-fond); color: var(--o-encre);
    font-family: Outfit, ui-sans-serif, system-ui, sans-serif;
    font-size: 15px; line-height: 1.55; -webkit-font-smoothing: antialiased;
  }
  .page { width: min(100% - 32px, 1180px); margin: 0 auto; padding: 40px 0 80px;
          display: flex; flex-direction: column; gap: 22px; }

  header { display: flex; flex-direction: column; gap: 8px; }
  .sur { font-family: "IBM Plex Mono", monospace; font-size: 11px;
         letter-spacing: .14em; text-transform: uppercase; color: var(--o-encre-2); }
  h1.t { margin: 0; font-size: clamp(28px, 5vw, 44px); font-weight: 600; letter-spacing: -.025em; }
  .chapo { margin: 0; max-width: 68ch; color: var(--o-encre-2); font-size: 16px; }
  .chapo b { color: var(--o-encre); font-weight: 500; }

  .choix { display: flex; flex-wrap: wrap; gap: 8px; }
  .choix button {
    font: 500 14.5px/1 Outfit, sans-serif; color: rgba(237,237,228,.66);
    background: none; border: 1px solid var(--o-bord); border-radius: 999px;
    padding: 11px 18px; cursor: pointer; min-height: 44px;
    transition: color 200ms ease, background-color 200ms ease, border-color 200ms ease,
                transform 140ms var(--sortie);
  }
  .choix button:active { transform: scale(.97); }
  .choix button:focus-visible { outline: 2px solid var(--acide); outline-offset: 3px; }
  .choix button[aria-pressed="true"] { color: #141414; background: var(--acide);
                                       border-color: transparent; font-weight: 600; }

  /* ════════ LA SECTION, telle qu'en ligne ════════ */
  .demo { border: 1px solid var(--o-bord); border-radius: 14px; overflow: hidden; }
  .sect { position: relative; background: var(--fond-2); color: var(--encre);
          padding: clamp(48px, 6vw, 92px) 0; overflow: hidden; }
  .dedans { width: min(100% - 48px, 1060px); margin-inline: auto; position: relative; z-index: 2; }
  .sect h2 { margin: 0 0 20px; font-size: clamp(28px, 4vw, 46px); line-height: 1;
             font-weight: 500; letter-spacing: -.012em; max-width: 16ch; text-wrap: balance; }
  .sect .para { margin: 0; max-width: 58ch; font-size: 18px; line-height: 1.34; color: var(--sourd); }
  .sect .para b { color: inherit; font-weight: 500; }
  .grille { display: grid; gap: 16px; margin-top: 44px;
            grid-template-columns: repeat(auto-fit, minmax(248px, 1fr)); }
  .fiche { position: relative; padding: 30px; border-radius: 24px; background: var(--fond);
           border: 1px solid var(--trait); overflow: hidden;
           transition: transform 220ms var(--sortie), box-shadow 220ms ease, border-color 200ms ease; }
  .fiche h3 { margin: 0 0 10px; font-size: 22px; font-weight: 500; letter-spacing: -.01em; }
  .fiche p { margin: 0; font-size: 16px; color: var(--sourd); }
  .fiche .film { position: absolute; inset: 0; opacity: 0; pointer-events: none; }
  .fiche video { display: block; width: 100%; height: 100%; object-fit: cover; }
  .ambiance { position: absolute; inset: 0; z-index: 0; opacity: 0; pointer-events: none; }
  .ambiance video { width: 100%; height: 100%; object-fit: cover; }

  /* ── A · vignette en tête ── */
  .u-vignette .fiche { padding: 0; }
  .u-vignette .fiche .film { position: relative; inset: auto; opacity: 1;
                             aspect-ratio: 16/9; background: #EDEDE8; }
  .u-vignette .fiche .txt { padding: 24px 28px 30px; }

  /* ── B · fond de carte ── */
  .u-fond .fiche { border-color: transparent; min-height: 300px;
                   display: flex; align-items: flex-end; }
  .u-fond .fiche .film { opacity: 1; }
  .u-fond .fiche .film::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(0deg, rgba(8,8,8,.92) 0%, rgba(8,8,8,.74) 46%, rgba(8,8,8,.22) 100%);
  }
  .u-fond .fiche .txt { position: relative; z-index: 2; padding: 28px; }
  .u-fond .fiche h3 { color: #FFFFFF; }
  .u-fond .fiche p { color: rgba(255,255,255,.78); }

  /* ── C · révélé au survol ── */
  .u-survol .fiche { padding: 0; cursor: pointer; }
  .u-survol .fiche .film { position: relative; inset: auto; opacity: 1;
                           aspect-ratio: 16/9; background: #EDEDE8; }
  .u-survol .fiche .film video { transform: scale(1.02); transition: transform 600ms var(--sortie); }
  .u-survol .fiche .txt { padding: 24px 28px 30px; }
  .u-survol .fiche:hover, .u-survol .fiche:focus-within {
    transform: translateY(-4px); box-shadow: 0 18px 44px rgba(20,20,20,.14);
    border-color: var(--acide);
  }
  .u-survol .fiche:hover video, .u-survol .fiche:focus-within video { transform: scale(1); }
  /* La pastille n'existe QUE dans l'usage qui l'appelle : visible partout,
     elle promettait un survol qui ne se passait pas. */
  .indice { display: none; }
  .u-survol .indice { display: block; position: absolute; top: 12px; right: 14px; z-index: 3;
    font-family: "IBM Plex Mono", monospace; font-size: 10px; letter-spacing: .08em;
    text-transform: uppercase; padding: 5px 9px; border-radius: 999px;
    background: rgba(255,255,255,.86); color: #141414;
    transition: opacity 200ms ease; }
  .u-survol .fiche:hover .indice, .u-survol .fiche:focus-within .indice { opacity: 0; }

  /* ── D · objet détouré ── */
  .u-detoure .fiche { background: none; border-color: transparent; padding: 8px 8px 26px; }
  .u-detoure .fiche .film {
    position: relative; inset: auto; opacity: 1; aspect-ratio: 1;
    width: min(190px, 76%); margin: 0 auto 18px; border-radius: 46px; overflow: hidden;
    filter: drop-shadow(0 22px 30px rgba(20,20,20,.20));
  }
  .u-detoure .fiche .txt { text-align: center; }
  .u-detoure .fiche p { max-width: 34ch; margin-inline: auto; }

  /* ── F · piloté au défilement ──
     La piste donne la course, la section s'y colle. « overflow: hidden » sur
     un ancetre casse le collage : la boite du demo l'ouvre pour cet usage. */
  .film .v-scrub { display: none; }
  .u-scrub .film .v-lect { display: none; }
  .u-scrub .film .v-scrub { display: block; }
  .demo.u-scrub { overflow: visible; }
  .u-scrub .piste { position: relative; height: 260vh; }
  .u-scrub .colle { position: sticky; top: 0; }
  .u-scrub .fiche { padding: 0; }
  .u-scrub .fiche .film { position: relative; inset: auto; opacity: 1;
                          aspect-ratio: 16/9; background: #EDEDE8; }
  .u-scrub .fiche .txt { padding: 22px 26px 26px; }
  .u-scrub .sect { padding: clamp(32px, 4vw, 56px) 0; }
  .jauge {
    position: absolute; left: 0; right: 0; top: 0; height: 3px;
    background: color-mix(in srgb, var(--encre) 10%, transparent); z-index: 5; display: none;
  }
  .u-scrub .jauge { display: block; }
  .jauge i { display: block; height: 100%; width: 0; background: var(--acide);
             transform-origin: left; }
  .jauge b {
    position: absolute; right: 12px; top: 10px;
    font-family: "IBM Plex Mono", monospace; font-size: 11px; font-weight: 500;
    color: var(--sourd); font-variant-numeric: tabular-nums;
  }

  /* ── E · ambiance de section ── */
  .u-ambiance .ambiance { opacity: 1; }
  .u-ambiance .ambiance video { transform: scale(1.25); filter: blur(10px) saturate(.7); }
  .u-ambiance .ambiance::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(244,244,242,.90), rgba(244,244,242,.80));
  }
  .u-ambiance .fiche { backdrop-filter: blur(2px); background: rgba(255,255,255,.90); }

  /* ════════ la fiche d'usage ════════ */
  .info { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 1px; background: var(--o-bord); border: 1px solid var(--o-bord);
          border-radius: 12px; overflow: hidden; }
  .info > div { background: var(--o-surface); padding: 16px 18px; display: flex;
                flex-direction: column; gap: 5px; }
  .info dt { font-family: "IBM Plex Mono", monospace; font-size: 10.5px;
             letter-spacing: .07em; text-transform: uppercase; color: var(--o-encre-2); }
  .info dd { margin: 0; font-size: 14px; }

  /* ════════ les profils ════════ */
  .profils { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
  .pf { background: var(--o-surface); border: 1px solid var(--o-bord);
        border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
  .pf b { font-size: 14.5px; font-weight: 600; }
  .pf svg { display: block; width: 100%; height: 42px;
            background: color-mix(in srgb, var(--o-encre) 5%, transparent); border-radius: 6px; }
  polyline { fill: none; vector-effect: non-scaling-stroke; }
  .c-mou { stroke: var(--acide); stroke-width: 1.6; }
  .c-lum { stroke: color-mix(in srgb, var(--o-encre) 32%, transparent); stroke-width: 1.2; }
  .pf .n { display: flex; gap: 12px; font-family: "IBM Plex Mono", monospace;
           font-size: 11px; color: var(--o-encre-2); }
  .pf .n em { font-style: normal; color: var(--o-encre); }
  .pf .n .alerte { color: #FF6B4A; }

  footer { border-top: 1px solid var(--o-bord); padding-top: 24px;
           display: flex; flex-direction: column; gap: 11px; }
  footer h2 { margin: 0; font-size: 18px; font-weight: 600; }
  footer p { margin: 0; color: var(--o-encre-2); max-width: 72ch; font-size: 14.5px; }
  footer p b { color: var(--o-encre); font-weight: 500; }

  @media (prefers-reduced-motion: reduce) {
    .fiche, .u-survol .fiche video { transition: none; }
  }
</style>

<div class="page">

  <header>
    <p class="sur">Motion design · section « Votre argent est en sécurité »</p>
    <h1 class="t">Cinq usages</h1>
    <p class="chapo">
      La section entière, au format réel, avec ses vraies cartes et son vrai
      texte. <b>Cinq façons d'y employer le même matériau</b> — clique et
      regarde l'effet. Sous la section, le profil mesuré de chaque vidéo :
      c'est lui qui dit quel usage elle supporte.
    </p>
  </header>

  <div class="choix" id="choix" role="group" aria-label="Usages">
    ${USAGES.map((u, i) => `<button data-u="${u.id}"${i === 0 ? ' aria-pressed="true"' : ""}>${ech(u.nom)}</button>`).join("\n    ")}
  </div>

  <div class="demo u-vignette" id="demo">
   <div class="piste" id="piste">
    <div class="colle">
    <section class="sect">
      <div class="jauge"><i id="jaugeBarre"></i><b id="jaugeTxt">0 %</b></div>
      <div class="ambiance">
        <video src="${V[3].video}" poster="${V[3].affiche}" muted loop playsinline
               preload="metadata" aria-hidden="true"></video>
      </div>
      <div class="dedans">
        <h2>Votre argent est en sécurité</h2>
        <p class="para">Chaque transaction repose sur un <b>système de sécurité
          complexe</b>, développé pour garantir la sécurité des utilisateurs. Trois
          couches y travaillent en même temps.</p>
        <div class="grille">
          ${CARTES.map((c, i) => `
          <article class="fiche" tabindex="0">
            <div class="film">
              <video class="v-lect" src="${V[i].video}" poster="${V[i].affiche}" muted loop
                     playsinline preload="metadata" aria-label="${ech(c.t)}"></video>
              <video class="v-scrub" src="${V[i].scrub}" poster="${V[i].affiche}" muted
                     playsinline preload="auto" aria-label="${ech(c.t)}"></video>
            </div>
            <span class="indice">survolez</span>
            <div class="txt">
              <h3>${ech(c.t)}</h3>
              <p>${ech(net(c.p))}</p>
            </div>
          </article>`).join("")}
        </div>
      </div>
    </section>
    </div>
   </div>
  </div>

  <dl class="info" id="info"></dl>

  <div class="profils">
    ${V.map((v, i) => `
    <div class="pf">
      <b>${["Traçabilité", "Chiffrement", "Biométrie", "L'orbite"][i]}</b>
      <svg viewBox="0 0 300 42" preserveAspectRatio="none" role="img"
           aria-label="Profil de mouvement et de lumière">
        <polyline class="c-lum" points="${courbe(v.p.lumiere, 300, 42)}"></polyline>
        <polyline class="c-mou" points="${courbe(v.p.mouvement, 300, 42)}"></polyline>
      </svg>
      <p class="n">
        <span>pic <em>${v.p.pic_mouvement_s} s</em></span>
        <span>lum <em>${v.p.pic_lumiere_s} s</em></span>
        <span>queue <em class="${v.p.queue > 0.2 ? "alerte" : ""}">${String(v.p.queue).replace(".", ",")}</em></span>
        <span style="margin-left:auto">${v.ko} Ko</span>
      </p>
    </div>`).join("")}
  </div>

  <footer>
    <h2>Ce que le profil impose à l'usage</h2>
    <p>
      <b>La queue</b> est le mouvement du dernier cinquième rapporté au maximum.
      Les trois premières sont à <b>0,07</b> : elles ralentissent et se posent,
      donc leur boucle est invisible et elles supportent n'importe quel usage de
      premier plan. <b>L'orbite est à 0,382</b> — elle bouge encore autant à la
      fin qu'au milieu. Sa reprise se verrait sur une carte ; c'est pourquoi elle
      n'a qu'un usage ici, en ambiance, agrandie et floutée.
    </p>
    <p>
      <b>Le poids reste le point dur.</b> Réduites en 720 px, les quatre pèsent
      ${totalKo} Ko contre ${(totalSrc / 1024).toFixed(1).replace(".", ",")} Mo à
      la source. Mais la page du site fait déjà 1,88 Mo parce que tout y est
      incrusté en base64 : les y poser telles quelles la porterait au-delà de
      3 Mo. « Révélé au survol » est le seul usage qui n'oblige à décoder qu'une
      vidéo à la fois — c'est aussi le moins cher, et de loin.
    </p>
    <p>
      <b>Le scrub se paie à l'encodage, pas au code.</b> Un fichier normal ne
      pose une image-clé que de loin en loin : chaque saut oblige le décodeur à
      repartir de la clé précédente et à rejouer l'intervalle, et c'est ça qui
      traîne. Il faut donc une image-clé <b>par image</b>. Mesuré ici :
      ${totalScrubKo} Ko en toutes-clés contre ${totalKo} Ko en lecture normale,
      soit <b>${(totalScrubKo / totalKo).toFixed(1).replace(".", ",")} fois plus lourd</b> — et
      encore, en descendant de 720 à 560 px. C'est le seul usage qui demande son
      propre encodage.
    </p>
  </footer>

</div>

<script>
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const USAGES = ${JSON.stringify(USAGES.map((u) => ({ id: u.id, nom: u.nom, quoi: net(u.quoi), cout: net(u.cout), pour: net(u.pour) })))};
  const demo = $("demo");
  const cartes = [...document.querySelectorAll(".fiche .v-lect")];
  const scrubs = [...document.querySelectorAll(".fiche .v-scrub")];
  const ambiance = document.querySelector(".ambiance video");
  let usage = "vignette";

  const joue = (v) => { if (v && v.paused) v.play().catch(() => {}); };
  const stop = (v) => { if (v && !v.paused) v.pause(); };

  function pose(id) {
    usage = id;
    demo.className = "demo u-" + id;
    [...$("choix").children].forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.u === id)));

    /* On ne fait tourner QUE ce qui est visible dans l'usage courant : quatre
       decodages simultanes pour n'en montrer qu'un est du gaspillage pur. */
    if (id === "scrub") { cartes.forEach(stop); stop(ambiance); scrubs.forEach(stop); defile(); }
    else if (id === "ambiance") { cartes.forEach(stop); joue(ambiance); }
    else if (id === "survol") { cartes.forEach(stop); stop(ambiance); }
    else { stop(ambiance); cartes.forEach(joue); }

    const u = USAGES.find((x) => x.id === id);
    $("info").innerHTML =
      '<div><dt>ce que ça fait</dt><dd>' + u.quoi + '</dd></div>' +
      '<div><dt>ce que ça coûte</dt><dd>' + u.cout + '</dd></div>' +
      '<div><dt>ce que ça vaut</dt><dd>' + u.pour + '</dd></div>';
  }

  $("choix").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-u]");
    if (b) pose(b.dataset.u);
  });

  /* ── le défilement pilote ──────────────────────────────────────────────
     Rien ne joue : on POSE currentTime a la position lue dans la piste. Le
     calcul se fait dans un requestAnimationFrame, jamais dans l'ecouteur —
     lire une boite pendant le defilement force une mise en page a chaque
     evenement, et c'est exactement ce qui saccade.

     Pourquoi un encodage a part : sans image-cle sur chaque image, un saut
     oblige le decodeur a repartir de la cle precedente et a rejouer tout
     l'intervalle. C'est la vraie cause du scrub qui traine, jamais le code. */
  function defile() {
    if (usage !== "scrub") return;
    const r = $("piste").getBoundingClientRect();
    const course = r.height - innerHeight;
    const p = course > 0 ? Math.min(1, Math.max(0, -r.top / course)) : 0;
    for (const v of scrubs) {
      const d = v.duration;
      if (!d || !isFinite(d)) continue;
      const t = p * (d - 0.04);
      if (Math.abs(v.currentTime - t) > 0.012) v.currentTime = t;
    }
    $("jaugeBarre").style.width = (p * 100).toFixed(1) + "%";
    $("jaugeTxt").textContent = Math.round(p * 100) + " %";
  }
  /* Une boucle continue, et non un ecouteur de defilement filtre. Premiere
     version : ecouteur + porte requestAnimationFrame — la position saturait a
     mi-course parce que le dernier evenement tombait pendant que la porte etait
     fermee, et rien ne le rattrapait. La boucle ne tourne que dans cet usage,
     et ne fait qu'une lecture de boite : le cout est nul devant le decodage. */
  function boucle() {
    if (usage === "scrub") defile();
    requestAnimationFrame(boucle);
  }
  requestAnimationFrame(boucle);
  addEventListener("resize", defile, { passive: true });
  scrubs.forEach((v) => v.addEventListener("loadedmetadata", defile));

  /* Le survol : la video ne demarre qu'a l'entree. Au clavier, le focus fait
     le meme travail — sinon l'effet n'existe pas pour qui n'a pas de souris.
     Sur telephone il n'y a ni l'un ni l'autre : le premier tap declenche. */
  document.querySelectorAll(".fiche").forEach((f) => {
    const v = f.querySelector("video");
    const on = () => { if (usage === "survol") joue(v); };
    const off = () => { if (usage === "survol") { stop(v); v.currentTime = 0; } };
    f.addEventListener("pointerenter", on);
    f.addEventListener("pointerleave", off);
    f.addEventListener("focusin", on);
    f.addEventListener("focusout", off);
    f.addEventListener("click", on);
  });

  /* Rien ne tourne hors de l'ecran. Et on retente sur canplay : appeler play()
     avant que les donnees soient pretes rejette la promesse — defaut deja paye
     sur le site. */
  let visible = false;
  new IntersectionObserver((es) => es.forEach((e) => {
    visible = e.isIntersecting;
    if (visible) pose(usage); else { cartes.forEach(stop); stop(ambiance); scrubs.forEach(stop); }
  }), { threshold: .15 }).observe(demo);

  [...cartes, ambiance].forEach((v) => v && v.addEventListener("canplay", () => {
    if (visible) pose(usage);
  }));

  pose("vignette");
})();
</script>
`;

writeFileSync(SORTIE, html, "utf8");
console.log("\nPlanche ->", SORTIE, (Buffer.byteLength(html) / 1024 / 1024).toFixed(2), "Mo\n");
