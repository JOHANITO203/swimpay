import { describe, expect, it } from 'vitest';
import {
  classifyDirection,
  detectMaskedPhone,
  extractAmountMinor,
  extractCurrency,
  extractReferenceCode,
  hasNegativeKeywordGate,
  normalizeRuText,
  normalizeRussianPhone,
  parseBankNotification
} from './index.js';

describe('bank notification parser', () => {
  it('parses a Russian incoming customer transfer signal', () => {
    const parsed = parseBankNotification({
      bankProfileId: 'sber_ru',
      text: 'Поступление 137 ₽\nПеревод от Иван +7 999 123-45-67. Комментарий SWP-A8K2'
    });

    expect(parsed.normalizedText).toContain('поступление');
    expect(parsed.directionLabel).toBe('incoming_customer_transfer');
    expect(parsed.amountMinor).toBe(13700);
    expect(parsed.currency).toBe('RUB');
    expect(parsed.senderPhoneNormalized).toBe('+79991234567');
    expect(parsed.referenceCode).toBe('SWP-A8K2');
    expect(parsed.allowAutoConfirmCandidate).toBe(true);
    expect(parsed.signalQuality).toBeGreaterThanOrEqual(80);
  });

  it.each([
    ['Поступление 137 ₽', 13700],
    ['Зачисление 137 руб.', 13700],
    ['Incoming transfer 137.50 RUB', 13750]
  ])('extracts amount and currency from %s', (text, expectedAmountMinor) => {
    expect(extractAmountMinor(text)).toBe(expectedAmountMinor);
    expect(extractCurrency(text)).toBe('RUB');
  });

  it.each([
    ['+7 999 123-45-67'],
    ['8 (999) 123-45-67'],
    ['89991234567'],
    ['999 123 45 67']
  ])('normalizes Russian phone %s', (phone) => {
    expect(normalizeRussianPhone(phone)).toBe('+79991234567');
  });

  it.each([
    ['Кэшбэк 12 ₽ за покупку', 'incoming_cashback'],
    ['Возврат 100 руб. по операции', 'incoming_refund'],
    ['Оплата покупки 137 RUB', 'outgoing_payment'],
    ['Акция: получите бонус за перевод', 'promo'],
    ['Перевод отклонено 137 ₽', 'failed_transfer']
  ])('does not classify %s as customer transfer', (text, expectedDirection) => {
    const direction = classifyDirection(text);

    expect(direction).toBe(expectedDirection);
    expect(direction).not.toBe('incoming_customer_transfer');
  });

  it('extracts SwimPay reference codes case-insensitively', () => {
    expect(extractReferenceCode('Комментарий swp-a8k2')).toBe('SWP-A8K2');
  });

  it('normalizes Russian text for deterministic keyword matching', () => {
    expect(normalizeRuText('  Перевод   ОТ\tИван\n137 ₽  ')).toBe('перевод от иван 137 ₽');
  });

  it('treats masked phone as a weak review hint only', () => {
    const parsed = parseBankNotification({
      bankProfileId: 'sberbank_ru',
      text: 'Поступление 137 ₽. Перевод от +7 *** *** **67. Комментарий SWP-A8K2'
    });

    expect(detectMaskedPhone(parsed.normalizedText)).toBe(true);
    expect(parsed.maskedPhoneDetected).toBe(true);
    expect(parsed.senderPhoneNormalized).toBeUndefined();
    expect(parsed.reasonCodes).toContain('phone_masked');
    expect(parsed.allowAutoConfirmCandidate).toBe(false);
  });

  it('applies negative gates before incoming transfer classification', () => {
    const text = 'Возврат 137 ₽. Перевод от +7 999 123-45-67. Комментарий SWP-A8K2';
    const parsed = parseBankNotification({
      bankProfileId: 'sberbank_ru',
      text
    });

    expect(hasNegativeKeywordGate(text)).toBe(true);
    expect(parsed.directionLabel).toBe('incoming_refund');
    expect(parsed.directionLabel).not.toBe('incoming_customer_transfer');
    expect(parsed.allowAutoConfirmCandidate).toBe(false);
  });
});
