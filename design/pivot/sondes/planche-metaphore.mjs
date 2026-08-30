/* MOTION DESIGN — « chacun son reseau ».

   Premiere version : un schema fixe avec un point qui glisse dessus. C'etait
   de la decoration, pas du motion design. Ici c'est une SEQUENCE, avec des
   actes, des courbes et un palier — la meme discipline que le socle : attaque
   franche, freinage long, jamais un ease-in, et une reprise nette.

   Le geste qui porte la metaphore : la valeur part dans VOTRE couleur, entre
   dans SwimPay, et en ressort dans CELLE DE L'AUTRE. La conversion se voit,
   et aucun des deux bouts n'a bouge.

   Aucune dependance. usage : node planche-metaphore.mjs                      */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const A = resolve("../assets");
const SORTIE = resolve("../planche-metaphore.html");
const logo = `data:image/png;base64,${readFileSync(join(A, "logo-symbole-blanc.png")).toString("base64")}`;

/* Les memes rails que le site. Aucun logo d'operateur : ceux du depot sont des
   rendus IA — le « oo » de Moov est invente — et une marque approximative est
   un faux. Les noms et les teintes, eux, sont des donnees du site. */
const RAILS = [
  { n: "SwimPay",      h: "82 100% 50%",  e: "#141414" },
  { n: "Orange Money", h: "24 100% 50%",  e: "#FFFFFF" },
  { n: "Wave",         h: "196 92% 48%",  e: "#FFFFFF" },
  { n: "MTN MoMo",     h: "48 100% 50%",  e: "#141414" },
  { n: "Moov Money",   h: "212 88% 52%",  e: "#FFFFFF" },
];

/* Les actes, en secondes. Ce sont eux qui sont regles, pas des durees
   d'animation eparpillees dans le CSS. */
const T = { depart: 0.60, centre: 1.45, mue: 1.85, arrivee: 2.75, pose: 3.20, boucle: 4.40 };

const ech = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const html = `<title>La valeur qui change de réseau</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">

<style>
  :root {
    --o-fond: #0D0E0A; --o-surface: #16170F; --o-bord: #2A2C1E;
    --o-encre: #EDEDE4; --o-encre-2: #8E9083;
    --noir: #141414; --acide: #A2FF01;
    --h: 48; --s: 100%; --l: 50%; --e: #141414;
    --dh: 212; --ds: 88%; --dl: 52%; --de: #FFFFFF;
    --sortie: cubic-bezier(.23, 1, .32, 1);
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--o-fond); color: var(--o-encre);
         font-family: Outfit, ui-sans-serif, system-ui, sans-serif;
         font-size: 15px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
  .page { width: min(100% - 32px, 1080px); margin: 0 auto; padding: 40px 0 80px;
          display: flex; flex-direction: column; gap: 20px; }
  header { display: flex; flex-direction: column; gap: 8px; }
  .sur { font-family: "IBM Plex Mono", monospace; font-size: 11px;
         letter-spacing: .14em; text-transform: uppercase; color: var(--o-encre-2); }
  h1 { margin: 0; font-size: clamp(28px, 5vw, 42px); font-weight: 600; letter-spacing: -.025em; }
  .chapo { margin: 0; max-width: 68ch; color: var(--o-encre-2); }
  .chapo b { color: var(--o-encre); font-weight: 500; }

  /* ════════ LA SCÈNE ════════ */
  .scene {
    position: relative; background: var(--noir); border: 1px solid var(--o-bord);
    border-radius: 14px; overflow: hidden;
    height: clamp(260px, 34vw, 380px);
  }
  /* le sol : deux halos qui prennent la couleur de chaque bout */
  .scene::before, .scene::after {
    content: ""; position: absolute; top: 0; bottom: 0; width: 46%; pointer-events: none;
    transition: background 700ms var(--sortie);
  }
  .scene::before { left: 0;  background: radial-gradient(70% 60% at 22% 50%, hsl(var(--h) var(--s) var(--l) / .16), transparent 72%); }
  .scene::after  { right: 0; background: radial-gradient(70% 60% at 78% 50%, hsl(var(--dh) var(--ds) var(--dl) / .16), transparent 72%); }

  .bout {
    position: absolute; top: 50%; translate: 0 -50%;
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    width: 22%; min-width: 130px;
  }
  .bout.g { left: 4%; }
  .bout.d { right: 4%; }

  .disque {
    width: clamp(64px, 8.5vw, 92px); aspect-ratio: 1; border-radius: 50%;
    display: grid; place-items: center; position: relative;
    font-weight: 600; font-size: clamp(13px, 1.5vw, 15px); letter-spacing: -.01em;
    text-align: center; padding: 6px; line-height: 1.1;
    transition: background-color 700ms var(--sortie), color 700ms var(--sortie);
  }
  .disque.g { background: hsl(var(--h) var(--s) var(--l)); color: var(--e); }
  .disque.d { background: hsl(var(--dh) var(--ds) var(--dl)); color: var(--de); }
  /* l'onde qui part du disque quand la valeur le quitte ou l'atteint */
  .onde {
    position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
    border: 2px solid currentColor; opacity: 0;
  }
  .qui { font-family: "IBM Plex Mono", monospace; font-size: 10.5px;
         letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.40); }

  /* le cœur */
  .coeur {
    position: absolute; left: 50%; top: 50%; translate: -50% -50%;
    width: clamp(58px, 7.4vw, 80px); aspect-ratio: 1; border-radius: 22px;
    display: grid; place-items: center;
    background: #1C1C1C; border: 1px solid rgba(255,255,255,.14);
  }
  .coeur img { width: 46%; display: block; opacity: .92; }
  .halo {
    position: absolute; inset: -14px; border-radius: 30px; pointer-events: none;
    box-shadow: 0 0 0 2px rgba(255,255,255,.5); opacity: 0;
  }

  /* le rail sur lequel la valeur voyage */
  .voie { position: absolute; left: 0; right: 0; top: 50%; height: 1px;
          background: rgba(255,255,255,.10); }

  /* LA VALEUR */
  .jeton {
    position: absolute; left: 0; top: 50%; width: 44px; height: 44px;
    margin: -22px 0 0 -22px; border-radius: 50%;
    display: grid; place-items: center; will-change: transform;
    box-shadow: 0 8px 26px rgba(0,0,0,.5);
    z-index: 4;   /* il passe DEVANT la marque, jamais derrière */
  }
  .jeton b { font-size: 19px; font-weight: 700; line-height: 1; }

  .hud { position: absolute; left: 14px; bottom: 12px;
         font-family: "IBM Plex Mono", monospace; font-size: 11px;
         color: rgba(255,255,255,.38); font-variant-numeric: tabular-nums; }
  .phrase { position: absolute; right: 16px; bottom: 12px; max-width: 54%;
            text-align: right; font-size: 14px; color: rgba(255,255,255,.62); }
  .phrase b { color: #FFFFFF; font-weight: 500; }

  /* ════════ transport ════════ */
  .transport { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  button { font: 600 14px/1 Outfit, sans-serif; color: var(--o-fond); background: var(--o-encre);
           border: 0; border-radius: 999px; padding: 11px 20px; cursor: pointer; min-width: 90px;
           transition: transform 160ms var(--sortie); }
  button:active { transform: scale(.97); }
  button:focus-visible { outline: 2px solid var(--acide); outline-offset: 3px; }
  .horloge { font-family: "IBM Plex Mono", monospace; font-size: 13px;
             font-variant-numeric: tabular-nums; color: var(--o-encre-2); white-space: nowrap; }
  .horloge b { color: var(--o-encre); font-weight: 600; }
  input[type=range] { -webkit-appearance: none; appearance: none; background: none; height: 22px;
                      cursor: pointer; flex: 1 1 200px; min-width: 160px; }
  input[type=range]::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: var(--o-bord); }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px;
    border-radius: 50%; background: var(--o-encre); border: 3px solid var(--o-fond);
    margin-top: -6px; box-shadow: 0 0 0 1px var(--o-bord); }

  .phases { position: relative; height: 40px; border-radius: 8px;
            border: 1px solid var(--o-bord); background: var(--o-surface); overflow: hidden; }
  .seg { position: absolute; top: 0; bottom: 0; display: flex; align-items: center;
         padding-left: 8px; font-family: "IBM Plex Mono", monospace; font-size: 10px;
         letter-spacing: .05em; text-transform: uppercase; color: var(--o-encre-2);
         border-left: 1px solid var(--o-bord); white-space: nowrap; overflow: hidden; }
  .tete { position: absolute; top: -1px; bottom: -1px; width: 2px; background: var(--o-encre);
          will-change: transform; }

  .rails { display: flex; flex-wrap: wrap; gap: 8px; }
  .rail { padding: 9px 15px; border-radius: 999px; font-size: 14px; font-weight: 500;
          border: 1px solid var(--o-bord); color: rgba(237,237,228,.62); background: none;
          cursor: pointer; font-family: inherit; min-height: 44px;
          transition: color 240ms ease, background-color 240ms ease, border-color 240ms ease; }
  .rail[aria-pressed="true"] { color: var(--e); background: hsl(var(--h) var(--s) var(--l));
                               border-color: transparent; font-weight: 600; }

  .note { font-size: 13.5px; color: var(--o-encre-2); max-width: 74ch; margin: 0; }
  .note b { color: var(--o-encre); font-weight: 500; }
  h2 { margin: 0; font-size: 17px; font-weight: 600; }
  .bloc { display: flex; flex-direction: column; gap: 9px; }

  @media (prefers-reduced-motion: reduce) { button { transition: none; } }
</style>

<div class="page">

  <header>
    <p class="sur">Motion design · « chacun son réseau »</p>
    <h1>La valeur change de réseau</h1>
    <p class="chapo">
      Une séquence, pas un schéma. La valeur part <b>dans votre couleur</b>,
      entre dans SwimPay, et <b>en ressort dans celle de l'autre</b>. La
      conversion se voit, et aucun des deux bouts n'a bougé. Choisis ton rail —
      la scène entière suit.
    </p>
  </header>

  <div class="rails" id="rails" role="group" aria-label="Votre réseau">
    ${RAILS.map((r, i) => `<button class="rail" data-i="${i}"${i === 3 ? ' aria-pressed="true"' : ""}>${ech(r.n)}</button>`).join("\n    ")}
  </div>

  <div class="scene" id="scene">
    <div class="voie"></div>

    <div class="bout g">
      <div class="disque g" id="dG"><span id="nG">MTN MoMo</span><span class="onde" id="oG"></span></div>
      <p class="qui">vous</p>
    </div>

    <div class="coeur"><img src="${logo}" alt="SwimPay"><span class="halo" id="halo"></span></div>

    <div class="bout d">
      <div class="disque d" id="dD"><span id="nD">Moov Money</span><span class="onde" id="oD"></span></div>
      <p class="qui">votre correspondant</p>
    </div>

    <div class="jeton" id="jeton"><b>₣</b></div>

    <p class="hud" id="hud">—</p>
    <p class="phrase" id="phrase"></p>
  </div>

  <div class="transport">
    <button id="btn" type="button">Pause</button>
    <input id="scrub" type="range" min="0" max="1000" value="0" step="1" aria-label="Position">
    <p class="horloge"><b id="tc">0,00</b> / ${T.boucle.toFixed(2).replace(".", ",")} s</p>
  </div>

  <div class="phases" id="phases">
    <div class="seg" id="s1">départ</div>
    <div class="seg" id="s2">trajet</div>
    <div class="seg" id="s3">la mue</div>
    <div class="seg" id="s4">trajet</div>
    <div class="seg" id="s5">arrivée · palier</div>
    <div class="tete" id="tete"></div>
  </div>

  <div class="bloc">
    <h2>Ce qui est réglé, et pourquoi</h2>
    <p class="note">
      <b>La mue au centre est le seul moment qui compte.</b> Le jeton s'écrase à
      l'entrée, la marque s'allume, et il ressort de l'autre couleur. C'est là
      que le produit se dit : la conversion arrive dans SwimPay, pas chez l'un
      ni chez l'autre.
    </p>
    <p class="note">
      <b>Les courbes ne sont pas décoratives.</b> Le départ est en expo-out —
      attaque franche, freinage long ; les deux trajets sont en in-out, parce
      qu'un objet qui traverse accélère puis ralentit ; l'arrivée retombe en
      expo-out. Jamais un ease-in : il rend le début mou, exactement là où
      l'œil regarde.
    </p>
    <p class="note">
      <b>Aucun logo d'opérateur.</b> Ceux du dépôt sont des rendus IA — celui de
      Moov porte un « oo » inventé. Les disques prendront les vrais fichiers
      officiels sans qu'une autre ligne change.
    </p>
  </div>

</div>

<script>
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const RAILS = ${JSON.stringify(RAILS)};
  const T = ${JSON.stringify(T)};
  const R = document.documentElement;

  /* ── les courbes, resolues a la main pour pouvoir scrubber ── */
  const bez = (x1, y1, x2, y2) => {
    const A = (a, b) => 1 - 3*b + 3*a, B = (a, b) => 3*b - 6*a, C = (a) => 3*a;
    const cal = (t, a, b) => ((A(a,b)*t + B(a,b))*t + C(a))*t;
    const pen = (t, a, b) => 3*A(a,b)*t*t + 2*B(a,b)*t + C(a);
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const d = pen(t, x1, x2); if (Math.abs(d) < 1e-6) break;
        const e = cal(t, x1, x2) - x; if (Math.abs(e) < 1e-6) return cal(t, y1, y2);
        t -= e / d;
      }
      return cal(t, y1, y2);
    };
  };
  const expoOut = bez(.16, 1, .3, 1);
  const inOut   = bez(.65, 0, .35, 1);
  const sat = (x) => Math.min(1, Math.max(0, x));
  const lerp = (a, b, p) => a + (b - a) * p;

  const jeton = $("jeton"), scene = $("scene");
  let moi = 3, lui = 4, larg = 0;

  const mesure = () => {
    const r = scene.getBoundingClientRect();
    larg = r.width;
    // les centres des deux disques et du cœur, en px depuis le bord gauche
    const c = (el) => { const b = el.getBoundingClientRect(); return b.left - r.left + b.width / 2; };
    return { g: c($("dG")), m: r.width / 2, d: c($("dD")), h: r.height };
  };
  let P = mesure();
  addEventListener("resize", () => { P = mesure(); });

  /* ── LA SÉQUENCE ─────────────────────────────────────────────────────── */
  function pose(t) {
    const teinte = (r) => "hsl(" + r.h.split(" ").join(" ") + ")";
    let x, y = 0, s = 1, sx = 1, sy = 1, op = 1, couleur, encre;

    if (t < T.depart) {
      /* le jeton nait dans votre disque : il grossit et se detache */
      const p = expoOut(sat(t / T.depart));
      x = P.g; y = lerp(0, -6, p); s = lerp(0.25, 1, p); op = p;
      couleur = teinte(RAILS[moi]); encre = RAILS[moi].e;
    } else if (t < T.centre) {
      /* il traverse : accelere puis ralentit, avec une legere levee */
      const p = inOut(sat((t - T.depart) / (T.centre - T.depart)));
      x = lerp(P.g, P.m, p); y = -6 - Math.sin(p * Math.PI) * 26; s = 1;
      couleur = teinte(RAILS[moi]); encre = RAILS[moi].e;
    } else if (t < T.mue) {
      /* LA MUE : il s'ecrase a l'entree, la marque s'allume, il ressort autre */
      const p = sat((t - T.centre) / (T.mue - T.centre));
      x = P.m; y = -6;
      s = 1;
      /* Un franchissement se dit par un ECRASEMENT, pas par une reduction :
         on comprime en largeur et on etire en hauteur. Reduit uniformement, le
         jeton devenait minuscule et la marque l'avalait. */
      sx = 1 - Math.sin(p * Math.PI) * 0.46;
      sy = 1 + Math.sin(p * Math.PI) * 0.26;
      const bascule = p > 0.5;
      couleur = teinte(RAILS[bascule ? lui : moi]);
      encre = (bascule ? RAILS[lui] : RAILS[moi]).e;
    } else if (t < T.arrivee) {
      const p = inOut(sat((t - T.mue) / (T.arrivee - T.mue)));
      x = lerp(P.m, P.d, p); y = -6 - Math.sin(p * Math.PI) * 26; s = 1;
      couleur = teinte(RAILS[lui]); encre = RAILS[lui].e;
    } else {
      /* il se pose dans le disque du correspondant et s'y fond */
      const p = expoOut(sat((t - T.arrivee) / (T.pose - T.arrivee)));
      x = P.d; y = lerp(-6, 0, p); s = lerp(1, 0.25, p); op = 1 - p;
      couleur = teinte(RAILS[lui]); encre = RAILS[lui].e;
    }

    jeton.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" +
      (s * sx).toFixed(3) + "," + (s * sy).toFixed(3) + ")";
    jeton.style.background = couleur;
    jeton.style.color = encre;
    jeton.style.opacity = op.toFixed(3);

    /* les ondes : le depart chez vous, l'arrivee chez lui */
    const onde = (el, debut, duree) => {
      const p = sat((t - debut) / duree);
      el.style.opacity = (p > 0 && p < 1 ? (1 - p) * 0.85 : 0).toFixed(3);
      el.style.transform = "scale(" + (1 + p * 0.55).toFixed(3) + ")";
    };
    onde($("oG"), 0.08, 0.7);
    onde($("oD"), T.arrivee - 0.05, 0.7);

    /* le halo du cœur, seulement pendant la mue */
    const hp = sat((t - T.centre + 0.08) / (T.mue - T.centre + 0.22));
    $("halo").style.opacity = (hp > 0 && hp < 1 ? Math.sin(hp * Math.PI) * 0.9 : 0).toFixed(3);
    $("halo").style.transform = "scale(" + (1 + Math.sin(sat(hp) * Math.PI) * 0.12).toFixed(3) + ")";

    const acte = t < T.depart ? "départ" : t < T.centre ? "trajet"
               : t < T.mue ? "LA MUE" : t < T.arrivee ? "trajet"
               : t < T.pose ? "arrivée" : "palier";
    $("hud").textContent = acte + "   t = " + t.toFixed(2).replace(".", ",") + " s";
  }

  /* ── le Caméléon : votre rail, et celui d'en face ── */
  function poseRail(i) {
    moi = i;
    lui = i === 0 ? 1 : (i % 4) + 1;   // toujours un opérateur, jamais vous, jamais SwimPay
    [...$("rails").children].forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
    const [h, s, l] = RAILS[moi].h.split(" ");
    R.style.setProperty("--h", h); R.style.setProperty("--s", s); R.style.setProperty("--l", l);
    R.style.setProperty("--e", RAILS[moi].e);
    const [dh, ds, dl] = RAILS[lui].h.split(" ");
    R.style.setProperty("--dh", dh); R.style.setProperty("--ds", ds); R.style.setProperty("--dl", dl);
    R.style.setProperty("--de", RAILS[lui].e);
    $("nG").textContent = RAILS[moi].n;
    $("nD").textContent = RAILS[lui].n;
    $("phrase").innerHTML = "Vous envoyez depuis <b>" + RAILS[moi].n +
      "</b>, il reçoit sur <b>" + RAILS[lui].n + "</b>. Aucun des deux n'a rien changé.";
    P = mesure();
  }

  /* ── transport ── */
  const st = { t: 0, lit: true };
  let prec = null, dernier = -1;

  function tour(ts) {
    if (prec !== null && st.lit) {
      st.t += (ts - prec) / 1000;
      if (st.t >= ${T.boucle}) st.t -= ${T.boucle};
    }
    prec = ts;
    pose(st.t);
    if (ts - dernier > 90) {
      dernier = ts;
      $("tc").textContent = st.t.toFixed(2).replace(".", ",");
      $("tete").style.transform = "translateX(" + (st.t / ${T.boucle} * $("phases").clientWidth).toFixed(1) + "px)";
      if (document.activeElement !== $("scrub")) $("scrub").value = Math.round(st.t / ${T.boucle} * 1000);
    }
    requestAnimationFrame(tour);
  }

  $("btn").addEventListener("click", () => {
    st.lit = !st.lit; $("btn").textContent = st.lit ? "Pause" : "Lire";
  });
  $("scrub").addEventListener("input", (e) => {
    st.lit = false; $("btn").textContent = "Lire";
    st.t = (e.target.value / 1000) * ${T.boucle};
  });
  $("rails").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (b) poseRail(Number(b.dataset.i));
  });

  /* la bande des actes */
  const bornes = [0, T.depart, T.centre, T.mue, T.arrivee, ${T.boucle}];
  ["s1","s2","s3","s4","s5"].forEach((id, k) => {
    const a = bornes[k] / ${T.boucle} * 100, b = bornes[k+1] / ${T.boucle} * 100;
    $(id).style.cssText = "left:" + a.toFixed(2) + "%;width:" + (b - a).toFixed(2) + "%" +
      (k === 2 ? ";background:hsl(82 100% 50% / .28);color:#EDEDE4" : k % 2 ? ";background:rgba(255,255,255,.04)" : "");
  });

  poseRail(3);
  requestAnimationFrame(tour);
})();
</script>
`;

writeFileSync(SORTIE, html, "utf8");
console.log("Planche ->", SORTIE, (Buffer.byteLength(html) / 1024).toFixed(0), "Ko\n");
