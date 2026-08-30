/**
 * Le Cerveau — les quatre modules.
 *
 * Rapprocheur, Moteur de factures, Annuaire, Routeur. Logique pure : aucun
 * module ne connait de fournisseur, aucun ne parle au reseau. Les bras
 * (PayDunya, la DGI) se branchent derriere @swimpay/rails et le DgiAdapter.
 */
export * from './matcher/decide.js';
export * from './invoicer/totals.js';
export * from './invoicer/dgi-payload.js';
export * from './invoicer/dgi-adapter.js';
export * from './invoicer/dgi-errors.js';
export * from './pricing/grille.js';
export * from './router/chemin.js';
export * from './directory/msisdn.js';
export * from './directory/identity.js';
export * from './directory/recipient.js';
export * from './instruction/instruction.js';
export * from './router/route.js';
