/* Monter la planche des presentations possibles de la video du Cameleon.

   Regle du projet : sur une question d'ESTHETIQUE on ne raconte pas, on fait
   choisir. Cinq presentations, la VRAIE video, le VRAI cycle des rails, et le
   choix ressort en CSS collable dans site.py.

   Aucune dependance. usage : node planche-video.mjs                        */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const A = resolve("../assets");
const SORTIE = resolve("../planche-video.html");

const uri = (f, mime) => {
  const b = readFileSync(join(A, f));
  console.log("  " + f.padEnd(28) + (b.length / 1024).toFixed(0) + " Ko");
  return `data:${mime};base64,${b.toString("base64")}`;
};

console.log("\nassets :");
const video = uri("hero-anim.mp4", "video/mp4");
const affiche = uri("hero-anim-poster.jpg", "image/jpeg");

const VUES = [
  {
    id: "boite", nom: "Boîte 9:16", sous: "ce qui est en ligne aujourd'hui",
    note: `Verticale, coin arrondi, ombre portée, un liseré qui prend la teinte du
      rail. Elle se lit comme un écran de téléphone sans en être un.`,
    cout: "aucun changement",
  },
  {
    id: "chassis", nom: "Châssis de téléphone", sous: "le même cadrage, dans un vrai boîtier",
    note: `Le même 9:16, mais dans un châssis dessiné en CSS — tranche, encoche,
      barre d'accueil. Ce n'est plus « une vidéo verticale », c'est l'application.`,
    cout: "zéro octet de plus, le châssis est en CSS",
  },
  {
    id: "colonne", nom: "Colonne pleine hauteur", sous: "sans boîte, fondue dans la section",
    note: `La vidéo occupe toute la hauteur de la section, sans coin ni ombre, ses
      deux bords fondus dans le noir. La matière, pas l'objet.`,
    cout: "aucun changement",
  },
  {
    id: "fond", nom: "Fond de section", sous: "le texte se pose dessus",
    note: `La vidéo remplit la section, assombrie ; le texte vit par-dessus. La
      teinte du rail devient l'ambiance de toute la bande.`,
    cout: "contraste à mesurer avant de livrer",
  },
  {
    id: "disque", nom: "Disque", sous: "la matière découpée en cercle",
    note: `La vidéo masquée en cercle, large, avec un anneau à la teinte du rail.
      Le plus graphique, le moins produit.`,
    cout: "aucun changement",
  },
];

const RAILS = [
  ["SwimPay", "82 100% 50%"],
  ["Orange Money", "24 100% 50%"],
  ["Wave", "196 92% 48%"],
  ["MTN MoMo", "48 100% 50%"],
  ["Moov Money", "212 88% 52%"],
];

const ech = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const net = (s) => s.replace(/\s+/g, " ").trim();

const html = `<title>Présenter la vidéo</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">

<style>
  :root {
    --fond: #0D0E0A; --surface: #16170F; --bord: #2A2C1E;
    --encre: #EDEDE4; --encre-2: #8E9083; --acide: #A2FF01;
    --h: 82; --s: 100%; --l: 50%;
    --cam: hsl(var(--h) var(--s) var(--l));
    --deux-sens: cubic-bezier(.77, 0, .175, 1);
    --sortie: cubic-bezier(.23, 1, .32, 1);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--fond); color: var(--encre);
    font-family: Outfit, ui-sans-serif, system-ui, sans-serif;
    font-size: 16px; line-height: 1.6; -webkit-font-smoothing: antialiased;
  }
  .page { width: min(100% - 32px, 1120px); margin: 0 auto; padding: 40px 0 80px;
          display: flex; flex-direction: column; gap: 24px; }
  header { display: flex; flex-direction: column; gap: 8px; }
  .sur { font-family: "IBM Plex Mono", monospace; font-size: 11px;
         letter-spacing: .14em; text-transform: uppercase; color: var(--encre-2); }
  h1 { margin: 0; font-size: clamp(28px, 5vw, 42px); font-weight: 600; letter-spacing: -.025em; }
  .chapo { margin: 0; max-width: 64ch; color: var(--encre-2); }
  .chapo b { color: var(--encre); font-weight: 500; }

  /* ── le sélecteur ─────────────────────────────────────────── */
  .choix { display: flex; flex-wrap: wrap; gap: 8px; }
  .choix button {
    font: 500 14.5px/1 Outfit, sans-serif; color: rgba(237,237,228,.66);
    background: none; border: 1px solid var(--bord); border-radius: 999px;
    padding: 11px 18px; cursor: pointer; min-height: 44px;
    transition: color 200ms ease, background-color 200ms ease, border-color 200ms ease,
                transform 140ms var(--sortie);
  }
  .choix button:active { transform: scale(.97); }
  .choix button:focus-visible { outline: 2px solid var(--cam); outline-offset: 3px; }
  .choix button[aria-pressed="true"] {
    color: #141414; background: var(--cam); border-color: transparent; font-weight: 600;
  }

  /* ── la scène : la section, telle qu'elle est sur le site ── */
  .demo {
    position: relative; border: 1px solid var(--bord); border-radius: 14px;
    background: #141414; overflow: hidden;
  }
  .dedans { width: min(100% - 48px, 1000px); margin-inline: auto; }
  .sect { padding: clamp(44px, 6vw, 84px) 0; position: relative; }
  h2 { margin: 0; font-size: clamp(26px, 3.4vw, 40px); font-weight: 500;
       letter-spacing: -.02em; line-height: 1.08; }
  .para { margin: 20px 0 0; max-width: 46ch; color: rgba(237,237,228,.72); font-size: 16.5px; }
  .para b { color: var(--encre); font-weight: 500; }
  .cam-quoi { margin: 26px 0 0; max-width: 44ch; color: rgba(237,237,228,.6); font-size: 15px; }
  .cam-quoi b { color: var(--encre); font-weight: 500; }
  .rails { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 28px; }
  .rail {
    padding: 9px 16px; border-radius: 999px; font-size: 14.5px; font-weight: 500;
    border: 1px solid rgba(255,255,255,.18); color: rgba(255,255,255,.6);
    background: none; cursor: pointer; font-family: inherit; min-height: 44px;
    transition: color 260ms ease, background-color 260ms ease, border-color 260ms ease;
  }
  .rail[aria-pressed="true"] { color: #141414; background: var(--cam); border-color: transparent; }

  .cam-duo { display: grid; grid-template-columns: 1fr .8fr;
             gap: clamp(28px, 4.5vw, 64px); align-items: center; }
  .cam-video { position: relative; }
  .cam-video video { display: block; width: 100%; height: 100%; object-fit: cover; }
  .voile {
    position: absolute; inset: 0; pointer-events: none;
    background: hsl(var(--h) var(--s) var(--l) / .30); mix-blend-mode: color;
    transition: background-color 900ms var(--deux-sens);
  }

  /* ── A · la boîte, telle qu'en ligne ── */
  .v-boite .cam-video {
    border-radius: 28px; overflow: hidden; aspect-ratio: 9/16;
    max-height: 520px; margin-inline: auto;
    box-shadow: 0 30px 80px rgba(0,0,0,.5);
    outline: 1px solid color-mix(in srgb, var(--cam) 34%, transparent);
  }

  /* ── B · le châssis, entièrement en CSS ── */
  .v-chassis .cam-video {
    aspect-ratio: 9/16; max-height: 520px; margin-inline: auto;
    border-radius: 40px; padding: 9px;
    background: linear-gradient(148deg, #4A4A46, #101010 42%, #3C3C38 70%, #0C0C0C);
    box-shadow: 0 34px 90px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.10);
  }
  .v-chassis .cam-ecran { position: relative; height: 100%; border-radius: 32px; overflow: hidden; }
  .v-chassis .cam-ecran::before {
    content: ""; position: absolute; top: 9px; left: 50%; transform: translateX(-50%);
    width: 30%; height: 20px; border-radius: 999px; background: #070707; z-index: 3;
  }
  .v-chassis .cam-ecran::after {
    content: ""; position: absolute; bottom: 9px; left: 50%; transform: translateX(-50%);
    width: 34%; height: 4px; border-radius: 999px; background: rgba(255,255,255,.65); z-index: 3;
  }

  /* ── C · la colonne pleine hauteur ── */
  .v-colonne .cam-duo { align-items: stretch; }
  .v-colonne .cam-video {
    overflow: hidden; min-height: 460px;
    -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 13%, #000 87%, transparent 100%);
            mask-image: linear-gradient(to bottom, transparent 0, #000 13%, #000 87%, transparent 100%);
  }

  /* ── D · le fond de section ── */
  .v-fond .cam-duo { grid-template-columns: 1fr; }
  .v-fond .cam-video { position: absolute; inset: 0; z-index: 0; }
  .v-fond .cam-video::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(90deg, rgba(10,10,10,.94) 0%, rgba(10,10,10,.80) 44%, rgba(10,10,10,.42) 100%);
  }
  .v-fond .cam-texte { position: relative; z-index: 2; }

  /* ── E · le disque ── */
  .v-disque .cam-video {
    aspect-ratio: 1; max-width: 440px; margin-inline: auto;
    border-radius: 50%; overflow: hidden;
    outline: 2px solid color-mix(in srgb, var(--cam) 66%, transparent);
    outline-offset: 14px;
    box-shadow: 0 30px 80px rgba(0,0,0,.5);
  }

  /* ── la fiche ─────────────────────────────────────────────── */
  .fiche {
    display: flex; flex-direction: column; gap: 8px; padding: 20px 22px;
    border: 1px solid var(--bord); border-radius: 12px; background: var(--surface);
  }
  .fiche h3 { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -.015em; }
  .fiche .sous { margin: 0; font-size: 13.5px; color: var(--encre-2); font-style: italic; }
  .fiche p.n { margin: 4px 0 0; font-size: 14.5px; }
  .fiche .cout {
    margin: 6px 0 0; font-family: "IBM Plex Mono", monospace; font-size: 11.5px;
    letter-spacing: .04em; color: var(--acide);
  }
  pre {
    margin: 0; padding: 16px; border-radius: 12px; border: 1px solid var(--bord);
    background: var(--surface); overflow-x: auto;
    font-family: "IBM Plex Mono", monospace; font-size: 12px; line-height: 1.6;
  }
  .note { font-size: 13.5px; color: var(--encre-2); max-width: 70ch; margin: 0; }
  .note b { color: var(--encre); font-weight: 500; }

  @media (max-width: 880px) {
    .cam-duo, .v-colonne .cam-duo { grid-template-columns: 1fr; }
    .v-fond .cam-video { position: relative; inset: auto; height: 300px; }
  }
  @media (prefers-reduced-motion: reduce) { .voile, .rail { transition: none; } }
</style>

<div class="page">

  <header>
    <p class="sur">Planche de choix · section « Émettez vos factures »</p>
    <h1>Présenter la vidéo</h1>
    <p class="chapo">
      Cinq façons de poser le même fichier. La <b>vraie vidéo</b>, le <b>vrai
      cycle des rails</b> — la teinte change toutes les 2,6 s, c'est le Caméléon.
      Clique, regarde, tranche. Le choix ressort en CSS en bas de page.
    </p>
  </header>

  <div class="choix" id="choix" role="group" aria-label="Présentations">
    ${VUES.map((v, i) => `<button data-v="${v.id}"${i === 0 ? ' aria-pressed="true"' : ""}>${ech(v.nom)}</button>`).join("\n    ")}
  </div>

  <div class="demo v-boite" id="demo">
    <section class="sect">
      <div class="cam-video" id="camVideo">
        <video id="v" src="${video}" poster="${affiche}" muted loop playsinline
               preload="auto" aria-label="Animation SwimPay"></video>
        <div class="voile"></div>
      </div>
      <div class="dedans">
        <div class="cam-duo">
          <div class="cam-texte">
            <h2>Émettez vos factures en une minute</h2>
            <p class="para">Vos opérations et vos <b>factures FNE approuvées par la
              DGI</b> partent en une minute. Le numéro, le QR de contrôle et
              l'archive légale les accompagnent, vous n'avez rien à ressaisir
              ailleurs.</p>
            <div class="rails" id="rails" role="group" aria-label="Réseaux">
              ${RAILS.map(([n, h], i) => `<button class="rail" data-h="${h}"${i === 0 ? ' aria-pressed="true"' : ""}>${n}</button>`).join("\n              ")}
            </div>
            <p class="cam-quoi">SwimPay envoie ou reçoit de l'argent depuis
              <b>n'importe quel Mobile Money</b> et n'importe quelle banque.
              C'est à vous de choisir, et votre correspondant garde le sien.</p>
          </div>
          <div id="ancre"></div>
        </div>
      </div>
    </section>
  </div>

  <div class="fiche" id="fiche"></div>

  <p class="note">
    Le châssis est <b>dessiné en CSS</b> : il n'ajoute pas un octet. Le fond de
    section est le seul qui pose une question de lisibilité — si tu le choisis,
    je mesure le contraste du texte au pire pixel avant de livrer, comme pour
    les héros.
  </p>

  <pre id="css"></pre>

</div>

<script>
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const VUES = ${JSON.stringify(VUES.map((v) => ({ id: v.id, nom: v.nom, sous: v.sous, note: net(v.note), cout: v.cout })))};

  const demo = $("demo"), camVideo = $("camVideo"), ancre = $("ancre"), v = $("v");
  let vue = "boite";

  /* Le chassis a besoin d'un ecran intermediaire ; les autres non. On le pose
     et on le retire, plutot que d'avoir cinq balisages differents. */
  function place(id) {
    vue = id;
    demo.className = "demo v-" + id;
    [...$("choix").children].forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === id)));

    // le chassis enveloppe la video dans un ecran
    const ecran = camVideo.querySelector(".cam-ecran");
    if (id === "chassis" && !ecran) {
      const e = document.createElement("div");
      e.className = "cam-ecran";
      while (camVideo.firstChild) e.appendChild(camVideo.firstChild);
      camVideo.appendChild(e);
    } else if (id !== "chassis" && ecran) {
      while (ecran.firstChild) camVideo.appendChild(ecran.firstChild);
      ecran.remove();
    }

    // le fond de section vit dans la section, les autres dans la colonne
    const cible = id === "fond" ? demo.querySelector(".sect") : ancre;
    if (camVideo.parentElement !== cible) {
      if (id === "fond") cible.insertBefore(camVideo, cible.firstChild);
      else cible.appendChild(camVideo);
    }

    const f = VUES.find((x) => x.id === id);
    $("fiche").innerHTML =
      '<h3>' + f.nom + '</h3><p class="sous">' + f.sous + '</p>' +
      '<p class="n">' + f.note + '</p><p class="cout">' + f.cout + '</p>';
    sortie(id);
    if (v.paused) v.play().catch(() => {});
  }

  const CSS = {
    boite: \`.cam-video {
  border-radius: 28px; overflow: hidden; aspect-ratio: 9 / 16;
  max-height: 560px; margin-inline: auto; position: relative;
  box-shadow: 0 30px 80px rgba(0, 0, 0, .5);
  outline: 1px solid color-mix(in srgb, var(--cam) 34%, transparent);
}\`,
    chassis: \`/* Le chassis est DESSINE : encoche, tranche, barre d'accueil.
   Il n'ajoute pas un octet et transforme « une video verticale »
   en « l'application ». Il faut un .cam-ecran autour du <video>. */
.cam-video {
  aspect-ratio: 9 / 16; max-height: 560px; margin-inline: auto;
  border-radius: 40px; padding: 9px; position: relative;
  background: linear-gradient(148deg, #4A4A46, #101010 42%, #3C3C38 70%, #0C0C0C);
  box-shadow: 0 34px 90px rgba(0, 0, 0, .6), inset 0 0 0 1px rgba(255, 255, 255, .10);
}
.cam-ecran { position: relative; height: 100%; border-radius: 32px; overflow: hidden; }
.cam-ecran::before {   /* l'encoche */
  content: ""; position: absolute; top: 9px; left: 50%; transform: translateX(-50%);
  width: 30%; height: 20px; border-radius: 999px; background: #070707; z-index: 3;
}
.cam-ecran::after {    /* la barre d'accueil */
  content: ""; position: absolute; bottom: 9px; left: 50%; transform: translateX(-50%);
  width: 34%; height: 4px; border-radius: 999px; background: rgba(255,255,255,.65); z-index: 3;
}\`,
    colonne: \`.cam-duo { align-items: stretch; }
.cam-video {
  position: relative; overflow: hidden; min-height: 460px;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 13%, #000 87%, transparent 100%);
          mask-image: linear-gradient(to bottom, transparent 0, #000 13%, #000 87%, transparent 100%);
}\`,
    fond: \`/* Le <video> passe AVANT .dedans dans la section, et le texte
   prend un z-index. Contraste a mesurer avant de livrer. */
.cam-duo { grid-template-columns: 1fr; }
.cam-video { position: absolute; inset: 0; z-index: 0; }
.cam-video::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(90deg, rgba(10,10,10,.94) 0%,
                              rgba(10,10,10,.80) 44%, rgba(10,10,10,.42) 100%);
}
.cam-texte { position: relative; z-index: 2; }\`,
    disque: \`.cam-video {
  aspect-ratio: 1; max-width: 440px; margin-inline: auto;
  border-radius: 50%; overflow: hidden; position: relative;
  outline: 2px solid color-mix(in srgb, var(--cam) 66%, transparent);
  outline-offset: 14px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, .5);
}\`,
  };

  const COMMUN = \`
/* commun aux cinq : le voile qui prend la teinte du rail actif */
.cam-video::before, .voile {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: hsl(var(--h) var(--s) var(--l) / .30); mix-blend-mode: color;
  transition: background-color 900ms var(--deux-sens);
}\`;

  const sortie = (id) => { $("css").textContent = CSS[id] + "\\n" + COMMUN; };

  $("choix").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]");
    if (b) place(b.dataset.v);
  });

  /* le Caméléon : la teinte vient du rail actif, et elle tourne */
  const rails = [...document.querySelectorAll(".rail")];
  let cycle = null, k = 0;
  const pose = (b) => {
    rails.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    const [h, s, l] = b.dataset.h.split(" ");
    document.documentElement.style.setProperty("--h", h);
    document.documentElement.style.setProperty("--s", s);
    document.documentElement.style.setProperty("--l", l);
  };
  rails.forEach((b, i) => b.addEventListener("click", () => {
    clearInterval(cycle); cycle = null; k = i; pose(b);
  }));
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    cycle = setInterval(() => { k = (k + 1) % rails.length; pose(rails[k]); }, 2600);
  }

  v.addEventListener("canplay", () => v.play().catch(() => {}));
  place("boite");
})();
</script>
`;

writeFileSync(SORTIE, html, "utf8");
console.log("\nPlanche ->", SORTIE, (Buffer.byteLength(html) / 1024 / 1024).toFixed(2), "Mo\n");
