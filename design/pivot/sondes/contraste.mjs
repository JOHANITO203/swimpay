/* Le contraste d'un texte pose SUR UNE PHOTO ne se juge pas a l'oeil : il se
   mesure au pixel, et c'est le PIRE pixel qui decide, pas la moyenne.

   Methode : on releve la couleur de l'encre et la boite EXACTE du texte (un
   Range sur le contenu, pas la boite du bouton), on rend l'encre transparente,
   on capture — on tient alors le fond NU sous chaque mot — puis on calcule le
   rapport WCAG contre chaque pixel de cette boite.

   Le PNG n'est PAS decode ici : une premiere version le faisait a la main et
   la calibration l'a prise en flagrant delit (lignes glissees — une zone
   blanche rendait un gris moyen). C'est le navigateur qui decode, dans un
   canvas ; lui, il sait.

   Usage :
     node contraste.mjs <url> [largeur] [hauteur] [dpr] [selecteur,selecteur,...]
   Sortie : un rapport par zone, et le pire point de l'ensemble.
   Code de sortie 0 si tout tient au-dessus de 4,5:1.
   DETAIL=1 ajoute l'encre, le fond moyen et la boite lue. */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [, , URL, LARGE = "390", HAUTE = "844", DPR = "2", SELS] = process.argv;
const CIBLES = (SELS || ".nav a.onglet, .nav .bouton.creux, .heros h1, .heros .dit")
  .split(",").map((s) => s.trim()).filter(Boolean);
const W = Number(LARGE), H = Number(HAUTE), R = Number(DPR);

const profil = mkdtempSync(join(tmpdir(), "swimpay-c-"));
const ch = spawn(CHROME, ["--headless=new", "--disable-gpu", "--disable-dev-shm-usage",
  "--remote-debugging-port=9439", `--user-data-dir=${profil}`, "about:blank"], { stdio: "ignore" });
process.on("exit", () => { try { ch.kill(); } catch {} try { rmSync(profil, { recursive: true, force: true }); } catch {} });
const dodo = (m) => new Promise((r) => setTimeout(r, m));
let ws;
for (let i = 0; i < 40 && !ws; i++) {
  await dodo(250);
  try {
    const pg = (await (await fetch("http://127.0.0.1:9439/json")).json()).find((x) => x.type === "page");
    if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl);
  } catch {}
}
await new Promise((r) => (ws.onopen = r));
let seq = 0; const att = new Map(), evs = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data);
  if (d.id && att.has(d.id)) { att.get(d.id)(d); att.delete(d.id); }
  if (d.method && evs.has(d.method)) evs.get(d.method)(d.params); };
const cmd = (m, p = {}) => new Promise((r) => { const id = ++seq; att.set(id, r); ws.send(JSON.stringify({ id, method: m, params: p })); });
const ev = async (x, attendre = false) => {
  const r = await cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: attendre });
  if (r.result.exceptionDetails)
    throw new Error(String(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text || "").split("\n")[0]);
  return r.result.result.value;
};
await cmd("Page.enable"); await cmd("Runtime.enable");
const charge = new Promise((r) => evs.set("Page.loadEventFired", r));
await cmd("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: R, mobile: W < 881 });
await cmd("Page.navigate", { url: URL }); await charge; await dodo(1600);

/* La boite du TEXTE, pas celle du bouton : un Range sur le contenu donne
   l'encre exacte, sans le rembourrage ou personne n'ecrit. */
const zones = await ev(`(() => {
  const L = [];
  ${JSON.stringify(CIBLES)}.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const g = document.createRange(); g.selectNodeContents(el);
      const b = g.getBoundingClientRect();
      if (b.width < 2 || b.height < 2) return;
      L.push({ mot: (el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 18),
        x: b.left, y: b.top, w: b.width, h: b.height,
        couleur: getComputedStyle(el).color });
    });
  });
  return L;
})()`);
if (!zones.length) { console.log("aucune zone de texte trouvee pour : " + CIBLES.join(" | ")); process.exit(1); }

// on efface l'encre : ce qui reste sous la boite EST le fond
await ev(`(() => {
  const s = document.createElement("style");
  s.id = "efface-encre";
  s.textContent = ${JSON.stringify(CIBLES)}.join(",") + "{ color: transparent !important; }";
  document.head.appendChild(s);
  return true;
})()`);
await dodo(240);
const cap = await cmd("Page.captureScreenshot", { format: "png" });

/* Le decodage revient au navigateur. On lui repasse la capture et les boites,
   il rend les chiffres — aucun octet de PNG ne transite par nos mains. */
const res = await ev(`(async () => {
  const img = new Image();
  img.src = "data:image/png;base64," + ${JSON.stringify(cap.result.data)};
  await img.decode();
  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  cv.getContext("2d").drawImage(img, 0, 0);
  const ctx = cv.getContext("2d");
  const R = ${R};
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const rap = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const zones = ${JSON.stringify(zones)};
  const out = { taille: cv.width + " x " + cv.height, lignes: [] };
  for (const z of zones) {
    const n = z.couleur.match(/[\\d.]+/g).map(Number);
    const lt = lum(n[0], n[1], n[2]);
    const x0 = Math.max(0, Math.round(z.x * R)), y0 = Math.max(0, Math.round(z.y * R));
    const x1 = Math.min(cv.width, Math.round((z.x + z.w) * R)), y1 = Math.min(cv.height, Math.round((z.y + z.h) * R));
    if (x1 <= x0 || y1 <= y0) continue;
    const d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    const tous = []; let sr = 0, sg = 0, sb = 0;
    for (let i = 0; i < d.length; i += 4) {
      tous.push(rap(lt, lum(d[i], d[i + 1], d[i + 2])));
      sr += d[i]; sg += d[i + 1]; sb += d[i + 2];
    }
    const c = d.length / 4;
    tous.sort((a, b) => a - b);
    out.lignes.push({ mot: z.mot, min: tous[0], med: tous[tous.length >> 1],
      encre: z.couleur, fond: Math.round(sr / c) + "," + Math.round(sg / c) + "," + Math.round(sb / c),
      boite: x0 + "," + y0 + "→" + x1 + "," + y1 });
  }
  return out;
})()`, true);

console.log(`fond nu : ${res.taille} px  (ecran ${W}x${H} @${R})`);
console.log("");
let pire = Infinity, pireQui = "";
for (const l of res.lignes) {
  if (l.min < pire) { pire = l.min; pireQui = l.mot; }
  const verdict = l.min >= 4.5 ? "tient" : l.min >= 3 ? "limite" : "ECHOUE";
  console.log(`  ${l.mot.padEnd(20)} pire ${l.min.toFixed(2)}:1   median ${l.med.toFixed(2)}:1   ${verdict}` +
    (process.env.DETAIL ? `   [encre ${l.encre}  fond ${l.fond}  boite ${l.boite}]` : ""));
}
console.log("");
console.log(`le pire point de toute la zone : ${pire.toFixed(2)}:1  (${pireQui})`);
process.exit(pire >= 4.5 ? 0 : 1);
