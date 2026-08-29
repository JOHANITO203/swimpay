/* Rendre des pages precises d un PDF en images, via le lecteur de Chrome.
   Usage : node pages-pdf.mjs <chemin.pdf> <prefixe-sortie> <p1,p2,p3...>
   Le lecteur accepte #page=N ; on force un tres grand viewport pour que la
   page entiere tienne dans une seule capture. */
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [, , PDF, PREFIXE, LISTE] = process.argv;
const pages = LISTE.split(",").map((x) => Number(x.trim())).filter(Boolean);
const PORT = 9700 + (process.pid % 150);
const profil = mkdtempSync(join(tmpdir(), "pgs-"));
const ch = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, "--remote-allow-origins=*",
  `--user-data-dir=${profil}`, "--no-first-run", "--no-default-browser-check",
  "--window-size=1400,1000", "--window-position=30,30", "about:blank",
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
const att = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && att.has(d.id)) { att.get(d.id)(d); att.delete(d.id); }
};
const cmd = (m, p = {}) => new Promise((r) => {
  const id = ++seq; att.set(id, r);
  ws.send(JSON.stringify({ id, method: m, params: p }));
});
await cmd("Page.enable");
await cmd("Emulation.setDeviceMetricsOverride", {
  width: 1500, height: 1950, deviceScaleFactor: 1.6, mobile: false,
});
const base = "file:///" + PDF.replace(/\\/g, "/");
for (const n of pages) {
  // Recharger completement : le lecteur ignore parfois un simple changement
  // de fragment quand la page est deja ouverte.
  await cmd("Page.navigate", { url: "about:blank" });
  await dodo(600);
  await cmd("Page.navigate", { url: `${base}#page=${n}&zoom=page-fit` });
  await dodo(7000);
  const cap = await cmd("Page.captureScreenshot", { format: "png" });
  const dest = `${PREFIXE}-p${n}.png`;
  writeFileSync(dest, Buffer.from(cap.result.data, "base64"));
  console.log("page", n, "->", dest);
}
process.exit(0);
