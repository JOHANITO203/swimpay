/* Monter la planche des quatre videos de la section securite.

   Chaque element est montre EN MOUVEMENT, avec son profil MESURE — la courbe
   de mouvement et la courbe de lumiere, image par image. C'est le profil qui
   dit ou tombe le temps fort et si la video se pose ; le regard seul se
   trompe sur les deux.

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

/* Les sources, dans l'ordre d'arrivee. Le profil est mesure sur l'ORIGINAL,
   pas sur la version reduite : le reencodage lisse le mouvement. */
const ELEMENTS = [
  {
    n: 1, src: "hf_20260830_182747_29770066-531c-4b7c-97ed-c392ec517fcb.mp4",
    nom: "Le cadenas qui s'ouvre",
    vu: `Le cadenas de résine orbite sur lui-même, puis s'entrouvre et découvre son
      mécanisme d'acier.`,
    carte: "Traçabilité",
    pourquoi: `Le seul des quatre qui MONTRE l'intérieur. « On peut retrouver
      n'importe quelle opération des mois plus tard » se raconte en ouvrant, pas
      en verrouillant.`,
    reserve: null,
  },
  {
    n: 2, src: "hf_20260830_183321_f4107799-db23-4828-b5af-108bb0c603b5.mp4",
    nom: "Le cadenas qui se forme",
    vu: `Un contour filaire flotte, se remplit de matière et devient un cadenas plein
      qui se pose sur la pierre.`,
    carte: "Chiffrement",
    pourquoi: `Le mouvement dit exactement la chose : quelque chose d'informe prend
      une forme scellée. Le pic de mouvement tombe tôt (1,96 s) et la lumière
      arrive après (6,46 s) — l'objet se construit, puis s'allume.`,
    reserve: null,
  },
  {
    n: 3, src: "hf_20260830_183858_514622c1-dea9-4ca5-9e89-137a9ea854ea.mp4",
    nom: "L'empreinte qui déclenche",
    vu: `Le pavé d'empreinte s'allume en acide, puis l'intérieur du boîtier révèle des
      engrenages qui s'engagent.`,
    carte: "Biométrie",
    pourquoi: `Sans ambiguïté : une empreinte, puis un mécanisme qui obéit. La
      lumière culmine à 9,92 s, tout à la fin — la vidéo construit vers sa
      conclusion au lieu de s'épuiser.`,
    reserve: `La plus lourde des quatre : 4,0 Mo à la source, 544 Ko une fois réduite.`,
  },
  {
    n: 4, src: "hf_20260830_184456_798362df-92eb-42dc-babc-7fcfee2ae481.mp4",
    nom: "L'orbite",
    vu: `Le cadenas reste immobile sur son socle ; c'est la caméra qui tourne autour,
      sans jamais s'arrêter.`,
    carte: "aucune des trois",
    pourquoi: `Elle ne raconte pas un geste, elle présente un objet. C'est une
      ambiance, pas une démonstration.`,
    reserve: `Sa QUEUE vaut 0,382 quand les trois autres sont à 0,07 : elle bouge
      encore autant à la fin qu'au milieu. Une orbite ne se pose jamais, donc la
      reprise de boucle se verra — sauf à la faire tourner d'un tour exact, ce que
      le rendu ne garantit pas.`,
  },
];

console.log("\nprofils mesurés sur les originaux :");
for (const e of ELEMENTS) {
  e.p = JSON.parse(execFileSync("node", ["profil-motion.mjs", join(A, e.src), "2"], { encoding: "utf8" }));
  console.log("  " + String(e.n) + " · " + e.nom.padEnd(26) +
    "pic mvt " + e.p.pic_mouvement_s + "s   pic lum " + e.p.pic_lumiere_s + "s   queue " + e.p.queue);
  const v = uri(`sec-${e.n}.mp4`, "video/mp4");
  e.video = v.d; e.ko = v.ko;
  e.affiche = uri(`sec-${e.n}-poster.jpg`, "image/jpeg").d;
}

/* Une courbe normalisee, en polyline SVG : donnee mesuree, pas decor. */
function courbe(vals, w, h) {
  const max = Math.max(...vals, 1e-6);
  return vals.map((v, i) =>
    (i / (vals.length - 1) * w).toFixed(1) + "," + (h - v / max * h).toFixed(1)).join(" ");
}

const ech = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const net = (s) => s.replace(/\s+/g, " ").trim();

const cartes = ELEMENTS.map((e) => {
  const W = 300, H = 56;
  const pm = (e.p.pic_mouvement_s / e.p.duree * W).toFixed(1);
  const pl = (e.p.pic_lumiere_s / e.p.duree * W).toFixed(1);
  return `
    <article class="carte">
      <div class="vue">
        <video src="${e.video}" poster="${e.affiche}" muted loop playsinline preload="metadata"
               aria-label="${ech(e.nom)}"></video>
        <span class="num">${String(e.n).padStart(2, "0")}</span>
      </div>
      <div class="corps">
        <div class="tete">
          <h2>${ech(e.nom)}</h2>
          <span class="puce ${e.carte === "aucune des trois" ? "p-non" : "p-oui"}">${ech(e.carte)}</span>
        </div>
        <p class="vu">${ech(net(e.vu))}</p>

        <figure class="profil">
          <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
               aria-label="Profil de mouvement et de lumière">
            <polyline class="c-lum" points="${courbe(e.p.lumiere, W, H)}"></polyline>
            <polyline class="c-mou" points="${courbe(e.p.mouvement, W, H)}"></polyline>
            <line class="marque" x1="${pm}" x2="${pm}" y1="0" y2="${H}"></line>
            <line class="marque m-lum" x1="${pl}" x2="${pl}" y1="0" y2="${H}"></line>
          </svg>
          <figcaption>
            <span><i class="l-mou"></i>mouvement</span>
            <span><i class="l-lum"></i>lumière</span>
            <span class="t">0 → ${e.p.duree} s</span>
          </figcaption>
        </figure>

        <dl class="chiffres">
          <div><dt>pic de mouvement</dt><dd>${e.p.pic_mouvement_s} s</dd></div>
          <div><dt>pic de lumière</dt><dd>${e.p.pic_lumiere_s} s</dd></div>
          <div><dt>queue</dt><dd class="${e.p.queue > 0.2 ? "alerte" : ""}">${String(e.p.queue).replace(".", ",")}</dd></div>
          <div><dt>coupes</dt><dd>${e.p.coupes.length}</dd></div>
          <div><dt>source</dt><dd>${(e.p.poids_ko / 1024).toFixed(1).replace(".", ",")} Mo</dd></div>
          <div><dt>réduite</dt><dd>${e.ko} Ko</dd></div>
        </dl>

        <p class="pq">${ech(net(e.pourquoi))}</p>
        ${e.reserve ? `<p class="reserve"><span>réserve</span>${ech(net(e.reserve))}</p>` : ""}
      </div>
    </article>`;
}).join("");

const totalKo = ELEMENTS.reduce((s, e) => s + e.ko, 0);
const totalSrc = ELEMENTS.reduce((s, e) => s + e.p.poids_ko, 0);

const html = `<title>Motion · section sécurité</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">

<style>
  :root {
    --fond: #0D0E0A; --surface: #16170F; --bord: #2A2C1E;
    --encre: #EDEDE4; --encre-2: #8E9083;
    --acide: #A2FF01; --ambre: #FFC53D; --brique: #FF6B4A;
  }
  :root[data-theme="light"] {
    --fond: #F2F2EC; --surface: #FFFFFF; --bord: #DCDCD2;
    --encre: #14150F; --encre-2: #5A5C50;
  }
  @media (prefers-color-scheme: light) {
    :root:not([data-theme="dark"]) {
      --fond: #F2F2EC; --surface: #FFFFFF; --bord: #DCDCD2;
      --encre: #14150F; --encre-2: #5A5C50;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--fond); color: var(--encre);
    font-family: Archivo, "Segoe UI", system-ui, sans-serif;
    font-size: 15px; line-height: 1.55; -webkit-font-smoothing: antialiased;
  }
  .page { width: min(100% - 32px, 1180px); margin: 0 auto; padding: 42px 0 80px;
          display: flex; flex-direction: column; gap: 30px; }

  header { display: flex; flex-direction: column; gap: 9px; }
  .sur { font-family: "IBM Plex Mono", monospace; font-size: 11px;
         letter-spacing: .14em; text-transform: uppercase; color: var(--encre-2); }
  h1 { margin: 0; font-size: clamp(30px, 5.4vw, 46px); font-weight: 700; letter-spacing: -.025em; }
  .chapo { margin: 0; max-width: 68ch; color: var(--encre-2); font-size: 16px; }
  .chapo b { color: var(--encre); font-weight: 600; }

  .compte { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 4px; }
  .puce-c { font-family: "IBM Plex Mono", monospace; font-size: 11.5px;
            padding: 6px 12px; border-radius: 999px; border: 1px solid var(--bord); color: var(--encre-2); }
  .puce-c b { color: var(--encre); font-weight: 500; }

  .grille { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 470px), 1fr)); gap: 22px; }

  .carte { display: flex; flex-direction: column; background: var(--surface);
           border: 1px solid var(--bord); border-radius: 14px; overflow: hidden; }
  .vue { position: relative; background: #000; border-bottom: 1px solid var(--bord); }
  .vue video { display: block; width: 100%; height: auto; aspect-ratio: 16/9; object-fit: cover; }
  .num { position: absolute; top: 12px; left: 14px;
         font-family: "IBM Plex Mono", monospace; font-size: 12px; letter-spacing: .08em;
         color: rgba(255,255,255,.5); }

  .corps { padding: 20px 22px 22px; display: flex; flex-direction: column; gap: 11px; }
  .tete { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  h2 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -.015em; }
  .puce { font-family: "IBM Plex Mono", monospace; font-size: 11px;
          padding: 4px 10px; border-radius: 999px; white-space: nowrap; font-weight: 500; }
  .p-oui { background: var(--acide); color: #0A0A0A; }
  .p-non { background: var(--ambre); color: #0A0A0A; }
  .vu { margin: 0; font-size: 14.5px; color: var(--encre-2); }

  /* ── le profil mesuré ── */
  .profil { margin: 4px 0 0; }
  .profil svg { display: block; width: 100%; height: 56px;
                background: color-mix(in srgb, var(--encre) 5%, transparent);
                border-radius: 7px; }
  polyline { fill: none; vector-effect: non-scaling-stroke; }
  .c-mou { stroke: var(--acide); stroke-width: 1.6; }
  .c-lum { stroke: color-mix(in srgb, var(--encre) 34%, transparent); stroke-width: 1.2; }
  .marque { stroke: var(--acide); stroke-width: 1; stroke-dasharray: 2 3; vector-effect: non-scaling-stroke; opacity: .7; }
  .m-lum { stroke: color-mix(in srgb, var(--encre) 40%, transparent); }
  figcaption { display: flex; gap: 14px; align-items: center; margin-top: 7px;
               font-family: "IBM Plex Mono", monospace; font-size: 10.5px; color: var(--encre-2); }
  figcaption i { display: inline-block; width: 12px; height: 2px; margin-right: 5px; vertical-align: middle; }
  .l-mou { background: var(--acide); }
  .l-lum { background: color-mix(in srgb, var(--encre) 40%, transparent); }
  figcaption .t { margin-left: auto; }

  .chiffres { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px;
              margin: 4px 0 0; background: var(--bord); border: 1px solid var(--bord);
              border-radius: 9px; overflow: hidden; }
  .chiffres div { background: var(--surface); padding: 9px 11px; }
  dt { font-family: "IBM Plex Mono", monospace; font-size: 10px;
       letter-spacing: .05em; text-transform: uppercase; color: var(--encre-2); }
  dd { margin: 2px 0 0; font-family: "IBM Plex Mono", monospace; font-size: 15px;
       font-weight: 600; font-variant-numeric: tabular-nums; }
  dd.alerte { color: var(--brique); }

  .pq { margin: 4px 0 0; font-size: 14.5px; }
  .reserve { margin: 4px 0 0; padding: 12px 14px; border-radius: 9px;
             background: color-mix(in srgb, var(--brique) 10%, transparent);
             border-left: 2px solid var(--brique); font-size: 13.5px; }
  .reserve span { display: block; font-family: "IBM Plex Mono", monospace; font-size: 10.5px;
                  letter-spacing: .1em; text-transform: uppercase; color: var(--brique); margin-bottom: 4px; }

  footer { border-top: 1px solid var(--bord); padding-top: 26px;
           display: flex; flex-direction: column; gap: 12px; }
  footer h2 { font-size: 19px; }
  footer p { margin: 0; color: var(--encre-2); max-width: 72ch; font-size: 14.5px; }
  footer p b { color: var(--encre); font-weight: 600; }

  @media (prefers-reduced-motion: reduce) { .vue video { display: none; } }
</style>

<div class="page">

  <header>
    <p class="sur">Motion design · section « Votre argent est en sécurité »</p>
    <h1>Quatre éléments</h1>
    <p class="chapo">
      Chacun en mouvement, avec son <b>profil mesuré image par image</b> : la
      courbe acide est le mouvement — l'écart entre une image et la précédente —
      et la courbe grise la lumière. Les traits pointillés marquent les deux pics.
      C'est le profil qui dit où tombe le temps fort et si la vidéo se pose ; le
      regard seul se trompe sur les deux.
    </p>
    <div class="compte">
      <span class="puce-c"><b>4</b> éléments · 10 s · 24 i/s</span>
      <span class="puce-c">source <b>${(totalSrc / 1024).toFixed(1).replace(".", ",")} Mo</b></span>
      <span class="puce-c">réduites <b>${totalKo} Ko</b></span>
      <span class="puce-c"><b>0</b> coupe dans les quatre</span>
    </div>
  </header>

  <div class="grille">${cartes}</div>

  <footer>
    <h2>Ce que la mesure dit, et que l'œil rate</h2>
    <p>
      <b>La queue</b> est le rapport entre le mouvement du dernier cinquième et
      le mouvement maximal. Trois éléments sont à <b>0,07</b> : ils ralentissent
      et se posent, donc leur reprise de boucle passe inaperçue. L'orbite est à
      <b>0,382</b> — elle bouge encore autant à la fin qu'au milieu, et sa
      reprise se verra.
    </p>
    <p>
      <b>L'ordre des deux pics</b> raconte le geste. Sur « le cadenas qui se
      forme », le mouvement culmine à 1,96 s et la lumière à 6,46 s : l'objet se
      construit d'abord, il s'allume ensuite. Sur « l'empreinte », la lumière
      culmine à 9,92 s, tout à la fin : la vidéo construit vers sa conclusion.
      Deux façons opposées d'occuper dix secondes.
    </p>
    <p>
      <b>Le poids reste le point dur.</b> Réduites, les quatre pèsent
      ${totalKo} Ko — mais la page fait déjà 1,88 Mo parce que tout y est
      incrusté en base64. Les poser telles quelles la porterait à plus de 3 Mo.
      Elles doivent être servies en fichiers, chargées à la demande quand la
      section approche. C'est le même chantier que celui déjà signalé sur le
      poids de la page.
    </p>
  </footer>

</div>

<script>
(() => {
  "use strict";
  /* Chaque vidéo ne tourne que lorsqu'elle est à l'écran : quatre lectures
     simultanées hors du cadre consomment sans rien montrer. Et on retente sur
     canplay — appeler play() avant que les données soient prêtes rejette la
     promesse, défaut déjà payé sur le site. */
  const vus = new Map();
  const obs = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    vus.set(v, e.isIntersecting);
    if (e.isIntersecting) { if (v.paused) v.play().catch(() => {}); }
    else v.pause();
  }), { threshold: .3 });
  document.querySelectorAll(".vue video").forEach((v) => {
    v.addEventListener("canplay", () => { if (vus.get(v) && v.paused) v.play().catch(() => {}); });
    obs.observe(v);
  });
})();
</script>
`;

writeFileSync(SORTIE, html, "utf8");
console.log("\nPlanche ->", SORTIE, (Buffer.byteLength(html) / 1024 / 1024).toFixed(2), "Mo\n");
