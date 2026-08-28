// ═══════════════ LA SONDE DU PROTOTYPE ═══════════════
//
// Elle vit DANS LE REPO, et c'est une leçon payée : la précédente vivait dans
// un dossier temporaire, un nettoyage trop large l'a emportée avec seize
// parcours écrits sur deux jours. Un harnais de vérification est du code du
// projet, pas un fichier jetable.
//
//   node design/pivot/sondes/verifie.mjs [chemin.html] [--capture dossier]
//
// Ce qu'elle vérifie, et pourquoi chaque point existe :
//   erreurs      une exception au chargement tue tout le script en silence ;
//                on l'a payé deux fois (const dupliqué, TDZ sur un typeof)
//   graphe       toute cible de navigation existe, aucun écran orphelin
//   contraste    mesuré sur le RENDU, avec étalonnage — six mensonges de sonde
//                ont été corrigés ici, la calibration les empêche de revenir
//   Apple        44 px de cible tactile, 11 px de texte, un retour par flux
//   libellés     aucun bouton ne casse sur plusieurs lignes
//   cartes       les trois cartes, leur modèle, et le masquage des montants
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const cible = args.find((a) => !a.startsWith("--")) || "design/pivot/ecran3-personnel-v6-acide.html";
const iCap = args.indexOf("--capture");
const dossierCap = iCap !== -1 ? args[iCap + 1] : null;
const URL = /^https?:|^file:/.test(cible) ? cible : pathToFileURL(resolve(cible)).href;

const CHROME = process.env.CHROME || (process.platform === "win32"
  ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
  : process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome");
const PORT = 9410 + Math.floor(process.pid % 200);
const profil = mkdtempSync(join(tmpdir(), "swimpay-sonde-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-dev-shm-usage", "--disable-extensions",
  "--disable-background-networking", "--disable-sync", "--renderer-process-limit=2",
  "--js-flags=--max-old-space-size=256", "--disable-gpu",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`, "about:blank",
], { stdio: "ignore" });
// le profil jetable se nettoie TOUJOURS : 716 profils orphelins ont saturé le
// disque une fois, c'est ce qui a provoqué la purge qui a tout emporté
const menage = () => { try { chrome.kill(); } catch {} try { rmSync(profil, { recursive: true, force: true }); } catch {} };
process.on("exit", menage);
process.on("SIGINT", () => { menage(); process.exit(130); });

const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 60 && !ws; i++) {
  await dodo(250);
  try {
    const p = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.type === "page");
    if (p) ws = new WebSocket(p.webSocketDebuggerUrl);
  } catch {}
}
if (!ws) { console.error("Chrome injoignable — définir la variable CHROME si besoin"); process.exit(2); }
await new Promise((r) => (ws.onopen = r));

let seq = 0; const att = new Map(); const evs = new Map();
const exceptions = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && att.has(d.id)) { att.get(d.id)(d); att.delete(d.id); }
  if (d.method === "Runtime.exceptionThrown") {
    const e = d.params.exceptionDetails;
    exceptions.push(String(e.exception?.description || e.text || "").split("\n")[0]);
  }
  if (d.method && evs.has(d.method)) evs.get(d.method)(d.params);
};
const cmd = (m, p = {}) => new Promise((r) => { const id = ++seq; att.set(id, r); ws.send(JSON.stringify({ id, method: m, params: p })); });
const ev = async (e) => {
  const r = await cmd("Runtime.evaluate", { expression: e, returnByValue: true });
  if (r.result.exceptionDetails) return "EXC: " + String(r.result.exceptionDetails.exception?.description || "").split("\n")[0];
  return r.result.result.value;
};
await cmd("Page.enable"); await cmd("Runtime.enable");
const charge = new Promise((r) => evs.set("Page.loadEventFired", r));
await cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await cmd("Page.navigate", { url: URL });
await charge; await dodo(1600);

const R = [];
const test = (nom, ok, detail = "") =>
  R.push({ ok: ok === true, ligne: `${ok === true ? "PASS" : "FAIL"}  ${nom}${ok === true ? "" : "  ← " + detail}` });

/* ═══ 1. le script vit ═══ */
test("aucune exception au chargement", exceptions.length === 0, exceptions.join(" | "));
test("la navigation est câblée", (await ev("typeof va")) === "function");

/* ═══ 2. le graphe de navigation ═══ */
const graphe = await ev(`(() => {
  const ecrans = [...document.querySelectorAll(".ecran")].map((e) => e.id);
  const cibles = new Set();
  document.querySelectorAll("[data-va], [data-mene]").forEach((e) => {
    (e.dataset.va || "").split(" ").filter(Boolean).forEach((x) => cibles.add(x));
    (e.dataset.mene || "").split(" ").filter(Boolean).forEach((x) => cibles.add(x));
  });
  const connus = new Set(ecrans);
  return {
    ecrans: ecrans.length,
    cassees: [...cibles].filter((c) => !connus.has(c)),
    orphelins: ecrans.filter((id) => id !== "splash" && id !== "accueil" && !cibles.has(id)),
  };
})()`);
test(`les ${graphe.ecrans} écrans sont déclarés`, graphe.ecrans > 40, String(graphe.ecrans));
test("aucune cible de navigation cassée", graphe.cassees.length === 0, graphe.cassees.join(", "));
test("aucun écran orphelin", graphe.orphelins.length === 0, graphe.orphelins.join(", "));

/* ═══ 3. chaque écran s'ouvre sans erreur et sans débord ═══ */
const evAttendu = async (e) => {
  const r = await cmd("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.result.exceptionDetails) return "EXC: " + String(r.result.exceptionDetails.exception?.description || "").split("\n")[0];
  return r.result.result.value;
};
// un IIFE async renvoie une PROMESSE : sans awaitPromise, on mesure l'objet
const parcours = await evAttendu(`(async () => {
  const ids = [...document.querySelectorAll(".ecran")].map((e) => e.id);
  const debords = [];
  for (const id of ids) {
    va(id);
    await new Promise((r) => setTimeout(r, 12));
    // ce qui compte est le symptome VU : la page defile-t-elle lateralement ?
    // Un ecran qui deborde sous overflow-x: clip ne fait rien defiler.
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)
      debords.push(id + " (" + document.documentElement.scrollWidth + "px)");
  }
  va("accueil");
  return debords;
})()`);
test("aucun écran ne déborde horizontalement", Array.isArray(parcours) && parcours.length === 0,
  Array.isArray(parcours) ? parcours.join(", ") : String(parcours));
test("aucune exception pendant le parcours de tous les écrans", exceptions.length === 0, exceptions.join(" | "));

/* ═══ 4. les règles Apple ═══ */
const apple = await ev(`(() => {
  const petites = [], petitsTextes = [];
  document.querySelectorAll(".ecran:not([hidden]) button, .ecran:not([hidden]) a, .ecran:not([hidden]) [role=button]")
    .forEach((e) => {
      const b = e.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return;
      if (b.width < 43.5 || b.height < 43.5) petites.push((e.textContent || e.ariaLabel || "?").trim().slice(0, 22)
        + " " + Math.round(b.width) + "x" + Math.round(b.height));
    });
  document.querySelectorAll(".ecran:not([hidden]) *").forEach((e) => {
    if (!e.firstChild || e.firstChild.nodeType !== 3 || !e.firstChild.textContent.trim()) return;
    const t = parseFloat(getComputedStyle(e).fontSize);
    if (t && t < 10.9) petitsTextes.push(e.firstChild.textContent.trim().slice(0, 22) + " " + t + "px");
  });
  return { petites: [...new Set(petites)], petitsTextes: [...new Set(petitsTextes)] };
})()`);
test("aucune cible tactile sous 44 × 44", apple.petites.length === 0, apple.petites.join(" · "));
test("aucun texte sous 11 px", apple.petitsTextes.length === 0, apple.petitsTextes.join(" · "));

/* ═══ 5. les libellés de boutons ne cassent pas ═══ */
const casses = await ev(`(() => {
  const mauvais = [];
  document.querySelectorAll(".ecran:not([hidden]) .btn, .ecran:not([hidden]) .sheet-actions button")
    .forEach((b) => {
      // un bouton a icone AU-DESSUS du libelle est vertical par construction :
      // le compter comme  casse  est un faux positif
      if (b.querySelector(".lib-m")) return;
      const h = b.getBoundingClientRect().height;
      const l = parseFloat(getComputedStyle(b).lineHeight) || 20;
      if (h > l * 2.4) mauvais.push(b.textContent.trim().slice(0, 24));
    });
  return [...new Set(mauvais)];
})()`);
test("aucun libellé de bouton ne casse sur plusieurs lignes", casses.length === 0, casses.join(" · "));

/* ═══ 6. les trois cartes et leur modèle ═══ */
const cartes = await ev(`(() => {
  if (typeof CARTES === "undefined") return { absent: true };
  const p = CARTES.find((c) => c.type === "tel");
  return {
    nombre: CARTES.length,
    principaleSansPan: !!p && !p.pan && !!p.tel,
    heroRail: document.querySelectorAll("#hero-rail > *").length,
    carteRail: document.querySelectorAll("#carte-rail > *").length,
    identitePrincipale: (document.querySelector("#hero-rail .ligne1") || {}).textContent || "",
  };
})()`);
test("le modèle des cartes existe", !cartes.absent);
test("trois cartes", cartes.nombre === 3, String(cartes.nombre));
test("le compte principal est identifié par un TÉLÉPHONE, pas un numéro bancaire",
  cartes.principaleSansPan === true);
// on ne déréférence jamais le retour d'une évaluation sans le protéger : si
// elle a levé, `cartes` est une chaîne d'erreur et le champ est indéfini
const identite = String((cartes && cartes.identitePrincipale) || "");
test("l'identité affichée ne parle pas de « compte bancaire »",
  identite.length > 0 && !/N° de compte/i.test(identite), identite.trim().slice(0, 40) || String(cartes).slice(0, 60));
test("le hero porte les trois cartes", cartes.heroRail === 3, String(cartes.heroRail));
test("« Ma carte » porte les trois cartes", cartes.carteRail === 3, String(cartes.carteRail));

/* ═══ 7. masquer les montants ═══ */
await ev('va("accueil")'); await dodo(350);
const avant = await ev('document.querySelector("#hero-rail .montant").textContent.trim()');
await ev('document.querySelector("#hero-rail .oeil").click()'); await dodo(200);
const masque = await ev('document.querySelector("#hero-rail .montant").textContent.trim()');
test("l'œil masque les montants", !/\d/.test(masque) && masque.length > 0, masque);
await ev('document.querySelector("#hero-rail .oeil").click()'); await dodo(250);
test("l'œil les rend à l'identique",
  (await ev('document.querySelector("#hero-rail .montant").textContent.trim()')) === avant);

/* ═══ 8. le contraste, avec étalonnage ═══ */
const contraste = await ev(`(() => {
  const lis = (c) => {
    if (!c) return null;
    c = c.trim();
    if (c.charAt(0) === "#") {
      const h = c.slice(1);
      const p = h.length === 3 ? [h[0] + h[0], h[1] + h[1], h[2] + h[2]] : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
      const v = p.map((x) => parseInt(x, 16));
      return v.some(isNaN) ? null : { r: v[0], g: v[1], b: v[2], a: 1 };
    }
    const n = (c.match(/[-0-9.]+/g) || []).map(Number);
    if (n.length < 3) return null;
    const e = c.indexOf("color(") === 0 ? 255 : 1;   // color() : composantes en 0-1
    return { r: n[0] * e, g: n[1] * e, b: n[2] * e, a: n.length > 3 ? n[3] : 1 };
  };
  const sur = (h, b) => ({ r: h.r * h.a + b.r * (1 - h.a), g: h.g * h.a + b.g * (1 - h.a),
                           b: h.b * h.a + b.b * (1 - h.a), a: 1 });
  const lum = (o) => {
    const c = typeof o === "string" ? lis(o) : o;
    const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const dis = (o) => "rgb(" + [o.r, o.g, o.b].map((v) => Math.round(v)).join(", ") + ")";
  const muets = new Set();
  /* Une surface résumée en une couche. Un fond en IMAGE ou fondu par
     background-blend-mode ne se devine pas : il DÉCLARE --fond-mesure. */
  const couche = (st, nom) => {
    const d = lis((st.getPropertyValue("--fond-mesure") || "").trim());
    if (d) return d;
    const img = st.backgroundImage;
    if (img && img.indexOf("gradient") !== -1) {
      const t = (img.match(/rgba?\\([^)]+\\)/g) || []).map(lis).filter(Boolean);
      const op = t.filter((c) => c.a >= 0.999);
      if (op.length) return op.reduce((pire, c) => (lum(c) < lum(pire) ? c : pire));
      if (t.length) { const v = t.reduce((f, c) => (c.a > f.a ? c : f)); if (v.a >= 0.02) return v; }
    }
    const c = lis(st.backgroundColor);
    if (c && c.a > 0.001) return c;
    if (img && img !== "none" && img.indexOf("gradient") === -1) muets.add(nom);
    return null;
  };
  /* L'ordre de peinture est ::after, ::before, puis l'élément — un
     pseudo-élément peint PAR-DESSUS, il ne se substitue pas. Et il n'est un
     fond que s'il COUVRE réellement la boîte. */
  const fondDe = (el) => {
    const couches = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const b = n.getBoundingClientRect();
      const nom = String(n.className || n.tagName).split(" ")[0];
      const surfaces = [];
      for (const ps of ["::after", "::before"]) {
        const sp = getComputedStyle(n, ps);
        if (!sp || sp.content === "none") continue;
        if (parseFloat(sp.width) >= b.width * 0.9 && parseFloat(sp.height) >= b.height * 0.9) surfaces.push(sp);
      }
      surfaces.push(getComputedStyle(n));
      let stop = false;
      for (const st of surfaces) {
        const ici = couche(st, nom);
        if (!ici) continue;
        couches.push(ici);
        if (ici.a >= 0.999) { stop = true; break; }
      }
      if (stop) break;
      n = n.parentElement;
    }
    couches.push(lis(getComputedStyle(document.documentElement).backgroundColor) || { r: 20, g: 20, b: 20, a: 1 });
    let f = couches[couches.length - 1];
    f = { r: f.r, g: f.g, b: f.b, a: 1 };
    for (let i = couches.length - 2; i >= 0; i--) f = sur(couches[i], f);
    return dis(f);
  };
  /* ÉTALONNAGE — trois paires dont la réponse est posée à la main AVANT.
     Sans lui, six bugs de cette fonction sont passés pour des résultats. */
  const etalon = (() => {
    const d = document.createElement("div");
    d.setAttribute("style", "position:fixed;left:-9999px;top:0;background:#FFFFFF");
    d.innerHTML = "<p style='color:#FFFFFF;background:#141414'>a</p>"
      + "<p style='color:#6A6A66;background:#FFFFFF'>b</p>"
      + "<div style='background:#FFFFFF'><p style='color:#141414;"
      + "background:color-mix(in srgb, #FFFFFF 78%, transparent)'>c</p></div>";
    document.body.appendChild(d);
    const attendu = [18.42, 5.43, 18.42];
    const lus = [...d.querySelectorAll("p")].map((p) => +ratio(getComputedStyle(p).color, fondDe(p)).toFixed(2));
    d.remove();
    return lus.map((v, i) => ({ lu: v, attendu: attendu[i], ecart: +Math.abs(v - attendu[i]).toFixed(2) }));
  })();

  const vus = new Map();
  ["accueil", "activite", "envoyer", "destinataire", "b-commercant", "pme-apercu", "envoye", "carte-ecran"]
    .forEach((id) => {
      if (!document.getElementById(id)) return;
      va(id);
      document.querySelectorAll("#" + id + " *").forEach((el) => {
        if (!el.firstChild || el.firstChild.nodeType !== 3) return;
        const t = el.firstChild.textContent.trim();
        if (!t) return;
        const st = getComputedStyle(el);
        const taille = parseFloat(st.fontSize);
        const fond = fondDe(el);
        const cle = st.color + "|" + fond + "|" + Math.round(taille);
        if (!vus.has(cle)) vus.set(cle, { couleur: st.color, fond, taille, ratio: +ratio(st.color, fond).toFixed(2), exemple: t.slice(0, 26) });
      });
    });
  va("accueil");
  return { etalon, muets: [...muets], mesures: [...vus.values()].sort((a, b) => a.ratio - b.ratio) };
})()`);

// une évaluation qui lève renvoie une CHAÎNE : on le dit au lieu de planter
if (!contraste || !contraste.etalon) {
  test("la sonde de contraste s'exécute", false, String(contraste).slice(0, 200));
  console.log(R.map((r) => "  " + r.ligne).join("\n"));
  const n = R.filter((r) => r.ok).length;
  console.log(`\n${n}/${R.length} PASS`);
  process.exit(1);
}
const etalonFaux = contraste.etalon.filter((e) => e.ecart > 0.15);
test("la sonde de contraste est étalonnée",
  etalonFaux.length === 0, contraste.etalon.map((e) => `${e.lu}≠${e.attendu}`).join(" "));
if (etalonFaux.length === 0) {
  const seuil = (t) => (t >= 18.66 ? 3 : 4.5);
  const echoue = contraste.mesures.filter((m) => m.ratio < seuil(m.taille));
  test("aucun texte sous le seuil de contraste", echoue.length === 0,
    echoue.map((m) => `${m.ratio}:1 ${Math.round(m.taille)}px « ${m.exemple} »`).join(" · "));
  if (contraste.muets.length)
    console.log("  note : fonds en image sans --fond-mesure :", contraste.muets.join(", "));
}

/* ═══ captures optionnelles ═══ */
if (dossierCap && existsSync(dossierCap)) {
  for (const [id, largeur] of [["accueil", 390], ["carte-ecran", 390], ["accueil", 1440]]) {
    await cmd("Emulation.setDeviceMetricsOverride",
      { width: largeur, height: largeur > 900 ? 900 : 844, deviceScaleFactor: largeur > 900 ? 1 : 2, mobile: largeur < 900 });
    await ev(`va(${JSON.stringify(id)})`); await dodo(600);
    const c = await cmd("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(dossierCap, `${id}-${largeur}.png`), Buffer.from(c.result.data, "base64"));
  }
  console.log("  captures écrites dans", dossierCap);
}

console.log(R.map((r) => "  " + r.ligne).join("\n"));
const ok = R.filter((r) => r.ok).length;
console.log(`\n${ok}/${R.length} PASS`);
process.exit(ok === R.length ? 0 : 1);
