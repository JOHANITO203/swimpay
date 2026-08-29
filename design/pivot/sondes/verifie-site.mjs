// Le site : les cinq pages, aux trois formats, plus ce qui doit etre vrai.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [, , URL, DOSSIER] = process.argv;
const PORT = 9427;
const profil = mkdtempSync(join(tmpdir(), "swimpay-site-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-dev-shm-usage", "--disable-extensions",
  "--disable-background-networking", "--disable-sync", "--disable-gpu", "--autoplay-policy=no-user-gesture-required",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`, "about:blank"], { stdio: "ignore" });
process.on("exit", () => { try { chrome.kill(); } catch {} try { rmSync(profil, { recursive: true, force: true }); } catch {} });
const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40 && !ws; i++) {
  await dodo(250);
  try {
    const p = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.type === "page");
    if (p) ws = new WebSocket(p.webSocketDebuggerUrl);
  } catch {}
}
await new Promise((r) => (ws.onopen = r));
let seq = 0; const att = new Map(); const evs = new Map(); const exceptions = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data);
  if (d.id && att.has(d.id)) { att.get(d.id)(d); att.delete(d.id); }
  if (d.method === "Runtime.exceptionThrown") exceptions.push(String(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text || "").split("\n")[0]);
  if (d.method && evs.has(d.method)) evs.get(d.method)(d.params); };
const cmd = (m, p = {}) => new Promise((r) => { const id = ++seq; att.set(id, r); ws.send(JSON.stringify({ id, method: m, params: p })); });
const ev = async (e, attendre = false) => {
  const r = await cmd("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: attendre });
  if (r.result.exceptionDetails) return "EXC: " + String(r.result.exceptionDetails.exception?.description || "").split("\n")[0];
  return r.result.result.value;
};
await cmd("Page.enable"); await cmd("Runtime.enable");
const charge = new Promise((r) => evs.set("Page.loadEventFired", r));
await cmd("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await cmd("Page.navigate", { url: URL });
await charge; await dodo(1800);

const R = [];
const test = (n, ok, d = "") => R.push(`${ok === true ? "PASS" : "FAIL"}  ${n}${ok === true ? "" : "  ← " + d}`);

test("aucune exception au chargement", exceptions.length === 0, exceptions.join(" | "));
test("la barre porte le logo puis les trois onglets",
  (await ev(`[...document.querySelectorAll(".nav .logo b, .nav a.onglet")].map((e) => e.textContent.trim()).join(" · ")`))
    === "SwimPay · Personnel · Business · Intégration");
test("et les deux entrées de compte",
  (await ev(`[...document.querySelectorAll(".nav .bouton")].map((e) => e.textContent.trim()).join(" · ")`))
    === "Se connecter · S'inscrire");

for (const page of ["accueil", "personnel", "business", "integration", "connexion", "inscription"]) {
  await ev(`location.hash = "#${page}"`); await dodo(280);
  const r = await ev(`(() => {
    const a = [...document.querySelectorAll(".page")].filter((p) => p.classList.contains("active"));
    return { combien: a.length, id: a[0] ? a[0].id : null,
             hauteur: Math.round(document.body.getBoundingClientRect().height),
             deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2 };
  })()`);
  test(`la page « ${page} » s'ouvre seule`, r.combien === 1 && r.id === page && r.deborde === false, JSON.stringify(r));
}

await ev(`location.hash = "#accueil"`); await dodo(300);
test("le héros porte la promesse",
  (await ev(`document.querySelector(".heros h1").textContent.replace(/\\s+/g, " ").trim()`)) === "Bien plus qu'une application");

/* LA CHARTE D'ÉCRITURE, tenue par la sonde et non par la bonne volonté.
   Relevé sur revolut.com : aucun titre ne porte de point final, aucun texte
   ne porte de tiret cadratin, et personne n'écrit « X, pas Y ». */
const ecriture = await ev(`(() => {
  const titres = [...document.querySelectorAll("h1, h2, .fiche h3")]
    .map((e) => e.textContent.replace(/\\s+/g, " ").trim()).filter(Boolean);
  const ponctues = titres.filter((t) => /[.?!]$/.test(t));
  const longs = titres.filter((t) => t.split(" ").length > 7);
  const corps = document.body.innerText;
  const cadratins = (corps.match(/\\u2014/g) || []).length;
  const antitheses = (corps.match(/, pas (un |une |le |la |seulement)/g) || []).length;
  return { titres: titres.length, ponctues, longs, cadratins, antitheses };
})()`);
test("aucun titre ne se termine par un point", ecriture.ponctues.length === 0, ecriture.ponctues.join(" | "));
test("aucun titre ne dépasse sept mots", ecriture.longs.length === 0, ecriture.longs.join(" | "));
test("aucun tiret cadratin dans le corps", ecriture.cadratins === 0, `${ecriture.cadratins} trouvé(s)`);
test("aucune antithèse « X, pas Y »", ecriture.antitheses === 0, `${ecriture.antitheses} trouvée(s)`);
test("le héros dit la facture FNE",
  (await ev(`document.querySelector(".heros .dit").textContent.includes("FNE")`)) === true);
/* Le texte du heros est pose SUR UNE PHOTO. Mesure au pixel : 13,75:1 au pire
   point, grace au voile qui tient le cote gauche. On garde le MECANISME —
   sans lui, le contraste redevient une loterie a chaque changement d image. */
// sans expression rationnelle : les échappements ne survivent pas au passage
// par un heredoc, et une regex mal échappée fait échouer le test pour la
// mauvaise raison — c'est déjà arrivé deux fois aujourd'hui
const voile = await ev(`(() => {
  const s = getComputedStyle(document.querySelector(".heros"), "::before");
  const g = s.backgroundImage || "";
  /* Chrome calcule les hsl(… / .96) en rgba(…) : l'opacité est la QUATRIÈME
     composante, pas ce qui suit une barre oblique. On lit le premier arrêt —
     c'est lui qui tient le côté où vit le texte. */
  const arrets = g.split("rgba(").slice(1)
    .map((x) => parseFloat(x.split(")")[0].split(",")[3] || "1"));
  return { existe: s.content !== "none", premier: arrets[0] || 0, arrets: arrets.length };
})()`);
test("le voile du heros tient le cote du texte",
  voile.existe === true && voile.premier >= 0.9, JSON.stringify(voile));
test("l image du heros part du premier pixel",
  (await ev(`Math.round(document.querySelector(".heros").getBoundingClientRect().top)`)) <= 2);
test("la barre s efface sur le heros",
  (await ev(`document.querySelector(".nav").getAttribute("data-pose")`)) === "non");

/* LE PARALLAXE. Une animation de défilement qui ne bouge pas se voit très mal
   à l'œil et pas du tout dans le code : on lit les deux transforms AVANT et
   APRÈS avoir défilé, et on exige qu'ils diffèrent l'un de l'autre. */
const derive = await ev(`(async () => {
  const lis = () => ({
    fond: getComputedStyle(document.querySelector(".heros-fond")).transform,
    sujet: getComputedStyle(document.querySelector(".heros-sujet")).transform,
  });
  scrollTo(0, 0);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const avant = lis();
  scrollTo(0, 420);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const apres = lis();
  scrollTo(0, 0);
  return { avant, apres,
    bouge: apres.fond !== avant.fond && apres.sujet !== avant.sujet,
    ecarte: apres.fond !== apres.sujet };
})()`, true);
test("les deux couches du héros dérivent au défilement",
  derive.bouge === true && derive.ecarte === true, JSON.stringify(derive));

/* UNE VARIABLE INCONNUE INVALIDE TOUTE LA DÉCLARATION, en silence. C'est ainsi
   qu'un fond de grain n'a jamais été peint, et qu'une coche de liste est restée
   invisible parce que son jeton venait de l'app et n'existait pas ici. On lit
   donc TOUS les var(--x) du CSS et on exige que chacun soit défini. */
const jetons = await ev(`(() => {
  const css = [...document.querySelectorAll("style")].map((s) => s.textContent).join(String.fromCharCode(10));
  const noms = [...new Set((css.match(/var\\(\\s*--[a-zA-Z0-9-]+/g) || [])
    .map((v) => v.replace(/var\\(\\s*/, "")))];
  const definis = new Set((css.match(/--[a-zA-Z0-9-]+\\s*:/g) || [])
    .map((d) => d.replace(/\\s*:$/, "")));
  return { combien: noms.length, orphelins: noms.filter((x) => !definis.has(x)) };
})()`);
test("aucune variable CSS n'est utilisée sans être définie",
  jetons.orphelins.length === 0, jetons.orphelins.join(" · "));

test("la section du gain de temps parle de la DGI",
  (await ev(`document.getElementById("temps").textContent.includes("DGI")`)) === true);

/* LE CAMÉLÉON : on ne se fie pas au nom, on regarde la teinte CHANGER */
const cam = await ev(`(() => {
  const lit = () => getComputedStyle(document.documentElement).getPropertyValue("--h").trim();
  const rails = [...document.querySelectorAll(".rail")];
  const avant = lit();
  rails[2].click();
  const apres = lit();
  const actif = rails.filter((r) => r.getAttribute("aria-pressed") === "true").length;
  return { avant, apres, change: avant !== apres, rails: rails.length, actif };
})()`);
test("le Caméléon change la teinte de toute la section",
  cam.change === true && cam.rails === 5 && cam.actif === 1, JSON.stringify(cam));

test("le formulaire ne prétend pas enregistrer",
  (await ev(`(() => {
    document.getElementById("f-inscription").requestSubmit();
    const n = document.querySelector("#f-inscription .form-reponse");
    return !!n && /ne transmet rien/.test(n.textContent);
  })()`)) === true);

test("un pied de page existe, avec ses colonnes",
  (await ev(`document.querySelectorAll("footer .pied > div").length`)) === 4);
test("le pied dit que rien n'est branché",
  (await ev(`/aucun service/i.test(document.querySelector("footer .pied-bas").textContent)`)) === true);
test("chaque lien externe s'ouvre en sécurité",
  (await ev(`[...document.querySelectorAll('a[target="_blank"]')].every((a) => (a.rel || "").includes("noopener"))`)) === true);

/* les cibles tactiles, aux trois formats */
for (const [nom, w, h] of [["mobile", 390, 844], ["tablette", 768, 1024], ["bureau", 1440, 900]]) {
  await cmd("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 881 });
  await ev(`location.hash = "#accueil"`); await dodo(400);
  /* LA GARDE QUI MANQUAIT. Sans meta viewport, un telephone met la page en
     page a 980 px et la reduit : je demandais 390, je mesurais 980, et TOUT
     ce que je verifiais ensuite portait sur une mise en page qui n existe sur
     aucun telephone. Une sonde qui n a pas la largeur qu elle a demandee doit
     le dire AVANT de mesurer quoi que ce soit d autre. */
  const large = await ev(`innerWidth`);
  test(`${nom} : la mise en page fait bien ${w} px de large`, large === w, `mesure ${large}`);

  /* La barre a le droit de passer a deux lignes en telephone. Pas a trois :
     a trois elle mangeait 176 px, soit la moitie de la bande photo du heros.
     Et les trois sections doivent rester ATTEIGNABLES — les cacher rendait
     trois pages sur cinq inaccessibles au telephone. */
  const barre = await ev(`(() => {
    const n = document.querySelector(".nav");
    const vus = [...document.querySelectorAll(".nav a.onglet")]
      .filter((a) => a.getBoundingClientRect().width > 0).length;
    return { haut: Math.round(n.getBoundingClientRect().height), onglets: vus,
             token: getComputedStyle(document.documentElement).getPropertyValue("--h-nav").trim() };
  })()`);
  const plafond = w < 721 ? 130 : 80;
  test(`${nom} : la barre tient en ${w < 721 ? "deux lignes" : "une ligne"} et garde ses trois sections`,
    barre.haut <= plafond && barre.onglets === 3, JSON.stringify(barre));
  test(`${nom} : --h-nav vaut la hauteur mesuree de la barre`,
    barre.token === barre.haut + "px", JSON.stringify(barre));
  const petites = await ev(`(() => {
    const p = [];
    document.querySelectorAll(".page.active a, .page.active button, .nav a, .nav button, footer a").forEach((e) => {
      const b = e.getBoundingClientRect();
      if (!b.width || !b.height) return;
      if (b.width < 43.5 || b.height < 43.5) p.push((e.textContent || "?").trim().slice(0, 18) + " " + Math.round(b.width) + "x" + Math.round(b.height));
    });
    return [...new Set(p)];
  })()`);
  test(`${nom} : aucune cible sous 44 × 44`, petites.length === 0, petites.join(" · "));
  if (DOSSIER) {
    const m = await cmd("Page.getLayoutMetrics");
    await cmd("Emulation.setDeviceMetricsOverride", { width: w, height: Math.min(Math.ceil(m.result.cssContentSize.height), 14000), deviceScaleFactor: 1, mobile: w < 881 });
    await dodo(600);
    const c = await cmd("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    writeFileSync(join(DOSSIER, `site-${nom}.png`), Buffer.from(c.result.data, "base64"));
  }
}

console.log(R.map((x) => "  " + x).join("\n"));
const ok = R.filter((x) => x.startsWith("PASS")).length;
console.log(`\n${ok}/${R.length} PASS`);
process.exit(ok === R.length ? 0 : 1);
