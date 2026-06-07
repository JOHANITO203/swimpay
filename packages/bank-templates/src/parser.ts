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
  currency?: 'RUB' | 'XOF' | 'USD' | undefined;
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
  createLearningProfile('ozon_bank', 'Ozon Банк'),
  createInternationalLearningProfile('wise_int', 'Wise'),
  createInternationalLearningProfile('revolut_int', 'Revolut'),
  createInternationalLearningProfile('payoneer_int', 'Payoneer')
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

// "Received FROM a sender" forms that share a verb with the generic outgoing gate
// (оплата / payment). The payment model is person-to-person, but business/company
// accounts also pay: "Оплата от ООО …" / "Payment from Acme Inc" is the company
// paying US (incoming), not us paying a merchant. These must beat the outgoing gate
// while the unambiguous "Оплата покупки" / "payment sent" stays outgoing.
const INCOMING_FROM_SENDER_KEYWORDS = [
  'оплата от',
  'payment from'
] as const;

export function parseBankNotification(input: ParseBankNotificationInput): ParsedBankNotification {
  if (input.bankProfileId.endsWith('_int')) {
    return parseInternationalNotification(input);
  }
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

const RUB_CURRENCY_PATTERN = /(?:₽|руб\.?|â‚½|Ñ€ÑƒÐ±\.?|RUB)(?=$|[\s.,;:])/iu;
const XOF_CURRENCY_PATTERN = /(?:^|[\s])(?:FCFA|F\sCFA|XOF|CFA)(?=$|[\s.,;:])/iu;
// Bare $ is USD unless letter-prefixed (CA$, A$); US$ and the USD code are word-bounded.
// Case-insensitive: the parse pipeline lowercases text (normalizeRuText) before extraction.
const USD_CURRENCY_PATTERN = /(?:(?<![A-Za-z])\$|(?:^|[\s])(?:US\$|USD)(?=$|[\s.,;:]))/iu;
// Matches a letter-prefixed dollar that is NOT the US$ combination (e.g. CA$, A$ but not US$).
// US$ is handled by USD_CURRENCY_PATTERN; other letter-prefixed dollars (CA$, A$, AU$) block USD.
// 'S$' only counts as prefixed when NOT preceded by [Uu] (to allow US$).
const PREFIXED_DOLLAR_PATTERN = /(?:(?<![Uu])[Ss]|[A-RT-Za-rt-z])\$/u;

export function extractCurrency(text: string): 'RUB' | 'XOF' | 'USD' | null {
  const rub = RUB_CURRENCY_PATTERN.test(text);
  const xof = XOF_CURRENCY_PATTERN.test(text);
  const usd = !PREFIXED_DOLLAR_PATTERN.test(text) && USD_CURRENCY_PATTERN.test(text);
  const matches = [rub, xof, usd].filter(Boolean).length;
  if (matches !== 1) {
    // No marker, or conflicting currency markers — never guess.
    return null;
  }
  if (rub) return 'RUB';
  if (xof) return 'XOF';
  return 'USD';
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

  // A company paying us ("Оплата от …" / "Payment from …") is incoming — must win
  // over the generic outgoing 'оплата'/'payment' gate below.
  if (containsAny(normalized, INCOMING_FROM_SENDER_KEYWORDS)) {
    return 'incoming_customer_transfer';
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
  currency?: 'RUB' | 'XOF' | 'USD' | null | undefined;
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

function createInternationalLearningProfile(bankProfileId: string, displayName: string): BankProfile {
  return {
    bankProfileId,
    displayName,
    country: 'INT',
    status: 'learning',
    autoConfirmStatus: 'disabled',
    trustedApps: [],
    supportedLocales: ['en'],
    fieldPriority: ['EXTRA_TITLE', 'EXTRA_TEXT', 'EXTRA_BIG_TEXT', 'EXTRA_TEXT_LINES', 'EXTRA_SUB_TEXT', 'tickerText']
  };
}

/** Locale-neutral normalization for international (English) notifications. */
export function normalizeIntlText(text: string): string {
  return text.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** USD amount from neobank notifications: $1,234.56 / 1234.56 USD / US$ 9.99. */
export function extractUsdAmountMinor(text: string): number | null {
  const t = text.normalize('NFKC');
  // $-prefixed (reject letter-prefixed like CA$) or trailing USD/US$.
  const match =
    t.match(/(?<![A-Za-z])(?:US\$|\$)\s?(\d[\d,]*(?:\.\d{1,2})?)/u) ??
    t.match(/(\d[\d,]*(?:\.\d{1,2})?)\s?(?:US\$|USD)(?=$|[\s.,;:])/iu);
  if (!match?.[1]) {
    return null;
  }
  // Reject a 3+-decimal mantissa: the matched number must not be part of a longer decimal sequence.
  // This guards against '10.999 USD' where the trailing regex matches '999' (after the dot).
  // Test whether the match begins with a sequence that has 3 or more decimal digits.
  if (/\.\d{3,}/.test(match[1])) {
    return null;
  }
  // Also guard the trailing-USD path: reject if the character immediately before the match index
  // is a digit or a dot (meaning the match started inside a longer decimal like '.999' from '10.999').
  const matchIndex = match.index ?? 0;
  if (matchIndex > 0 && /[\d.]/.test(t[matchIndex - 1]!)) {
    return null;
  }
  const normalized = match[1].replace(/,/g, '');
  const [major = '0', minor = ''] = normalized.split('.');
  const amount = Number.parseInt(major, 10) * 100 + (minor ? Number.parseInt(minor.padEnd(2, '0').slice(0, 2), 10) : 0);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

const INTL_INCOMING_KEYWORDS = [
  'you received', 'received $', 'received us$', 'received usd', '%1$s received', 'received from',
  'got paid', 'payment from', 'sent you', 'paid you', 'money from', 'you got'
];
const INTL_OUTGOING_KEYWORDS = [
  'you sent', 'you paid', 'payment sent', 'sent to', 'you transferred', 'transfer sent', 'withdrawal', 'you withdrew'
];
const INTL_NOISE_KEYWORDS = [
  'incoming call', 'add money', 'top up', 'confirm your email', 'verify', 'verification', 'one-time',
  'passcode', 'code', 'otp', 'log in', 'login', 'security', 'card delivered', 'statement',
  'reward', 'cashback', 'promo', 'offer', 'reminder'
];

/** English money-received direction for INT profiles. Conservative: unknown unless clearly incoming. */
export function classifyIntlDirection(text: string): DirectionLabel {
  const n = normalizeIntlText(text);
  if (INTL_NOISE_KEYWORDS.some((k) => n.includes(k))) {
    return 'unknown';
  }
  if (INTL_OUTGOING_KEYWORDS.some((k) => n.includes(k))) {
    return 'outgoing_payment';
  }
  // Keywords that require a money token (amount) to be treated as incoming.
  // Without an amount, 'sent you' and 'paid you' could be informational/OTP text.
  const AMOUNT_GATED_INCOMING = ['sent you', 'paid you'];
  const hasAmount = extractUsdAmountMinor(text) !== null;
  // Reject the bank/service-as-sender promo form ("We sent you $50", "We've paid
  // you $5", "I sent you ...") — first-person subject means the app, not a peer,
  // is the sender, so it is a credit/promo notification, never a customer payment.
  const BANK_AS_SENDER = /\b(?:we|i)(?:'ve|\s+have|\s+just)?\s+(?:sent|paid)\s+you\b/u;
  const amountGatedMatch =
    AMOUNT_GATED_INCOMING.some((k) => n.includes(k)) && hasAmount && !BANK_AS_SENDER.test(n);
  // Remaining incoming keywords are always sufficient (e.g. 'you received', 'payment from').
  const UNCONDITIONAL_INCOMING = INTL_INCOMING_KEYWORDS.filter((k) => !AMOUNT_GATED_INCOMING.includes(k));
  const unconditionalMatch = UNCONDITIONAL_INCOMING.some((k) => n.includes(k)) || (/\breceived\b/u.test(n) && /\bfrom\b/u.test(n));
  return amountGatedMatch || unconditionalMatch ? 'incoming_customer_transfer' : 'unknown';
}

function parseInternationalNotification(input: ParseBankNotificationInput): ParsedBankNotification {
  const normalizedText = normalizeIntlText(input.text);
  const directionLabel = classifyIntlDirection(input.text);
  const amountMinor = extractUsdAmountMinor(input.text) ?? undefined;
  const currency = extractCurrency(input.text) ?? undefined;
  const referenceCode = extractReferenceCode(normalizedText) ?? undefined;
  const reasonCodes: string[] = [];
  if (directionLabel === 'incoming_customer_transfer') reasonCodes.push('intl_incoming_detected');
  if (amountMinor !== undefined) reasonCodes.push('amount_extracted');
  if (currency === 'USD') reasonCodes.push('currency_usd');
  if (referenceCode) reasonCodes.push('reference_extracted');
  reasonCodes.push('intl_review_only_never_auto_confirm');

  return {
    bankProfileId: input.bankProfileId,
    normalizedText,
    directionLabel,
    rail: undefined,
    amountMinor,
    currency,
    senderNameHint: undefined,
    senderBankHint: undefined,
    sourceLabel: undefined,
    cardNetwork: undefined,
    receiverCardLast4: undefined,
    balanceAfterMinor: undefined,
    senderPhoneNormalized: undefined,
    maskedPhoneDetected: false,
    referenceCode,
    signalQuality: scoreParsedSignal({ directionLabel, amountMinor, currency, referenceCode }),
    allowAutoConfirmCandidate: false, // neobanks never auto-confirm in v1
    reasonCodes
  };
}
