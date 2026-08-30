/* Exporter le document de presentation en PDF, et en extraire de quoi
   fabriquer un .docx : la structure du contenu et les schemas en images.

   Chrome reel, pilote par CDP. Aucune dependance installee. */
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [, , SRC, OUT_PDF, OUT_DIR] = process.argv;
const PORT = 9450 + (process.pid % 120);
const profil = mkdtempSync(join(tmpdir(), "expo-"));
mkdirSync(OUT_DIR, { recursive: true });

const ch = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, "--remote-allow-origins=*",
  `--user-data-dir=${profil}`, "--no-first-run", "--no-default-browser-check",
  "--force-color-profile=srgb", "--window-size=1200,1400", "--window-position=30,30",
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
  if (r.result.exceptionDetails) {
    throw new Error("EXC: " + String(r.result.exceptionDetails.exception?.description || "").split("\n")[0]);
  }
  return r.result.result.value;
};

await cmd("Page.enable"); await cmd("Runtime.enable");
// Papier blanc : on force le theme clair, quel que soit le reglage du systeme.
await cmd("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });

const charge = new Promise((r) => evs.set("Page.loadEventFired", r));
await cmd("Page.navigate", { url: "file:///" + SRC.replace(/\\/g, "/") });
await charge;
// Les polices Google doivent etre arrivees avant toute mesure ou capture.
await ev(`document.fonts.ready.then(() => true)`, true);
await dodo(1200);

// ── 1. Le PDF ───────────────────────────────────────────────────────────────
const pdf = await cmd("Page.printToPDF", {
  printBackground: true,
  paperWidth: 8.27, paperHeight: 11.69,          // A4 en pouces
  marginTop: 0.55, marginBottom: 0.55, marginLeft: 0.47, marginRight: 0.47,
  preferCSSPageSize: true,
});
if (!pdf.result?.data) { console.log("PDF vide"); process.exit(1); }
writeFileSync(OUT_PDF, Buffer.from(pdf.result.data, "base64"));
console.log("PDF ->", OUT_PDF);

// ── 2. Les schemas, un PNG chacun ───────────────────────────────────────────
/* Chaque SVG est capture a sa taille reelle x2, sur fond blanc, pour que Word
   l'affiche net. On repere les SVG par leur ordre dans le document. */
const nbSvg = await ev(`document.querySelectorAll('svg').length`);
const images = [];
for (let i = 0; i < nbSvg; i++) {
  const box = await ev(`(() => {
    const s = document.querySelectorAll('svg')[${i}];
    s.scrollIntoView({ block: 'center' });
    const r = s.getBoundingClientRect();
    return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };
  })()`);
  await dodo(220);
  const cap = await cmd("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 2 },
  });
  const nom = `schema-${i + 1}.png`;
  writeFileSync(join(OUT_DIR, nom), Buffer.from(cap.result.data, "base64"));
  images.push({ nom, w: Math.round(box.w), h: Math.round(box.h) });
  console.log("  schema", i + 1, `${Math.round(box.w)}x${Math.round(box.h)}`);
}

// ── 3. La structure du contenu, pour le .docx ──────────────────────────────
/* On parcourt le DOM dans l'ordre et on rend une liste de blocs typés. Ce qui
   n'a pas de sens hors du web (les icones emoji decoratives) est laisse de
   cote par l'appelant s'il le souhaite. */
const structure = await ev(`(() => {
  const out = [];
  let svgVus = 0;
  const txt = (el) => (el.textContent || '').replace(/\\s+/g, ' ').trim();

  const visite = (el) => {
    for (const n of el.children) {
      const tag = n.tagName.toLowerCase();
      if (tag === 'svg') { svgVus++; out.push({ type: 'image', index: svgVus }); continue; }
      if (tag === 'style' || tag === 'link' || tag === 'title' || tag === 'defs') continue;

      if (/^h[1-3]$/.test(tag)) { const t = txt(n); if (t) out.push({ type: tag, text: t }); continue; }

      if (tag === 'p') {
        const t = txt(n);
        if (!t) continue;
        const cls = n.className || '';
        if (cls.includes('eyebrow')) out.push({ type: 'eyebrow', text: t });
        else if (cls.includes('sous-titre')) out.push({ type: 'h3', text: t });
        else if (cls.includes('cap') || cls.includes('ex-sub')) out.push({ type: 'legende', text: t });
        else out.push({ type: 'p', text: t });
        continue;
      }

      if (tag === 'table') {
        const rows = [...n.querySelectorAll('tr')].map((tr) =>
          [...tr.children].map((c) => txt(c)));
        if (rows.length) out.push({ type: 'table', rows });
        continue;
      }

      // Les listes de tarifs et de statut sont des tableaux a deux colonnes.
      if (n.classList && n.classList.contains('tarifs')) {
        const rows = [...n.querySelectorAll('.r')].map((r) => [
          txt(r.querySelector('.op') || r),
          txt(r.querySelector('.px') || ''),
        ]);
        if (rows.length) out.push({ type: 'table', rows });
        continue;
      }
      if (tag === 'ul' || tag === 'ol') {
        const items = [...n.querySelectorAll('li')].map((li) => txt(li)).filter(Boolean);
        if (items.length) out.push({ type: 'list', items });
        continue;
      }
      if (tag === 'dl') {
        for (const d of n.querySelectorAll('.item')) {
          const dt = txt(d.querySelector('dt') || ''), dd = txt(d.querySelector('dd') || '');
          if (dt) out.push({ type: 'def', term: dt, text: dd });
        }
        continue;
      }
      if (n.classList && n.classList.contains('note')) {
        const titre = txt(n.querySelector('.titre') || '');
        const corps = txt(n).replace(titre, '').trim();
        out.push({ type: 'note', title: titre, text: corps });
        continue;
      }
      if (n.classList && n.classList.contains('gros')) {
        out.push({ type: 'chiffre', qui: txt(n.querySelector('.qui') || ''), num: txt(n.querySelector('.num') || ''), txt: txt(n.querySelector('.txt') || '') });
        continue;
      }
      visite(n);
    }
  };
  visite(document.querySelector('.wrap') || document.body);
  return JSON.stringify(out);
})()`);

writeFileSync(join(OUT_DIR, "structure.json"), structure, "utf8");
const blocs = JSON.parse(structure);
console.log("structure :", blocs.length, "blocs,", images.length, "schemas");
process.exit(0);
