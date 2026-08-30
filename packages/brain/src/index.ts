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
export * from './decision/decision.js';
export * from './invoicer/dgi-transport.js';
/* stickers.ts a son propre StickerObservation (une lecture de balance_sticker),
   distinct de celui du contrat dgi-adapter (une paire d'observations du store).
   On aliase pour lever la collision sans toucher aux modules. */
export {
  evalueStock,
  facturesGratuites,
  FENETRE_JOURS_DEFAUT,
  SEUIL_ALERTE_JOURS_DEFAUT,
  SEUIL_CRITIQUE_JOURS_DEFAUT,
  FRANCHISE_STICKER_MINOR,
  type StickerObservation as StockStickerObservation,
  type StockLevel,
  type StockVerdict,
  type StockOptions,
} from './invoicer/stickers.js';
export * from './treasury/reequilibre.js';
export * from './statements/releves.js';
export * from './directory/msisdn.js';
export * from './directory/identity.js';
export * from './directory/recipient.js';
export * from './instruction/instruction.js';
export * from './router/route.js';
