/* Le schema qui image la phrase :
   « C'est a vous de choisir, et votre correspondant garde le sien. »

   Sans aucun logo d'operateur. Ceux du depot sont des rendus IA : celui de
   Moov porte un « oo » invente, et le pingouin de Wave n'est pas le fichier
   officiel. Une marque approximative est un faux, et un faux ne se publie
   pas. Le schema se sert donc de ce que le site possede DEJA en propre : les
   noms et les teintes de marque, qui sont des donnees, pas des images.

   Le schema suit le Cameleon : le bout gauche prend le rail choisi.

   Aucune dependance. usage : node planche-metaphore.mjs                     */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const A = resolve("../assets");
const SORTIE = resolve("../planche-metaphore.html");

const uri = (f, mime) =>
  `data:${mime};base64,${readFileSync(join(A, f)).toString("base64")}`;

const logo = uri("logo-symbole-blanc.png", "image/png");

/* Les memes rails que le site, avec leur teinte et l'encre qui tient dessus. */
const RAILS = [
  { n: "SwimPay", h: "82 100% 50%", e: "#141414" },
  { n: "Orange Money", h: "24 100% 50%", e: "#FFFFFF" },
  { n: "Wave", h: "196 92% 48%", e: "#FFFFFF" },
  { n: "MTN MoMo", h: "48 100% 50%", e: "#141414" },
  { n: "Moov Money", h: "212 88% 52%", e: "#FFFFFF" },
];

const ech = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const html = `<title>Chacun son réseau</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">

<style>
  :root {
    --o-fond: #0D0E0A; --o-bord: #2A2C1E; --o-encre: #EDEDE4; --o-encre-2: #8E9083;
    --noir: #141414; --acide: #A2FF01;
    --h: 82; --s: 100%; --l: 50%;
    --cam: hsl(var(--h) var(--s) var(--l));
    --cam-encre: #141414;
    --deux-sens: cubic-bezier(.77, 0, .175, 1);
    --sortie: cubic-bezier(.23, 1, .32, 1);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--o-fond); color: var(--o-encre);
    font-family: Outfit, ui-sans-serif, system-ui, sans-serif;
    font-size: 16px; line-height: 1.55; -webkit-font-smoothing: antialiased;
  }
  .page { width: min(100% - 32px, 1060px); margin: 0 auto; padding: 40px 0 80px;
          display: flex; flex-direction: column; gap: 24px; }
  header { display: flex; flex-direction: column; gap: 8px; }
  .sur { font-family: "IBM Plex Mono", monospace; font-size: 11px;
         letter-spacing: .14em; text-transform: uppercase; color: var(--o-encre-2); }
  h1 { margin: 0; font-size: clamp(28px, 5vw, 42px); font-weight: 600; letter-spacing: -.025em; }
  .chapo { margin: 0; max-width: 66ch; color: var(--o-encre-2); }
  .chapo b { color: var(--o-encre); font-weight: 500; }

  /* ════════ la section, telle qu'en ligne ════════ */
  .demo { border: 1px solid var(--o-bord); border-radius: 14px; overflow: hidden;
          background: var(--noir); }
  .dedans { width: min(100% - 48px, 960px); margin-inline: auto; }
  .sect { padding: clamp(44px, 6vw, 76px) 0; color: #FFFFFF; }
  h2 { margin: 0 0 18px; font-size: clamp(26px, 3.6vw, 40px); line-height: 1.04;
       font-weight: 500; letter-spacing: -.015em; max-width: 16ch; }
  .para { margin: 0; max-width: 56ch; font-size: 17.5px; line-height: 1.36;
          color: rgba(255, 255, 255, .68); }
  .para b { color: #FFFFFF; font-weight: 500; }

  .rails { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 28px; }
  .rail { padding: 9px 16px; border-radius: 999px; font-size: 14.5px; font-weight: 500;
          border: 1px solid rgba(255,255,255,.18); color: rgba(255,255,255,.62);
          background: none; cursor: pointer; font-family: inherit; min-height: 44px;
          transition: color 260ms ease, background-color 260ms ease, border-color 260ms ease,
                      transform 140ms var(--sortie); }
  .rail:active { transform: scale(.97); }
  .rail:focus-visible { outline: 2px solid var(--cam); outline-offset: 3px; }
  .rail[aria-pressed="true"] { color: var(--cam-encre); background: var(--cam); border-color: transparent; }

  /* ════════ LE SCHÉMA ════════
     Deux bouts, deux réseaux différents, un fil qui passe par SwimPay. Le bout
     gauche prend le rail choisi ; le droit garde le sien. C'est la phrase,
     dessinée. */
  .schema { margin-top: 44px; position: relative; }
  .fil {
    display: grid; grid-template-columns: 1fr auto 1fr;
    align-items: center; gap: clamp(10px, 3vw, 30px);
  }

  /* align-items par defaut vaut stretch : la pastille s'etirait sur toute la
     colonne et recouvrait le fil. Elle doit garder sa largeur de contenu. */
  .bout { display: flex; flex-direction: column; gap: 10px; min-width: 0; align-items: flex-start; }
  .bout.droite { align-items: flex-end; text-align: right; }

  .pastille {
    display: inline-flex; align-items: center; gap: 9px;
    padding: 13px 20px; border-radius: 999px;
    font-size: clamp(14px, 1.6vw, 17px); font-weight: 600; letter-spacing: -.01em;
    white-space: nowrap; max-width: 100%;
    transition: background-color 800ms var(--deux-sens), color 800ms var(--deux-sens);
  }
  .p-gauche { background: var(--cam); color: var(--cam-encre); }
  .p-droite { background: hsl(var(--dh) var(--ds) var(--dl)); color: var(--d-encre); }
  .pastille i {
    width: 9px; height: 9px; border-radius: 50%;
    background: currentColor; opacity: .55; flex: none;
  }

  .qui {
    font-family: "IBM Plex Mono", monospace; font-size: 11px;
    letter-spacing: .09em; text-transform: uppercase; color: rgba(255,255,255,.42);
  }

  /* le cœur : la marque, sur laquelle le fil passe */
  .coeur {
    position: relative; width: clamp(60px, 8vw, 78px); aspect-ratio: 1;
    border-radius: 24px; display: grid; place-items: center;
    background: #1E1E1E; border: 1px solid rgba(255,255,255,.14);
    box-shadow: 0 0 0 8px rgba(20,20,20,1);
  }
  .coeur img { width: 46%; height: auto; display: block; opacity: .92; }

  /* le trait, derrière tout, qui traverse d'un bout à l'autre */
  .trait { position: absolute; left: 0; right: 0; top: 50%; height: 2px;
           transform: translateY(-1px); pointer-events: none; }
  .trait::before {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(90deg,
      hsl(var(--h) var(--s) var(--l) / .55) 0%,
      rgba(255,255,255,.34) 46%, rgba(255,255,255,.34) 54%,
      hsl(var(--dh) var(--ds) var(--dl) / .55) 100%);
    transition: background 800ms var(--deux-sens);
  }
  /* la valeur qui circule : un point qui traverse, sans arrêt et sans bruit */
  .grain {
    position: absolute; top: 50%; left: 0; width: 8px; height: 8px;
    margin-top: -4px; border-radius: 50%; background: #FFFFFF;
    box-shadow: 0 0 12px rgba(255,255,255,.7);
    animation: traverse 3.4s cubic-bezier(.55,0,.45,1) infinite;
  }
  @keyframes traverse {
    0%   { left: 0%;   opacity: 0; transform: scale(.6); }
    12%  { opacity: 1; transform: scale(1); }
    88%  { opacity: 1; transform: scale(1); }
    100% { left: 100%; opacity: 0; transform: scale(.6); }
  }

  .legende { margin: 26px 0 0; font-size: 15px; color: rgba(255,255,255,.56); max-width: 62ch; }
  .legende b { color: #FFFFFF; font-weight: 500; }

  @media (max-width: 720px) {
    .fil { grid-template-columns: 1fr; justify-items: center; gap: 18px; }
    .bout.droite { align-items: center; text-align: center; }
    .trait { display: none; }
    .coeur { box-shadow: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .grain { animation: none; opacity: 0; }
    .pastille, .trait::before { transition: none; }
  }

  /* ════════ notes ════════ */
  .notes { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
           gap: 1px; background: var(--o-bord); border: 1px solid var(--o-bord);
           border-radius: 12px; overflow: hidden; }
  .notes > div { background: var(--o-fond); padding: 16px 18px; display: flex;
                 flex-direction: column; gap: 5px; }
  .notes dt { font-family: "IBM Plex Mono", monospace; font-size: 10.5px;
              letter-spacing: .07em; text-transform: uppercase; color: var(--o-encre-2); }
  .notes dd { margin: 0; font-size: 14px; }
  .alerte { color: #FF6B4A; }
</style>

<div class="page">

  <header>
    <p class="sur">Section « Émettez vos factures » · le schéma</p>
    <h1>Chacun son réseau</h1>
    <p class="chapo">
      La phrase dessinée : <b>vous choisissez le vôtre, votre correspondant garde
      le sien</b>, et la valeur passe entre les deux. Clique un rail — le bout
      gauche le prend, le droit reste sur un autre. Le schéma suit le Caméléon
      au lieu de le répéter.
    </p>
  </header>

  <div class="demo">
    <section class="sect">
      <div class="dedans">
        <h2>Émettez vos factures en une minute</h2>
        <p class="para">SwimPay envoie ou reçoit de l'argent depuis
          <b>n'importe quel Mobile Money</b> et n'importe quelle banque.
          C'est à vous de choisir, et votre correspondant garde le sien.</p>

        <div class="rails" id="rails" role="group" aria-label="Réseaux pris en charge">
          ${RAILS.map((r, i) => `<button class="rail" data-h="${r.h}" data-encre="${r.e}" data-nom="${ech(r.n)}"${i === 0 ? ' aria-pressed="true"' : ""}>${ech(r.n)}</button>`).join("\n          ")}
        </div>

        <div class="schema">
          <div class="trait" aria-hidden="true"><span class="grain"></span></div>
          <div class="fil">
            <div class="bout">
              <p class="qui">vous</p>
              <span class="pastille p-gauche" id="pGauche"><i></i><span id="nGauche">SwimPay</span></span>
            </div>
            <div class="coeur" role="img" aria-label="SwimPay">
              <img src="${logo}" alt="">
            </div>
            <div class="bout droite">
              <p class="qui">votre correspondant</p>
              <span class="pastille p-droite" id="pDroite"><span id="nDroite">Orange Money</span><i></i></span>
            </div>
          </div>
        </div>

        <p class="legende" id="legende"></p>
      </div>
    </section>
  </div>

  <dl class="notes">
    <div><dt>ce que ça coûte</dt><dd>Rien. Aucune image, aucune vidéo : des pastilles, un trait et un point. Tout est déjà dans la page.</dd></div>
    <div><dt>pourquoi sans logos</dt><dd class="alerte">Les logos d'opérateurs du dépôt sont des rendus IA. Celui de Moov porte un « oo » inventé ; le pingouin de Wave n'est pas le fichier officiel. Une marque approximative est un faux.</dd></div>
    <div><dt>pour les avoir</dt><dd>Il faut les fichiers officiels, pris sur les espaces presse des quatre opérateurs. Le schéma les accueillera dans les pastilles sans rien changer d'autre.</dd></div>
  </dl>

</div>

<script>
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const RAILS = ${JSON.stringify(RAILS)};
  const rails = [...document.querySelectorAll(".rail")];
  const R = document.documentElement;

  /* Le correspondant n'est jamais sur le meme reseau que vous : c'est tout le
     propos de la phrase. On prend donc le suivant, jamais le meme. */
  const pose = (i) => {
    const moi = RAILS[i];
    /* Le correspondant est TOUJOURS un operateur, jamais SwimPay : SwimPay est
       le milieu du fil, pas un de ses bouts. Ecrire « votre correspondant
       recoit sur SwimPay » disait le contraire de la phrase. Et jamais le meme
       que vous — c'est tout le propos. */
    const lui = RAILS[i === 0 ? 1 : (i % 4) + 1];
    rails.forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));

    const [h, s, l] = moi.h.split(" ");
    R.style.setProperty("--h", h); R.style.setProperty("--s", s); R.style.setProperty("--l", l);
    R.style.setProperty("--cam-encre", moi.e);

    const [dh, ds, dl] = lui.h.split(" ");
    R.style.setProperty("--dh", dh); R.style.setProperty("--ds", ds); R.style.setProperty("--dl", dl);
    R.style.setProperty("--d-encre", lui.e);

    $("nGauche").textContent = moi.n;
    $("nDroite").textContent = lui.n;
    $("legende").innerHTML =
      "Vous envoyez depuis <b>" + moi.n + "</b>. Votre correspondant reçoit sur <b>" +
      lui.n + "</b>, sans rien changer chez lui.";
  };

  let cycle = null, k = 0;
  rails.forEach((b, i) => b.addEventListener("click", () => {
    clearInterval(cycle); cycle = null; k = i; pose(i);
  }));
  pose(0);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    cycle = setInterval(() => { k = (k + 1) % RAILS.length; pose(k); }, 3200);
  }
})();
</script>
`;

writeFileSync(SORTIE, html, "utf8");
console.log("Planche ->", SORTIE, (Buffer.byteLength(html) / 1024).toFixed(0), "Ko\n");
