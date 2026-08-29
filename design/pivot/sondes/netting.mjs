/* Simulateur de netting multi-operateurs.
 *
 * Ce qu il cherche a savoir :
 *   1. quelle part des flux s annule d elle-meme (le taux de compensation) ;
 *   2. combien immobiliser dans chaque boite pour ne jamais tomber a court,
 *      y compris pendant une vague de retraits ;
 *   3. ce que ca coute reellement, en pourcentage du flux brut ;
 *   4. a partir de combien de clients le modele decolle.
 *
 * ── PREMIERE VERSION, ET POURQUOI ELLE ETAIT FAUSSE ───────────────────────
 * Elle annoncait 99,88 % de compensation et zero echec dans tous les cas.
 * C etait un bug, pas un resultat : chaque client encaissait deux fois plus
 * qu il ne sortait, donc les reserves ne faisaient que gonfler. Un systeme ou
 * l argent entre et ne ressort jamais n a evidemment aucun probleme de
 * tresorerie. En vrai, le marchand retire son argent.
 *
 * Corrige ici par la CONSERVATION : sur le mois, ce qui sort d un client
 * egale ce qui entre, moins le solde qu il laisse.
 *
 * ── L ETALONNAGE ───────────────────────────────────────────────────────────
 * Le simulateur se verifie sur deux cas dont la reponse est connue AVANT :
 *   - si chacun sort sur les memes operateurs qu il encaisse -> ~100 % ;
 *   - si chacun encaisse sur un operateur et sort sur un autre ->  ~0 %.
 * Si ces deux-la ne tombent pas, tout le reste est a jeter.
 *
 * AVERTISSEMENT : les profils sont des HYPOTHESES, aucun n est mesure. Le
 * simulateur ne predit pas ; il montre OU le modele bascule.
 *
 * Deterministe : meme graine, memes chiffres.
 *
 *   node netting.mjs                 tous les scenarios
 *   node netting.mjs --clients 400 --budget 3000000
 *
 * ── MODE HYBRIDE (options de cfg, toutes inertes par defaut) ───────────────
 *   caisses: ['orange','wave']  ne tenir des caisses QUE la ; le reste part
 *                               en routage direct (montage 3)
 *   seuilDirect: 1_000_000      un mouvement au-dela part en direct, sans
 *                               toucher les caisses — les gros coups ne les
 *                               vident plus
 *   fallbackDirect: true        caisse a sec -> on route en direct au lieu
 *                               d echouer. L echec devient un cout.
 *   budgets: {orange: 5e6, …}   budget par boite, remplace budgetParBoite
 *
 * Le fichier est aussi un MODULE : hybride.mjs importe simule() pour explorer
 * les combinaisons. Le chemin par defaut ne consomme pas un tirage de plus,
 * pour que la graine reproduise les chiffres deja publies.
 */
import { pathToFileURL } from 'node:url';

function graine(n) {
  return function () {
    n |= 0; n = (n + 0x6d2b79f5) | 0;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const OPERATEURS = ['orange', 'wave', 'mtn', 'moov', 'banque'];

/* Les rails. PayDunya et Julaya releves en primaire (docs/pivot/09 et 10) ;
   Wave, Orange et Hub2 en source tierce. Le plafond du compte marchand est une
   hypothese tierce — c est lui qui contraint le modele. */
export const RAILS = [
  { nom: 'marchand-wave', cout: 0.010, plafondMensuel: 15_000_000, ops: ['wave'] },
  { nom: 'marchand-orange', cout: 0.015, plafondMensuel: 20_000_000, ops: ['orange'] },
  { nom: 'julaya', cout: 0.010, plafondMensuel: Infinity, ops: OPERATEURS },
  { nom: 'hub2', cout: 0.020, plafondMensuel: Infinity, ops: OPERATEURS },
  { nom: 'paydunya', cout: 0.020, plafondMensuel: Infinity, ops: OPERATEURS },
];
const RAIL_PISPI = { nom: 'pi-spi', cout: 0, plafondMensuel: Infinity, ops: OPERATEURS };

/* Profils — TOUS hypothetiques.
   `entrees`      : encaissements mensuels ;
   `partTransfert`: la part de ce qui ressort qui va vers un TIERS (salaire,
                    fournisseur) ; le reste est un RETRAIT du client lui-meme ;
   `garde`        : la part des encaissements qu il laisse chez nous. */
export const PROFILS_BASE = {
  commercant: {
    part: 0.45, entrees: 900_000, partTransfert: 0.30, garde: 0.05,
    mixIn: { wave: 0.50, orange: 0.28, mtn: 0.14, moov: 0.08, banque: 0 },
    mixOut: { wave: 0.35, orange: 0.35, mtn: 0.15, moov: 0.10, banque: 0.05 },
  },
  pme: {
    part: 0.30, entrees: 5_000_000, partTransfert: 0.65, garde: 0.08,
    mixIn: { wave: 0.30, orange: 0.30, mtn: 0.15, moov: 0.10, banque: 0.15 },
    mixOut: { wave: 0.30, orange: 0.32, mtn: 0.18, moov: 0.10, banque: 0.10 },
  },
  entreprise_paie: {
    part: 0.05, entrees: 12_000_000, partTransfert: 0.92, garde: 0.05,
    mixIn: { wave: 0.05, orange: 0.05, mtn: 0.03, moov: 0.02, banque: 0.85 },
    mixOut: { wave: 0.30, orange: 0.35, mtn: 0.20, moov: 0.13, banque: 0.02 },
  },
  ecommerce: {
    part: 0.08, entrees: 3_500_000, partTransfert: 0.12, garde: 0.05,
    mixIn: { wave: 0.38, orange: 0.30, mtn: 0.16, moov: 0.10, banque: 0.06 },
    mixOut: { wave: 0.10, orange: 0.10, mtn: 0.05, moov: 0.05, banque: 0.70 },
  },
  particulier: {
    part: 0.12, entrees: 120_000, partTransfert: 0.70, garde: 0.03,
    mixIn: { wave: 0.45, orange: 0.32, mtn: 0.14, moov: 0.09, banque: 0 },
    mixOut: { wave: 0.42, orange: 0.33, mtn: 0.15, moov: 0.10, banque: 0 },
  },
};

const P_IN = 0.6, P_OUT = 0.5, P_RET = 0.35; // frequences journalieres

export function simule(cfg) {
  const profils = cfg.profils ?? PROFILS_BASE;
  const rnd = graine(cfg.graine ?? 12345);
  const rails = cfg.pispi ? [RAIL_PISPI, ...RAILS] : RAILS;
  const JOURS = cfg.jours ?? 30;

  /* Mode hybride. Tout est inerte par defaut : le chemin de base garde
     exactement les memes tirages et les memes chiffres. */
  const actives = cfg.caisses ?? OPERATEURS;
  const seuilDirect = cfg.seuilDirect ?? Infinity;
  const fallbackDirect = cfg.fallbackDirect ?? false;

  const reserve = {}, budget = {}, creux = {};
  for (const op of OPERATEURS) {
    // Une boite inactive n a ni budget ni reserve : tout y part en direct.
    const b = actives.includes(op) ? (cfg.budgets?.[op] ?? cfg.budgetParBoite) : 0;
    budget[op] = b;
    reserve[op] = b;
    creux[op] = b;
  }
  const consomme = {};
  for (const r of rails) consomme[r.nom] = 0;

  let brut = 0, deplace = 0, frais = 0, echecs = 0, montantEchoue = 0, onUs = 0;
  let directement = 0, fraisDirect = 0, secours = 0, fraisSecours = 0;
  const densite = cfg.densite ?? 0;
  const entreParOp = {}, sortParOp = {};
  for (const op of OPERATEURS) { entreParOp[op] = 0; sortParOp[op] = 0; }

  const clients = [];
  for (const p of Object.values(profils)) {
    const n = Math.max(1, Math.round(cfg.clients * p.part));
    // CONSERVATION : ce qui ressort egale ce qui entre, moins ce qu il garde.
    const sortie = p.entrees * (1 - p.garde);
    for (let i = 0; i < n; i++) {
      clients.push({
        ...p,
        // montant moyen par evenement, pour que le total mensuel tombe juste
        mIn: p.entrees / (P_IN * JOURS),
        mOut: (sortie * p.partTransfert) / (P_OUT * JOURS),
        mRet: (sortie * (1 - p.partTransfert)) / (P_RET * JOURS),
      });
    }
  }

  const tirage = (mix) => {
    let x = rnd();
    for (const op of OPERATEURS) { x -= mix[op] ?? 0; if (x <= 0) return op; }
    return OPERATEURS.find((o) => (mix[o] ?? 0) > 0) ?? 'orange';
  };
  const autour = (m) => Math.max(0, Math.round(m * (0.4 + 1.2 * rnd())));

  function choisitRail(op, montant) {
    return rails
      .filter((r) => r.ops.includes(op))
      .filter((r) => consomme[r.nom] + montant <= r.plafondMensuel)
      .sort((a, b) => a.cout - b.cout)[0];
  }

  /* Aller chercher de l argent pour une boite a sec : d abord chez nous, dans
     les boites qui debordent — c est le netting croise. */
  function rapprovisionne(op, manque) {
    for (const autre of OPERATEURS) {
      if (autre === op || manque <= 0) continue;
      const dispo = reserve[autre] - budget[autre] * 0.3;
      if (dispo <= 0) continue;
      const pris = Math.min(dispo, manque);
      const rail = choisitRail(op, pris);
      if (!rail) continue;
      reserve[autre] -= pris; reserve[op] += pris;
      deplace += pris; frais += pris * rail.cout; consomme[rail.nom] += pris;
      manque -= pris;
    }
    return manque <= 0;
  }

  /* Le routage direct — le montage 3 a l interieur du montage 2. Le mouvement
     part immediatement par le rail le moins cher, frais sur le montant plein,
     sans toucher les caisses. */
  function routeDirect(op, m, enSecours) {
    const rail = choisitRail(op, m);
    if (!rail) { echecs++; montantEchoue += m; return; }
    if (enSecours) { secours += m; fraisSecours += m * rail.cout; }
    else { directement += m; fraisDirect += m * rail.cout; }
    consomme[rail.nom] += m;
  }

  function debite(op, m) {
    // Pas de caisse ici, ou mouvement trop gros pour elle : direct d office.
    if (!actives.includes(op) || m > seuilDirect) { routeDirect(op, m, false); return; }
    if (reserve[op] >= m) { reserve[op] -= m; }
    else if (rapprovisionne(op, m - reserve[op])) { reserve[op] -= m; }
    // La soupape : caisse a sec -> l echec devient un cout, pas un refus.
    else if (fallbackDirect) { routeDirect(op, m, true); return; }
    else { echecs++; montantEchoue += m; return; }
    if (reserve[op] < creux[op]) creux[op] = reserve[op];
  }

  function reequilibre() {
    const basses = OPERATEURS.filter((o) => reserve[o] < budget[o] * 0.6);
    for (const bas of basses) {
      let besoin = budget[bas] - reserve[bas];
      for (const haut of OPERATEURS) {
        if (haut === bas || besoin <= 0) continue;
        const dispo = reserve[haut] - budget[haut];
        if (dispo <= 0) continue;
        const pris = Math.min(dispo, besoin);
        const rail = choisitRail(bas, pris);
        if (!rail) continue;
        reserve[haut] -= pris; reserve[bas] += pris;
        deplace += pris; frais += pris * rail.cout; consomme[rail.nom] += pris;
        besoin -= pris;
      }
    }
  }

  for (let jour = 1; jour <= JOURS; jour++) {
    const paie = jour >= 26 && jour <= 30;
    const vague = cfg.vague === jour;
    for (const c of clients) {
      if (rnd() < P_IN) {
        const op = tirage(c.mixIn);
        const m = autour(c.mIn);
        reserve[op] += m; brut += m; entreParOp[op] += m;
      }
      if (rnd() < P_OUT) {
        const op = tirage(c.mixOut);
        const m = autour(c.mOut * (paie && c.partTransfert > 0.8 ? 3 : 1));
        if (m > 0) {
          brut += m;
          /* ON-US : si le beneficiaire est LUI AUSSI client, rien ne sort du
             livre. Ce n est meme pas du netting, c est une ecriture. Cout
             zero, instantane, aucun rail traverse. */
          if (rnd() < densite) { onUs += m; }
          else { sortParOp[op] += m; debite(op, m); }
        }
      }
      if (rnd() < (vague ? 0.95 : P_RET)) {
        const op = tirage(c.mixOut);
        const m = autour(c.mRet * (vague ? 6 : 1));
        if (m > 0) { brut += m; sortParOp[op] += m; debite(op, m); }
      }
    }
    reequilibre();
  }

  /* Le desequilibre STRUCTUREL : la moitie de la somme des ecarts par
     operateur. C est le plancher theorique de ce qui doit traverser, quelle
     que soit l intelligence du moteur. */
  let ecart = 0;
  for (const op of OPERATEURS) ecart += Math.abs(entreParOp[op] - sortParOp[op]);
  const structurel = brut > 0 ? ecart / 2 / brut : 0;

  /* « traverse » = tout ce qui a paye un rail : reequilibrages + direct +
     secours. Dans le chemin de base, direct et secours valent zero et les
     chiffres publies ne bougent pas. */
  const traverse = deplace + directement + secours;
  const coutTotal = frais + fraisDirect + fraisSecours;

  return {
    clients: clients.length, brut, deplace, frais, onUs,
    directement, fraisDirect, secours, fraisSecours, traverse, coutTotal,
    tauxOnUs: brut > 0 ? onUs / brut : 0,
    compensation: brut > 0 ? 1 - traverse / brut : 0,
    structurel,
    coutEffectif: brut > 0 ? coutTotal / brut : 0,
    economie: brut * 0.02 - coutTotal,
    echecs, montantEchoue, creux, reserve,
    float: OPERATEURS.reduce((s, op) => s + budget[op], 0),
    entreParOp, sortParOp,
  };
}

// ── Etalonnage : deux cas dont on connait la reponse d avance ───────────────
function etalonne() {
  const memeMix = { wave: 0.4, orange: 0.3, mtn: 0.15, moov: 0.1, banque: 0.05 };
  const identiques = {
    x: { part: 1, entrees: 1_000_000, partTransfert: 0.5, garde: 0.02,
         mixIn: memeMix, mixOut: memeMix },
  };
  const opposes = {
    x: { part: 1, entrees: 1_000_000, partTransfert: 0.5, garde: 0.02,
         mixIn: { wave: 1, orange: 0, mtn: 0, moov: 0, banque: 0 },
         mixOut: { wave: 0, orange: 1, mtn: 0, moov: 0, banque: 0 } },
  };
  const a = simule({ clients: 200, budgetParBoite: 2_000_000, profils: identiques });
  const b = simule({ clients: 200, budgetParBoite: 2_000_000, profils: opposes });
  const okA = a.structurel < 0.05;
  const okB = b.structurel > 0.40;
  console.log('— 0. ETALONNAGE (si ces deux lignes echouent, tout le reste est faux)');
  console.log(`  memes operateurs a l entree et a la sortie  -> desequilibre structurel ${P(a.structurel)}  ${okA ? 'OK  (attendu ~0)' : 'ECHEC'}`);
  console.log(`  tout entre Wave, tout sort Orange           -> desequilibre structurel ${P(b.structurel)}  ${okB ? 'OK  (attendu ~50 %)' : 'ECHEC'}`);
  return okA && okB;
}

const F = (n) => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
const P = (x) => (x * 100).toFixed(2).replace('.', ',') + ' %';

function ligne(titre, r) {
  const al = r.echecs > 0 ? `  ECHECS ${r.echecs} (${F(r.montantEchoue)} F)` : '  ok';
  console.log(
    `${titre.padEnd(28)} ${String(r.clients).padStart(4)}cl ` +
    `| brut ${F(r.brut).padStart(13)} | deplace ${F(r.deplace).padStart(12)} ` +
    `| compens ${P(r.compensation).padStart(8)} | struct ${P(r.structurel).padStart(7)} ` +
    `| frais ${F(r.frais).padStart(9)} | ${P(r.coutEffectif).padStart(7)}` + al);
}

// Le rapport complet ne tourne que si le fichier est LANCE, pas importe.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const CLIENTS = arg('clients', 400), BUDGET = arg('budget', 3_000_000);

console.log('\n=== NETTING — 30 jours, profils hypothetiques, conservation appliquee ===');
console.log(`Budget ${F(BUDGET)} F par boite x 5 boites = ${F(BUDGET * 5)} F immobilises.`);
console.log('« compens » = ce qui ne traverse pas. « struct » = le plancher theorique.\n');

if (!etalonne()) { console.log('\nEtalonnage en echec — on s arrete.'); process.exit(1); }

console.log('\n— 1. L effet d echelle');
for (const n of [10, 25, 50, 100, 200, 400, 800]) ligne(`  ${n} clients`, simule({ clients: n, budgetParBoite: BUDGET }));

console.log('\n— 2. Combien immobiliser par boite ?');
for (const b of [250_000, 500_000, 1_000_000, 3_000_000, 6_000_000, 12_000_000])
  ligne(`  ${F(b)} F/boite`, simule({ clients: CLIENTS, budgetParBoite: b }));

console.log('\n— 3. LA VAGUE DE RETRAITS au jour 15');
for (const b of [1_000_000, 3_000_000, 6_000_000, 12_000_000, 25_000_000])
  ligne(`  ${F(b)} F/boite`, simule({ clients: CLIENTS, budgetParBoite: b, vague: 15 }));

console.log('\n— 4. Le PI-SPI gratuit');
ligne('  sans', simule({ clients: CLIENTS, budgetParBoite: BUDGET }));
ligne('  avec', simule({ clients: CLIENTS, budgetParBoite: BUDGET, pispi: true }));

console.log('\n— 5. Le cas defavorable : tout entre Wave, tout sort Orange');
{
  const p = JSON.parse(JSON.stringify(PROFILS_BASE));
  for (const v of Object.values(p)) {
    v.mixIn = { wave: 0.95, orange: 0.05, mtn: 0, moov: 0, banque: 0 };
    v.mixOut = { wave: 0.02, orange: 0.93, mtn: 0.05, moov: 0, banque: 0 };
  }
  ligne('  flux unidirectionnels', simule({ clients: CLIENTS, budgetParBoite: BUDGET, profils: p }));
}

console.log('\n— 6. LA DENSITE DU RESEAU : et si le beneficiaire est aussi client ?');
console.log('   part des versements dont le destinataire est deja chez nous');
for (const d of [0, 0.15, 0.30, 0.50, 0.70, 0.85]) {
  const r = simule({ clients: CLIENTS, budgetParBoite: BUDGET, densite: d });
  console.log(`  densite ${String(Math.round(d * 100)).padStart(3)} %`
    + ` | on-us ${F(r.onUs).padStart(13)} F (${P(r.tauxOnUs).padStart(7)})`
    + ` | deplace ${F(r.deplace).padStart(12)} | compens ${P(r.compensation).padStart(8)}`
    + ` | frais ${F(r.frais).padStart(9)} | ${P(r.coutEffectif).padStart(7)}`);
}

console.log('\n— 7. Le detail du scenario retenu');
{
  const r = simule({ clients: CLIENTS, budgetParBoite: BUDGET });
  console.log(`  flux brut 30 jours       : ${F(r.brut)} F`);
  console.log(`  reellement deplace       : ${F(r.deplace)} F`);
  console.log(`  TAUX DE COMPENSATION     : ${P(r.compensation)}`);
  console.log(`  plancher structurel      : ${P(r.structurel)} du brut doit traverser, quoi qu on fasse`);
  console.log(`  frais reels              : ${F(r.frais)} F  (${P(r.coutEffectif)} du brut)`);
  console.log(`  si chaque franc traversait a 2 % : ${F(r.brut * 0.02)} F`);
  console.log(`  ECONOMIE                 : ${F(r.economie)} F/mois`);
  console.log(`  float immobilise         : ${F(r.float)} F`);
  console.log('  par boite : entre / sort / creux atteint');
  for (const op of OPERATEURS) {
    console.log(`      ${op.padEnd(8)} ${F(r.entreParOp[op]).padStart(13)} ${F(r.sortParOp[op]).padStart(13)} ${F(r.creux[op]).padStart(12)}`);
  }
}
console.log('');

} // fin du rapport lance directement
