/* Le contraste d'un texte pose sur une VIDEO.

   contraste.mjs mesure une image. Ici le fond bouge : mesurer un seul instant
   ne prouve rien, l'image suivante peut etre plus claire. On balaie donc la
   video, on mesure a chaque arret, et on garde le PIRE de tous les instants.

   La methode de mesure est celle de contraste.mjs, alpha de l'encre compris :
   une encre a 0,72 ne se pose pas comme une couleur pleine, elle se MELANGE
   au fond, et sa couleur rendue depend du pixel dessous.

   usage : node contraste-video.mjs <url> [largeur] [hauteur] [dpr] [pas_s]   */

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROMES = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);
const CHROME = CHROMES.find((c) => existsSync(c));
if (!CHROME) { console.log("Chrome introuvable"); process.exit(1); }

const [, , URL, LARGE = "1440", HAUTE = "900", DPR = "2", PAS = "1.25", SELS] = process.argv;
const CIBLES = (SELS || ".cam-texte h2, .cam-texte .para, .cam-texte .cam-quoi, .cam-texte .rail")
  .split(",").map((s) => s.trim()).filter(Boolean);
const W = Number(LARGE), H = Number(HAUTE), R = Number(DPR), P = Number(PAS);

const PORT = 9500 + (process.pid % 380);
const profil = mkdtempSync(join(tmpdir(), "cvid-"));
const ch = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, "--remote-allow-origins=*",
  `--user-data-dir=${profil}`, "--no-first-run", "--no-default-browser-check",
  "--force-color-profile=srgb", "--hide-scrollbars", "--allow-file-access-from-files",
  "--autoplay-policy=no-user-gesture-required", "about:blank",
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
    const p = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.type === "page");
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
const ev = (x, a = false) =>
  cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: a })
    .then((r) => r.result?.result?.value);

await cmd("Page.enable"); await cmd("Runtime.enable");
await cmd("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: R, mobile: W < 881 });
const charge = new Promise((r) => evs.set("Page.loadEventFired", r));
await cmd("Page.navigate", { url: URL }); await charge;
await ev(`document.fonts.ready.then(() => true)`, true);
await dodo(1300);
/* La section doit etre a l'ecran — mais PAS collee au bord haut : la barre de
   navigation est collante et opaque, et scrollIntoView({block:"start"}) glissait
   le titre dessous. La sonde mesurait alors le sol de la barre (172,174,170 en
   telephone, un gris clair) et accusait un fond innocent. On decale donc de la
   hauteur reelle de la barre, mesuree, pas devinee. */
await ev(`(() => {
  const s = document.getElementById("temps");
  if (!s) return false;
  const nav = document.querySelector(".nav");
  const h = nav ? nav.getBoundingClientRect().height : 0;
  scrollTo(0, s.getBoundingClientRect().top + scrollY - h - 12);
  return true;
})()`);
await dodo(700);

const duree = await ev(`(() => { const v = document.querySelector("video"); return v ? (v.duration || 0) : 0; })()`);
if (!duree) { console.log("aucune video sur la page"); process.exit(1); }

/* Le cycle des rails change la TEINTE du voile : on le fige, sinon deux
   mesures du meme instant ne donnent pas le meme chiffre. */
await ev(`(() => {
  document.querySelectorAll(".rail").forEach((b, i) => { if (i === 0) b.click(); });
  return true;
})()`);

const zones = await ev(`(() => {
  const L = [];
  ${JSON.stringify(CIBLES)}.forEach((sel) => document.querySelectorAll(sel).forEach((el) => {
    const g = document.createRange(); g.selectNodeContents(el);
    const b = g.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) return;
    L.push({ mot: (el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 20),
      x: b.left, y: b.top, w: b.width, h: b.height, couleur: getComputedStyle(el).color });
  }));
  return L;
})()`);
if (!zones.length) { console.log("aucune zone de texte trouvee"); process.exit(1); }

/* On efface l'encre — ET CELLE DES DESCENDANTS. Un <b> a sa propre couleur :
   rendre seulement le parent transparent le laisse peint, et la sonde le
   mesure contre lui-meme. Elle rend alors 1,00:1 et accuse un fond innocent.
   Defaut paye trois fois avant d'etre corrige ici. */
await ev(`(() => {
  const s = document.createElement("style");
  const sels = ${JSON.stringify(CIBLES)};
  s.textContent = sels.concat(sels.map((x) => x + " *")).join(",") +
    "{ color: transparent !important; }";
  document.head.appendChild(s);
  return true;
})()`);
await dodo(200);

const pires = new Map(zones.map((z) => [z.mot, { min: Infinity, quand: 0, fond: "" }]));
const instants = [];
for (let t = 0; t < duree - 0.05; t += P) instants.push(Number(t.toFixed(2)));

console.log("");
console.log("Contraste sur video —", instants.length, "instants sur", duree.toFixed(1), "s",
            `(${W}x${H} @${R})`);
console.log("");

for (const t of instants) {
  await ev(`(() => { const v = document.querySelector("video"); v.pause(); v.currentTime = ${t}; return true; })()`);
  await dodo(320);
  const cap = await cmd("Page.captureScreenshot", { format: "png" });
  const res = await ev(`(async () => {
    const img = new Image();
    img.src = "data:image/png;base64," + ${JSON.stringify(cap.result.data)};
    await img.decode();
    const cv = document.createElement("canvas");
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const ctx = cv.getContext("2d"); ctx.drawImage(img, 0, 0);
    const R = ${R};
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const rap = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const out = [];
    for (const z of ${JSON.stringify(zones)}) {
      const n = z.couleur.match(/[\\d.]+/g).map(Number);
      const al = n.length > 3 ? n[3] : 1;
      const x0 = Math.max(0, Math.round(z.x * R)), y0 = Math.max(0, Math.round(z.y * R));
      const x1 = Math.min(cv.width, Math.round((z.x + z.w) * R));
      const y1 = Math.min(cv.height, Math.round((z.y + z.h) * R));
      if (x1 <= x0 || y1 <= y0) { out.push(null); continue; }
      const d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      let pire = Infinity, sr = 0, sg = 0, sb = 0;
      for (let i = 0; i < d.length; i += 4) {
        const fr = d[i], fg = d[i+1], fb = d[i+2];
        const r0 = rap(lum(al*n[0] + (1-al)*fr, al*n[1] + (1-al)*fg, al*n[2] + (1-al)*fb), lum(fr, fg, fb));
        if (r0 < pire) pire = r0;
        sr += fr; sg += fg; sb += fb;
      }
      const c = d.length / 4;
      out.push({ mot: z.mot, min: pire,
        fond: Math.round(sr/c) + "," + Math.round(sg/c) + "," + Math.round(sb/c) });
    }
    return out;
  })()`, true);

  let pireInstant = Infinity;
  for (const l of res || []) {
    if (!l) continue;
    const p = pires.get(l.mot);
    if (l.min < p.min) { p.min = l.min; p.quand = t; p.fond = l.fond; }
    if (l.min < pireInstant) pireInstant = l.min;
  }
  console.log("  t=" + String(t).padStart(5) + " s   pire de l'instant : " + pireInstant.toFixed(2) + ":1");
}

console.log("");
console.log("  " + "zone".padEnd(24) + "pire".padEnd(11) + "a t=".padEnd(9) + "fond moyen".padEnd(16) + "verdict");
let global = Infinity, quiGlobal = "";
for (const [mot, p] of pires) {
  if (p.min < global) { global = p.min; quiGlobal = mot; }
  console.log("  " + mot.padEnd(24) + (p.min.toFixed(2) + ":1").padEnd(11) +
    (p.quand + " s").padEnd(9) + p.fond.padEnd(16) +
    (p.min >= 4.5 ? "tient" : p.min >= 3 ? "gros texte seulement" : "ECHOUE"));
}
console.log("");
console.log("  le pire de TOUTE la video : " + global.toFixed(2) + ":1  (" + quiGlobal + ")");
console.log("");
process.exit(global >= 4.5 ? 0 : 1);
