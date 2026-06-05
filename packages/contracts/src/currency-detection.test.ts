// packages/contracts/src/currency-detection.test.ts
import { describe, expect, it } from 'vitest';
import { detectCurrencyFromDisplayPrice } from './currency-detection.js';

describe('detectCurrencyFromDisplayPrice', () => {
  it('detects native RUB from symbol and codes', () => {
    expect(detectCurrencyFromDisplayPrice('999 ₽')).toEqual({
      kind: 'detected', currency: 'RUB', amount_minor: 99900, needs_conversion: false, raw_input: '999 ₽'
    });
    expect(detectCurrencyFromDisplayPrice('1 000,50 руб.')).toMatchObject({ currency: 'RUB', amount_minor: 100050 });
    expect(detectCurrencyFromDisplayPrice('1500 RUB')).toMatchObject({ currency: 'RUB', amount_minor: 150000 });
  });

  it('detects native USD ($ alone is USD by documented policy)', () => {
    expect(detectCurrencyFromDisplayPrice('$10.99')).toMatchObject({ currency: 'USD', amount_minor: 1099, needs_conversion: false });
    expect(detectCurrencyFromDisplayPrice('1,000.50 USD')).toMatchObject({ currency: 'USD', amount_minor: 100050 });
    expect(detectCurrencyFromDisplayPrice('US$ 5')).toMatchObject({ currency: 'USD', amount_minor: 500 });
  });

  it('detects native XOF with zero decimals', () => {
    expect(detectCurrencyFromDisplayPrice('1 000 FCFA')).toMatchObject({ currency: 'XOF', amount_minor: 1000, needs_conversion: false });
    expect(detectCurrencyFromDisplayPrice('2500 CFA')).toMatchObject({ currency: 'XOF', amount_minor: 2500 });
    expect(detectCurrencyFromDisplayPrice('10.000 XOF')).toMatchObject({ currency: 'XOF', amount_minor: 10000 });
  });

  it('flags convertible currencies (EUR, GBP, XAF, JPY) for conversion', () => {
    expect(detectCurrencyFromDisplayPrice('€9.99')).toEqual({
      kind: 'detected', currency: 'EUR', amount_minor: 999, needs_conversion: true, raw_input: '€9.99'
    });
    expect(detectCurrencyFromDisplayPrice('£20')).toMatchObject({ currency: 'GBP', amount_minor: 2000, needs_conversion: true });
    expect(detectCurrencyFromDisplayPrice('1000 XAF')).toMatchObject({ currency: 'XAF', amount_minor: 1000, needs_conversion: true });
    expect(detectCurrencyFromDisplayPrice('500 JPY')).toMatchObject({ currency: 'JPY', amount_minor: 500, needs_conversion: true });
  });

  it('handles locale separators decidably', () => {
    expect(detectCurrencyFromDisplayPrice('1.000,50 EUR')).toEqual({ kind: 'detected', currency: 'EUR', amount_minor: 100050, needs_conversion: true, raw_input: '1.000,50 EUR' }); // EU style
    expect(detectCurrencyFromDisplayPrice('1,000.50 $')).toMatchObject({ amount_minor: 100050 }); // US style
    expect(detectCurrencyFromDisplayPrice('1,000 $')).toMatchObject({ amount_minor: 100000 }); // 3 digits after lone separator = grouping
    expect(detectCurrencyFromDisplayPrice('1.5 $')).toMatchObject({ amount_minor: 150 }); // 1 digit = decimal
  });

  it('rejects a malformed decimal that collides with grouping notation', () => {
    expect(detectCurrencyFromDisplayPrice('$10.999')).toEqual({ kind: 'invalid_amount', raw_input: '$10.999' });
    expect(detectCurrencyFromDisplayPrice('10.999 EUR')).toMatchObject({ currency: 'EUR', amount_minor: 1099900 }); // EU dot-grouping stays legitimate
    expect(detectCurrencyFromDisplayPrice('10,999 RUB')).toEqual({ kind: 'invalid_amount', raw_input: '10,999 RUB' }); // comma is RUB's decimal separator
  });

  it('treats conflicting currency signals as ambiguous', () => {
    expect(detectCurrencyFromDisplayPrice('USD 5 EUR')).toEqual({ kind: 'ambiguous', raw_input: 'USD 5 EUR' });
    expect(detectCurrencyFromDisplayPrice('€5 $')).toEqual({ kind: 'ambiguous', raw_input: '€5 $' });
  });

  it('rejects ambiguous or invalid input — never guesses', () => {
    expect(detectCurrencyFromDisplayPrice('1000')).toEqual({ kind: 'ambiguous', raw_input: '1000' });
    expect(detectCurrencyFromDisplayPrice('CA$ 10')).toEqual({ kind: 'ambiguous', raw_input: 'CA$ 10' });
    expect(detectCurrencyFromDisplayPrice('A$10')).toEqual({ kind: 'ambiguous', raw_input: 'A$10' });
    expect(detectCurrencyFromDisplayPrice('10 BTC')).toEqual({ kind: 'ambiguous', raw_input: '10 BTC' });
    expect(detectCurrencyFromDisplayPrice('')).toEqual({ kind: 'ambiguous', raw_input: '' });
    expect(detectCurrencyFromDisplayPrice('0 $')).toEqual({ kind: 'invalid_amount', raw_input: '0 $' });
    expect(detectCurrencyFromDisplayPrice('-5 $')).toEqual({ kind: 'invalid_amount', raw_input: '-5 $' });
    expect(detectCurrencyFromDisplayPrice('10.5 FCFA')).toEqual({ kind: 'invalid_amount', raw_input: '10.5 FCFA' }); // XOF has no decimals
  });
});
