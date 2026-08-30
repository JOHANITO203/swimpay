/* Mesurer la FLUIDITE d'une page animee, sur Chrome reel.

   On ne juge pas une animation au code : on releve la duree de chaque image
   pendant la lecture, et on compte celles qui depassent le budget. Le reste
   (nombre de recalculs de style, de mises en page) vient des metriques CDP,
   avant/apres, pour savoir si le mouvement tourne sur le compositeur ou s'il
   repasse par le fil principal a chaque image.

   Aucune dependance : WebSocket natif de Node 22+.

   usage : node fluidite.mjs [chemin.html] [duree_ms]                        */

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CIBLE = resolve(process.argv[2] ?? "../socle-eclate.html");
const DUREE = Number(process.argv[3] ?? 4000);

const CHROMES = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);

const CHROME = CHROMES.find((c) => existsSync(c));
if (!CHROME) { console.log("Chrome introuvable — definir CHROME"); process.exit(1); }
if (!existsSync(CIBLE)) { console.log("Cible introuvable :", CIBLE); process.exit(1); }

const PORT = 9600 + (process.pid % 140);
const profil = mkdtempSync(join(tmpdir(), "fluide-"));

const ch = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, "--remote-allow-origins=*",
  `--user-data-dir=${profil}`, "--no-first-run", "--no-default-browser-check",
  "--force-color-profile=srgb", "--window-size=1280,900", "--window-position=40,30",
  "--allow-file-access-from-files",
  "about:blank",
], { stdio: "ignore" });

process.on("exit", () => {
  try { ch.kill(); } catch {}
  try { rmSync(profil, { recursive: true, force: true }); } catch {}
});

const dodo = (m) => new Promise((r) => setTimeout(r, m));

let ws;
for (let i = 0; i < 60 && !ws; i++) {
  await dodo(300);
  try {
    const pages = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    const p = pages.find((x) => x.type === "page");
    if (p) ws = new WebSocket(p.webSocketDebuggerUrl);
  } catch {}
}
if (!ws) { console.log("Chrome muet"); process.exit(1); }
await new Promise((r) => (ws.onopen = r));

let seq = 0;
const att = new Map(), evs = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && att.has(d.id)) { att.get(d.id)(d); att.delete(d.id); }
  if (d.method && evs.has(d.method)) evs.get(d.method)(d.params);
};
const cmd = (m, p = {}) => new Promise((r) => {
  const id = ++seq; att.set(id, r);
  ws.send(JSON.stringify({ id, method: m, params: p }));
});
const ev = async (x, at = false) => {
  const r = await cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: at });
  if (r.result?.exceptionDetails) {
    throw new Error("EXC: " + String(r.result.exceptionDetails.exception?.description || "").split("\n")[0]);
  }
  return r.result?.result?.value;
};

await cmd("Page.enable");
await cmd("Runtime.enable");
await cmd("Performance.enable");

const charge = new Promise((r) => evs.set("Page.loadEventFired", r));
await cmd("Page.navigate", { url: "file:///" + CIBLE.replace(/\\/g, "/") });
await charge;
await ev(`document.fonts.ready.then(() => true)`, true);
await dodo(1400);                       // laisser l'animation atteindre son regime

const metriques = async () => {
  const { result } = await cmd("Performance.getMetrics");
  const m = Object.fromEntries((result?.metrics ?? []).map((x) => [x.name, x.value]));
  return m;
};

const avant = await metriques();

/* Le releveur : on empile les deltas de requestAnimationFrame pendant DUREE.
   rAF est cadence par le compositeur — c'est la meme horloge que celle qui
   presente les images a l'ecran. */
await ev(`(() => {
  window.__ech = [];
  let p = null, fin = performance.now() + ${DUREE};
  const tic = (t) => {
    if (p !== null) window.__ech.push(t - p);
    p = t;
    if (t < fin) requestAnimationFrame(tic); else window.__fini = true;
  };
  requestAnimationFrame(tic);
  return true;
})()`);

await dodo(DUREE + 700);

const ech = await ev(`window.__ech`);
const apres = await metriques();

if (!ech || ech.length < 10) { console.log("Releve vide"); process.exit(1); }

/* On jette la premiere image : elle porte le cout du demarrage du releveur. */
const d = ech.slice(1).sort((a, b) => a - b);
const n = d.length;
const q = (p) => d[Math.min(n - 1, Math.floor(p * n))];
const moy = d.reduce((s, x) => s + x, 0) / n;

/* Budget : a 60 Hz une image dure 16,67 ms. On compte large a 20 ms pour ne
   pas compter comme saccade le bruit de mesure. */
const BUDGET = 20;
const sautes = d.filter((x) => x > BUDGET).length;
const gros = d.filter((x) => x > 33).length;

const delta = (k) => Math.round((apres[k] ?? 0) - (avant[k] ?? 0));

const l = (k, v) => console.log("  " + k.padEnd(30) + v);

console.log("");
console.log("Fluidite —", CIBLE.split(/[\\/]/).pop(), `(${(DUREE / 1000).toFixed(1)} s de lecture)`);
console.log("");
l("images relevees", n);
l("cadence moyenne", (1000 / moy).toFixed(1) + " Hz");
l("duree mediane", q(0.5).toFixed(2) + " ms");
l("95e centile", q(0.95).toFixed(2) + " ms");
l("pire image", d[n - 1].toFixed(2) + " ms");
l("images > 20 ms", sautes + "  (" + (sautes / n * 100).toFixed(1) + " %)");
l("images > 33 ms", gros + "  (" + (gros / n * 100).toFixed(1) + " %)");
console.log("");
console.log("  Cout par image sur le fil principal");
l("recalculs de style", delta("RecalcStyleCount") + "  (" + (delta("RecalcStyleCount") / n).toFixed(2) + " / image)");
l("mises en page", delta("LayoutCount") + "  (" + (delta("LayoutCount") / n).toFixed(2) + " / image)");
l("duree script", delta("ScriptDuration") + " ms");
l("duree mise en page", delta("LayoutDuration") + " ms");
l("duree rendu", delta("RecalcStyleDuration") + " ms");
console.log("");

const verdict =
  sautes / n > 0.05 ? "SACCADE — plus de 5 % des images hors budget"
  : q(0.95) > BUDGET ? "LIMITE — la queue depasse le budget"
  : "FLUIDE";
console.log("  verdict :", verdict);
console.log("");

process.exit(0);
