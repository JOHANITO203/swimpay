import {
  computeTotals,
  InvoiceInputError,
  type InvoiceLine,
  type InvoiceTotals,
} from './totals.js';

/**
 * Le Moteur de factures — la mise au format DGI.
 *
 * Traduit une facture SwimPay en corps de requete pour
 * `POST $url/external/invoices/sign` (cf. docs/pivot/08_DGI_FNE_API.md, tire
 * de la procedure officielle de mai 2025).
 *
 * Cette fonction NE PARLE PAS au reseau. Elle fabrique le corps et refuse ce
 * qui serait rejete — parce que chaque appel a /sign consomme un sticker
 * prepaye du marchand, que l'API n'offre ni idempotence ni endpoint de statut,
 * et qu'un rejet cote DGI se paie deux fois : le sticker, et le temps du
 * marchand. Toute validation qu'on peut faire ici, on la fait ici.
 */

export type InvoiceTemplate = 'B2B' | 'B2C' | 'B2G' | 'B2F';

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'check'
  | 'mobile-money'
  | 'transfer'
  | 'deferred';

/** Les devises que la DGI accepte en B2F. */
const DEVISES_B2F = new Set([
  'XOF',
  'USD',
  'EUR',
  'JPY',
  'CAD',
  'GBP',
  'AUD',
  'CNH',
  'CHF',
  'HKD',
  'NZD',
]);

export interface InvoiceDraft {
  invoiceType?: 'sale' | 'purchase' | undefined;
  template: InvoiceTemplate;
  paymentMethod: PaymentMethod;
  /** Le point de vente et l'etablissement viennent du profil du marchand. */
  pointOfSale: string;
  establishment: string;
  isRne?: boolean | undefined;
  rne?: string | undefined;
  client: {
    ncc?: string | undefined;
    companyName?: string | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    sellerName?: string | undefined;
  };
  lines: readonly InvoiceLine[];
  discountPercent?: number | undefined;
  commercialMessage?: string | undefined;
  footer?: string | undefined;
  foreignCurrency?: string | undefined;
  foreignCurrencyRate?: number | undefined;
}

export interface DgiSignPayload {
  invoiceType: 'sale' | 'purchase';
  paymentMethod: PaymentMethod;
  template: InvoiceTemplate;
  isRne: boolean;
  rne?: string | undefined;
  clientNcc?: string | undefined;
  clientCompanyName?: string | undefined;
  clientPhone?: string | undefined;
  clientEmail?: string | undefined;
  clientSellerName?: string | undefined;
  pointOfSale: string;
  establishment: string;
  commercialMessage?: string | undefined;
  footer?: string | undefined;
  foreignCurrency?: string | undefined;
  foreignCurrencyRate?: number | undefined;
  discount?: number | undefined;
  items: Array<{
    reference?: string | undefined;
    description: string;
    quantity: number;
    amount: number;
    taxes: string[];
    customTaxes?: Array<{ name: string; amount: number }> | undefined;
    discount?: number | undefined;
    measurementUnit?: string | undefined;
  }>;
}

export interface BuiltInvoice {
  payload: DgiSignPayload;
  totals: InvoiceTotals;
}

/**
 * Construit le corps de la requete de certification, apres validation.
 *
 * Ce qui est refuse ici ne partira jamais a la DGI — et ne consommera donc
 * jamais de sticker pour rien.
 */
export function buildDgiSignPayload(draft: InvoiceDraft): BuiltInvoice {
  if (!draft.pointOfSale?.trim()) {
    throw new InvoiceInputError('point de vente absent : la DGI rejette (Point of sale is not valid)');
  }
  if (!draft.establishment?.trim()) {
    throw new InvoiceInputError('etablissement absent');
  }

  // B2B sans NCC acheteur : rejet garanti cote DGI. On l'arrete ici.
  if (draft.template === 'B2B' && !draft.client.ncc?.trim()) {
    throw new InvoiceInputError('facture B2B sans NCC client : la DGI la refusera');
  }

  // B2F : la devise et son taux sont obligatoires, et la devise doit etre
  // dans la liste que la DGI accepte.
  if (draft.template === 'B2F') {
    const devise = draft.foreignCurrency?.trim().toUpperCase();
    if (!devise || !DEVISES_B2F.has(devise)) {
      throw new InvoiceInputError(
        `facture B2F : devise absente ou non reconnue (${draft.foreignCurrency ?? 'aucune'})`,
      );
    }
    if (!draft.foreignCurrencyRate || draft.foreignCurrencyRate <= 0) {
      throw new InvoiceInputError('facture B2F : taux de change absent ou invalide');
    }
  }

  if (draft.isRne && !draft.rne?.trim()) {
    throw new InvoiceInputError('facture liee a un recu (isRne) sans numero de recu');
  }

  const totals = computeTotals(draft.lines, { discountPercent: draft.discountPercent });

  const payload: DgiSignPayload = {
    invoiceType: draft.invoiceType ?? 'sale',
    paymentMethod: draft.paymentMethod,
    template: draft.template,
    isRne: draft.isRne ?? false,
    pointOfSale: draft.pointOfSale.trim(),
    establishment: draft.establishment.trim(),
    items: draft.lines.map((l) => ({
      reference: l.reference,
      description: l.description,
      quantity: l.quantity,
      // La DGI attend le prix unitaire HORS TAXE.
      amount: l.unitPriceMinor,
      taxes: [l.taxes],
      customTaxes: l.customTaxes?.map((t) => ({ name: t.name, amount: t.amountMinor })),
      discount: l.discountPercent,
      measurementUnit: l.measurementUnit,
    })),
  };

  if (draft.rne) payload.rne = draft.rne.trim();
  if (draft.client.ncc) payload.clientNcc = draft.client.ncc.trim();
  if (draft.client.companyName) payload.clientCompanyName = draft.client.companyName;
  if (draft.client.phone) payload.clientPhone = draft.client.phone;
  if (draft.client.email) payload.clientEmail = draft.client.email;
  if (draft.client.sellerName) payload.clientSellerName = draft.client.sellerName;
  if (draft.commercialMessage) payload.commercialMessage = draft.commercialMessage;
  if (draft.footer) payload.footer = draft.footer;
  if (draft.discountPercent) payload.discount = draft.discountPercent;
  if (draft.template === 'B2F') {
    payload.foreignCurrency = draft.foreignCurrency!.trim().toUpperCase();
    payload.foreignCurrencyRate = draft.foreignCurrencyRate;
  }

  return { payload, totals };
}

/**
 * La reponse de certification, telle que la DGI la rend.
 * `reference` est le numero officiel, `token` l'URL a transformer en QR code,
 * `balance_sticker` ce qu'il reste au marchand.
 */
export interface DgiSignResponse {
  ncc: string;
  reference: string;
  token: string;
  warning?: boolean | undefined;
  balance_sticker?: number | undefined;
  invoice?: unknown;
}

export interface ParsedCertification {
  reference: string;
  token: string;
  stickerBalance?: number | undefined;
  warning: boolean;
}

/**
 * Lit la reponse de certification.
 *
 * Une reponse a laquelle il manque la reference ou le token n'est PAS un
 * succes : sans elles la facture n'est pas opposable. On refuse, et l'appelant
 * met la facture en file de doute — un sticker a peut-etre ete consomme, cela
 * se verifie a la main dans l'espace FNE. Jamais de rejeu aveugle.
 */
export function parseCertification(body: unknown): ParsedCertification {
  const b = (body ?? {}) as Partial<DgiSignResponse>;
  if (typeof b.reference !== 'string' || !b.reference.trim()) {
    throw new InvoiceInputError('reponse DGI sans reference : certification non prouvee');
  }
  if (typeof b.token !== 'string' || !b.token.trim()) {
    throw new InvoiceInputError('reponse DGI sans token : pas de QR de verification');
  }
  return {
    reference: b.reference.trim(),
    token: b.token.trim(),
    stickerBalance: typeof b.balance_sticker === 'number' ? b.balance_sticker : undefined,
    warning: b.warning === true,
  };
}

/**
 * Le stock de stickers merite une alerte AVANT la rupture : un marchand qui
 * decouvre la panne au moment de facturer devant son client ne revient pas.
 */
export function stickerAlert(balance: number | undefined): 'ok' | 'low' | 'critical' | 'unknown' {
  if (balance === undefined) return 'unknown';
  if (balance <= 20) return 'critical';
  if (balance <= 100) return 'low';
  return 'ok';
}
