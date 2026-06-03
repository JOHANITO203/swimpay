import { describe, expect, it } from 'vitest';
import { currencyMinorDigits, formatAmountMinor } from './orders.js';

describe('currency-aware amount formatting', () => {
  it('defaults to 2 decimals (RUB / V1 behavior preserved)', () => {
    expect(currencyMinorDigits(undefined)).toBe(2);
    expect(currencyMinorDigits('RUB')).toBe(2);
    expect(formatAmountMinor(13700)).toBe('137.00');
    expect(formatAmountMinor(13735, 'RUB')).toBe('137.35');
  });

  it('formats franc CFA (XOF/XAF) with no decimals', () => {
    expect(currencyMinorDigits('XOF')).toBe(0);
    expect(currencyMinorDigits('xof')).toBe(0);
    expect(currencyMinorDigits('XAF')).toBe(0);
    // For XOF the minor amount IS the integer franc amount.
    expect(formatAmountMinor(1000, 'XOF')).toBe('1000');
    expect(formatAmountMinor(1037, 'XOF')).toBe('1037');
  });

  it('falls back to 2 decimals for unknown currencies', () => {
    expect(currencyMinorDigits('ZZZ')).toBe(2);
  });
});
