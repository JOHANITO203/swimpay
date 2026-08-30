/**
 * Le Cerveau — la logique metier de SwimPay, sans fournisseur ni reseau.
 *
 * Neuf domaines, et non quatre comme le disait cet en-tete jusqu'au
 * 31 aout 2026 — il datait d'avant la tarification, la tresorerie, les
 * releves et l'instruction :
 *
 *   matcher/      le Rapprocheur : decider si une operation correspond
 *   invoicer/     le Moteur de factures : totaux, payload DGI, FNE, stickers
 *   directory/    l'Annuaire : MSISDN, identite, destinataires
 *   router/       le Routeur : le chemin et son cout
 *   pricing/      la grille tarifaire : le PRIX, par nature d'operation
 *   decision/     l'arbitrage
 *   treasury/     le reequilibrage des soldes
 *   statements/   la lecture des releves
 *   instruction/  la sequence d'execution
 *
 * Regle d'architecture, tenue et non seulement enoncee : `pricing` ne connait
 * pas les chemins, `router` ne connait pas les prix. Le prix suit la nature
 * commerciale de l'operation, jamais le rail technique.
 *
 * Logique pure : aucun module ne connait de fournisseur, aucun ne parle au
 * reseau. Les bras (PayDunya, la DGI) se branchent derriere @swimpay/rails et
 * le DgiAdapter. Seule exception d'environnement : `directory/identity.ts`
 * utilise `node:crypto` — le paquet suppose donc un runtime Node.
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
