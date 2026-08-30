/* Capturer la scene du socle a des instants precis de la boucle.

   On pilote le scrub de la page (pas une horloge interne devinee), puis on
   capture l'element de rendu a sa taille reelle x2. C'est le RENDU qu'on
   regarde, pas le code qui le produit.

   usage : node capture-socle.mjs [chemin.html] [t1,t2,...] [prefixe]        */

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";

const CIBLE  = resolve(process.argv[2] ?? "../socle-eclate.html");
const TEMPS  = (process.argv[3] ?? "0,0.35,1.2,3.4").split(",").map(Number);
const PREFIX = resolve(process.argv[4] ?? "../captures/socle");

mkdirSync(dirname(PREFIX), { recursive: true });

const CHROMES = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);

const CHROME = CHROMES.find((c) => existsSync(c));
if (!CHROME) { console.log("Chrome introuvable"); process.exit(1); }

const PORT = 9740 + (process.pid % 130);
const profil = mkdtempSync(join(tmpdir(), "capsocle-"));

const ch = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, "--remote-allow-origins=*",
  `--user-data-dir=${profil}`, "--no-first-run", "--no-default-browser-check",
  "--force-color-profile=srgb", "--window-size=1280,1000", "--window-position=40,20",
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

await cmd("Page.enable"); await cmd("Runtime.enable");
await cmd("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });

const charge = new Promise((r) => evs.set("Page.loadEventFired", r));
await cmd("Page.navigate", { url: "file:///" + CIBLE.replace(/\\/g, "/") });
await charge;
await ev(`document.fonts.ready.then(() => true)`, true);
await dodo(1000);

const boucle = await ev(`(() => {
  const s = document.getElementById('scrub');
  return s ? parseFloat(document.getElementById('tBoucle').textContent.replace(',', '.')) : null;
})()`);
if (!boucle) { console.log("Page sans scrub — rien a piloter"); process.exit(1); }

for (const t of TEMPS) {
  await ev(`(() => {
    const s = document.getElementById('scrub');
    s.value = Math.round((${t} / ${boucle}) * 1000);
    s.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('studio').scrollIntoView({ block: 'center' });
    return true;
  })()`);
  await dodo(320);

  const box = await ev(`(() => {
    const r = document.getElementById('studio').getBoundingClientRect();
    return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };
  })()`);

  const cap = await cmd("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 2 },
  });

  const nom = `${PREFIX}-t${String(t).replace(".", "_")}.png`;
  writeFileSync(nom, Buffer.from(cap.result.data, "base64"));
  console.log("  t=" + t + "s ->", nom, `${Math.round(box.w)}x${Math.round(box.h)}`);
}

process.exit(0);
