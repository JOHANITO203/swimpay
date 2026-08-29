/* L explorateur de combinaisons — montage 2 x montage 3.
 *
 * LO : « le montage 2 et 3 peuvent etre combines, lance une loop de
 * combinaisons et sors-moi des modeles rentables et intelligents. »
 *
 * C est exactement ce que fait ce fichier. Il importe le moteur de netting
 * et fait varier QUATRE leviers :
 *
 *   1. OU met-on des caisses ?      toutes / les grosses seulement
 *   2. QUELS mouvements y passent ? tous / seulement sous un seuil
 *   3. QUE fait-on caisse a sec ?   echec / routage direct (la soupape)
 *   4. COMBIEN dans chaque caisse ? 1 M / 3 M / 6 M
 *
 * Chaque combinaison est jouee DEUX fois : un mois normal, et un mois avec
 * une vague de retraits au jour 15 — le scenario qui cassait le montage 2 pur.
 *
 * Le cout complet integre le PRIX DU FLOAT : de l argent immobilise dans les
 * caisses n est pas gratuit. Hypothese affichee : 1 % par mois (cout
 * d opportunite / ligne de credit). C est une hypothese, pas une mesure.
 *
 * Une combinaison est ELIMINEE si elle refuse un seul paiement dans l un des
 * deux scenarios. Un modele qui refuse des retraits n est pas un modele, c est
 * un incident de presse.
 *
 *   node hybride.mjs                 la grille complete + les archetypes
 *   node hybride.mjs --clients 400
 */
import { simule, OPERATEURS } from './netting.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const CLIENTS = arg('clients', 400);
const COUT_FLOAT_MENSUEL = 0.01; // 1 % par mois — HYPOTHESE, affichee partout

const F = (n) => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
const P = (x) => (x * 100).toFixed(2).replace('.', ',') + ' %';

// ── La grille ───────────────────────────────────────────────────────────────
const CAISSES = [
  { nom: 'toutes', val: undefined },
  { nom: 'orange+wave', val: ['orange', 'wave'] },
  { nom: 'orange+wave+banque', val: ['orange', 'wave', 'banque'] },
];
const SEUILS = [
  { nom: 'tout en caisse', val: undefined },
  { nom: 'gros>2M direct', val: 2_000_000 },
  { nom: 'gros>1M direct', val: 1_000_000 },
  { nom: 'gros>500k direct', val: 500_000 },
];
const SOUPAPES = [
  { nom: 'sans', val: false },
  { nom: 'AVEC soupape', val: true },
];
const BUDGETS = [1_000_000, 3_000_000, 6_000_000];

function joue(cfg) {
  const normal = simule({ clients: CLIENTS, ...cfg });
  const vague = simule({ clients: CLIENTS, ...cfg, vague: 15 });
  const float = normal.float;
  const coutComplet = normal.coutTotal + float * COUT_FLOAT_MENSUEL;
  return { normal, vague, float, coutComplet };
}

const resultats = [];
for (const c of CAISSES) for (const s of SEUILS) for (const f of SOUPAPES) for (const b of BUDGETS) {
  const r = joue({ caisses: c.val, seuilDirect: s.val, fallbackDirect: f.val, budgetParBoite: b });
  resultats.push({
    etiquette: `${c.nom} · ${s.nom} · ${f.nom} · ${F(b)}/boite`,
    caisses: c.nom, seuil: s.nom, soupape: f.val, budget: b, ...r,
  });
}

// ── Le classement ───────────────────────────────────────────────────────────
const sansEchec = resultats.filter((r) => r.normal.echecs === 0 && r.vague.echecs === 0);
const elimines = resultats.length - sansEchec.length;
sansEchec.sort((a, b) => a.coutComplet - b.coutComplet);

console.log(`\n=== LA BOUCLE DE COMBINAISONS — ${CLIENTS} clients, 30 jours, 2 scenarios chacune ===`);
console.log(`${resultats.length} combinaisons jouees. ${elimines} ELIMINEES (au moins un paiement refuse).`);
console.log(`Cout complet = frais de rails (mois normal) + ${P(COUT_FLOAT_MENSUEL)} du float immobilise (hypothese).\n`);

console.log('— LES 12 MEILLEURES (aucun refus, ni en mois normal ni pendant la vague)');
console.log('  rang  combinaison                                                    cout complet   dont float   cout vague   traverse');
sansEchec.slice(0, 12).forEach((r, i) => {
  console.log(
    `  ${String(i + 1).padStart(2)}.   ${r.etiquette.padEnd(60)}` +
    ` ${F(r.coutComplet).padStart(10)} F` +
    ` ${F(r.float * COUT_FLOAT_MENSUEL).padStart(9)} F` +
    ` ${F(r.vague.coutTotal).padStart(10)} F` +
    ` ${P(1 - r.normal.compensation).padStart(8)}`);
});

// ── Les archetypes, nommes — pour comparer les philosophies ─────────────────
console.log('\n— LES ARCHETYPES, COTE A COTE (400 clients, 3 M/boite quand il y a des caisses)');
const archetypes = [
  { nom: 'B PUR — caisses partout, sans soupape', cfg: { budgetParBoite: 3_000_000 } },
  { nom: 'LA SOUPAPE — caisses partout + direct en secours', cfg: { budgetParBoite: 3_000_000, fallbackDirect: true } },
  { nom: 'CAISSES CHOISIES — orange+wave seulement + soupape', cfg: { budgetParBoite: 3_000_000, caisses: ['orange', 'wave'], fallbackDirect: true } },
  { nom: 'DEUX VITESSES — gros>1M en direct + soupape', cfg: { budgetParBoite: 3_000_000, seuilDirect: 1_000_000, fallbackDirect: true } },
  { nom: 'LE COMPLET — choisies + gros>1M direct + soupape', cfg: { budgetParBoite: 3_000_000, caisses: ['orange', 'wave'], seuilDirect: 1_000_000, fallbackDirect: true } },
  { nom: 'TOUT DIRECT — montage 3 pur (reference)', cfg: { budgetParBoite: 0, caisses: [], fallbackDirect: true } },
];
console.log('  archetype                                              cout normal    float     cout vague   refus(N/V)');
for (const a of archetypes) {
  const r = joue(a.cfg);
  console.log(
    `  ${a.nom.padEnd(52)}` +
    ` ${F(r.normal.coutTotal).padStart(10)} F` +
    ` ${F(r.float).padStart(10)} F` +
    ` ${F(r.vague.coutTotal).padStart(10)} F` +
    `   ${r.normal.echecs}/${r.vague.echecs}`);
}

// ── Le detail du gagnant ────────────────────────────────────────────────────
const g = sansEchec[0];
if (g) {
  console.log(`\n— LE GAGNANT, DECOMPOSE : ${g.etiquette}`);
  for (const [nom, r] of [['mois normal', g.normal], ['mois avec vague', g.vague]]) {
    console.log(`  ${nom} :`);
    console.log(`    brut ${F(r.brut)} F · netting ${F(r.deplace)} F (${F(r.frais)} F)` +
      ` · direct ${F(r.directement)} F (${F(r.fraisDirect)} F)` +
      ` · secours ${F(r.secours)} F (${F(r.fraisSecours)} F)`);
    console.log(`    cout rails ${F(r.coutTotal)} F = ${P(r.coutEffectif)} du brut · refus ${r.echecs}`);
  }
  console.log(`  float immobilise ${F(g.float)} F · cout du float ${F(g.float * COUT_FLOAT_MENSUEL)} F/mois (hypothese ${P(COUT_FLOAT_MENSUEL)})`);
  const ref = joue({ budgetParBoite: 0, caisses: [], fallbackDirect: true });
  console.log(`  reference tout-direct : ${F(ref.normal.coutTotal)} F/mois -> le gagnant economise ${F(ref.normal.coutTotal - g.coutComplet)} F/mois`);
}
console.log('');
