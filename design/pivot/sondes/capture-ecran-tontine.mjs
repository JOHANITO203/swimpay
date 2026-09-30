// Capture l'ecran « Tu as gagne » de la demo tontine pour le site
// (design/pivot/assets/ecran-demo-tontine.webp, 740 x 1600).
//
//   node design/pivot/sondes/capture-ecran-tontine.mjs
//
// Pourquoi ce script existe : la capture du site montrait encore la caution a
// 30 % (55 000 F recuperes au tour 3) apres le passage a 25 % le 30/09/2026.
// Une image faite a la main vieillit en silence ; celle-ci se refait depuis la
// demo, donc depuis les REGLES du moteur. Exemple fixe : 10 membres, 10 tours,
// 10 000 F, gagnant du tour 3, tout le monde paie.
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEMO = pathToFileURL(resolve("design/pivot/tontine-demo.html")).href;
const PNG = join(tmpdir(), "ecran-demo-tontine.png");
const WEBP = resolve("design/pivot/assets/ecran-demo-tontine.webp");
const PORT = 9300 + (process.pid % 150);
const profil = mkdtempSync(join(tmpdir(), "ecran-tontine-"));
const ch = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [`--remote-debugging-port=${PORT}`, "--remote-allow-origins=*",
  `--user-data-dir=${profil}`, "--no-first-run", "--no-default-browser-check", "--force-color-profile=srgb", "--hide-scrollbars",
  "--window-size=1300,1000", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
process.on("exit", () => { try { ch.kill(); } catch {} try { rmSync(profil, { recursive: true, force: true }); } catch {} });
const dodo = (m) => new Promise((r) => setTimeout(r, m));
let ws;
for (let i = 0; i < 60 && !ws; i++) { await dodo(300); try { const p = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.type === "page"); if (p) ws = new WebSocket(p.webSocketDebuggerUrl); } catch {} }
if (!ws) { console.error("Chrome injoignable"); process.exit(2); }
await new Promise((r) => (ws.onopen = r));
let seq = 0; const att = new Map(), evs = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && att.has(d.id)) { att.get(d.id)(d); att.delete(d.id); } if (d.method && evs.has(d.method)) evs.get(d.method)(d.params); };
const cmd = (m, p = {}) => new Promise((r) => { const id = ++seq; att.set(id, r); ws.send(JSON.stringify({ id, method: m, params: p })); });
const ev = (x, at = false) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: at }).then((r) => r.result?.result?.value);
await cmd("Page.enable"); await cmd("Runtime.enable");
await cmd("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 2, mobile: false });
const charge = new Promise((r) => evs.set("Page.loadEventFired", r));
await cmd("Page.navigate", { url: DEMO }); await charge;
await ev(`document.fonts.ready.then(() => true)`, true); await dodo(800);

// tirage fait, puis on place « Vous » au tour 3 et on joue jusqu'a son gain
const etat = await ev(`(() => {
  clearTimeout(notifier.t); document.getElementById("notif").classList.remove("visible");
  E = neuf(); dernierEcran = null; raccourci();
  const o = E.ordre.filter((id) => id !== 0); o.splice(2, 0, 0); E.ordre = o;
  E.M = null; relancerMoteur(); E.tourVu = 0;
  avancer(); avancer(); avancer();
  E.notif = null; document.getElementById("notif").classList.remove("visible");
  rendre();
  const q = E.M.p[maPlace()];
  return { ecran: E.ecran, tour: E.M.tour, place: maPlace(), libre: q.libre, caution: REGLES.caution };
})()`);
console.log(JSON.stringify(etat));
if (etat.ecran !== "gain" || etat.tour !== 3 || etat.libre !== 50000) { console.error("etat inattendu : la capture n'est pas faite"); process.exit(1); }
await ev(`document.querySelector(".indicateur").style.display = "none"`); // la barre d accueil passait sous le dernier bouton
await dodo(700);                                             // fin de l animation d entree
const r = await ev(`(() => { const b = document.getElementById("ecran").getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; })()`);
const s = await cmd("Page.captureScreenshot", { format: "png", clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } });
writeFileSync(PNG, Buffer.from(s.result.data, "base64"));
execFileSync("python", ["-c", `from PIL import Image; im = Image.open(r"${PNG}").convert("RGB"); print(im.size); im.save(r"${WEBP}", "WEBP", quality=86, method=6)`], { stdio: "inherit" });
console.log("ecrit :", WEBP);
process.exit(0);
