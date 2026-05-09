import type { BankProfile, DirectionLabel } from './types.js';
import { BankTemplateReasonCodes } from './reason-codes.js';

export interface ParseBankNotificationInput {
  bankProfileId: string;
  text: string;
}

export interface ParsedBankNotification {
  bankProfileId: string;
  normalizedText: string;
  directionLabel: DirectionLabel;
  rail?: 'sbp' | 'card' | undefined;
  amountMinor?: number | undefined;
  currency?: 'RUB' | undefined;
  senderNameHint?: string | undefined;
  senderBankHint?: string | undefined;
  sourceLabel?: string | undefined;
  cardNetwork?: string | undefined;
  receiverCardLast4?: string | undefined;
  balanceAfterMinor?: number | undefined;
  senderPhoneNormalized?: string | undefined;
  maskedPhoneDetected: boolean;
  referenceCode?: string | undefined;
  signalQuality: number;
  allowAutoConfirmCandidate: boolean;
  reasonCodes: string[];
}

export const V1_BANK_PROFILES: BankProfile[] = [
  createLearningProfile('sber_ru', 'Sberbank'),
  createLearningProfile('tbank_ru', 'Tinkoff / T-Bank'),
  createLearningProfile('vtb_ru', 'VTB Bank'),
  createLearningProfile('alfa_ru', 'Alfa-Bank'),
  createLearningProfile('gazprombank_ru', 'Gazprombank'),
  createLearningProfile('ozon_bank', 'Ozon Банк')
];

const NEGATIVE_KEYWORDS = {
  cashback: ['кэшбэк', 'кешбэк', 'cashback'],
  refund: ['возврат', 'refund'],
  outgoingTransfer: ['перевод отправлен', 'вы перевели', 'transfer sent'],
  outgoing: ['списание', 'покупка', 'оплата', 'purchase', 'payment'],
  promo: ['акция', 'предложение', 'скидка', 'promo', 'bonus'],
  failed: ['отклонено', 'отклонена', 'не выполнено', 'не выполнен', 'declined', 'failed'],
  balance: ['баланс', 'balance']
} as const;

const INCOMING_KEYWORDS = [
  '???????????',
  '??????????',
  '??????? ???????',
  '??????? ???????',
  '??????????',
  '??????? ??',
  'поступление',
  'зачисление',
  'перевод получен',
  'получен перевод',
  'вам перевели',
  'пополнение',
  'перевод от',
  'incoming transfer',
  'transfer from'
] as const;

export function parseBankNotification(input: ParseBankNotificationInput): ParsedBankNotification {
  const normalizedText = normalizeRuText(input.text);
  const sbpVariant = extractSbpIncomingVariant(input.text);
  const cardVariant = extractCardIncomingVariant(input.text);
  const directionLabel = classifyDirection(normalizedText);
  const amountMinor = sbpVariant?.amountMinor ?? cardVariant?.amountMinor ?? extractAmountMinor(normalizedText) ?? undefined;
  const currency = extractCurrency(normalizedText) ?? undefined;
  const senderPhoneNormalized = extractRussianPhone(normalizedText) ?? undefined;
  const maskedPhoneDetected = !senderPhoneNormalized && detectMaskedPhone(normalizedText);
  const referenceCode = extractReferenceCode(normalizedText) ?? undefined;
  const allowAutoConfirmCandidate =
    directionLabel === 'incoming_customer_transfer' &&
    amountMinor !== undefined &&
    currency === 'RUB' &&
    Boolean(senderPhoneNormalized || referenceCode) &&
    !maskedPhoneDetected;
  const reasonCodes = buildReasonCodes({
    directionLabel,
    amountMinor,
    senderPhoneNormalized,
    maskedPhoneDetected,
    referenceCode,
    normalizedText,
    rail: sbpVariant ? 'sbp' : cardVariant ? 'card' : undefined,
    receiverCardLast4: cardVariant?.receiverCardLast4
  });

  return {
    bankProfileId: input.bankProfileId,
    normalizedText,
    directionLabel,
    rail: sbpVariant ? 'sbp' : cardVariant ? 'card' : undefined,
    amountMinor,
    currency,
    senderNameHint: sbpVariant?.senderNameHint,
    senderBankHint: sbpVariant?.senderBankHint,
    sourceLabel: cardVariant?.sourceLabel,
    cardNetwork: cardVariant?.cardNetwork,
    receiverCardLast4: cardVariant?.receiverCardLast4,
    balanceAfterMinor: sbpVariant?.balanceAfterMinor ?? cardVariant?.balanceAfterMinor,
    senderPhoneNormalized,
    maskedPhoneDetected,
    referenceCode,
    signalQuality: scoreParsedSignal({
      directionLabel,
      amountMinor,
      currency,
      senderPhoneNormalized,
      maskedPhoneDetected,
      referenceCode
    }),
    allowAutoConfirmCandidate,
    reasonCodes
  };
}

export function normalizeRuText(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('ru-RU');
}

export function extractAmountMinor(text: string): number | null {
  const match = text.match(/(\d[\d\s]*(?:[,.]\d{1,2})?)\s*(?:₽|руб\.?|â‚½|Ñ€ÑƒÐ±\.?|RUB)(?=$|[\s.,;:])/iu);
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
  return /(?:₽|руб\.?|â‚½|Ñ€ÑƒÐ±\.?|RUB)(?=$|[\s.,;:])/iu.test(text) ? 'RUB' : null;
}

interface SbpIncomingVariant {
  amountMinor: number;
  senderNameHint?: string | undefined;
  senderBankHint?: string | undefined;
  balanceAfterMinor?: number | undefined;
}

interface CardIncomingVariant {
  amountMinor: number;
  sourceLabel?: string | undefined;
  cardNetwork?: string | undefined;
  receiverCardLast4?: string | undefined;
  balanceAfterMinor?: number | undefined;
}

export function extractSbpIncomingVariant(text: string): SbpIncomingVariant | null {
  const lines = text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const header = lines.find((line) => /пополнение\s+через\s+сбп\s+на/iu.test(line));
  if (!header) {
    return null;
  }
  const amountMinor = extractAmountMinor(header);
  if (!amountMinor) {
    return null;
  }
  const detailsLine = lines.find((line) => line !== header && !/^баланс(?:\s|:|$)/iu.test(line));
  const details = detailsLine?.replace(/\s+/gu, ' ').trim();
  const detailParts = details?.split(/\.\s*/u).map((part) => part.trim()).filter(Boolean) ?? [];
  const balanceLine = lines.find((line) => /^баланс(?:\s|:|$)/iu.test(line));

  return {
    amountMinor,
    senderNameHint: detailParts[0],
    senderBankHint: detailParts[1],
    balanceAfterMinor: balanceLine ? extractAmountMinor(balanceLine) ?? undefined : undefined
  };
}

export function extractCardIncomingVariant(text: string): CardIncomingVariant | null {
  const lines = text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const header = lines.find((line) => /^зачисление(?:\s|:|$)/iu.test(line));
  const amountLine = lines.find((line) => /^\+?\d/iu.test(line) && extractAmountMinor(line) !== null);
  const routeLine = lines.find((line) => /сч[её]т\s+карты/iu.test(line));
  if (!header || !amountLine || !routeLine) {
    return null;
  }
  const amountMinor = extractAmountMinor(amountLine);
  const routeMatch = routeLine.match(/сч[её]т\s+карты\s+([\p{L}\d-]+)\s*[•*x]{2,}\s*(\d{4})/iu);
  if (!amountMinor || !routeMatch?.[2]) {
    return null;
  }

  return {
    amountMinor,
    sourceLabel: header.replace(/^зачисление(?:\s|:)?\s*/iu, '').trim() || undefined,
    cardNetwork: routeMatch[1],
    receiverCardLast4: routeMatch[2],
    balanceAfterMinor: extractBalanceAfterMinor(amountLine) ?? undefined
  };
}

function extractBalanceAfterMinor(text: string): number | null {
  const match = text.match(/баланс\s*:?\s*(\d[\d\s]*(?:[,.]\d{1,2})?)\s*(?:₽|руб\.?|RUB)/iu);
  return match?.[1] ? extractAmountMinor(`${match[1]} ₽`) : null;
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
  const match = text.match(/(?<!\d)(?:\+7|8)?[\s(.-]*\d{3}[\s).-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}(?!\d)/u);
  return match?.[0] ? normalizeRussianPhone(match[0]) : null;
}

export function detectMaskedPhone(text: string): boolean {
  return /(?:\+7|8)?[\s(.-]*(?:\*{2,3}|\d{3})[\s).-]*(?:\*{2,3}|\d{3})[\s.-]*(?:\*{2}|\d{2})[\s.-]*\d{2}/u.test(text);
}

export function extractReferenceCode(text: string): string | null {
  const match = text.match(/\bSWP-[A-Z0-9]{3,12}\b/iu);
  return match?.[0] ? match[0].toUpperCase() : null;
}

export function classifyDirection(text: string): DirectionLabel {
  const normalized = normalizeRuText(text);

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

  if (containsAny(normalized, NEGATIVE_KEYWORDS.outgoingTransfer)) {
    return 'outgoing_transfer';
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
  const normalized = normalizeRuText(text);
  return Object.values(NEGATIVE_KEYWORDS).some((keywords) => containsAny(normalized, keywords));
}

export function scoreParsedSignal(input: {
  directionLabel: DirectionLabel;
  amountMinor?: number | null | undefined;
  currency?: 'RUB' | null | undefined;
  senderPhoneNormalized?: string | null | undefined;
  maskedPhoneDetected?: boolean | null | undefined;
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
  } else if (input.maskedPhoneDetected) {
    score += 5;
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
  maskedPhoneDetected?: boolean | null | undefined;
  referenceCode?: string | null | undefined;
  normalizedText: string;
  rail?: 'sbp' | 'card' | undefined;
  receiverCardLast4?: string | undefined;
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

  if (input.directionLabel !== 'incoming_customer_transfer' && input.directionLabel !== 'unknown') {
    codes.push(BankTemplateReasonCodes.NOT_CUSTOMER_TRANSFER);
  }

  codes.push(input.amountMinor ? BankTemplateReasonCodes.AMOUNT_EXTRACTED : BankTemplateReasonCodes.AMOUNT_MISSING);

  if (input.rail === 'sbp') {
    codes.push('rail_sbp_detected', 'sender_focused_matching_hint');
  } else if (input.rail === 'card') {
    codes.push('rail_card_detected', 'receiver_route_focused_matching_hint');
  }

  if (input.receiverCardLast4) {
    codes.push('receiver_card_last4_extracted');
  }

  if (
    input.directionLabel === 'incoming_customer_transfer' &&
    input.amountMinor &&
    !input.senderPhoneNormalized &&
    !input.referenceCode
  ) {
    codes.push(BankTemplateReasonCodes.AMOUNT_ONLY_NEVER_AUTO_CONFIRM);
  }

  if (containsAny(input.normalizedText, NEGATIVE_KEYWORDS.balance)) {
    codes.push(BankTemplateReasonCodes.BALANCE_DISAMBIGUATED);
  }

  if (input.senderPhoneNormalized) {
    codes.push(BankTemplateReasonCodes.PHONE_EXTRACTED);
  } else if (input.maskedPhoneDetected) {
    codes.push(BankTemplateReasonCodes.PHONE_MASKED);
  } else {
    codes.push(BankTemplateReasonCodes.PHONE_MISSING);
  }

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
