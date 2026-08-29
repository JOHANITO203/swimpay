/**
 * Le Moteur de factures — les totaux.
 *
 * Tout est en entiers XOF. Le franc CFA n'a pas de centime : un flottant ici
 * n'apporte que des ecarts d'un franc qui remontent en litige avec la DGI.
 *
 * Deux decisions d'arrondi, prises une fois et documentees :
 *   1. la TVA est calculee et arrondie LIGNE PAR LIGNE, puis sommee. C'est
 *      l'usage fiscal, et c'est ce que la facture imprimee montre : le lecteur
 *      doit pouvoir refaire l'addition a la main ;
 *   2. l'arrondi est au plus proche, la moitie vers le haut.
 */

/** Les quatre taux que la DGI reconnait. */
export type TaxCode = 'TVA' | 'TVAB' | 'TVAC' | 'TVAD';

/** En points de base, pour rester entier : 18 % = 1800. */
const TAUX_BP: Record<TaxCode, number> = {
  TVA: 1800, // 18 % — le taux normal
  TVAB: 900, // 9 %  — le taux reduit
  TVAC: 0, // exoneration conventionnelle
  TVAD: 0, // exoneration legale
};

export interface CustomTax {
  name: string;
  amountMinor: number;
}

export interface InvoiceLine {
  reference?: string | undefined;
  description: string;
  /** Prix unitaire HORS TAXE, en entiers XOF. */
  unitPriceMinor: number;
  quantity: number;
  taxes: TaxCode;
  /** Remise de ligne, en pourcentage entier (0 a 100). */
  discountPercent?: number | undefined;
  measurementUnit?: string | undefined;
  customTaxes?: CustomTax[] | undefined;
}

export interface InvoiceTotals {
  totalHtMinor: number;
  totalTvaMinor: number;
  totalCustomMinor: number;
  totalTtcMinor: number;
  lines: Array<{
    baseHtMinor: number;
    tvaMinor: number;
    customMinor: number;
    ttcMinor: number;
  }>;
}

export class InvoiceInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvoiceInputError';
  }
}

/** Arrondi au plus proche, la moitie vers le haut, sur des entiers. */
function arrondi(valeur: number): number {
  return Math.round(valeur);
}

export function tauxBp(code: TaxCode): number {
  return TAUX_BP[code];
}

/**
 * Calcule les totaux d'une facture.
 *
 * On refuse plutot que de deviner : une quantite nulle, un prix negatif ou une
 * remise hors bornes sont des erreurs de saisie, pas des cas limites a
 * absorber en silence. Une facture fausse transmise a la DGI consomme un
 * sticker et se corrige par un avoir.
 */
export function computeTotals(
  lines: readonly InvoiceLine[],
  options: { discountPercent?: number | undefined } = {},
): InvoiceTotals {
  if (lines.length === 0) {
    throw new InvoiceInputError('une facture sans ligne ne peut pas etre emise');
  }
  const remiseGlobale = options.discountPercent ?? 0;
  if (remiseGlobale < 0 || remiseGlobale > 100) {
    throw new InvoiceInputError(`remise globale hors bornes : ${remiseGlobale}`);
  }

  const detail: InvoiceTotals['lines'] = [];
  let totalHt = 0;
  let totalTva = 0;
  let totalCustom = 0;

  for (const [i, ligne] of lines.entries()) {
    if (!Number.isInteger(ligne.unitPriceMinor) || ligne.unitPriceMinor < 0) {
      throw new InvoiceInputError(`ligne ${i + 1} : prix unitaire invalide`);
    }
    if (!Number.isFinite(ligne.quantity) || ligne.quantity <= 0) {
      throw new InvoiceInputError(`ligne ${i + 1} : quantite invalide`);
    }
    const remiseLigne = ligne.discountPercent ?? 0;
    if (remiseLigne < 0 || remiseLigne > 100) {
      throw new InvoiceInputError(`ligne ${i + 1} : remise hors bornes`);
    }

    const brut = ligne.unitPriceMinor * ligne.quantity;
    // Les deux remises s'appliquent l'une apres l'autre, jamais additionnees.
    const apresLigne = brut * (1 - remiseLigne / 100);
    const baseHt = arrondi(apresLigne * (1 - remiseGlobale / 100));
    const tva = arrondi((baseHt * tauxBp(ligne.taxes)) / 10_000);

    let custom = 0;
    for (const t of ligne.customTaxes ?? []) {
      if (!Number.isInteger(t.amountMinor) || t.amountMinor < 0) {
        throw new InvoiceInputError(`ligne ${i + 1} : taxe « ${t.name} » invalide`);
      }
      custom += t.amountMinor;
    }

    totalHt += baseHt;
    totalTva += tva;
    totalCustom += custom;
    detail.push({
      baseHtMinor: baseHt,
      tvaMinor: tva,
      customMinor: custom,
      ttcMinor: baseHt + tva + custom,
    });
  }

  return {
    totalHtMinor: totalHt,
    totalTvaMinor: totalTva,
    totalCustomMinor: totalCustom,
    totalTtcMinor: totalHt + totalTva + totalCustom,
    lines: detail,
  };
}

/**
 * La numerotation locale, continue par marchand.
 *
 * Ce n'est PAS le numero officiel : celui-la vient de la DGI dans la reponse
 * de certification (champ `reference`, prefixe du NCC). Le numero local est
 * le notre, il sert a retrouver une facture avant meme qu'elle soit certifiee,
 * et a voir un trou dans la serie.
 *
 * Format retenu : AAAA-NNNNNN. L'annee en tete pour que la serie reparte
 * proprement au 1er janvier, six chiffres parce que personne n'emet un million
 * de factures par an.
 */
export function formatLocalNumber(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new InvoiceInputError(`annee invalide : ${year}`);
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999_999) {
    throw new InvoiceInputError(`sequence hors bornes : ${sequence}`);
  }
  return `${year}-${String(sequence).padStart(6, '0')}`;
}
