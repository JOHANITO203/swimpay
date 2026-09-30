// La sonde de la caution de la tontine, dans le vrai Chrome.
//
//   node design/pivot/sondes/verifie-tontine-caution.mjs [--capture dossier]
//
// Elle charge les deux copies de la demo (design et site deploye) et verifie,
// sur le rendu reel, la position figee par LO le 30/09/2026 (docs/pivot/35) :
//   - aucune exception au chargement ;
//   - le moteur est a 25 % de caution ;
//   - le moteur rend, sur la cagnotte de 330 000 F (11 x 30 000), exactement
//     les montants du doc 35 : 96 000 F au tour 1 ... 396 000 F au tour 11,
//     position -5 % a chaque place, -12 600 / -2 700 F a la fin, perte 0 ;
//   - les ecrans « Mes chiffres », « Le contrat » et la feuille « Accepter »
//     affichent la caution de 25 %, pas un 30 % ecrit en dur (defaut trouve
//     le 30/09 : sept affichages recalculaient la caution a 30 %).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const iCap = args.indexOf("--capture");
const dossierCap = iCap !== -1 ? args[iCap + 1] : null;
const libres = args.filter((a, i) => !a.startsWith("--") && (iCap === -1 || i !== iCap + 1));
const CIBLES = libres.length ? libres : ["design/pivot/tontine-demo.html", "deploy/public/demo/tontine/index.html"];
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9610 + Math.floor(process.pid % 200);
const profil = mkdtempSync(join(tmpdir(), "swimpay-tontine-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--disable-extensions",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`, "about:blank"], { stdio: "ignore" });
const menage = () => { try { chrome.kill(); } catch {} try { rmSync(profil, { recursive: true, force: true }); } catch {} };
process.on("exit", menage);

const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 60 && !ws; i++) {
  await dodo(250);
  try {
    const p = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.type === "page");
    if (p) ws = new WebSocket(p.webSocketDebuggerUrl);
  } catch {}
}
if (!ws) { console.error("Chrome injoignable"); process.exit(2); }
await new Promise((r) => (ws.onopen = r));
let seq = 0; const att = new Map(); const evs = new Map(); let exceptions = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && att.has(d.id)) { att.get(d.id)(d); att.delete(d.id); }
  if (d.method === "Runtime.exceptionThrown") exceptions.push(String(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).split("\n")[0]);
  if (d.method && evs.has(d.method)) evs.get(d.method)(d.params);
};
const cmd = (m, p = {}) => new Promise((r) => { const id = ++seq; att.set(id, r); ws.send(JSON.stringify({ id, method: m, params: p })); });
const ev = async (e) => {
  const r = await cmd("Runtime.evaluate", { expression: e, returnByValue: true });
  if (r.result.exceptionDetails) return "EXC: " + String(r.result.exceptionDetails.exception?.description || "").split("\n")[0];
  return r.result.result.value;
};
await cmd("Page.enable"); await cmd("Runtime.enable");
await cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const ATTENDU = { rendu: [96000, 126000, 156000, 186000, 216000, 246000, 276000, 306000, 336000, 366000, 396000],
  final: [-12600, -12600, -12600, -12600, -12600, -12600, -12600, -12600, -2700, -2700, -2700] };
let echecs = 0;
const test = (nom, ok, detail = "") => { if (!ok) echecs++; console.log(`${ok ? "PASS" : "FAIL"}  ${nom}${ok ? "" : "  <- " + detail}`); };
const num = (s) => Number(String(s).replace(/[^\d]/g, ""));

for (const cible of CIBLES) {
  console.log("\n== " + cible);
  exceptions = [];
  const charge = new Promise((r) => evs.set("Page.loadEventFired", r));
  await cmd("Page.navigate", { url: /^https?:/.test(cible) ? cible : pathToFileURL(resolve(cible)).href });
  await charge; await dodo(1200);
  test("aucune exception au chargement", exceptions.length === 0, exceptions.join(" | "));
  test("le moteur est a 25 % de caution", (await ev("REGLES.caution")) === 25, String(await ev("REGLES.caution")));

  const moteur = await ev(`(() => {
    const M = creeMoteur(11, 11, 1, 30000, {}); const rendu = [];
    for (let t = 1; t <= 11; t++) { const avant = M.p[t - 1].entree; tourSuivant(M); rendu.push(M.p[t - 1].entree - avant); }
    cloture(M);
    return { caution: M.caution0, rendu, final: M.p.map((q) => q.entree - q.sortie), perte: M.perteSw };
  })()`);
  test("caution du moteur = 82 500 F (25 % de 330 000)", moteur.caution === 82500, JSON.stringify(moteur.caution));
  test("rendu le jour du gain = doc 35, places 1 a 11", JSON.stringify(moteur.rendu) === JSON.stringify(ATTENDU.rendu), JSON.stringify(moteur.rendu));
  test("position le jour du gain = -16 500 F (-5 %) partout",
    moteur.rendu.every((r, i) => r - (82500 + 30000 * (i + 1)) === -16500), JSON.stringify(moteur.rendu.map((r, i) => r - 82500 - 30000 * (i + 1))));
  test("resultat final = -12 600 / -2 700 F", JSON.stringify(moteur.final) === JSON.stringify(ATTENDU.final), JSON.stringify(moteur.final));
  test("perte de SwimPay = 0", moteur.perte === 0, String(moteur.perte));

  // les ecrans, sur la meme tontine de 330 000 F
  const ecran = async (nom, prep = "") => ev(`(() => {
    E.cfg = { rythme: "mois", c: 30000, T: 11, B: 1, mode: "invitation" }; E.nom = "Sonde"; ${prep}
    E.ecran = "${nom}"; rendre(); return document.body.innerText;
  })()`);
  const chiffres = await ecran("chiffres");
  const ligne = (txt, lib) => { const l = txt.split("\n"); const i = l.findIndex((x) => x.includes(lib)); return i < 0 ? "" : (l[i] + " " + (l[i + 1] || "")); };
  test("Mes chiffres : caution affichee 82 500 F", num(ligne(chiffres, "dont caution").split("mises")[1]) === 82500, ligne(chiffres, "dont caution"));
  test("Mes chiffres : preleve au contrat 112 500 F", num(ligne(chiffres, "Prélevé en acceptant").split("contrat")[1]) === 112500, ligne(chiffres, "Prélevé en acceptant"));
  const places = await ev(`[...document.querySelectorAll(".places b")].map((b) => b.textContent)`);
  test("Mes chiffres : retire au gain, tours 1 / 6 / 11 = 96 000 / 246 000 / 396 000",
    JSON.stringify((places || []).map(num)) === JSON.stringify([96000, 246000, 396000]), JSON.stringify(places));
  if (dossierCap) {
    mkdirSync(dossierCap, { recursive: true });
    const s = await cmd("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(dossierCap, (cible.includes("deploy") ? "site" : "design") + "-chiffres.png"), Buffer.from(s.result.data, "base64"));
  }
  const contrat = await ecran("contrat");
  test("Le contrat : preleve maintenant 112 500 F", num(ligne(contrat, "Prélevé maintenant").split("maintenant")[1]) === 112500, ligne(contrat, "Prélevé maintenant"));
  const feuille = await ev(`(() => { E.feuille = "accepter"; rendreFeuille(); return document.body.innerText; })()`);
  const m = /caution \(([^)]*)\)/.exec(feuille || "");
  test("Accepter le contrat : caution 82 500 F", !!m && num(m[1]) === 82500, m ? m[1] : "introuvable");
  await ev(`fermerFeuille(true)`);
  // le solde debite a la signature : 25 % de caution + la premiere mise (defaut trouve le 30/09 :
  // raccourci() et la signature par code debitaient encore 30 %)
  const solde = await ev(`(() => { E = neuf(); E.cfg = { rythme: "mois", c: 30000, T: 11, B: 1, mode: "invitation" }; raccourci(); return E.solde; })()`);
  test("solde apres signature = 148 350 - 82 500 - 30 000 = 35 850 F", solde === 35850, String(solde));

  // le parcours « Tontine du bureau » (invitation : 8 semaines, 10 000 F, cagnotte 80 000 F)
  const bureau = await ev(`(() => {
    E = neuf(); dernierEcran = null; notifier("invitation"); ouvrirOffre("invitation");
    const chiffres = document.body.innerText;
    raccourci();
    const q = E.M.p[maPlace()];
    return { chiffres, cautionMoteur: E.M.caution0, cautionEcran: document.body.innerText, solde: E.solde };
  })()`);
  test("Tontine du bureau, Mes chiffres : caution 20 000 F", num(ligne(bureau.chiffres, "dont caution").split("mises")[1]) === 20000, ligne(bureau.chiffres, "dont caution"));
  test("Tontine du bureau, le pourcentage de la caution est affiche (25 %)", ligne(bureau.chiffres, "dont caution").includes("25 %"), ligne(bureau.chiffres, "dont caution"));
  test("Tontine du bureau, la premiere mise est affichee (10 000 F)", num(ligne(bureau.chiffres, "dont première mise").split("mise")[1]) === 10000, ligne(bureau.chiffres, "dont première mise"));
  test("Tontine du bureau, preleve au contrat 30 000 F", num(ligne(bureau.chiffres, "Prélevé en acceptant").split("contrat")[1]) === 30000, ligne(bureau.chiffres, "Prélevé en acceptant"));
  test("Tontine du bureau, caution du moteur 20 000 F", bureau.cautionMoteur === 20000, String(bureau.cautionMoteur));
  test("Tontine du bureau, solde apres signature 118 350 F", bureau.solde === 118350, String(bureau.solde));
  if (dossierCap) {
    await ev(`(() => { E = neuf(); dernierEcran = null; notifier("invitation"); ouvrirOffre("invitation"); })()`);
    await dodo(500);
    const s = await cmd("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(dossierCap, (cible.includes("deploy") ? "site" : "design") + "-bureau.png"), Buffer.from(s.result.data, "base64"));
  }
}
console.log(echecs ? `\n${echecs} echec(s)` : "\nTout passe.");
process.exit(echecs ? 1 : 0);
