/* Capturer une page du site a un format donne, sur Chrome reel.

   usage : node capture-site.mjs <ancre> <largeur> <hauteur> <dpr> <sortie.png>
   ex.   : node capture-site.mjs business 1440 900 2 ../captures/b.png        */

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";

const SITE = resolve("../site.html");
const [, , ANCRE = "accueil", L = "1440", H = "900", D = "2", OUT = "../captures/site.png"] = process.argv;
const SORTIE = resolve(OUT);
mkdirSync(dirname(SORTIE), { recursive: true });

const CHROMES = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);
const CHROME = CHROMES.find((c) => existsSync(c));
if (!CHROME) { console.log("Chrome introuvable"); process.exit(1); }

const PORT = 9820 + (process.pid % 120);
const profil = mkdtempSync(join(tmpdir(), "capsite-"));
const ch = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, "--remote-allow-origins=*",
  `--user-data-dir=${profil}`, "--no-first-run", "--no-default-browser-check",
  "--force-color-profile=srgb", "--hide-scrollbars",
  `--window-size=${Number(L) + 20},${Number(H) + 120}`, "--window-position=30,20",
  "--allow-file-access-from-files", "about:blank",
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
const ev = (x, at = false) =>
  cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: at })
    .then((r) => r.result?.result?.value);

await cmd("Page.enable"); await cmd("Runtime.enable"); await cmd("Emulation.setDeviceMetricsOverride", {
  width: Number(L), height: Number(H), deviceScaleFactor: Number(D),
  mobile: Number(L) <= 880,
});

const charge = new Promise((r) => evs.set("Page.loadEventFired", r));
await cmd("Page.navigate", { url: "file:///" + SITE.replace(/\\/g, "/") + "#" + ANCRE });
await charge;
await ev(`document.fonts.ready.then(() => true)`, true);
/* Le routeur ecoute hashchange : on le reveille explicitement, puis on remet
   le defilement en haut pour que la barre soit dans son etat « sur le heros ». */
await ev(`(() => { dispatchEvent(new HashChangeEvent("hashchange")); scrollTo(0, 0); return true; })()`);
await dodo(1100);

const cap = await cmd("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
if (!cap.result?.data) { console.log("Capture vide"); process.exit(1); }
writeFileSync(SORTIE, Buffer.from(cap.result.data, "base64"));
console.log("  " + ANCRE + " " + L + "x" + H + " @" + D + " ->", SORTIE);
process.exit(0);
