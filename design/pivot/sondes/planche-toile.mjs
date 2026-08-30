/* MOTION DESIGN — la toile : SwimPay au moyeu, toutes les operations autour.

   La vue large. Chaque rayon est une operation REELLE, prise de la grille
   tarifaire du moteur (packages/brain/src/pricing/grille.ts) et des textes du
   site — rien d'invente pour faire joli. Le sens du rayon est l'information
   principale : ce qui ENTRE, ce qui SORT, ce qui fait les deux.

   Le mouvement n'est pas un ornement : c'est la circulation elle-meme. Chaque
   rayon tire sa valeur a son propre rythme, dans son propre sens, et tout
   passe par le centre. C'est la these du produit, dessinee.

   Aucune dependance. usage : node planche-toile.mjs                          */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const A = resolve("../assets");
const SORTIE = resolve("../planche-toile.html");
const logo = `data:image/png;base64,${readFileSync(join(A, "logo-symbole-blanc.png")).toString("base64")}`;

/* sens : "e" entree (vers SwimPay), "s" sortie, "b" les deux.
   op : le nom de l'operation dans la grille, quand il en existe un. */
const NOEUDS = [
  { n: "Orange Money", f: "Mobile Money", h: "24 100% 50%",  sens: "b", op: "transfert · encaissement · retrait" },
  { n: "Wave",         f: "Mobile Money", h: "196 92% 48%",  sens: "b", op: "transfert · encaissement · retrait" },
  { n: "MTN MoMo",     f: "Mobile Money", h: "48 100% 50%",  sens: "b", op: "transfert · encaissement · retrait" },
  { n: "Moov Money",   f: "Mobile Money", h: "212 88% 52%",  sens: "b", op: "transfert · encaissement · retrait" },
  { n: "Votre banque", f: "Virement",     h: "0 0% 72%",     sens: "b", op: "banque vers mobile · mobile vers banque" },
  { n: "Carte Visa",   f: "Paiement",     h: "0 0% 86%",     sens: "s", op: "achat en ligne, carte virtuelle" },
  { n: "Au comptoir",  f: "Encaissement", h: "82 100% 50%",  sens: "e", op: "encaissement par QR ou sans contact" },
  { n: "Votre site",   f: "Encaissement", h: "82 100% 50%",  sens: "e", op: "checkout en ligne, par le SDK" },
  { n: "Vos salaires", f: "Décaissement", h: "0 0% 62%",     sens: "s", op: "paie, une signature pour toute l'équipe" },
  { n: "Fournisseurs", f: "Décaissement", h: "0 0% 62%",     sens: "s", op: "paiement fournisseur" },
];

const ech = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const html = `<title>La toile SwimPay</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">

<style>
  :root {
    --fond: #0D0E0A; --surface: #16170F; --bord: #2A2C1E;
    --encre: #EDEDE4; --encre-2: #8E9083;
    --noir: #141414; --acide: #A2FF01;
    --sortie: cubic-bezier(.23, 1, .32, 1);
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--fond); color: var(--encre);
         font-family: Outfit, ui-sans-serif, system-ui, sans-serif;
         font-size: 15px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
  .page { width: min(100% - 32px, 1120px); margin: 0 auto; padding: 40px 0 80px;
          display: flex; flex-direction: column; gap: 20px; }
  header { display: flex; flex-direction: column; gap: 8px; }
  .sur { font-family: "IBM Plex Mono", monospace; font-size: 11px;
         letter-spacing: .14em; text-transform: uppercase; color: var(--encre-2); }
  h1 { margin: 0; font-size: clamp(28px, 5vw, 42px); font-weight: 600; letter-spacing: -.025em; }
  .chapo { margin: 0; max-width: 70ch; color: var(--encre-2); }
  .chapo b { color: var(--encre); font-weight: 500; }

  .scene { position: relative; background: var(--noir);
           border: 1px solid var(--bord); border-radius: 14px; overflow: hidden; }
  svg { display: block; width: 100%; height: auto; }

  /* les rayons */
  .rayon { fill: none; stroke-linecap: round; transition: stroke-opacity 260ms ease, stroke-width 260ms ease; }
  .r-e { stroke: var(--acide); stroke-opacity: .30; stroke-width: 1.4; }
  .r-s { stroke: #FFFFFF;     stroke-opacity: .20; stroke-width: 1.4; }
  .r-b { stroke: #FFFFFF;     stroke-opacity: .26; stroke-width: 1.4; }
  g.actif .rayon { stroke-opacity: .9; stroke-width: 2.4; }

  /* les noeuds */
  .puce { transition: r 260ms var(--sortie); }
  .anneau { fill: none; stroke-width: 1.2; stroke-opacity: .5; }
  .nom { font-size: 15px; font-weight: 500; fill: #FFFFFF; letter-spacing: -.01em; }
  .fam { font-family: "IBM Plex Mono", monospace; font-size: 10px;
         letter-spacing: .09em; text-transform: uppercase; fill: rgba(255,255,255,.42); }
  g.noeud { cursor: pointer; }
  g.actif .nom { fill: #FFFFFF; }
  g.actif .fam { fill: rgba(255,255,255,.75); }

  /* le moyeu */
  .moyeu-fond { fill: #1C1C1C; stroke: rgba(255,255,255,.16); stroke-width: 1; }
  .moyeu-halo { fill: none; stroke: rgba(255,255,255,.45); stroke-width: 1.5; }

  .jeton { }

  .legende {
    position: absolute; left: 18px; bottom: 16px; display: flex; flex-direction: column; gap: 7px;
    font-family: "IBM Plex Mono", monospace; font-size: 11px; color: rgba(255,255,255,.5);
  }
  .legende span { display: flex; align-items: center; gap: 9px; }
  .legende i { width: 16px; height: 2px; border-radius: 2px; }
  .l-e { background: var(--acide); }
  .l-s { background: rgba(255,255,255,.6); }
  /* la moitie des rayons circule dans les deux sens : la legende doit le dire,
     sinon elle explique la moitie de la toile et laisse l'autre muette */
  .l-b { background: linear-gradient(90deg, var(--acide), rgba(255,255,255,.6)); }

  .detail {
    position: absolute; right: 18px; bottom: 16px; max-width: 46%; text-align: right;
    min-height: 44px;
  }
  .detail b { display: block; font-size: 17px; font-weight: 600; color: #FFFFFF; }
  .detail span { font-size: 13.5px; color: rgba(255,255,255,.6); }

  .transport { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  button { font: 600 14px/1 Outfit, sans-serif; color: var(--fond); background: var(--encre);
           border: 0; border-radius: 999px; padding: 11px 20px; cursor: pointer; min-width: 90px;
           transition: transform 160ms var(--sortie); }
  button:active { transform: scale(.97); }
  button:focus-visible { outline: 2px solid var(--acide); outline-offset: 3px; }
  .compte { font-family: "IBM Plex Mono", monospace; font-size: 12.5px; color: var(--encre-2); }
  .compte b { color: var(--encre); font-weight: 500; }

  .note { font-size: 13.5px; color: var(--encre-2); max-width: 74ch; margin: 0; }
  .note b { color: var(--encre); font-weight: 500; }
  h2 { margin: 0; font-size: 17px; font-weight: 600; }
  .bloc { display: flex; flex-direction: column; gap: 9px; }

  @media (max-width: 700px) { .legende, .detail { position: static; text-align: left;
    max-width: none; padding: 0 18px 16px; } .detail { padding-top: 10px; } }
  @media (prefers-reduced-motion: reduce) { button { transition: none; } }
</style>

<div class="page">

  <header>
    <p class="sur">Motion design · la vue large</p>
    <h1>La toile</h1>
    <p class="chapo">
      SwimPay au moyeu, et <b>toutes les opérations autour</b> — les quatre
      Mobile Money, les banques, la carte, l'encaissement au comptoir et en
      ligne, la paie, les fournisseurs. Chaque rayon porte son sens :
      <b>ce qui entre</b>, <b>ce qui sort</b>, ce qui fait les deux. Survole un
      nœud pour l'isoler.
    </p>
  </header>

  <div class="scene" id="scene">
    <svg id="toile" viewBox="0 0 1000 660" role="img"
         aria-label="SwimPay au centre, relié à dix contreparties : quatre Mobile Money, les banques, la carte, le comptoir, votre site, les salaires et les fournisseurs">
      <g id="rayons"></g>
      <g id="jetons"></g>
      <g id="noeuds"></g>
      <g id="moyeu">
        <circle class="moyeu-halo" id="halo" cx="500" cy="330" r="54" opacity="0"></circle>
        <rect class="moyeu-fond" x="458" y="288" width="84" height="84" rx="24"></rect>
        <image href="${logo}" x="479" y="309" width="42" height="42" opacity=".94"></image>
      </g>
    </svg>

    <div class="legende">
      <span><i class="l-e"></i>ce qui entre</span>
      <span><i class="l-s"></i>ce qui sort</span>
      <span><i class="l-b"></i>les deux sens</span>
    </div>
    <p class="detail" id="detail"><b>SwimPay</b><span>tout passe par le même compte</span></p>
  </div>

  <div class="transport">
    <button id="btn" type="button">Pause</button>
    <p class="compte"><b id="cN">10</b> contreparties · <b id="cE">0</b> entrées · <b id="cS">0</b> sorties · <b id="cB">0</b> dans les deux sens</p>
  </div>

  <div class="bloc">
    <h2>D'où viennent ces rayons</h2>
    <p class="note">
      Chacun est une opération <b>réelle</b>, prise de la grille tarifaire du
      moteur et des textes du site : transfert entre réseaux, mobile vers
      banque, banque vers mobile, retrait, encaissement de vente, checkout en
      ligne, paie des salaires, paiement fournisseur. Rien n'a été ajouté pour
      remplir la roue.
    </p>
    <p class="note">
      <b>Le sens est l'information principale.</b> <span id="phraseSens"></span>
      La forme dit le produit avant le premier mot.
    </p>
    <p class="note">
      <b>Aucun logo d'opérateur</b>, comme sur la séquence : ceux du dépôt sont
      des rendus IA et celui de Moov porte un « oo » inventé. Les puces
      prendront les fichiers officiels sans qu'une autre ligne change.
    </p>
  </div>

</div>

<script>
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const N = ${JSON.stringify(NOEUDS)};
  const CX = 500, CY = 330, RX = 352, RY = 232;

  const SVG = "http://www.w3.org/2000/svg";
  const el = (t, a) => { const e = document.createElementNS(SVG, t);
    for (const k in a) e.setAttribute(k, a[k]); return e; };

  /* Les positions : une ellipse, pas un cercle — le cadre est large, et un
     cercle y laisserait deux gros vides a gauche et a droite. */
  const pts = N.map((_, i) => {
    const a = -Math.PI / 2 + (i / N.length) * Math.PI * 2;
    return { a, x: CX + Math.cos(a) * RX, y: CY + Math.sin(a) * RY };
  });

  const gR = $("rayons"), gN = $("noeuds"), gJ = $("jetons");
  const groupes = [];

  N.forEach((n, i) => {
    const p = pts[i];
    const teinte = "hsl(" + n.h + ")";

    /* le rayon : une courbe tres legere, pas une droite. Dix droites depuis un
       meme point font une etoile de mire ; une courbe fait une toile. */
    const mx = (CX + p.x) / 2 + Math.cos(p.a + Math.PI / 2) * 26;
    const my = (CY + p.y) / 2 + Math.sin(p.a + Math.PI / 2) * 26;
    const d = "M " + CX + " " + CY + " Q " + mx.toFixed(1) + " " + my.toFixed(1) +
              " " + p.x.toFixed(1) + " " + p.y.toFixed(1);

    const g = el("g", { class: "noeud" });
    const ray = el("path", { class: "rayon r-" + n.sens, d });
    gR.appendChild(ray);

    g.appendChild(el("circle", { class: "anneau", cx: p.x, cy: p.y, r: 21, stroke: teinte }));
    g.appendChild(el("circle", { class: "puce", cx: p.x, cy: p.y, r: 13, fill: teinte }));

    /* le texte se pose du bon cote : vers l'exterieur, jamais par-dessus la toile */
    const dehors = 34;
    const tx = p.x + Math.cos(p.a) * dehors, ty = p.y + Math.sin(p.a) * dehors;
    const cote = Math.cos(p.a);
    const anc = Math.abs(cote) < 0.34 ? "middle" : cote > 0 ? "start" : "end";
    const nom = el("text", { class: "nom", x: tx, y: ty + 1, "text-anchor": anc });
    nom.textContent = n.n;
    const fam = el("text", { class: "fam", x: tx, y: ty + 17, "text-anchor": anc });
    fam.textContent = n.f;
    g.append(nom, fam);

    /* le jeton du rayon */
    const j = el("circle", { class: "jeton", r: 5.5, fill: n.sens === "e" ? "var(--acide)" : teinte,
                             cx: CX, cy: CY, opacity: 0 });
    gJ.appendChild(j);

    gN.appendChild(g);
    groupes.push({ n, p, g, ray, j, d,
      chemin: null, phase: (i / N.length) * 2.6 + (i % 3) * 0.31 });

    const survol = () => {
      groupes.forEach((x) => x.g.classList.remove("actif"));
      g.classList.add("actif");
      $("detail").innerHTML = "<b>" + n.n + "</b><span>" + n.op + "</span>";
    };
    g.addEventListener("pointerenter", survol);
    g.addEventListener("focusin", survol);
    g.setAttribute("tabindex", "0");
  });

  /* getPointAtLength donne la position exacte le long de la courbe : on ne
     re-derive pas la Bezier a la main, le navigateur la connait deja. */
  groupes.forEach((o) => { o.chemin = o.ray; o.len = o.ray.getTotalLength(); });

  $("scene").addEventListener("pointerleave", () => {
    groupes.forEach((x) => x.g.classList.remove("actif"));
    $("detail").innerHTML = "<b>SwimPay</b><span>tout passe par le même compte</span>";
  });

  const bez = (x1, y1, x2, y2) => {
    const A = (a, b) => 1 - 3*b + 3*a, B = (a, b) => 3*b - 6*a, C = (a) => 3*a;
    const cal = (t, a, b) => ((A(a,b)*t + B(a,b))*t + C(a))*t;
    const pen = (t, a, b) => 3*A(a,b)*t*t + 2*B(a,b)*t + C(a);
    return (x) => { if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) { const d = pen(t, x1, x2); if (Math.abs(d) < 1e-6) break;
        const e = cal(t, x1, x2) - x; if (Math.abs(e) < 1e-6) return cal(t, y1, y2); t -= e / d; }
      return cal(t, y1, y2); };
  };
  const inOut = bez(.65, 0, .35, 1);

  const CYCLE = 2.9;      // duree d'un aller sur un rayon
  const REPOS = 1.5;      // le rayon respire entre deux valeurs
  const TOTAL = CYCLE + REPOS;

  let t = 0, prec = null, lit = true;

  function tour(ts) {
    if (prec !== null && lit) t += (ts - prec) / 1000;
    prec = ts;

    let auCentre = 0;
    for (const o of groupes) {
      const local = ((t + o.phase) % TOTAL);
      if (local > CYCLE) { o.j.setAttribute("opacity", "0"); continue; }
      const p = inOut(local / CYCLE);

      /* le sens : entree = du noeud vers le moyeu, sortie = l'inverse.
         « les deux » alterne d'un passage a l'autre — c'est ce qui distingue
         un rayon qui circule d'un rayon a sens unique. */
      let versCentre = o.n.sens === "e";
      if (o.n.sens === "b") versCentre = Math.floor((t + o.phase) / TOTAL) % 2 === 0;

      const l = versCentre ? (1 - p) * o.len : p * o.len;
      const pt = o.chemin.getPointAtLength(l);
      o.j.setAttribute("cx", pt.x.toFixed(1));
      o.j.setAttribute("cy", pt.y.toFixed(1));
      /* il apparait en quittant son bord et s'efface en atteignant l'autre */
      const op = Math.min(1, Math.sin(p * Math.PI) * 2.4);
      o.j.setAttribute("opacity", op.toFixed(3));
      o.j.setAttribute("r", (4.4 + Math.sin(p * Math.PI) * 2.2).toFixed(2));

      /* qui touche le moyeu, en ce moment ? */
      const d2 = (pt.x - CX) ** 2 + (pt.y - CY) ** 2;
      if (d2 < 70 * 70) auCentre += 1 - Math.sqrt(d2) / 70;
    }

    /* le moyeu s'allume a la mesure de ce qui le traverse : le halo n'est pas
       une pulsation decorative, c'est une lecture du trafic. */
    $("halo").setAttribute("opacity", Math.min(0.85, auCentre * 0.5).toFixed(3));
    $("halo").setAttribute("r", (54 + Math.min(3, auCentre) * 5).toFixed(1));

    requestAnimationFrame(tour);
  }

  $("btn").addEventListener("click", () => {
    lit = !lit; $("btn").textContent = lit ? "Pause" : "Lire";
  });

  /* Les comptes sont LUS, jamais ecrits a la main : la premiere version
     annoncait quatre rayons a double sens la ou il y en a cinq. */
  const nE = N.filter((x) => x.sens === "e"), nS = N.filter((x) => x.sens === "s"),
        nB = N.filter((x) => x.sens === "b");
  const liste = (a) => a.map((x) => x.n).join(", ");
  $("phraseSens").textContent =
    nB.length + " rayons vont dans les deux sens — " + liste(nB) +
    " : c'est là que SwimPay est un passage. " + nE.length + " n'entrent que — " +
    liste(nE) + ". " + nS.length + " ne sortent que — " + liste(nS) + ".";
  $("cN").textContent = N.length;
  $("cE").textContent = N.filter((x) => x.sens === "e").length;
  $("cS").textContent = N.filter((x) => x.sens === "s").length;
  $("cB").textContent = N.filter((x) => x.sens === "b").length;

  requestAnimationFrame(tour);
})();
</script>
`;

writeFileSync(SORTIE, html, "utf8");
console.log("Toile ->", SORTIE, (Buffer.byteLength(html) / 1024).toFixed(0), "Ko\n");
