/* Auditer le site contre ce qu'on attend d'un site EN PRODUCTION.

   Pas un avis : une liste de controles, chacun repondu par une mesure sur le
   rendu reel. Ce qui manque est nomme ; ce qui est absent par choix est
   distingue de ce qui est absent par oubli.

   Aucune dependance. usage : node audit-prod.mjs [chemin.html]              */

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CIBLE = resolve(process.argv[2] ?? "../site.html");
if (!existsSync(CIBLE)) { console.log("Introuvable :", CIBLE); process.exit(1); }

const CHROMES = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);
const CHROME = CHROMES.find((c) => existsSync(c));
if (!CHROME) { console.log("Chrome introuvable"); process.exit(1); }

const PORT = 9300 + (process.pid % 190);
const profil = mkdtempSync(join(tmpdir(), "audit-"));
const ch = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, "--remote-allow-origins=*", `--user-data-dir=${profil}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--allow-file-access-from-files", "about:blank",
], { stdio: "ignore" });
const net = () => { try { ch.kill(); } catch {} try { rmSync(profil, { recursive: true, force: true }); } catch {} };
process.on("exit", net); process.on("SIGTERM", () => { net(); process.exit(0); });

const dodo = (m) => new Promise((r) => setTimeout(r, m));
let ws;
for (let i = 0; i < 60 && !ws; i++) {
  await dodo(300);
  try {
    const p = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.type === "page");
    if (p) ws = new WebSocket(p.webSocketDebuggerUrl);
  } catch {}
}
if (!ws) { console.log("Chrome muet"); process.exit(1); }
await new Promise((r) => (ws.onopen = r));

let seq = 0; const att = new Map(), evs = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && att.has(d.id)) { att.get(d.id)(d); att.delete(d.id); }
  if (d.method && evs.has(d.method)) evs.get(d.method)(d.params);
};
const cmd = (m, p = {}) => new Promise((r) => { const id = ++seq; att.set(id, r); ws.send(JSON.stringify({ id, method: m, params: p })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true })
  .then((r) => r.result?.exceptionDetails
    ? "EXC: " + String(r.result.exceptionDetails.exception?.description || "").split("\n")[0]
    : r.result?.result?.value);

await cmd("Page.enable"); await cmd("Runtime.enable");
await cmd("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const erreurs = [];
evs.set("Runtime.exceptionThrown", (p) => erreurs.push((p.exceptionDetails?.exception?.description || "").split("\n")[0]));
const charge = new Promise((r) => evs.set("Page.loadEventFired", r));
await cmd("Page.navigate", { url: "file:///" + CIBLE.replace(/\\/g, "/") });
await charge;
await ev(`document.fonts.ready.then(() => true)`);
await dodo(1600);

const R = [];
const ligne = (bloc, quoi, etat, detail) => R.push({ bloc, quoi, etat, detail: String(detail ?? "") });

/* ── LIVRAISON ─────────────────────────────────────────────────────────── */
const octets = statSync(CIBLE).size;
ligne("Livraison", "poids du document", octets < 500e3 ? "ok" : octets < 1e6 ? "limite" : "grave",
  Math.round(octets / 1024) + " Ko en un seul fichier");
ligne("Livraison", "ressources externes", "ok",
  await ev(`[...document.querySelectorAll("link[href^='http'], script[src^='http'], img[src^='http']")].length + " (hors polices Google)"`));
ligne("Livraison", "polices", "info",
  await ev(`[...document.querySelectorAll("link[href*='fonts.googleapis']")].length + " feuille(s) Google Fonts — une requete tierce au premier rendu"`));

/* ── ADRESSES & REFERENCEMENT ──────────────────────────────────────────── */
ligne("Référencement", "attribut lang", await ev(`document.documentElement.lang ? "ok" : "grave"`),
  await ev(`document.documentElement.lang || "ABSENT — le navigateur et les lecteurs d ecran devinent la langue"`));
ligne("Référencement", "meta description", await ev(`document.querySelector("meta[name=description]") ? "ok" : "grave"`),
  await ev(`(document.querySelector("meta[name=description]")||{}).content || "ABSENTE — Google ecrira ce qu il veut"`));
ligne("Référencement", "titre", "info", await ev(`document.title + "  (" + document.title.length + " caracteres)"`));
ligne("Référencement", "og: / partage social", await ev(`document.querySelector("meta[property^='og:']") ? "ok" : "grave"`),
  await ev(`document.querySelectorAll("meta[property^='og:'], meta[name^='twitter:']").length + " balise(s) — sans elles, un lien partage sur WhatsApp n affiche ni titre ni image"`));
ligne("Référencement", "canonique", await ev(`document.querySelector("link[rel=canonical]") ? "ok" : "limite"`),
  await ev(`document.querySelector("link[rel=canonical]") ? "presente" : "absente"`));
ligne("Référencement", "favicon", await ev(`document.querySelector("link[rel*=icon]") ? "ok" : "grave"`),
  await ev(`document.querySelector("link[rel*=icon]") ? "presente" : "ABSENTE — onglet vide, et 404 sur /favicon.ico"`));
ligne("Référencement", "adresses des pages", "grave",
  await ev(`[...document.querySelectorAll(".page")].length + " pages sur UNE seule adresse, routees par ancre : aucune n est indexable ni partageable seule"`));
ligne("Référencement", "hiérarchie des titres", "info",
  await ev(`(() => { const h = [...document.querySelectorAll("h1,h2,h3")].map(x => x.tagName);
    return h.filter(x => x === "H1").length + " h1, " + h.filter(x => x === "H2").length + " h2, " + h.filter(x => x === "H3").length + " h3"; })()`));

/* ── ACCESSIBILITÉ ─────────────────────────────────────────────────────── */
ligne("Accessibilité", "images sans alt", await ev(`[...document.querySelectorAll("img:not([alt])")].length ? "grave" : "ok"`),
  await ev(`[...document.querySelectorAll("img:not([alt])")].length + " sur " + document.querySelectorAll("img").length`));
ligne("Accessibilité", "boutons sans nom", await ev(`[...document.querySelectorAll("button")].filter(b => !b.textContent.trim() && !b.getAttribute("aria-label")).length ? "grave" : "ok"`),
  await ev(`[...document.querySelectorAll("button")].filter(b => !b.textContent.trim() && !b.getAttribute("aria-label")).length + " sur " + document.querySelectorAll("button").length`));
ligne("Accessibilité", "champs sans étiquette", await ev(`(() => { const n = [...document.querySelectorAll("input,select,textarea")].filter(i => !i.labels?.length && !i.getAttribute("aria-label") && !i.getAttribute("aria-labelledby")); return n.length ? "grave" : "ok"; })()`),
  await ev(`(() => { const t = document.querySelectorAll("input,select,textarea").length;
    const n = [...document.querySelectorAll("input,select,textarea")].filter(i => !i.labels?.length && !i.getAttribute("aria-label") && !i.getAttribute("aria-labelledby")).length;
    return n + " sur " + t; })()`));
ligne("Accessibilité", "lien d évitement", await ev(`[...document.querySelectorAll("a")].some(a => /aller au contenu|skip/i.test(a.textContent)) ? "ok" : "limite"`),
  "un clavier doit pouvoir sauter la navigation");
ligne("Accessibilité", "repères", "info",
  await ev(`["header","nav","main","footer"].filter(t => document.querySelector(t)).join(", ") || "aucun"`));

/* ── SANS JAVASCRIPT ───────────────────────────────────────────────────── */
ligne("Robustesse", "erreurs JS au chargement", erreurs.length ? "grave" : "ok",
  erreurs.length ? erreurs.join(" | ") : "aucune");
ligne("Robustesse", "sans JavaScript", "grave",
  "les pages sont en display:none et le routeur est en JS : sans lui, la page est VIDE");
ligne("Robustesse", "liens morts / vers l app", await ev(`[...document.querySelectorAll("a[href*='claude.ai']")].length ? "grave" : "ok"`),
  await ev(`[...document.querySelectorAll("a[href*='claude.ai']")].length + " lien(s) vers un artefact claude.ai presente(s) comme etant l application"`));
ligne("Robustesse", "formulaires", "grave",
  await ev(`(() => { const f = [...document.querySelectorAll("form")];
    return f.length + " formulaire(s), action=" + (f.map(x => x.getAttribute("action") || "aucune").join(", ") || "-") + " : rien n est envoye nulle part"; })()`));

/* ── OBLIGATIONS ───────────────────────────────────────────────────────── */
const cherche = async (mots) => ev(`(() => {
  const t = document.body.innerText.toLowerCase();
  return ${JSON.stringify(mots)}.some(m => t.includes(m)); })()`);
ligne("Obligations", "mentions légales", (await cherche(["mentions légales", "mentions legales"])) ? "ok" : "grave",
  "obligatoire, et attendue d une societe qui manipule de l argent");
ligne("Obligations", "politique de confidentialité", (await cherche(["confidentialité", "confidentialite", "données personnelles"])) ? "ok" : "grave",
  "le site collecte nom, telephone et usage dans ses formulaires");
ligne("Obligations", "conditions générales", (await cherche(["conditions générales", "cgu", "cgv"])) ? "ok" : "grave",
  "attendues avant toute ouverture de compte");
ligne("Obligations", "identité de l éditeur", (await cherche(["swimpay sarl", "rccm", "siège", "abidjan"])) ? "ok" : "limite",
  "raison sociale, RCCM, siege, contact");
ligne("Obligations", "contact", (await cherche(["contact", "@swimpay", "nous écrire"])) ? "ok" : "grave",
  "aucun moyen de joindre l entreprise");

/* ── RENDU ─────────────────────────────────────────────────────────────── */
ligne("Rendu", "débordement horizontal", await ev(`document.documentElement.scrollWidth > innerWidth + 2 ? "grave" : "ok"`),
  await ev(`document.documentElement.scrollWidth + " px pour " + innerWidth`));
await cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await dodo(900);
ligne("Rendu", "débordement en 390 px", await ev(`document.documentElement.scrollWidth > 392 ? "grave" : "ok"`),
  await ev(`document.documentElement.scrollWidth + " px pour 390"`));

/* ── SORTIE ────────────────────────────────────────────────────────────── */
const sym = { ok: "  ok  ", limite: " tiède", grave: " MANQUE", info: "  —   " };
let g = 0, l = 0;
console.log("");
console.log("AUDIT PRODUCTION —", CIBLE.split(/[\\/]/).pop());
let bloc = "";
for (const r of R) {
  if (r.bloc !== bloc) { bloc = r.bloc; console.log("\n" + bloc.toUpperCase()); }
  if (r.etat === "grave") g++;
  if (r.etat === "limite") l++;
  console.log(" " + sym[r.etat] + "  " + r.quoi.padEnd(30) + r.detail.slice(0, 96));
}
console.log("");
console.log("  manques graves : " + g + "   points tièdes : " + l);
console.log("");
net(); process.exit(0);
