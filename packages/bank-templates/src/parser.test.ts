import { describe, expect, it } from 'vitest';
import {
  V1_BANK_PROFILES,
  classifyDirection,
  detectMaskedPhone,
  extractAmountMinor,
  extractCurrency,
  extractReferenceCode,
  extractRussianPhone,
  extractUsdAmountMinor,
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
    ['Vous avez recu 1 000 FCFA de M. Diallo', 'XOF'],
    ['Recu 2500 F CFA via Wave', 'XOF'],
    ['Transfert de 5000 XOF recu', 'XOF'],
    ['You received $10.99 from John', 'USD'],
    ['Incoming transfer 137.50 USD', 'USD'],
    ['Received US$ 25.00', 'USD']
  ])('extracts non-RUB currency from %s', (text, expected) => {
    expect(extractCurrency(text)).toBe(expected);
  });

  it.each([
    ['You received CA$ 10.00'],        // prefixed dollar — never USD
    ['A$25 received'],
    ['CFAO Motors payment received'],  // CFA must be word-bounded
    ['USDT deposit confirmed'],        // USD must be word-bounded
    ['Received 100 RUB then 50 USD']   // conflicting currencies — never guess
  ])('returns null for ambiguous or unbounded currency text %s', (text) => {
    expect(extractCurrency(text)).toBeNull();
  });

  it('keeps RUB extraction unchanged and RUB wins its own contexts', () => {
    expect(extractCurrency('Поступление 137.50 ₽')).toBe('RUB');
    expect(extractCurrency('перевод 500 руб.')).toBe('RUB');
  });

  it('extracts USD through the full parse pipeline despite text normalization lowercasing', () => {
    // normalizeRuText lowercases before extraction — the USD pattern must be case-insensitive.
    const parsed = parseBankNotification({
      bankProfileId: 'wise_int',
      text: 'You received US$ 25.00 from John Doe'
    });
    expect(parsed.currency).toBe('USD');

    const codeOnly = parseBankNotification({
      bankProfileId: 'wise_int',
      text: 'Incoming transfer 137.50 USD'
    });
    expect(codeOnly.currency).toBe('USD');
  });

  it.each([
    ['+7 999 123-45-67'],
    ['8 (999) 123-45-67'],
    ['89991234567'],
    ['999 123 45 67']
  ])('normalizes Russian phone %s', (phone) => {
    expect(normalizeRussianPhone(phone)).toBe('+79991234567');
    expect(extractRussianPhone(`from ${phone}`)).toBe('+79991234567');
  });

  it.each([
    ['Кэшбэк 12 ₽ за покупку', 'incoming_cashback'],
    ['Возврат 100 руб. по операции', 'incoming_refund'],
    ['Оплата покупки 137 RUB', 'outgoing_payment'],
    ['Перевод отправлен 137 ₽. Вы перевели деньги', 'outgoing_transfer'],
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

  it('extracts real-world SBP incoming variant as sender-focused matching context', () => {
    const parsed = parseBankNotification({
      bankProfileId: 'sberbank_ru',
      text: 'Пополнение через СБП на 1390,80 ₽.\nИван П. Сбербанк.\nБаланс 5000 ₽'
    });

    expect(parsed.directionLabel).toBe('incoming_customer_transfer');
    expect(parsed.rail).toBe('sbp');
    expect(parsed.amountMinor).toBe(139080);
    expect(parsed.senderNameHint).toBe('Иван П');
    expect(parsed.senderBankHint).toBe('Сбербанк');
    expect(parsed.balanceAfterMinor).toBe(500000);
    expect(parsed.reasonCodes).toEqual(expect.arrayContaining(['rail_sbp_detected', 'sender_focused_matching_hint']));
    expect(parsed.allowAutoConfirmCandidate).toBe(false);
  });

  it('extracts real-world card incoming variant without requiring sender hints', () => {
    const parsed = parseBankNotification({
      bankProfileId: 'tbank_ru',
      text: 'Зачисление перевод\n+1390,80 ₽ — Баланс: 5000 ₽\nСчёт карты MIR •• 4821'
    });

    expect(parsed.directionLabel).toBe('incoming_customer_transfer');
    expect(parsed.rail).toBe('card');
    expect(parsed.amountMinor).toBe(139080);
    expect(parsed.sourceLabel).toBe('перевод');
    expect(parsed.cardNetwork).toBe('MIR');
    expect(parsed.receiverCardLast4).toBe('4821');
    expect(parsed.senderNameHint).toBeUndefined();
    expect(parsed.senderBankHint).toBeUndefined();
    expect(parsed.reasonCodes).toEqual(
      expect.arrayContaining(['rail_card_detected', 'receiver_route_focused_matching_hint', 'receiver_card_last4_extracted'])
    );
    expect(parsed.allowAutoConfirmCandidate).toBe(false);
  });
});

describe('international neobank parsing (USD)', () => {
  it('extracts USD amount in common notification formats', () => {
    expect(extractUsdAmountMinor('You received $50.00 from John Doe')).toBe(5000);
    expect(extractUsdAmountMinor('1,234.56 USD received')).toBe(123456);
    expect(extractUsdAmountMinor('Received US$ 9.99')).toBe(999);
    expect(extractUsdAmountMinor('Payment of $1,000 from Acme')).toBe(100000);
    expect(extractUsdAmountMinor('CA$ 10.00 received')).toBeNull(); // prefixed dollar, not USD
    expect(extractUsdAmountMinor('no money here')).toBeNull();
  });

  it('parses a Wise money-received notification as incoming USD', () => {
    const parsed = parseBankNotification({ bankProfileId: 'wise_int', text: 'You received $50.00 from John Doe' });
    expect(parsed.directionLabel).toBe('incoming_customer_transfer');
    expect(parsed.currency).toBe('USD');
    expect(parsed.amountMinor).toBe(5000);
    expect(parsed.allowAutoConfirmCandidate).toBe(false); // neobanks never auto-confirm
    expect(parsed.signalQuality).toBeGreaterThan(0);
  });

  it('parses Revolut-style fragments as incoming USD', () => {
    const parsed = parseBankNotification({ bankProfileId: 'revolut_int', text: '$25.00 from Alice — Received on the 6th' });
    expect(parsed.directionLabel).toBe('incoming_customer_transfer');
    expect(parsed.amountMinor).toBe(2500);
    expect(parsed.currency).toBe('USD');
  });

  it('classifies outgoing and noise as non-incoming on INT profiles', () => {
    expect(parseBankNotification({ bankProfileId: 'wise_int', text: 'You sent $50.00 to Bob' }).directionLabel).not.toBe('incoming_customer_transfer');
    expect(parseBankNotification({ bankProfileId: 'wise_int', text: 'You paid $12.00 at Store' }).directionLabel).not.toBe('incoming_customer_transfer');
    expect(parseBankNotification({ bankProfileId: 'wise_int', text: 'Add money instantly to your account' }).directionLabel).toBe('unknown');
    expect(parseBankNotification({ bankProfileId: 'wise_int', text: 'Incoming call from +1...' }).directionLabel).toBe('unknown');
    expect(parseBankNotification({ bankProfileId: 'payoneer_int', text: 'Confirm your email address' }).directionLabel).toBe('unknown');
  });

  it('registers the three INT learning profiles (country INT, autoconfirm disabled)', () => {
    for (const id of ['wise_int', 'revolut_int', 'payoneer_int']) {
      const p = V1_BANK_PROFILES.find((x) => x.bankProfileId === id);
      expect(p).toBeDefined();
      expect(p!.country).toBe('INT');
      expect(p!.status).toBe('learning');
      expect(p!.autoConfirmStatus).toBe('disabled');
      expect(p!.supportedLocales).toEqual(['en']);
    }
  });
});
