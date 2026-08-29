import { describe, expect, it } from 'vitest';
import {
  computeTotals,
  formatLocalNumber,
  InvoiceInputError,
  type InvoiceLine,
} from './totals.js';
import {
  buildDgiSignPayload,
  parseCertification,
  stickerAlert,
  type InvoiceDraft,
} from './dgi-payload.js';

const ligne = (over: Partial<InvoiceLine> = {}): InvoiceLine => ({
  description: 'Baguette',
  unitPriceMinor: 500,
  quantity: 2,
  taxes: 'TVA',
  ...over,
});

const brouillon = (over: Partial<InvoiceDraft> = {}): InvoiceDraft => ({
  template: 'B2C',
  paymentMethod: 'cash',
  pointOfSale: 'Boutique Marcory',
  establishment: 'Siege',
  client: { companyName: 'Client comptant' },
  lines: [ligne()],
  ...over,
});

describe('Les totaux — l argent se compte en entiers', () => {
  it('calcule HT, TVA et TTC au taux normal', () => {
    const t = computeTotals([ligne()]);
    expect(t.totalHtMinor).toBe(1_000);
    expect(t.totalTvaMinor).toBe(180);
    expect(t.totalTtcMinor).toBe(1_180);
  });

  it('applique le taux reduit et les exonerations', () => {
    expect(computeTotals([ligne({ taxes: 'TVAB' })]).totalTvaMinor).toBe(90);
    expect(computeTotals([ligne({ taxes: 'TVAC' })]).totalTvaMinor).toBe(0);
    expect(computeTotals([ligne({ taxes: 'TVAD' })]).totalTvaMinor).toBe(0);
  });

  it('arrondit la TVA ligne par ligne, pas sur le total', () => {
    // 333 x 1 a 18 % = 59,94 -> 60 par ligne. Trois lignes : 180.
    // Sur le total on aurait 999 x 18 % = 179,82 -> 180 aussi, mais la
    // difference se voit des que les taux different ; ce test fige la regle.
    const t = computeTotals([
      ligne({ unitPriceMinor: 333, quantity: 1 }),
      ligne({ unitPriceMinor: 333, quantity: 1 }),
      ligne({ unitPriceMinor: 333, quantity: 1 }),
    ]);
    expect(t.lines.map((l) => l.tvaMinor)).toEqual([60, 60, 60]);
    expect(t.totalTvaMinor).toBe(180);
  });

  it('applique la remise de ligne puis la remise globale, jamais leur somme', () => {
    // 1000 HT, -10 % ligne = 900, -10 % global = 810. Pas 800.
    const t = computeTotals([ligne({ discountPercent: 10 })], { discountPercent: 10 });
    expect(t.totalHtMinor).toBe(810);
  });

  it('ajoute les taxes specifiques au TTC sans les passer par la TVA', () => {
    const t = computeTotals([ligne({ customTaxes: [{ name: 'AIRSI', amountMinor: 50 }] })]);
    expect(t.totalTvaMinor).toBe(180);
    expect(t.totalCustomMinor).toBe(50);
    expect(t.totalTtcMinor).toBe(1_230);
  });

  it('refuse une facture vide, une quantite nulle ou un prix negatif', () => {
    expect(() => computeTotals([])).toThrow(InvoiceInputError);
    expect(() => computeTotals([ligne({ quantity: 0 })])).toThrow(InvoiceInputError);
    expect(() => computeTotals([ligne({ unitPriceMinor: -1 })])).toThrow(InvoiceInputError);
    expect(() => computeTotals([ligne({ discountPercent: 120 })])).toThrow(InvoiceInputError);
  });
});

describe('La numerotation locale', () => {
  it('produit une serie lisible ou un trou se voit', () => {
    expect(formatLocalNumber(2026, 1)).toBe('2026-000001');
    expect(formatLocalNumber(2026, 999_999)).toBe('2026-999999');
  });

  it('refuse une sequence hors bornes', () => {
    expect(() => formatLocalNumber(2026, 0)).toThrow(InvoiceInputError);
    expect(() => formatLocalNumber(2026, 1_000_000)).toThrow(InvoiceInputError);
  });
});

describe('Le corps DGI — ce qui ne partira pas pour rien', () => {
  it('construit un corps conforme pour une vente comptant', () => {
    const { payload, totals } = buildDgiSignPayload(brouillon());
    expect(payload.invoiceType).toBe('sale');
    expect(payload.paymentMethod).toBe('cash');
    expect(payload.items[0]).toMatchObject({ amount: 500, quantity: 2, taxes: ['TVA'] });
    expect(totals.totalTtcMinor).toBe(1_180);
  });

  it('accepte le virement et le mobile money, comme le modele DGI', () => {
    expect(buildDgiSignPayload(brouillon({ paymentMethod: 'transfer' })).payload.paymentMethod)
      .toBe('transfer');
    expect(buildDgiSignPayload(brouillon({ paymentMethod: 'mobile-money' })).payload.paymentMethod)
      .toBe('mobile-money');
  });

  it('refuse une B2B sans NCC client, que la DGI rejetterait', () => {
    expect(() =>
      buildDgiSignPayload(brouillon({ template: 'B2B', client: { companyName: 'SARL X' } })),
    ).toThrow(InvoiceInputError);
  });

  it('accepte une B2B avec NCC', () => {
    const { payload } = buildDgiSignPayload(
      brouillon({ template: 'B2B', client: { ncc: '9606123E', companyName: 'SARL X' } }),
    );
    expect(payload.clientNcc).toBe('9606123E');
  });

  it('exige devise et taux en B2F, et refuse une devise inconnue', () => {
    expect(() => buildDgiSignPayload(brouillon({ template: 'B2F' }))).toThrow(InvoiceInputError);
    expect(() =>
      buildDgiSignPayload(brouillon({ template: 'B2F', foreignCurrency: 'XXX', foreignCurrencyRate: 1 })),
    ).toThrow(InvoiceInputError);
    const ok = buildDgiSignPayload(
      brouillon({ template: 'B2F', foreignCurrency: 'eur', foreignCurrencyRate: 655.957 }),
    );
    expect(ok.payload.foreignCurrency).toBe('EUR');
  });

  it('refuse un point de vente absent, l erreur que la DGI renvoie en 400', () => {
    expect(() => buildDgiSignPayload(brouillon({ pointOfSale: '  ' }))).toThrow(InvoiceInputError);
  });

  it('refuse un lien vers un recu sans numero de recu', () => {
    expect(() => buildDgiSignPayload(brouillon({ isRne: true }))).toThrow(InvoiceInputError);
  });
});

describe('La reponse de certification', () => {
  it('lit la reference, le token et le stock de stickers', () => {
    const c = parseCertification({
      ncc: '9606123E',
      reference: '9606123E25000000019',
      token: 'http://fne/verification/019465c1',
      balance_sticker: 179,
      warning: false,
    });
    expect(c.reference).toBe('9606123E25000000019');
    expect(c.stickerBalance).toBe(179);
    expect(c.warning).toBe(false);
  });

  it('refuse une reponse sans reference ou sans token : rien n est prouve', () => {
    expect(() => parseCertification({ token: 'http://x' })).toThrow(InvoiceInputError);
    expect(() => parseCertification({ reference: 'X' })).toThrow(InvoiceInputError);
    expect(() => parseCertification(null)).toThrow(InvoiceInputError);
  });

  it('alerte sur le stock de stickers avant la rupture', () => {
    expect(stickerAlert(500)).toBe('ok');
    expect(stickerAlert(80)).toBe('low');
    expect(stickerAlert(12)).toBe('critical');
    expect(stickerAlert(undefined)).toBe('unknown');
  });
});
