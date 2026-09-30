// Exporte swimpay-motion.html image par image, sans rien installer :
// Chrome par son protocole de debogage (WebSocket natif de Node 22), puis ffmpeg.
//   node capture.cjs                      toute la video -> images/ puis MP4
//   node capture.cjs 2.5 6.5 10.5         seulement ces instants (controle)
// Variables : CHROME (chemin de chrome.exe), FFMPEG (chemin de ffmpeg), SORTIE.
const { spawn } = require("child_process");
const fs = require("fs"), path = require("path");

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FFMPEG = process.env.FFMPEG || "C:/Python313/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe";
const PAGE = "file:///" + path.resolve(__dirname, "swimpay-motion.html").replace(/\\/g, "/") + "?export";
const SORTIE = process.env.SORTIE || path.resolve(__dirname, "images");
const PORT = 9333;
const instants = process.argv.slice(2).map(Number);

const dort = (ms) => new Promise((r) => setTimeout(r, ms));
async function main() {
  fs.mkdirSync(SORTIE, { recursive: true });
  const profil = fs.mkdtempSync(path.join(require("os").tmpdir(), "motion-"));
  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=" + PORT, "--remote-allow-origins=*",
    "--user-data-dir=" + profil, "--window-size=1080,1920", "--hide-scrollbars", "--force-device-scale-factor=1",
    "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
  let cibles;
  for (let k = 0; k < 50; k++) { try { cibles = await (await fetch("http://127.0.0.1:" + PORT + "/json")).json(); break; } catch { await dort(200); } }
  const page = cibles.find((c) => c.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0; const attente = new Map();
  ws.addEventListener("message", (m) => { const d = JSON.parse(m.data); if (d.id && attente.has(d.id)) { attente.get(d.id)(d); attente.delete(d.id); } });
  const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; attente.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalue = async (expr) => (await cmd("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.result.value;

  await cmd("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
  await cmd("Page.enable");
  await cmd("Page.navigate", { url: PAGE });
  for (let k = 0; k < 100; k++) { if (await evalue("typeof window.pret !== 'undefined'")) break; await dort(100); }
  await evalue("window.pret");
  const duree = await evalue("DUREE"), fps = await evalue("FPS");
  const liste = instants.length ? instants : Array.from({ length: Math.round(duree * fps) }, (_, i) => i / fps);
  const debut = Date.now();
  for (let i = 0; i < liste.length; i++) {
    await evalue("seek(" + liste[i] + "); new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
    const img = await cmd("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const nom = instants.length ? "controle-" + String(liste[i]).replace(".", "_") + ".png" : "f" + String(i).padStart(5, "0") + ".png";
    fs.writeFileSync(path.join(SORTIE, nom), Buffer.from(img.result.data, "base64"));
    if (!instants.length && i % 60 === 0) process.stdout.write("  image " + i + " / " + liste.length + "\r");
  }
  ws.close(); chrome.kill();
  console.log("\n" + liste.length + " images en " + Math.round((Date.now() - debut) / 1000) + " s");
  if (instants.length) return;
  const mp4 = path.resolve(__dirname, "swimpay-motion-9x16.mp4");
  await new Promise((r, e) => spawn(FFMPEG, ["-y", "-framerate", String(fps), "-i", path.join(SORTIE, "f%05d.png"),
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4], { stdio: "inherit" })
    .on("exit", (c) => c === 0 ? r() : e(new Error("ffmpeg " + c))));
  console.log("video : " + mp4);
}
main().catch((e) => { console.error(e); process.exit(1); });
