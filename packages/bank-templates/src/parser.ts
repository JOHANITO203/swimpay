import type { BankProfile, DirectionLabel } from './types.js';
import { BankTemplateReasonCodes } from './reason-codes.js';

export interface ParseBankNotificationInput {
  bankProfileId: string;
  text: string;
}

export interface ParsedBankNotification {
  bankProfileId: string;
  directionLabel: DirectionLabel;
  amountMinor?: number | undefined;
  currency?: 'RUB' | undefined;
  senderPhoneNormalized?: string | undefined;
  referenceCode?: string | undefined;
  signalQuality: number;
  reasonCodes: string[];
}

export const V1_BANK_PROFILES: BankProfile[] = [
  createLearningProfile('sber_ru', 'Sberbank'),
  createLearningProfile('tbank_ru', 'Tinkoff / T-Bank'),
  createLearningProfile('vtb_ru', 'VTB Bank'),
  createLearningProfile('alfa_ru', 'Alfa-Bank'),
  createLearningProfile('gazprombank_ru', 'Gazprombank')
];

const NEGATIVE_KEYWORDS = {
  cashback: ['кэшбэк', 'кешбэк', 'cashback'],
  refund: ['возврат', 'refund'],
  outgoing: ['списание', 'покупка', 'оплата', 'purchase', 'payment'],
  promo: ['акция', 'предложение', 'скидка', 'promo', 'bonus'],
  failed: ['отклонено', 'не выполнено', 'declined', 'failed']
} as const;

const INCOMING_KEYWORDS = [
  'поступление',
  'зачисление',
  'перевод получен',
  'получен перевод',
  'вам перевели',
  'пополнение',
  'перевод от',
  'incoming transfer',
  'transfer from'
];

export function parseBankNotification(input: ParseBankNotificationInput): ParsedBankNotification {
  const directionLabel = classifyDirection(input.text);
  const amountMinor = extractAmountMinor(input.text) ?? undefined;
  const currency = extractCurrency(input.text) ?? undefined;
  const senderPhoneNormalized = extractRussianPhone(input.text) ?? undefined;
  const referenceCode = extractReferenceCode(input.text) ?? undefined;
  const reasonCodes = buildReasonCodes({
    directionLabel,
    amountMinor,
    senderPhoneNormalized,
    referenceCode
  });

  return {
    bankProfileId: input.bankProfileId,
    directionLabel,
    amountMinor,
    currency,
    senderPhoneNormalized,
    referenceCode,
    signalQuality: scoreParsedSignal({
      directionLabel,
      amountMinor,
      currency,
      senderPhoneNormalized,
      referenceCode
    }),
    reasonCodes
  };
}

export function extractAmountMinor(text: string): number | null {
  const match = text.match(/(\d[\d\s]*(?:[,.]\d{1,2})?)\s*(?:₽|руб\.?|RUB)(?=$|[\s.,;:])/iu);
  if (!match?.[1]) {
    return null;
  }

  const normalized = match[1].replace(/\s/g, '').replace(',', '.');
  const [major = '0', minor = ''] = normalized.split('.');
  const majorMinor = Number.parseInt(major, 10) * 100;
  const fractionalMinor = minor ? Number.parseInt(minor.padEnd(2, '0').slice(0, 2), 10) : 0;

  if (Number.isNaN(majorMinor) || Number.isNaN(fractionalMinor)) {
    return null;
  }

  return majorMinor + fractionalMinor;
}

export function extractCurrency(text: string): 'RUB' | null {
  return /(?:₽|руб\.?|RUB)(?=$|[\s.,;:])/iu.test(text) ? 'RUB' : null;
}

export function normalizeRussianPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');

  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  return null;
}

export function extractRussianPhone(text: string): string | null {
  const match = text.match(/(?:\+7|8)?[\s(.-]*\d{3}[\s).-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/u);
  return match?.[0] ? normalizeRussianPhone(match[0]) : null;
}

export function extractReferenceCode(text: string): string | null {
  const match = text.match(/\bSWP-[A-Z0-9]{3,12}\b/iu);
  return match?.[0] ? match[0].toUpperCase() : null;
}

export function classifyDirection(text: string): DirectionLabel {
  const normalized = text.toLowerCase();

  if (containsAny(normalized, NEGATIVE_KEYWORDS.failed)) {
    return 'failed_transfer';
  }

  if (containsAny(normalized, NEGATIVE_KEYWORDS.cashback)) {
    return 'incoming_cashback';
  }

  if (containsAny(normalized, NEGATIVE_KEYWORDS.refund)) {
    return 'incoming_refund';
  }

  if (containsAny(normalized, NEGATIVE_KEYWORDS.promo)) {
    return 'promo';
  }

  if (containsAny(normalized, NEGATIVE_KEYWORDS.outgoing)) {
    return 'outgoing_payment';
  }

  if (containsAny(normalized, INCOMING_KEYWORDS)) {
    return 'incoming_customer_transfer';
  }

  return 'unknown';
}

export function hasNegativeKeywordGate(text: string): boolean {
  const normalized = text.toLowerCase();
  return Object.values(NEGATIVE_KEYWORDS).some((keywords) => containsAny(normalized, keywords));
}

export function scoreParsedSignal(input: {
  directionLabel: DirectionLabel;
  amountMinor?: number | null | undefined;
  currency?: 'RUB' | null | undefined;
  senderPhoneNormalized?: string | null | undefined;
  referenceCode?: string | null | undefined;
}): number {
  let score = 0;

  if (input.amountMinor) {
    score += 25;
  }

  if (input.currency === 'RUB') {
    score += 15;
  }

  if (input.directionLabel === 'incoming_customer_transfer') {
    score += 25;
  } else if (input.directionLabel !== 'unknown') {
    score -= 30;
  }

  if (input.senderPhoneNormalized) {
    score += 20;
  }

  if (input.referenceCode) {
    score += 20;
  }

  return Math.max(0, Math.min(100, score));
}

function buildReasonCodes(input: {
  directionLabel: DirectionLabel;
  amountMinor?: number | null | undefined;
  senderPhoneNormalized?: string | null | undefined;
  referenceCode?: string | null | undefined;
}): string[] {
  const codes: string[] = [];

  if (input.directionLabel === 'incoming_customer_transfer') {
    codes.push(BankTemplateReasonCodes.INCOMING_KEYWORD_DETECTED);
  } else if (input.directionLabel === 'outgoing_payment' || input.directionLabel === 'outgoing_transfer') {
    codes.push(BankTemplateReasonCodes.OUTGOING_KEYWORD_DETECTED);
  } else if (input.directionLabel === 'incoming_cashback') {
    codes.push(BankTemplateReasonCodes.CASHBACK_KEYWORD_DETECTED);
  } else if (input.directionLabel === 'incoming_refund') {
    codes.push(BankTemplateReasonCodes.REFUND_KEYWORD_DETECTED);
  } else if (input.directionLabel === 'failed_transfer') {
    codes.push(BankTemplateReasonCodes.FAILED_KEYWORD_DETECTED);
  } else if (input.directionLabel === 'promo') {
    codes.push(BankTemplateReasonCodes.PROMO_KEYWORD_DETECTED);
  } else {
    codes.push(BankTemplateReasonCodes.AMBIGUOUS_DIRECTION);
  }

  codes.push(input.amountMinor ? BankTemplateReasonCodes.AMOUNT_EXTRACTED : BankTemplateReasonCodes.AMOUNT_MISSING);
  codes.push(input.senderPhoneNormalized ? BankTemplateReasonCodes.PHONE_EXTRACTED : BankTemplateReasonCodes.PHONE_MISSING);
  codes.push(input.referenceCode ? BankTemplateReasonCodes.REFERENCE_EXTRACTED : BankTemplateReasonCodes.REFERENCE_MISSING);

  return codes;
}

function containsAny(value: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword));
}

function createLearningProfile(bankProfileId: string, displayName: string): BankProfile {
  return {
    bankProfileId,
    displayName,
    country: 'RU',
    status: 'learning',
    autoConfirmStatus: 'disabled',
    trustedApps: [],
    supportedLocales: ['ru-RU'],
    fieldPriority: ['EXTRA_TITLE', 'EXTRA_TEXT', 'EXTRA_BIG_TEXT', 'EXTRA_TEXT_LINES', 'EXTRA_SUB_TEXT', 'tickerText']
  };
}
