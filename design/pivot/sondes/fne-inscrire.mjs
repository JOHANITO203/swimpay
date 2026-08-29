/* Inscription sur l ENVIRONNEMENT DE TEST de la FNE (54.247.95.108).

   Autorisee explicitement par LO. Environnement de test uniquement — jamais
   services.fne.dgi.gouv.ci. Le script remplit l etape 1 (NCC + numero de
   teledeclarant), valide, et rapporte FIDELEMENT ce que la plateforme repond,
   etape par etape, avec une capture a chaque ecran.

   Il ne devine rien : s il ne comprend pas l ecran, il le dit et s arrete. */
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const NCC = process.env.NCC || "2500736C";
const NTD = process.env.NTD || "CI-2025-0027163 N";
const PORT = 9350 + (process.pid % 90);
const profil = mkdtempSync(join(tmpdir(), "fnei-"));
const ch = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, "--remote-allow-origins=*",
  `--user-data-dir=${profil}`, "--no-first-run", "--no-default-browser-check",
  "--window-size=1400,1100", "--window-position=40,40", "about:blank",
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
const ev = async (x, at = false) => {
  const r = await cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: at });
  if (r.result.exceptionDetails) return "EXC: " + String(r.result.exceptionDetails.exception?.description || "").split("\n")[0];
  return r.result.result.value;
};
await cmd("Page.enable"); await cmd("Runtime.enable"); await cmd("Network.enable");

// On garde trace des appels d API : c est la que se lit la verite.
const appels = [];
evs.set("Network.responseReceived", (p) => {
  const u = p.response.url;
  if (/api|onboarding|ncc|declarant|register|signup/i.test(u) && !/\.(js|css|png|jpg|svg|woff2?)/i.test(u)) {
    appels.push(`${p.response.status} ${p.response.url}`);
  }
});

const ecran = async (nom) => {
  const t = await ev(`(() => {
    const vu = new Set(); const L = [];
    document.querySelectorAll('h1,h2,h3,h4,p,label,span,div,li,strong,button,a').forEach((el) => {
      const d = [...el.childNodes].filter((n) => n.nodeType === 3)
        .map((n) => n.textContent).join(' ').replace(/\\s+/g, ' ').trim();
      if (d.length < 2 || vu.has(d) || !el.getBoundingClientRect().width) return;
      vu.add(d); L.push(d.slice(0, 130));
    });
    return L.join(String.fromCharCode(10));
  })()`);
  const c = await cmd("Page.captureScreenshot", { format: "png" });
  writeFileSync(`insc-${nom}.png`, Buffer.from(c.result.data, "base64"));
  console.log(`\n===== ECRAN ${nom} =====`);
  console.log("url :", await ev("location.href"));
  console.log(t);
  console.log(`(capture -> insc-${nom}.png)`);
};

const charge = new Promise((r) => evs.set("Page.loadEventFired", r));
await cmd("Page.navigate", { url: "http://54.247.95.108/fr/onboarding" });
await charge;
await dodo(4000);
await ecran("1-vide");

console.log("\n-- saisie et validation --");
console.log(await ev(`(() => {
  const poseur = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  const n = document.querySelector('input[name=ncc]');
  const d = document.querySelector('input[name=declarantNumber]');
  if (!n || !d) return 'champs introuvables';
  poseur.call(n, ${JSON.stringify(NCC)}); n.dispatchEvent(new Event('input', { bubbles: true }));
  poseur.call(d, ${JSON.stringify(NTD)}); d.dispatchEvent(new Event('input', { bubbles: true }));
  const b = [...document.querySelectorAll('button')].find((e) =>
    /valider/i.test(e.textContent) && e.offsetParent !== null);
  if (!b) return 'bouton Valider introuvable';
  b.click();
  return 'soumis';
})()`));
await dodo(7000);
await ecran("2-apres-validation");

console.log("\n-- appels reseau retenus --");
console.log(appels.length ? [...new Set(appels)].join("\n") : "(aucun)");
process.exit(0);
