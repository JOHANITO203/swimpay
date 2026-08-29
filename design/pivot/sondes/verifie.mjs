// ═══════════════ LA SONDE DU PROTOTYPE ═══════════════
//
// Elle vit DANS LE REPO, et c'est une leçon payée : la précédente vivait dans
// un dossier temporaire, un nettoyage trop large l'a emportée avec seize
// parcours écrits sur deux jours. Un harnais de vérification est du code du
// projet, pas un fichier jetable.
//
//   node design/pivot/sondes/verifie.mjs [chemin.html] [--capture dossier]
//
// Ce qu'elle vérifie, et pourquoi chaque point existe :
//   erreurs      une exception au chargement tue tout le script en silence ;
//                on l'a payé deux fois (const dupliqué, TDZ sur un typeof)
//   graphe       toute cible de navigation existe, aucun écran orphelin
//   contraste    mesuré sur le RENDU, avec étalonnage — six mensonges de sonde
//                ont été corrigés ici, la calibration les empêche de revenir
//   Apple        44 px de cible tactile, 11 px de texte, un retour par flux
//   libellés     aucun bouton ne casse sur plusieurs lignes
//   cartes       les trois cartes, leur modèle, et le masquage des montants
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const iCap = args.indexOf("--capture");
const dossierCap = iCap !== -1 ? args[iCap + 1] : null;
// la VALEUR de --capture n'est pas la cible : sans cette exclusion, la sonde
// chargeait le dossier de captures au lieu du prototype et échouait partout
const libres = args.filter((a, i) => !a.startsWith("--") && i !== iCap + 1);
const cible = libres[0] || "design/pivot/ecran3-personnel-v6-acide.html";
const URL = /^https?:|^file:/.test(cible) ? cible : pathToFileURL(resolve(cible)).href;

const CHROME = process.env.CHROME || (process.platform === "win32"
  ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
  : process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome");
const PORT = 9410 + Math.floor(process.pid % 200);
const profil = mkdtempSync(join(tmpdir(), "swimpay-sonde-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-dev-shm-usage", "--disable-extensions",
  "--disable-background-networking", "--disable-sync", "--renderer-process-limit=2",
  "--js-flags=--max-old-space-size=256", "--disable-gpu",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`, "about:blank",
], { stdio: "ignore" });
// le profil jetable se nettoie TOUJOURS : 716 profils orphelins ont saturé le
// disque une fois, c'est ce qui a provoqué la purge qui a tout emporté
const menage = () => { try { chrome.kill(); } catch {} try { rmSync(profil, { recursive: true, force: true }); } catch {} };
process.on("exit", menage);
process.on("SIGINT", () => { menage(); process.exit(130); });

const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 60 && !ws; i++) {
  await dodo(250);
  try {
    const p = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.type === "page");
    if (p) ws = new WebSocket(p.webSocketDebuggerUrl);
  } catch {}
}
if (!ws) { console.error("Chrome injoignable — définir la variable CHROME si besoin"); process.exit(2); }
await new Promise((r) => (ws.onopen = r));

let seq = 0; const att = new Map(); const evs = new Map();
const exceptions = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && att.has(d.id)) { att.get(d.id)(d); att.delete(d.id); }
  if (d.method === "Runtime.exceptionThrown") {
    const e = d.params.exceptionDetails;
    exceptions.push(String(e.exception?.description || e.text || "").split("\n")[0]);
  }
  if (d.method && evs.has(d.method)) evs.get(d.method)(d.params);
};
const cmd = (m, p = {}) => new Promise((r) => { const id = ++seq; att.set(id, r); ws.send(JSON.stringify({ id, method: m, params: p })); });
const ev = async (e) => {
  const r = await cmd("Runtime.evaluate", { expression: e, returnByValue: true });
  if (r.result.exceptionDetails) return "EXC: " + String(r.result.exceptionDetails.exception?.description || "").split("\n")[0];
  return r.result.result.value;
};
await cmd("Page.enable"); await cmd("Runtime.enable");
const charge = new Promise((r) => evs.set("Page.loadEventFired", r));
await cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await cmd("Page.navigate", { url: URL });
await charge; await dodo(1600);

const R = [];
const test = (nom, ok, detail = "") =>
  R.push({ ok: ok === true, ligne: `${ok === true ? "PASS" : "FAIL"}  ${nom}${ok === true ? "" : "  ← " + detail}` });

/* ═══ 1. le script vit ═══ */
test("aucune exception au chargement", exceptions.length === 0, exceptions.join(" | "));
test("la navigation est câblée", (await ev("typeof va")) === "function");

/* ═══ 2. le graphe de navigation ═══ */
const graphe = await ev(`(() => {
  const ecrans = [...document.querySelectorAll(".ecran")].map((e) => e.id);
  const cibles = new Set();
  document.querySelectorAll("[data-va], [data-mene]").forEach((e) => {
    (e.dataset.va || "").split(" ").filter(Boolean).forEach((x) => cibles.add(x));
    (e.dataset.mene || "").split(" ").filter(Boolean).forEach((x) => cibles.add(x));
  });
  const connus = new Set(ecrans);
  return {
    ecrans: ecrans.length,
    cassees: [...cibles].filter((c) => !connus.has(c)),
    orphelins: ecrans.filter((id) => id !== "splash" && id !== "accueil" && !cibles.has(id)),
  };
})()`);
test(`les ${graphe.ecrans} écrans sont déclarés`, graphe.ecrans > 40, String(graphe.ecrans));
test("aucune cible de navigation cassée", graphe.cassees.length === 0, graphe.cassees.join(", "));
test("aucun écran orphelin", graphe.orphelins.length === 0, graphe.orphelins.join(", "));

/* ═══ 3. chaque écran s'ouvre sans erreur et sans débord ═══ */
const evAttendu = async (e) => {
  const r = await cmd("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.result.exceptionDetails) return "EXC: " + String(r.result.exceptionDetails.exception?.description || "").split("\n")[0];
  return r.result.result.value;
};
// un IIFE async renvoie une PROMESSE : sans awaitPromise, on mesure l'objet
const parcours = await evAttendu(`(async () => {
  const ids = [...document.querySelectorAll(".ecran")].map((e) => e.id);
  const debords = [];
  for (const id of ids) {
    va(id);
    await new Promise((r) => setTimeout(r, 12));
    // ce qui compte est le symptome VU : la page defile-t-elle lateralement ?
    // Un ecran qui deborde sous overflow-x: clip ne fait rien defiler.
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 2)
      debords.push(id + " (" + document.documentElement.scrollWidth + "px)");
  }
  va("accueil");
  return debords;
})()`);
test("aucun écran ne déborde horizontalement", Array.isArray(parcours) && parcours.length === 0,
  Array.isArray(parcours) ? parcours.join(", ") : String(parcours));
test("aucune exception pendant le parcours de tous les écrans", exceptions.length === 0, exceptions.join(" | "));

/* ═══ 4. les règles Apple ═══ */
const apple = await ev(`(() => {
  const petites = [], petitsTextes = [];
  document.querySelectorAll(".ecran:not([hidden]) button, .ecran:not([hidden]) a, .ecran:not([hidden]) [role=button]")
    .forEach((e) => {
      const b = e.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return;
      if (b.width < 43.5 || b.height < 43.5) petites.push((e.textContent || e.ariaLabel || "?").trim().slice(0, 22)
        + " " + Math.round(b.width) + "x" + Math.round(b.height));
    });
  document.querySelectorAll(".ecran:not([hidden]) *").forEach((e) => {
    if (!e.firstChild || e.firstChild.nodeType !== 3 || !e.firstChild.textContent.trim()) return;
    const t = parseFloat(getComputedStyle(e).fontSize);
    if (t && t < 10.9) petitsTextes.push(e.firstChild.textContent.trim().slice(0, 22) + " " + t + "px");
  });
  return { petites: [...new Set(petites)], petitsTextes: [...new Set(petitsTextes)] };
})()`);
test("aucune cible tactile sous 44 × 44", apple.petites.length === 0, apple.petites.join(" · "));
test("aucun texte sous 11 px", apple.petitsTextes.length === 0, apple.petitsTextes.join(" · "));

/* ═══ 5. les libellés de boutons ne cassent pas ═══ */
const casses = await ev(`(() => {
  const mauvais = [];
  document.querySelectorAll(".ecran:not([hidden]) .btn, .ecran:not([hidden]) .sheet-actions button")
    .forEach((b) => {
      // un bouton a icone AU-DESSUS du libelle est vertical par construction :
      // le compter comme  casse  est un faux positif
      if (b.querySelector(".lib-m")) return;
      const h = b.getBoundingClientRect().height;
      const l = parseFloat(getComputedStyle(b).lineHeight) || 20;
      if (h > l * 2.4) mauvais.push(b.textContent.trim().slice(0, 24));
    });
  return [...new Set(mauvais)];
})()`);
test("aucun libellé de bouton ne casse sur plusieurs lignes", casses.length === 0, casses.join(" · "));

/* ═══ 6. les trois cartes et leur modèle ═══ */
const cartes = await ev(`(() => {
  if (typeof CARTES === "undefined") return { absent: true };
  const p = CARTES.find((c) => c.type === "tel");
  return {
    nombre: CARTES.length,
    principaleSansPan: !!p && !p.pan && !!p.tel,
    heroRail: document.querySelectorAll("#hero-rail > *").length,
    carteRail: document.querySelectorAll("#carte-rail > *").length,
    identitePrincipale: (document.querySelector("#hero-rail .ligne1") || {}).textContent || "",
  };
})()`);
test("le modèle des cartes existe", !cartes.absent);
test("trois cartes", cartes.nombre === 3, String(cartes.nombre));
test("le compte principal est identifié par un TÉLÉPHONE, pas un numéro bancaire",
  cartes.principaleSansPan === true);
// on ne déréférence jamais le retour d'une évaluation sans le protéger : si
// elle a levé, `cartes` est une chaîne d'erreur et le champ est indéfini
const identite = String((cartes && cartes.identitePrincipale) || "");
test("l'identité affichée ne parle pas de « compte bancaire »",
  identite.length > 0 && !/N° de compte/i.test(identite), identite.trim().slice(0, 40) || String(cartes).slice(0, 60));
test("le hero porte les trois cartes", cartes.heroRail === 3, String(cartes.heroRail));
test("« Ma carte » porte les trois cartes", cartes.carteRail === 3, String(cartes.carteRail));

/* ═══ 7. masquer les montants ═══ */
await ev('va("accueil")'); await dodo(350);
const avant = await ev('document.querySelector("#hero-rail .montant").textContent.trim()');
await ev('document.querySelector("#hero-rail .oeil").click()'); await dodo(200);
const masque = await ev('document.querySelector("#hero-rail .montant").textContent.trim()');
test("l'œil masque les montants", !/\d/.test(masque) && masque.length > 0, masque);
await ev('document.querySelector("#hero-rail .oeil").click()'); await dodo(250);
test("l'œil les rend à l'identique",
  (await ev('document.querySelector("#hero-rail .montant").textContent.trim()')) === avant);

/* ═══ 8. les flux des cartes ═══
   Ils changent l'ÉTAT : c'est là que le prototype ment le plus facilement.
   Un coffre qui se remplit sans que le compte se vide, un verrou qu'on
   contourne — on les éprouve, on ne les regarde pas. */
await ev('va("carte-ecran")'); await dodo(400);
const flux = await ev(`(() => {
  const v = CARTES.find((c) => c.type === "pan");
  const r = CARTES.find((c) => c.type === "coffre");
  const journal = [];
  const clic = (id) => { ouvreFluxCarte(id); document.getElementById("fc-valide").click(); };
  const choisis = (val) => {
    const c = [...document.querySelectorAll("#fc-corps .fc-choix .chip")].find((x) => x.dataset.val == val);
    if (c) c.click();
  };

  const panAvant = v.pan;
  clic("virt-regen");
  journal.push({ quoi: "régénérer", panChange: v.pan !== panAvant, actif: v.statut === "active" });

  clic("virt-detruire");
  journal.push({ quoi: "détruire", detruite: v.statut === "detruite" });
  rendActionsCarte("virtuelle");
  journal.push({ quoi: "actions après destruction",
    proposeNouvelle: /nouvelle carte/i.test(document.getElementById("carte-vue-details").textContent),
    neProposePlusRegenerer: !/Régénérer/i.test(document.getElementById("carte-vue-details").textContent) });

  const panDetruit = v.pan;
  clic("virt-nouvelle");
  journal.push({ quoi: "nouvelle carte", active: v.statut === "active", autreNumero: v.pan !== panDetruit });

  const soldeAvant = solde;
  ouvreFluxCarte("coffre-alimenter"); choisis(25000);
  document.getElementById("fc-valide").click();
  journal.push({ quoi: "alimenter", coffre: r.montant, compteBaisse: soldeAvant - solde,
    conserve: (soldeAvant - solde) === r.montant });

  ouvreFluxCarte("coffre-verrouiller"); choisis(30);
  document.getElementById("fc-valide").click();
  journal.push({ quoi: "verrouiller", date: r.verrouJusquau });

  ouvreFluxCarte("coffre-liberer");
  const refus = document.getElementById("fc-corps").textContent;
  const bloque = document.getElementById("fc-valide").disabled;
  fermeSheet();
  journal.push({ quoi: "libérer sous verrou", bloque, ditPourquoi: /verrouill/i.test(refus),
    ditJusquaQuand: refus.includes(r.verrouJusquau || "@@") });

  return journal;
})()`);
const etape = (nom) => (Array.isArray(flux) ? flux.find((x) => x.quoi === nom) || {} : {});
test("régénérer donne un autre numéro", etape("régénérer").panChange === true, JSON.stringify(flux).slice(0, 120));
test("détruire met la carte hors service", etape("détruire").detruite === true);
test("une carte détruite propose d'en obtenir une nouvelle",
  etape("actions après destruction").proposeNouvelle === true);
test("… et ne propose plus de régénérer",
  etape("actions après destruction").neProposePlusRegenerer === true);
test("la nouvelle carte est active, avec un autre numéro",
  etape("nouvelle carte").active === true && etape("nouvelle carte").autreNumero === true);
test("alimenter le coffre DÉBITE le compte du même montant",
  etape("alimenter").conserve === true,
  `coffre ${etape("alimenter").coffre} / compte −${etape("alimenter").compteBaisse}`);
test("verrouiller pose une date", !!etape("verrouiller").date, String(etape("verrouiller").date));
test("sous verrou, libérer est refusé", etape("libérer sous verrou").bloque === true);
test("… et le refus dit pourquoi et jusqu'à quand",
  etape("libérer sous verrou").ditPourquoi === true && etape("libérer sous verrou").ditJusquaQuand === true);

/* ═══ 9. le mouvement ═══
   On mesure le RENDU, pas le code : l'état :active est FORCÉ par le protocole,
   puis on lit la transformation calculée. Lire la feuille de style dirait ce
   qu'on a voulu ; forcer l'état dit ce qui se passe. */
await cmd("DOM.enable"); await cmd("CSS.enable");
await ev('va("accueil")'); await dodo(400);
const racine = (await cmd("DOM.getDocument", { depth: -1 })).result.root.nodeId;
const transformeSousAppui = async (selecteur) => {
  const n = (await cmd("DOM.querySelector", { nodeId: racine, selector: selecteur })).result.nodeId;
  if (!n) return "absent";
  await cmd("CSS.forcePseudoState", { nodeId: n, forcedPseudoClasses: ["active"] });
  await dodo(60);
  const t = await ev(`getComputedStyle(document.querySelector(${JSON.stringify(selecteur)})).transform`);
  await cmd("CSS.forcePseudoState", { nodeId: n, forcedPseudoClasses: [] });
  return t;
};
for (const [nom, sel] of [
  ["un bouton", "#accueil .actions .btn"],
  ["une capsule", "#accueil .chip-capsule"],
  ["une rangée", "#accueil .row"],
]) {
  const t = await transformeSousAppui(sel);
  test(`${nom} répond à l'appui`, typeof t === "string" && t !== "none" && t.startsWith("matrix"), String(t));
}
/* LA RÈGLE INVERSE, aussi importante : un retour d'appui sur un élément qui ne
   répond à aucun appui promet une réaction qui n'existe pas. Les cartes n'ont
   pas de cible de navigation — elles ne doivent donc pas s'enfoncer. */
const carteInteractive = await ev(`(() => {
  const c = document.querySelector("#hero-rail .plaque-verre");
  return !!(c && (c.dataset.va || c.dataset.flux || c.onclick || c.closest("button, a")));
})()`);
const carteSousAppui = await transformeSousAppui("#hero-rail .plaque-verre");
test("la carte ne promet pas un appui auquel elle ne répond pas",
  carteInteractive === true ? carteSousAppui !== "none" : carteSousAppui === "none",
  `interactive: ${carteInteractive} · sous appui: ${carteSousAppui}`);

const motion = await ev(`(() => {
  const regles = [...document.styleSheets].flatMap((f) => { try { return [...f.cssRules]; } catch { return []; } });
  const aplat = (rs) => rs.flatMap((r) => (r.cssRules ? [r, ...aplat([...r.cssRules])] : [r]));
  const toutes = aplat(regles);
  const style = toutes.filter((r) => r.style);
  const survolNonProtege = [];
  toutes.forEach((r) => {
    if (!r.selectorText || !r.selectorText.includes(":hover")) return;
    // une requête média à plusieurs termes n'expose pas conditionText dans
    // tous les moteurs : on lit aussi media.mediaText
    let p = r.parentRule, protege = false;
    while (p) {
      const cond = String(p.conditionText || (p.media && p.media.mediaText) || "");
      if (cond.includes("hover") || cond.includes("pointer")) protege = true;
      p = p.parentRule;
    }
    // une règle qui RETIRE le mouvement (transform: none) n'est pas un effet
    // de survol : c'est une neutralisation, elle n'a pas à être protégée
    const t = String(r.style.transform || "").trim();
    const a = String(r.style.animationName || "").trim();
    const bouge = (t && t !== "none") || (a && a !== "none");
    if (!protege && bouge) survolNonProtege.push(r.selectorText.slice(0, 40));
  });
  return {
    toutProprietes: style.filter((r) => /transition:\\s*all/.test(r.style.cssText || "")).length,
    depuisZero: style.filter((r) => /scale\\(0\\)/.test(r.style.cssText || "")).length,
    easeIn: style.filter((r) => /(transition|animation)[^;]*\\bease-in\\b(?!-out)/.test(r.style.cssText || "")).length,
    // une duree peut etre rendue en s OU en ms : lire le nombre sans lire
    // l unite faisait passer 110ms pour 110 secondes
    lentes: style.flatMap((r) => (String(r.style.transitionDuration || "").split(", ")
      .filter((d) => (d.endsWith("ms") ? parseFloat(d) : parseFloat(d) * 1000) > 310)
      .map((d) => (r.selectorText || "?").slice(0, 26) + " " + d))),
    survolNonProtege,
    mouvementReduit: toutes.some((r) => String(r.conditionText || "").includes("prefers-reduced-motion")),
  };
})()`);
test("aucune transition sur « all »", motion.toutProprietes === 0, String(motion.toutProprietes));
test("rien n'apparaît depuis scale(0)", motion.depuisZero === 0, String(motion.depuisZero));
test("aucune courbe ease-in sur de l'interface", motion.easeIn === 0, String(motion.easeIn));
test("aucune transition d'interface au-delà de 300 ms",
  motion.lentes.length === 0, motion.lentes.join(" · "));
test("les effets de survol sont protégés du tactile",
  motion.survolNonProtege.length === 0, motion.survolNonProtege.join(" · "));
test("le mouvement réduit est honoré", motion.mouvementReduit === true);

/* ═══ 9 ter. les chorégraphies propres aux écrans ═══
   Deux gardes contre une panne déjà survenue : l'écran d'envoi et celui de
   réception se vidaient après 300 ms.
   La cause était double, et instructive :
   — DEUX @keyframes DU MÊME NOM. Le dernier déclaré gagne PARTOUT, et rien ne
     lève. Même famille de piège qu'un `const` redéclaré, en plus silencieux ;
   — une règle générique PLUS SPÉCIFIQUE que la chorégraphie de l'écran la
     remplaçait, sans son `forwards` : les éléments retombaient à opacity 0.
     Corrigé par :where(), qui met la générique à spécificité zéro. */
const doublons = await ev(`(() => {
  const noms = [];
  const aplat = (rs) => rs.flatMap((r) => (r.cssRules ? [r, ...aplat([...r.cssRules])] : [r]));
  [...document.styleSheets].forEach((f) => {
    try { aplat([...f.cssRules]).forEach((r) => { if (r.type === 7 || r.name) noms.push(r.name); }); } catch {}
  });
  const vus = {}, doubles = [];
  noms.filter(Boolean).forEach((n) => { vus[n] = (vus[n] || 0) + 1; });
  Object.entries(vus).forEach(([n, k]) => { if (k > 1) doubles.push(n + " ×" + k); });
  return doubles;
})()`);
test("aucune image-clés déclarée deux fois",
  Array.isArray(doublons) && doublons.length === 0, String(doublons));

/* et la garde de fond : un écran qui a sa propre chorégraphie la JOUE.
   `jouées: 0` était le symptôme exact de la panne. */
for (const [nom, ecran, sel] of [
  ["l'envoi", "envoye", "#envoye .s-titre"],
  ["la réception", "recevoir", "#recevoir .s-titre, #recevoir .qr-cadre, #recevoir .scene"],
]) {
  const joue = await evAttendu(`(async () => {
    va(${JSON.stringify(ecran)});
    await new Promise((r) => setTimeout(r, 120));
    const e = document.querySelector(${JSON.stringify(sel)});
    if (!e) return { absent: true };
    const s = getComputedStyle(e);
    return { nom: s.animationName, jouees: e.getAnimations().length, opacite: s.opacity };
  })()`);
  test(`${nom} : sa chorégraphie est bien JOUÉE`,
    joue.absent === true || (joue.jouees > 0 && joue.nom !== "none"),
    JSON.stringify(joue));
}
await ev('va("accueil")'); await dodo(300);

/* ═══ 9 bis. le mouvement qui porte de l'information ═══
   Chacun de ces gestes dit quelque chose. On vérifie qu'ils le disent
   vraiment, et que ce qui NE DOIT PAS bouger ne bouge pas. */
await ev('va("accueil")'); await dodo(400);

// la profondeur du rail est pilotée par le DÉFILEMENT, pas par une minuterie
const profondeur = await ev(`(() => {
  const s = getComputedStyle(document.querySelector("#hero-rail > *"));
  return { nom: s.animationName, ligne: s.animationTimeline };
})()`);
test("la profondeur du rail suit le défilement",
  profondeur.nom === "profondeur" && profondeur.ligne !== "auto",
  `${profondeur.nom} · ${profondeur.ligne}`);

// le solde se compte : il passe par des valeurs intermédiaires
const compte = await evAttendu(`(async () => {
  const el = () => document.querySelector('#hero-rail .plaque-verre[data-carte="principale"] .montant');
  const lit = () => Number(el().textContent.replace(/[^0-9]/g, "").slice(0, -2) || 0);
  const avant = lit();
  debite("Épreuve", "Sonde", 40000);
  const vus = [];
  for (let i = 0; i < 6; i++) { await new Promise((r) => setTimeout(r, 60)); vus.push(lit()); }
  await new Promise((r) => setTimeout(r, 400));
  return { avant, vus, apres: lit(), intermediaires: vus.filter((v) => v !== avant && v !== lit()).length };
})()`);
test("le solde se compte au lieu de sauter",
  compte.intermediaires >= 1 && compte.apres === compte.avant - 40000,
  JSON.stringify(compte).slice(0, 130));

// la ligne qui arrive se signale comme neuve
test("une nouvelle ligne du grand livre s'annonce",
  (await ev('!!document.querySelector("#a-ops .row.neuve")')) === true);

// le pavé numérique ne bouge pas : il est frappé des centaines de fois par jour
await ev('va("envoyer")'); await dodo(400);
const pave = await ev(`(() => {
  const t = document.querySelector("#envoyer .numpad button, #envoyer .numpad .touche");
  if (!t) return "absent";
  const s = getComputedStyle(t);
  return s.animationName + " | " + getComputedStyle(document.querySelector("#envoyer .saisie .montant")).transitionDuration;
})()`);
test("le pavé numérique et son montant ne s'animent pas",
  typeof pave === "string" && /^none/.test(pave) && pave.endsWith("0s"), String(pave));

// la pastille du sélecteur glisse d'un segment à l'autre
await ev('va("carte-ecran")'); await dodo(450);
const glisse = await evAttendu(`(async () => {
  const g = document.querySelector("#carte-ecran .segments");
  const lit = () => parseFloat(getComputedStyle(g).getPropertyValue("--seg-x")) || 0;
  const a = lit();
  g.querySelectorAll(".segment")[1].click();
  await new Promise((r) => setTimeout(r, 350));
  const b = lit();
  g.querySelectorAll(".segment")[0].click();
  await new Promise((r) => setTimeout(r, 350));
  return { a, b, retour: lit(), transition: getComputedStyle(g, "::before").transitionDuration };
})()`);
test("la pastille du sélecteur glisse au lieu de sauter",
  glisse.b > glisse.a && glisse.retour === glisse.a && glisse.transition !== "0s",
  JSON.stringify(glisse));

/* ═══ 9 quater. les gestes des écrans business ═══
   Trois widgets portent des chiffres. On vérifie qu'ils les FONT LIRE :
   la donnée se construit sous l'œil au lieu d'être posée. */
const gestes = await evAttendu(`(async () => {
  const releve = {};
  const voir = async (ecran, sel, clef) => {
    va(ecran);
    await new Promise((r) => setTimeout(r, 140));
    const e = document.querySelector(sel);
    if (!e) { releve[clef] = { absent: true }; return; }
    const s = getComputedStyle(e);
    releve[clef] = { nom: s.animationName, jouees: e.getAnimations().length, delai: s.animationDelay };
  };
  await voir("b-commercant", "#b-commercant .barres i:nth-child(3)", "barres");
  await voir("b-pme", "#b-pme .jauge-w i", "jauge");
  await voir("b-comptable", "#b-comptable .anneau-c", "anneau");
  return releve;
})()`);
test("le rythme des commandes se dresse, heure par heure",
  gestes.barres && (gestes.barres.absent || (gestes.barres.nom === "barre-monte"
    && gestes.barres.jouees > 0 && gestes.barres.delai !== "0s")),
  JSON.stringify(gestes.barres));
test("les jauges se remplissent jusqu'à leur niveau",
  gestes.jauge && (gestes.jauge.absent || (gestes.jauge.nom === "jauge-remplit" && gestes.jauge.jouees > 0)),
  JSON.stringify(gestes.jauge));

/* L'ANNEAU EST LE POINT FRAGILE : une propriété personnalisée NON TYPÉE ne
   s'interpole pas — l'anneau sauterait de 0 à sa valeur sans qu'on le voie.
   On ne se fie donc pas au nom de l'animation : on relève --part PENDANT
   qu'elle tourne et on exige une valeur intermédiaire. */
const anneau = await evAttendu(`(async () => {
  va("b-comptable");
  await new Promise((r) => setTimeout(r, 60));
  const e = document.querySelector("#b-comptable .anneau-c");
  if (!e) return { absent: true };
  const lit = () => parseFloat(getComputedStyle(e).getPropertyValue("--part")) || 0;
  const vus = [];
  for (let i = 0; i < 5; i++) { await new Promise((r) => setTimeout(r, 90)); vus.push(lit()); }
  await new Promise((r) => setTimeout(r, 500));
  const fin = lit();
  return { vus, fin, intermediaires: vus.filter((v) => v > 0 && v < fin - 0.5).length };
})()`);
test("la part de l'anneau se dessine au lieu de sauter",
  anneau.absent === true || anneau.intermediaires >= 1,
  JSON.stringify(anneau));
await ev('va("accueil")'); await dodo(300);

/* ═══ 9 quinquies. les trois manques comblés ═══ */

/* LE PLAFOND : l'action existait et n'ouvrait rien. Elle ouvre, et elle tient
   une contrainte honnête — un plafond ne descend pas sous ce qui est déjà
   parti, et le refus le dit. */
const plafond = await evAttendu(`(async () => {
  va("carte-ecran"); fermeSheet();
  await new Promise((r) => setTimeout(r, 200));
  const v = CARTES.find((c) => c.type === "pan");
  v.plafond = 200000; v.depense = 63500;
  ouvreFluxCarte("virt-plafond");
  const corps = document.getElementById("fc-corps");
  if (!corps.querySelector(".fc-choix")) return { pasDeFlux: true };
  const dit = corps.textContent;
  const chip = (val) => [...corps.querySelectorAll(".chip")].find((c) => c.dataset.val == val);
  chip(50000).click();                       // sous ce qui est déjà dépensé
  const refuse = document.getElementById("fc-valide").disabled;
  chip(500000).click();
  const accepte = !document.getElementById("fc-valide").disabled;
  document.getElementById("fc-valide").click();
  await new Promise((r) => setTimeout(r, 120));
  return { refuse, accepte, pose: v.plafond, ditLeDepense: dit.includes("63 500") };
})()`);
test("le plafond de la carte virtuelle a un flux",
  plafond && plafond.pasDeFlux !== true, JSON.stringify(plafond));
test("un plafond sous ce qui est déjà dépensé est refusé",
  plafond.refuse === true && plafond.ditLeDepense === true, JSON.stringify(plafond));
test("un plafond au-dessus est accepté et posé",
  plafond.accepte === true && plafond.pose === 500000, JSON.stringify(plafond));

/* LA FILE D'INSTALLATION : la ligne de celui qui vient d'installer s'annonce.
   Un compteur qui change seul ne dit pas QUI. */
const file = await evAttendu(`(async () => {
  va("pme-attente");
  await new Promise((r) => setTimeout(r, 250));
  const b = document.getElementById("fa-simule");
  if (!b) return { absent: true };
  const avant = document.getElementById("fa-compte").textContent;
  b.click();
  await new Promise((r) => setTimeout(r, 900));
  const l = document.querySelector("#fa-liste .row.rejoint");
  return {
    avant, apres: document.getElementById("fa-compte").textContent,
    annonce: !!l, jouees: l ? l.getAnimations().length : 0,
  };
})()`);
test("une installation fait avancer le compte",
  file.absent === true || file.avant !== file.apres, JSON.stringify(file));
test("et la ligne de celui qui rejoint s'annonce",
  file.absent === true || (file.annonce === true && file.jouees > 0), JSON.stringify(file));

/* LE CALENDRIER : révélé dans l'ordre des jours, il se lit comme une ligne de
   temps. Sans rang, les trente-cinq cases arrivent d'un bloc — une mosaïque. */
const calendrier = await evAttendu(`(async () => {
  va("pme-salaires");
  await new Promise((r) => setTimeout(r, 180));
  const cases = [...document.querySelectorAll("#pme-salaires .calendrier i")];
  if (!cases.length) return { absent: true };
  const delais = cases.map((c) => parseFloat(getComputedStyle(c).animationDelay) || 0);
  return {
    nombre: cases.length,
    croissants: delais[10] > delais[2] && delais[25] > delais[10],
    premier: delais[0], dernier: delais[cases.length - 1],
    nom: getComputedStyle(cases[5]).animationName,
  };
})()`);
test("le calendrier se révèle dans l'ordre des jours",
  calendrier.absent === true || (calendrier.croissants === true && calendrier.nom === "case-parait"),
  JSON.stringify(calendrier));
await ev('va("accueil")'); await dodo(300);

/* ═══ 10. le mouvement suit l'UX de CHAQUE format ═══
   Les trois interfaces ne sont pas la même : le téléphone a un bas (pouce,
   pilule de navigation, feuille qui monte), le bureau n'en a pas (barre en
   haut, volets côte à côte, feuille CENTRÉE). Faire monter les choses d'un
   bord qui n'existe pas est un contresens — on le vérifie. */
for (const [format, largeur, hauteur, tactile] of [
  ["téléphone", 390, 844, true], ["tablette", 768, 1024, true], ["bureau", 1280, 900, false],
]) {
  await cmd("Emulation.setDeviceMetricsOverride",
    { width: largeur, height: hauteur, deviceScaleFactor: 1, mobile: tactile });
  await ev('va("accueil")'); await dodo(500);
  const m = await ev(`(() => {
    const e = document.querySelector(".ecran:not([hidden]) > .shell > *");
    const s = getComputedStyle(e);
    return { nom: s.animationName, duree: s.animationDuration };
  })()`);
  const attendu = largeur >= 881 ? "parait" : (largeur >= 601 ? "entre-bas-large" : "entre-bas");
  test(`${format} : l'entrée d'écran est « ${attendu} »`, m.nom === attendu, `${m.nom} ${m.duree}`);
}

/* la feuille, et le piège du centrage : sur bureau elle est centrée par
   translateY(-50%). Une animation de `transform` qui ne reprend pas cette
   translation l'écrase, et la feuille saute en fin de course. On mesure sa
   position PENDANT l'animation, pas seulement à la fin. */
for (const [format, largeur, centree] of [["téléphone", 390, false], ["bureau", 1280, true]]) {
  await cmd("Emulation.setDeviceMetricsOverride",
    { width: largeur, height: 844, deviceScaleFactor: 1, mobile: largeur < 881 });
  await ev('va("carte-ecran"); fermeSheet();'); await dodo(300);
  const haut = () => ev('Math.round(document.getElementById("sheet-carte").getBoundingClientRect().top)');
  await ev('ouvreFluxCarte("coffre-alimenter")');
  await dodo(25);
  const debut = await haut();
  // l'animation doit être INTERROGÉE PENDANT QU'ELLE TOURNE : la fermer avant
  // rend l'élément invisible, sans animation ni transformation calculée —
  // c'est ce qui faisait répondre « undefined » à toutes les questions
  const verdictCentrage = centree ? await ev(`(() => {
    const e = document.getElementById("sheet-carte");
    const a = e.getAnimations()[0];
    const k = a ? a.effect.getKeyframes() : null;
    const dernier = k ? String(k[k.length - 1].transform || "none") : "aucune animation";
    e.style.animation = "none"; void e.offsetHeight;
    const repos = getComputedStyle(e).transform;      // la règle de base seule
    e.style.animation = "";
    const m = /matrix\\(([^)]+)\\)/.exec(repos);
    const ty = m ? Math.round(parseFloat(m[1].split(",")[5])) : 0;
    return { ty, dernier, reprend: ty === 0 || /translateY\\(\\s*-?50%/.test(dernier) };
  })()`) : null;
  await dodo(700);
  const pose = await haut();
  await ev("fermeSheet()");
  if (centree) {
    /* LE CRITÈRE DÉTERMINISTE : la DERNIÈRE image-clé de l'animation doit
       reprendre la translation que porte la règle de base. Si elle ne la
       reprend pas, elle l'écrase : la feuille se pose au mauvais endroit puis
       SAUTE quand l'animation rend la main — 123 px mesurés sur le défaut réel.
       Échantillonner une position ne suffit pas : le saut se produit entre
       deux images, et selon la durée de l'animation on tombe avant ou après.
       C'est ce qui rendait ce test inutile deux fois de suite. */
    test(`${format} : la dernière image-clé reprend le centrage`,
      !!verdictCentrage && verdictCentrage.reprend === true,
      verdictCentrage
        ? `repos translateY ${verdictCentrage.ty}px · dernière image-clé « ${verdictCentrage.dernier} »`
        : "pas de relevé");
    test(`${format} : la feuille centrée ne sort jamais de l'écran`,
      debut >= -8 && debut <= 844, `première frame à ${debut}`);
  } else {
    // ancrée en bas : elle DOIT venir d'en dessous, sinon elle apparaît sur place
    test(`${format} : la feuille monte bien depuis le bas`,
      debut > pose + 20, `début ${debut} · posée ${pose}`);
  }
}
await cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await dodo(200);

/* ═══ 11. le contraste, avec étalonnage ═══ */
const contraste = await ev(`(() => {
  const lis = (c) => {
    if (!c) return null;
    c = c.trim();
    if (c.charAt(0) === "#") {
      const h = c.slice(1);
      const p = h.length === 3 ? [h[0] + h[0], h[1] + h[1], h[2] + h[2]] : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
      const v = p.map((x) => parseInt(x, 16));
      return v.some(isNaN) ? null : { r: v[0], g: v[1], b: v[2], a: 1 };
    }
    const n = (c.match(/[-0-9.]+/g) || []).map(Number);
    if (n.length < 3) return null;
    const e = c.indexOf("color(") === 0 ? 255 : 1;   // color() : composantes en 0-1
    return { r: n[0] * e, g: n[1] * e, b: n[2] * e, a: n.length > 3 ? n[3] : 1 };
  };
  const sur = (h, b) => ({ r: h.r * h.a + b.r * (1 - h.a), g: h.g * h.a + b.g * (1 - h.a),
                           b: h.b * h.a + b.b * (1 - h.a), a: 1 });
  const lum = (o) => {
    const c = typeof o === "string" ? lis(o) : o;
    const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const dis = (o) => "rgb(" + [o.r, o.g, o.b].map((v) => Math.round(v)).join(", ") + ")";
  const muets = new Set();
  /* Une surface résumée en une couche. Un fond en IMAGE ou fondu par
     background-blend-mode ne se devine pas : il DÉCLARE --fond-mesure. */
  const couche = (st, nom) => {
    const d = lis((st.getPropertyValue("--fond-mesure") || "").trim());
    if (d) return d;
    const img = st.backgroundImage;
    if (img && img.indexOf("gradient") !== -1) {
      const t = (img.match(/rgba?\\([^)]+\\)/g) || []).map(lis).filter(Boolean);
      const op = t.filter((c) => c.a >= 0.999);
      if (op.length) return op.reduce((pire, c) => (lum(c) < lum(pire) ? c : pire));
      if (t.length) { const v = t.reduce((f, c) => (c.a > f.a ? c : f)); if (v.a >= 0.02) return v; }
    }
    const c = lis(st.backgroundColor);
    if (c && c.a > 0.001) return c;
    if (img && img !== "none" && img.indexOf("gradient") === -1) muets.add(nom);
    return null;
  };
  /* L'ordre de peinture est ::after, ::before, puis l'élément — un
     pseudo-élément peint PAR-DESSUS, il ne se substitue pas. Et il n'est un
     fond que s'il COUVRE réellement la boîte. */
  const fondDe = (el) => {
    const couches = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const b = n.getBoundingClientRect();
      const nom = String(n.className || n.tagName).split(" ")[0];
      const surfaces = [];
      for (const ps of ["::after", "::before"]) {
        const sp = getComputedStyle(n, ps);
        if (!sp || sp.content === "none") continue;
        if (parseFloat(sp.width) >= b.width * 0.9 && parseFloat(sp.height) >= b.height * 0.9) surfaces.push(sp);
      }
      surfaces.push(getComputedStyle(n));
      let stop = false;
      for (const st of surfaces) {
        const ici = couche(st, nom);
        if (!ici) continue;
        couches.push(ici);
        if (ici.a >= 0.999) { stop = true; break; }
      }
      if (stop) break;
      n = n.parentElement;
    }
    couches.push(lis(getComputedStyle(document.documentElement).backgroundColor) || { r: 20, g: 20, b: 20, a: 1 });
    let f = couches[couches.length - 1];
    f = { r: f.r, g: f.g, b: f.b, a: 1 };
    for (let i = couches.length - 2; i >= 0; i--) f = sur(couches[i], f);
    return dis(f);
  };
  /* ÉTALONNAGE — trois paires dont la réponse est posée à la main AVANT.
     Sans lui, six bugs de cette fonction sont passés pour des résultats. */
  const etalon = (() => {
    const d = document.createElement("div");
    d.setAttribute("style", "position:fixed;left:-9999px;top:0;background:#FFFFFF");
    d.innerHTML = "<p style='color:#FFFFFF;background:#141414'>a</p>"
      + "<p style='color:#6A6A66;background:#FFFFFF'>b</p>"
      + "<div style='background:#FFFFFF'><p style='color:#141414;"
      + "background:color-mix(in srgb, #FFFFFF 78%, transparent)'>c</p></div>";
    document.body.appendChild(d);
    const attendu = [18.42, 5.43, 18.42];
    const lus = [...d.querySelectorAll("p")].map((p) => +ratio(getComputedStyle(p).color, fondDe(p)).toFixed(2));
    d.remove();
    return lus.map((v, i) => ({ lu: v, attendu: attendu[i], ecart: +Math.abs(v - attendu[i]).toFixed(2) }));
  })();

  const vus = new Map();
  ["accueil", "activite", "envoyer", "destinataire", "b-commercant", "pme-apercu", "envoye", "carte-ecran"]
    .forEach((id) => {
      if (!document.getElementById(id)) return;
      va(id);
      document.querySelectorAll("#" + id + " *").forEach((el) => {
        if (!el.firstChild || el.firstChild.nodeType !== 3) return;
        const t = el.firstChild.textContent.trim();
        if (!t) return;
        const st = getComputedStyle(el);
        const taille = parseFloat(st.fontSize);
        const fond = fondDe(el);
        const cle = st.color + "|" + fond + "|" + Math.round(taille);
        if (!vus.has(cle)) vus.set(cle, { couleur: st.color, fond, taille, ratio: +ratio(st.color, fond).toFixed(2), exemple: t.slice(0, 26) });
      });
    });
  va("accueil");
  return { etalon, muets: [...muets], mesures: [...vus.values()].sort((a, b) => a.ratio - b.ratio) };
})()`);

// une évaluation qui lève renvoie une CHAÎNE : on le dit au lieu de planter
if (!contraste || !contraste.etalon) {
  test("la sonde de contraste s'exécute", false, String(contraste).slice(0, 200));
  console.log(R.map((r) => "  " + r.ligne).join("\n"));
  const n = R.filter((r) => r.ok).length;
  console.log(`\n${n}/${R.length} PASS`);
  process.exit(1);
}
const etalonFaux = contraste.etalon.filter((e) => e.ecart > 0.15);
test("la sonde de contraste est étalonnée",
  etalonFaux.length === 0, contraste.etalon.map((e) => `${e.lu}≠${e.attendu}`).join(" "));
if (etalonFaux.length === 0) {
  const seuil = (t) => (t >= 18.66 ? 3 : 4.5);
  const echoue = contraste.mesures.filter((m) => m.ratio < seuil(m.taille));
  test("aucun texte sous le seuil de contraste", echoue.length === 0,
    echoue.map((m) => `${m.ratio}:1 ${Math.round(m.taille)}px « ${m.exemple} »`).join(" · "));
  if (contraste.muets.length)
    console.log("  note : fonds en image sans --fond-mesure :", contraste.muets.join(", "));
}

/* ═══ captures optionnelles ═══ */
if (dossierCap && existsSync(dossierCap)) {
  // les trois formats, parce que les trois interfaces diffèrent
  for (const [id, largeur] of [["accueil", 390], ["accueil", 768], ["accueil", 1280],
                               ["carte-ecran", 390], ["carte-ecran", 1280]]) {
    await cmd("Emulation.setDeviceMetricsOverride",
      { width: largeur, height: largeur > 900 ? 900 : 1024, deviceScaleFactor: largeur > 900 ? 1 : 2, mobile: largeur < 881 });
    await ev(`va(${JSON.stringify(id)})`); await dodo(600);
    const c = await cmd("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(dossierCap, `${id}-${largeur}.png`), Buffer.from(c.result.data, "base64"));
  }
  console.log("  captures écrites dans", dossierCap);
}

console.log(R.map((r) => "  " + r.ligne).join("\n"));
const ok = R.filter((r) => r.ok).length;
console.log(`\n${ok}/${R.length} PASS`);
process.exit(ok === R.length ? 0 : 1);
