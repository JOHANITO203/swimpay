import type { EventType } from '@swimpay/events';

export const OrderStatuses = [
  'created',
  'awaiting_buyer_identity',
  'payment_session_created',
  'receiver_arming',
  'receiver_armed',
  'payment_instructions_shown',
  'awaiting_payment',
  'buyer_claimed_paid',
  'signal_detected',
  'matching',
  'needs_review',
  'manual_confirmed',
  'rejected',
  'expired',
  'fulfilled'
] as const;

export type OrderStatus = (typeof OrderStatuses)[number];

export const PaymentSessionStatuses = [
  'created',
  'receiver_arming',
  'receiver_armed',
  'awaiting_payment',
  'buyer_claimed_paid',
  'signal_detected',
  'matching',
  'needs_review',
  'manual_confirmed',
  'rejected',
  'expired'
] as const;

export type PaymentSessionStatus = (typeof PaymentSessionStatuses)[number];

export const CheckoutSessionStates = [
  'receiver_bank_selection',
  'receiving_route_selection',
  'payer_bank_launcher_selection',
  'payment_instructions',
  'awaiting_payment',
  'buyer_claimed_paid',
  'signal_detected',
  'needs_review',
  'confirmed',
  'expired',
  'rejected'
] as const;

export type CheckoutSessionState = (typeof CheckoutSessionStates)[number];

export const BuyerSafeCheckoutStatuses = [
  'awaiting_payment',
  'searching_signal',
  'signal_detected',
  'needs_review',
  'confirmed',
  'expired',
  'not_validated'
] as const;

export type BuyerSafeCheckoutStatus = (typeof BuyerSafeCheckoutStatuses)[number];

export type ReceiverBankBuyerStatus = 'available' | 'review_required_beta' | 'temporarily_unavailable';
export type ReceiverRouteBuyerStatus = 'review_beta' | 'temporarily_unavailable';

export const ReceivingRouteRailTypes = ['phone_transfer', 'card_transfer'] as const;
export type ReceivingRouteRailType = (typeof ReceivingRouteRailTypes)[number];

export const ReceiverIdentifierTypes = ['phone', 'card'] as const;
export type ReceiverIdentifierType = (typeof ReceiverIdentifierTypes)[number];

export const ReceivingRouteReviewPolicies = ['review_first', 'eligible_low_risk_later'] as const;
export type ReceivingRouteReviewPolicy = (typeof ReceivingRouteReviewPolicies)[number];

export const ReceivingRouteRiskReasonCodes = [
  'phone_transfer_matching_hint_available',
  'buyer_sender_phone_missing',
  'card_transfer_review_required',
  'reference_not_observed',
  'amount_only_card_transfer',
  'receiver_route_review_only',
  'receiving_route_not_selected',
  'receiver_bank_exact',
  'receiver_bank_mismatch'
] as const;

export type ReceivingRouteRiskReasonCode = (typeof ReceivingRouteRiskReasonCodes)[number];

export interface ReceiverBankOption {
  receiver_bank_id: string;
  bank_profile_id: string;
  display_name: string;
  status: ReceiverBankBuyerStatus;
  review_only: boolean;
  detection_supported: boolean;
  merchant_receiver_account_id: string | null;
  beta_ready: boolean;
  disabled_reason: string | null;
  available_route_count?: number | undefined;
  rail_types?: readonly ReceivingRouteRailType[] | undefined;
  recommended_rail_type?: ReceivingRouteRailType | null | undefined;
  auto_confirm_enabled: false;
  official_bank_confirmation: false;
}

export interface MerchantReceivingRoute {
  route_id: string;
  merchant_id: string;
  bank_profile_id: string;
  rail_type: ReceivingRouteRailType;
  receiver_identifier_type: ReceiverIdentifierType;
  receiver_identifier_encrypted: string;
  receiver_identifier_masked: string;
  route_code: string;
  display_label: string;
  enabled: boolean;
  recommended: boolean;
  review_policy: ReceivingRouteReviewPolicy;
  fees_hint?: string | undefined;
  created_at: string;
  updated_at: string;
}

export interface BuyerSafeReceivingRoute {
  route_id: string;
  bank_profile_id: string;
  rail_type: ReceivingRouteRailType;
  receiver_identifier_type: ReceiverIdentifierType;
  receiver_identifier_masked: string;
  route_code: string;
  display_label: string;
  enabled: boolean;
  recommended: boolean;
  review_policy: ReceivingRouteReviewPolicy;
  fees_hint?: string | undefined;
  copy_action_available: boolean;
  buyer_status_label: ReceiverRouteBuyerStatus;
  official_bank_confirmation: false;
}

export type PayerBankLaunchStrategy = 'package_hint_only' | 'manual_only';
export type PayerBankFallbackStrategy = 'copy_details_manual_transfer';

export interface PayerBankLauncherOption {
  payer_bank_launcher_id: string;
  display_name: string;
  country: 'RU';
  android_package_candidates: readonly string[];
  android_package_hint: string | null;
  deeplink_schemes: readonly string[];
  launch_url: string | null;
  launch_strategy: PayerBankLaunchStrategy;
  fallback_strategy: PayerBankFallbackStrategy;
  enabled: boolean;
  detection_supported: false;
  does_not_confirm_payment: true;
  official_bank_confirmation: false;
}

export const V1ReceiverBankOptions: readonly ReceiverBankOption[] = [
  receiverBank('sber_ru', 'Sberbank'),
  receiverBank('tbank_ru', 'Tinkoff / T-Bank'),
  receiverBank('vtb_ru', 'VTB'),
  receiverBank('alfa_ru', 'Alfa-Bank'),
  receiverBank('gazprombank_ru', 'Gazprombank')
] as const;

export const PayerBankLauncherRegistry: readonly PayerBankLauncherOption[] = [
  payerLauncher('sberbank_ru', 'Sberbank', ['ru.sberbankmobile']),
  payerLauncher('tbank_ru', 'T-Bank', ['com.idamob.tinkoff.android']),
  payerLauncher('vtb_ru', 'VTB', ['ru.vtb24.mobilebanking.android']),
  payerLauncher('alfa_ru', 'Alfa-Bank', ['ru.alfabank.mobile.android']),
  payerLauncher('gazprombank_ru', 'Gazprombank', ['ru.gazprombank.android.mobilebank.app']),
  payerLauncher('yoomoney_ru', 'YooMoney', []),
  payerLauncher('ozon_bank_ru', 'Ozon Bank', []),
  payerLauncher('mts_bank_ru', 'MTS Bank', []),
  payerLauncher('post_bank_ru', 'Post Bank', []),
  payerLauncher('raiffeisen_ru', 'Raiffeisen', []),
  payerLauncher('other_manual', 'Other bank / manual transfer', [], 'manual_only')
] as const;

export interface CheckoutStateInput {
  paymentSessionStatus: PaymentSessionStatus;
  selectedReceiverBankId?: string | null | undefined;
  selectedReceivingRouteId?: string | null | undefined;
  selectedPayerBankLauncherId?: string | null | undefined;
  paymentInstructionsShownAt?: string | null | undefined;
}

export function getReceiverBankOption(receiverBankId: string): ReceiverBankOption | null {
  return V1ReceiverBankOptions.find((bank) => bank.receiver_bank_id === receiverBankId) ?? null;
}

export function getPayerBankLauncherOption(payerBankLauncherId: string): PayerBankLauncherOption | null {
  return PayerBankLauncherRegistry.find((launcher) => launcher.payer_bank_launcher_id === payerBankLauncherId) ?? null;
}

export function mapPaymentSessionToCheckoutState(input: CheckoutStateInput): CheckoutSessionState {
  switch (input.paymentSessionStatus) {
    case 'manual_confirmed':
      return 'confirmed';
    case 'expired':
      return 'expired';
    case 'rejected':
      return 'rejected';
    case 'needs_review':
      return 'needs_review';
    case 'signal_detected':
    case 'matching':
      return 'signal_detected';
    case 'buyer_claimed_paid':
      return 'buyer_claimed_paid';
    case 'awaiting_payment':
      return 'awaiting_payment';
    case 'created':
    case 'receiver_arming':
    case 'receiver_armed':
      if (!input.selectedReceiverBankId) {
        return 'receiver_bank_selection';
      }
      if (!input.selectedReceivingRouteId) {
        return 'receiving_route_selection';
      }
      if (!input.selectedPayerBankLauncherId) {
        return 'payer_bank_launcher_selection';
      }
      if (!input.paymentInstructionsShownAt) {
        return 'payment_instructions';
      }
      return 'awaiting_payment';
  }
}

export function mapCheckoutStateToBuyerSafeStatus(state: CheckoutSessionState): BuyerSafeCheckoutStatus {
  switch (state) {
    case 'receiver_bank_selection':
    case 'receiving_route_selection':
    case 'payer_bank_launcher_selection':
      return 'not_validated';
    case 'payment_instructions':
    case 'awaiting_payment':
      return 'awaiting_payment';
    case 'buyer_claimed_paid':
      return 'searching_signal';
    case 'signal_detected':
      return 'signal_detected';
    case 'needs_review':
      return 'needs_review';
    case 'confirmed':
      return 'confirmed';
    case 'expired':
      return 'expired';
    case 'rejected':
      return 'not_validated';
  }
}

export function toBuyerSafeReceivingRoute(route: MerchantReceivingRoute): BuyerSafeReceivingRoute {
  const value: BuyerSafeReceivingRoute = {
    route_id: route.route_id,
    bank_profile_id: route.bank_profile_id,
    rail_type: route.rail_type,
    receiver_identifier_type: route.receiver_identifier_type,
    receiver_identifier_masked: route.receiver_identifier_masked,
    route_code: route.route_code,
    display_label: route.display_label,
    enabled: route.enabled,
    recommended: route.recommended,
    review_policy: route.review_policy,
    copy_action_available: route.enabled,
    buyer_status_label: route.enabled ? 'review_beta' : 'temporarily_unavailable',
    official_bank_confirmation: false
  };
  assignIfDefined(value, 'fees_hint', route.fees_hint);
  return value;
}

export function maskReceiverIdentifier(type: ReceiverIdentifierType, value: string): string {
  const digits = value.replace(/\D/g, '');
  if (type === 'phone') {
    const lastTwo = digits.slice(-2).padStart(2, '*');
    return `+7 *** *** **${lastTwo}`;
  }

  if (digits.length < 8) {
    return '****';
  }
  return `${digits.slice(0, 4)} **** **** ${digits.slice(-4)}`;
}

export function generateHumanReadablePaymentReference(input: {
  merchantId: string;
  receivingRouteId: string;
  activeReferences: ReadonlySet<string>;
  wordSource?: readonly string[] | undefined;
  seed?: number | undefined;
}): string {
  const words = input.wordSource ?? DEFAULT_REFERENCE_WORDS;
  if (words.length < 2) {
    throw new Error('At least two reference words are required.');
  }

  const first = words[indexForSeed(input.seed ?? 0, words.length)];
  const second = words[indexForSeed((input.seed ?? 0) + 1, words.length)];
  const twoWord = `${first} ${second}`;
  if (!input.activeReferences.has(referenceScopeKey(input.merchantId, input.receivingRouteId, twoWord))) {
    return twoWord;
  }

  const third = words[indexForSeed((input.seed ?? 0) + 2, words.length)];
  return `${twoWord} ${third}`;
}

export function referenceScopeKey(merchantId: string, receivingRouteId: string, reference: string): string {
  return `${merchantId}:${receivingRouteId}:${reference}`;
}

export function isCheckoutStatePaymentConfirming(state: CheckoutSessionState): boolean {
  return state === 'confirmed';
}

export interface BuyerRecognitionHintInput {
  buyer_first_name: string;
  buyer_last_name: string;
  buyer_phone: string;
  buyer_source_card_number: string;
  [key: string]: unknown;
}

export interface BuyerRecognitionHints {
  buyer_first_name: string;
  buyer_last_name: string;
  buyer_phone_hmac: string;
  buyer_phone_masked: string;
  buyer_source_card_encrypted: string;
  buyer_source_card_hmac: string;
  buyer_source_card_masked: string;
  buyer_source_card_last4: string;
}

export interface BuyerRecognitionHintDerivationOptions {
  merchant_id: string;
  hmac(scope: string, normalizedValue: string): string;
  encrypt(scope: string, normalizedValue: string): string;
}

export interface BuildPaymentIntentInput {
  order_id: string;
  payment_session_id: string;
  merchant_id: string;
  display_price_minor: number;
  reconciliation_delta_minor: number;
  max_reconciliation_delta_minor: number;
  currency: string;
  generated_reference: string;
  selected_receiver_bank: string;
  selected_receiving_method: ReceivingRouteRailType;
  buyer_hints: BuyerRecognitionHints;
  expires_at: string;
  status: PaymentSessionStatus;
}

export interface PaymentIntent {
  order_id: string;
  payment_session_id: string;
  merchant_id: string;
  display_price_minor: number;
  expected_payment_amount_minor: number;
  buyer_visible_expected_amount_minor: number;
  matching_amount_minor: number;
  reconciliation_delta_minor: number;
  currency: string;
  generated_reference: string;
  selected_receiver_bank: string;
  selected_receiving_method: ReceivingRouteRailType;
  buyer_first_name: string;
  buyer_last_name: string;
  buyer_phone_hmac: string;
  buyer_phone_masked: string;
  buyer_source_card_encrypted: string;
  buyer_source_card_hmac: string;
  buyer_source_card_masked: string;
  buyer_source_card_last4: string;
  expires_at: string;
  status: PaymentSessionStatus;
}

export const PaymentIntentRelations = [
  'expected_payment_candidate',
  'ambiguous_activity',
  'unrelated_bank_activity',
  'negative_activity',
  'unknown_activity',
  'late_payment_candidate'
] as const;

export type PaymentIntentRelation = (typeof PaymentIntentRelations)[number];

export type PaymentWindowStatus = 'active' | 'expired' | 'none';
export type LearningContext = 'intent_bound_feedback' | 'background_observation';

export interface MerchantReviewMatchingCopy {
  title: string;
  label: string;
  text: string;
}

export interface IntentBoundLearningMetadataInput {
  intent_relation: PaymentIntentRelation;
  active_payment_intent_present: boolean;
  collision_detected: boolean;
  payment_window_status: PaymentWindowStatus;
  review_created: boolean;
  profile_version: string;
  shape_hash: string;
}

export interface IntentBoundLearningMetadata extends IntentBoundLearningMetadataInput {
  learning_context: LearningContext;
  mutates_runtime_rules: false;
  promotes_profile: false;
}

export interface UnknownShapeMonitoringRecordInput {
  shape_hash: string;
  bank_profile_id: string;
  package_name: string;
  profile_version: string;
  seen_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

export interface UnknownShapeMonitoringRecord extends UnknownShapeMonitoringRecordInput {
  classification_guess: 'unknown';
  review_status: 'pending';
  learning_context: 'background_observation';
  read_only: true;
  mutates_runtime_rules: false;
  promotes_profile: false;
  official_bank_confirmation: false;
  creates_payment_review: false;
}

export function deriveBuyerRecognitionHints(
  input: BuyerRecognitionHintInput,
  options: BuyerRecognitionHintDerivationOptions
): BuyerRecognitionHints {
  assertNoProhibitedBuyerCredentialFields(input);
  const firstName = input.buyer_first_name.trim();
  const lastName = input.buyer_last_name.trim();
  const normalizedPhone = normalizeDigits(input.buyer_phone);
  const normalizedCard = normalizeDigits(input.buyer_source_card_number);

  if (!firstName || !lastName || normalizedPhone.length < 8 || normalizedCard.length < 4) {
    throw new Error('Buyer recognition hints are incomplete.');
  }

  return {
    buyer_first_name: firstName,
    buyer_last_name: lastName,
    buyer_phone_hmac: options.hmac(`${options.merchant_id}:phone`, normalizedPhone),
    buyer_phone_masked: maskBuyerPhone(input.buyer_phone),
    buyer_source_card_encrypted: options.encrypt(`${options.merchant_id}:source_card`, normalizedCard),
    buyer_source_card_hmac: options.hmac(`${options.merchant_id}:source_card`, normalizedCard),
    buyer_source_card_masked: maskBuyerSourceCard(input.buyer_source_card_number),
    buyer_source_card_last4: normalizedCard.slice(-4)
  };
}

export function buildPaymentIntent(input: BuildPaymentIntentInput): PaymentIntent {
  if (!Number.isInteger(input.display_price_minor) || input.display_price_minor <= 0) {
    throw new Error('Display price must be a positive minor-unit integer.');
  }
  if (
    !Number.isInteger(input.reconciliation_delta_minor) ||
    Math.abs(input.reconciliation_delta_minor) > input.max_reconciliation_delta_minor
  ) {
    throw new Error('Reconciliation delta exceeds configured bounds.');
  }

  const expectedPaymentAmountMinor = input.display_price_minor + input.reconciliation_delta_minor;
  if (expectedPaymentAmountMinor <= 0) {
    throw new Error('Expected payment amount must be positive.');
  }

  return {
    order_id: input.order_id,
    payment_session_id: input.payment_session_id,
    merchant_id: input.merchant_id,
    display_price_minor: input.display_price_minor,
    expected_payment_amount_minor: expectedPaymentAmountMinor,
    buyer_visible_expected_amount_minor: expectedPaymentAmountMinor,
    matching_amount_minor: expectedPaymentAmountMinor,
    reconciliation_delta_minor: input.reconciliation_delta_minor,
    currency: input.currency,
    generated_reference: input.generated_reference,
    selected_receiver_bank: input.selected_receiver_bank,
    selected_receiving_method: input.selected_receiving_method,
    buyer_first_name: input.buyer_hints.buyer_first_name,
    buyer_last_name: input.buyer_hints.buyer_last_name,
    buyer_phone_hmac: input.buyer_hints.buyer_phone_hmac,
    buyer_phone_masked: input.buyer_hints.buyer_phone_masked,
    buyer_source_card_encrypted: input.buyer_hints.buyer_source_card_encrypted,
    buyer_source_card_hmac: input.buyer_hints.buyer_source_card_hmac,
    buyer_source_card_masked: input.buyer_hints.buyer_source_card_masked,
    buyer_source_card_last4: input.buyer_hints.buyer_source_card_last4,
    expires_at: new Date(input.expires_at).toISOString(),
    status: input.status
  };
}

export function buildMerchantReviewMatchingCopy(relation: PaymentIntentRelation): MerchantReviewMatchingCopy {
  if (relation === 'expected_payment_candidate') {
    return {
      title: 'Nouveau paiement détecté',
      label: 'Matching 100 %',
      text: 'Veuillez confirmer ce paiement.'
    };
  }

  return {
    title: 'Paiement à vérifier',
    label: 'Paiement à vérifier',
    text: 'Certains éléments correspondent, mais une confirmation est nécessaire.'
  };
}

export function buildIntentBoundLearningMetadata(
  input: IntentBoundLearningMetadataInput
): IntentBoundLearningMetadata {
  return {
    ...input,
    learning_context:
      input.active_payment_intent_present || input.review_created ? 'intent_bound_feedback' : 'background_observation',
    mutates_runtime_rules: false,
    promotes_profile: false
  };
}

export function buildUnknownShapeMonitoringRecord(
  input: UnknownShapeMonitoringRecordInput
): UnknownShapeMonitoringRecord {
  return {
    ...input,
    classification_guess: 'unknown',
    review_status: 'pending',
    learning_context: 'background_observation',
    read_only: true,
    mutates_runtime_rules: false,
    promotes_profile: false,
    official_bank_confirmation: false,
    creates_payment_review: false
  };
}

export function maskBuyerSourceCard(value: string): string {
  const digits = normalizeDigits(value);
  if (digits.length <= 4) {
    return `**** ${digits.slice(-4)}`;
  }
  if (digits.length < 8) {
    return `**** ${digits.slice(-4)}`;
  }
  return `${digits.slice(0, 4)} **** **** ${digits.slice(-4)}`;
}

export function maskBuyerPhone(value: string): string {
  const digits = normalizeDigits(value);
  return `+7 *** *** **${digits.slice(-2).padStart(2, '*')}`;
}

function assertNoProhibitedBuyerCredentialFields(input: Record<string, unknown>): void {
  const forbidden = /^(cvv|cvc|security_code|expiration|expiry|exp_month|exp_year|pin|sms_code|bank_password|password)$/iu;
  if (Object.keys(input).some((key) => forbidden.test(key))) {
    throw new Error('Buyer recognition hints must not include card secrets or bank credentials.');
  }
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function receiverBank(bankProfileId: string, displayName: string): ReceiverBankOption {
  return {
    receiver_bank_id: bankProfileId,
    bank_profile_id: bankProfileId,
    display_name: displayName,
    status: 'review_required_beta',
    review_only: true,
    detection_supported: true,
    merchant_receiver_account_id: null,
    beta_ready: true,
    disabled_reason: null,
    auto_confirm_enabled: false,
    official_bank_confirmation: false
  };
}

function payerLauncher(
  payerBankLauncherId: string,
  displayName: string,
  androidPackageCandidates: readonly string[],
  launchStrategy: PayerBankLaunchStrategy = androidPackageCandidates.length > 0 ? 'package_hint_only' : 'manual_only'
): PayerBankLauncherOption {
  return {
    payer_bank_launcher_id: payerBankLauncherId,
    display_name: displayName,
    country: 'RU',
    android_package_candidates: androidPackageCandidates,
    android_package_hint: androidPackageCandidates[0] ?? null,
    deeplink_schemes: [],
    launch_url: null,
    launch_strategy: launchStrategy,
    fallback_strategy: 'copy_details_manual_transfer',
    enabled: true,
    detection_supported: false,
    does_not_confirm_payment: true,
    official_bank_confirmation: false
  };
}

const DEFAULT_REFERENCE_WORDS = [
  'TANGO',
  'ALFA',
  'NOVA',
  'KILO',
  'MANGO',
  'RIVER',
  'DELTA',
  'ORBIT',
  'LIMA',
  'VECTOR',
  'PULSE',
  'MIR'
] as const;

function indexForSeed(seed: number, length: number): number {
  return Math.abs(seed) % length;
}

export const BankProfileStatuses = [
  'learning',
  'shadow_testing',
  'trusted_low_amount',
  'trusted',
  'degraded',
  'review_only',
  'disabled'
] as const;

export type BankProfileStatus = (typeof BankProfileStatuses)[number];

export const DirectionLabels = [
  'incoming_customer_transfer',
  'incoming_card_transfer',
  'incoming_sbp_transfer',
  'incoming_cashback',
  'incoming_refund',
  'outgoing_payment',
  'outgoing_transfer',
  'failed_transfer',
  'promo',
  'balance_update',
  'system_notice',
  'unknown',
  'unknown_ambiguous_direction'
] as const;

export type DirectionLabel = (typeof DirectionLabels)[number];

export const IntelligenceNotificationCategories = [
  'incoming_customer_transfer',
  'incoming_card_transfer',
  'incoming_sbp_transfer',
  'cashback',
  'refund',
  'outgoing_payment',
  'outgoing_transfer',
  'failed_transfer',
  'promo',
  'balance_update',
  'system_notice',
  'unknown'
] as const;

export type IntelligenceNotificationCategory = (typeof IntelligenceNotificationCategories)[number];

export const IntelligenceFeedbackActions = ['correct', 'corrected', 'ignored'] as const;
export type IntelligenceFeedbackAction = (typeof IntelligenceFeedbackActions)[number];

export const IntelligenceFeedbackReviewStatuses = ['pending', 'accepted', 'rejected', 'duplicate'] as const;
export type IntelligenceFeedbackReviewStatus = (typeof IntelligenceFeedbackReviewStatuses)[number];

export interface StaticBankProfileV1 {
  bank_profile_id: string;
  display_name: string;
  package_name: string;
  version: 'intelligence-v1';
  profile_signature: string;
  extraction_rules: readonly string[];
  keyword_lists: Record<string, readonly string[]>;
  negative_gates: readonly IntelligenceNotificationCategory[];
  classification_rules: readonly string[];
  official_bank_confirmation: false;
  auto_confirm_enabled: false;
}

function staticBankProfile(bankProfileId: string, displayName: string, packageName: string): StaticBankProfileV1 {
  return {
    bank_profile_id: bankProfileId,
    display_name: displayName,
    package_name: packageName,
    version: 'intelligence-v1',
    profile_signature: `profile_v1:${bankProfileId}:static`,
    extraction_rules: ['amount_minor', 'currency', 'sender_hint_hmac_optional', 'reference_hmac_optional'],
    keyword_lists: {
      incoming: ['incoming', 'received', 'pоступление', 'поступление', 'зачисление'],
      card: ['card', 'карта', 'карт'],
      sbp: ['sbp', 'сбп'],
      cashback: ['cashback', 'кэшбэк', 'кешбэк'],
      refund: ['refund', 'возврат'],
      outgoing: ['outgoing', 'списание', 'перевод отправлен'],
      failed: ['failed', 'отклонен', 'отклонён', 'не выполнен'],
      promo: ['promo', 'акция', 'скидка'],
      balance: ['balance', 'баланс', 'остаток'],
      system: ['security', 'login', 'system', 'система', 'вход']
    },
    negative_gates: ['cashback', 'refund', 'outgoing_payment', 'outgoing_transfer', 'failed_transfer', 'promo', 'unknown'],
    classification_rules: ['keyword_negative_gates_first', 'incoming_direction_required', 'amount_only_needs_review'],
    official_bank_confirmation: false,
    auto_confirm_enabled: false
  };
}

export const V1StaticBankProfiles: readonly StaticBankProfileV1[] = [
  staticBankProfile('sber_ru', 'Sberbank', 'ru.sberbankmobile'),
  staticBankProfile('tbank_ru', 'T-Bank', 'com.idamob.tinkoff.android'),
  staticBankProfile('vtb_ru', 'VTB', 'ru.vtb24.mobilebanking.android'),
  staticBankProfile('alfa_ru', 'Alfa-Bank', 'ru.alfabank.mobile.android'),
  staticBankProfile('gazprombank_ru', 'Gazprombank', 'ru.gazprombank.android.mobilebank.app')
] as const;

export interface IntelligenceFeedbackRequest {
  shape_hash: string;
  bank_profile_id: string;
  package_name: string;
  profile_version: string;
  classification_guess: IntelligenceNotificationCategory;
  human_label: IntelligenceNotificationCategory;
  feedback: IntelligenceFeedbackAction;
  timestamp: string;
  review_status: IntelligenceFeedbackReviewStatus;
  learning_metadata: IntentBoundLearningMetadata;
  mutates_runtime_rules: false;
  promotes_profile: false;
  official_bank_confirmation: false;
  creates_payment_review: false;
}

export type IntelligenceFeedbackValidationResult =
  | { valid: true; value: IntelligenceFeedbackRequest }
  | { valid: false; code: AndroidReceiverErrorCode; field?: string };

export const Decisions = ['needs_review', 'rejected', 'wait'] as const;
export type Decision = (typeof Decisions)[number];

export const ReviewStatuses = ['open', 'confirmed', 'rejected', 'cancelled'] as const;
export type ReviewStatus = (typeof ReviewStatuses)[number];

export const WebhookDeliveryStatuses = ['pending', 'delivering', 'delivered', 'failed', 'dead', 'cancelled'] as const;
export type WebhookDeliveryStatus = (typeof WebhookDeliveryStatuses)[number];

export interface Order {
  id: string;
  merchantId: string;
  externalId: string;
  productId?: string;
  productName?: string;
  productRiskLevel: string;
  amountMinor: number;
  currency: string;
  status: OrderStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSession {
  id: string;
  orderId: string;
  merchantId: string;
  expectedAmountMinor: number;
  currency: string;
  buyerPhoneHmac?: string;
  buyerPhoneMasked?: string;
  buyerNameHmac?: string;
  referenceCode?: string;
  referenceHmac?: string;
  status: PaymentSessionStatus;
  receiverGroupId?: string;
  selectedReceiverBankId?: string;
  selectedReceiverBankProfileId?: string;
  selectedReceivingRouteId?: string;
  selectedPayerBankLauncherId?: string;
  buyerSenderPhoneHmac?: string;
  buyerSenderPhoneMasked?: string;
  paymentInstructionsShownAt?: string;
  buyerClaimedPaidAt?: string;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiverDevice {
  id: string;
  merchantId: string;
  deviceName?: string;
  publicKey: string;
  appVersion?: string;
  androidVersion?: string;
  status:
    | 'pending'
    | 'active'
    | 'inactive'
    | 'degraded'
    | 'suspended'
    | 'revoked'
    | 'needs_reconnect'
    | 'notification_access_missing'
    | 'bank_targets_missing'
    | 'force_review_local';
  trustScore: number;
  notificationAccessStatus: boolean;
  lastLocalCounter: number;
  lastHeartbeatAt?: string;
}

export interface NotificationSignal {
  id: string;
  merchantId: string;
  deviceId: string;
  bankProfileId?: string;
  eventId: string;
  notificationHash: string;
  semanticHash?: string;
  localCounter: number;
  observedAt: string;
  receivedAt: string;
  amountMinor?: number;
  currency?: string;
  senderPhoneHmac?: string;
  senderPhoneMasked?: string;
  referenceHmac?: string;
  referenceCodeMasked?: string;
  directionLabel: DirectionLabel;
  signalQuality: number;
  parserVersion: string;
  templateId?: string;
  signatureValid: boolean;
  status: 'received' | 'verified' | 'parsed' | 'matched' | 'rejected';
}

export interface SignalMatch {
  id: string;
  signalId: string;
  orderId: string;
  paymentSessionId: string;
  score: number;
  decision: Decision;
  collisionDetected: boolean;
  reasonCodes: string[];
  createdAt: string;
}

export interface ReviewItem {
  id: string;
  merchantId: string;
  orderId?: string;
  paymentSessionId?: string;
  signalId?: string;
  reasonCode: string;
  status: ReviewStatus;
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface WebhookEvent<TData extends Record<string, unknown> = Record<string, unknown>> {
  eventId: string;
  eventType: EventType;
  confirmationType: 'notification_signal';
  officialBankConfirmation: false;
  occurredAt: string;
  merchantId: string;
  data: TData;
}

export interface AuditEvent {
  id: string;
  merchantId?: string;
  eventType: string;
  objectType: string;
  objectId: string;
  actorType?: string;
  actorId?: string;
  payloadRedacted: Record<string, unknown>;
  createdAt: string;
}

export const AndroidReceiverCapabilities = {
  NOTIFICATION_ACCESS: 'notification_access',
  SIGNED_SIGNAL_UPLOAD: 'signed_signal_upload',
  LOCAL_REDACTION: 'local_redaction',
  SIGNAL_COALESCING: 'signal_coalescing'
} as const;

export type AndroidReceiverCapability =
  (typeof AndroidReceiverCapabilities)[keyof typeof AndroidReceiverCapabilities];

export const RequiredAndroidReceiverCapabilities = [
  AndroidReceiverCapabilities.NOTIFICATION_ACCESS,
  AndroidReceiverCapabilities.SIGNED_SIGNAL_UPLOAD,
  AndroidReceiverCapabilities.LOCAL_REDACTION
] as const;

export const AndroidReceiverErrorCodes = {
  DEVICE_NOT_REGISTERED: 'device_not_registered',
  DEVICE_DISABLED: 'device_disabled',
  SIGNATURE_MISSING: 'signature_missing',
  SIGNATURE_INVALID: 'signature_invalid',
  EVENT_ID_DUPLICATE: 'event_id_duplicate',
  NOTIFICATION_HASH_DUPLICATE: 'notification_hash_duplicate',
  PACKAGE_NOT_ALLOWED: 'package_not_allowed',
  PACKAGE_CERT_UNVERIFIED: 'package_cert_unverified',
  BANK_PROFILE_UNTRUSTED: 'bank_profile_untrusted',
  PAYLOAD_INVALID: 'payload_invalid',
  RAW_PHONE_REJECTED: 'raw_phone_rejected',
  RAW_NOTIFICATION_REJECTED: 'raw_notification_rejected',
  LOCAL_COUNTER_REPLAY: 'local_counter_replay',
  TIMESTAMP_OUT_OF_RANGE: 'timestamp_out_of_range',
  NOTIFICATION_ACCESS_REQUIRED: 'notification_access_required',
  RECEIVER_OUTDATED: 'receiver_outdated'
} as const;

export type AndroidReceiverErrorCode =
  (typeof AndroidReceiverErrorCodes)[keyof typeof AndroidReceiverErrorCodes];

export const ReceiverSignatureAlgorithms = {
  HMAC_SHA256_CANONICAL_V1: 'hmac_sha256_canonical_v1'
} as const;

export type ReceiverSignatureAlgorithm =
  (typeof ReceiverSignatureAlgorithms)[keyof typeof ReceiverSignatureAlgorithms];

export const AndroidReceiverWarnings = {
  NOTIFICATION_ACCESS_DISABLED: 'notification_access_disabled',
  LISTENER_DISCONNECTED: 'listener_disconnected',
  DEVICE_VERSION_OUTDATED: 'device_version_outdated',
  BANK_PROFILE_UNVERIFIED: 'bank_profile_unverified',
  BANK_TARGETS_MISSING: 'bank_targets_missing',
  QUEUE_BACKLOG_HIGH: 'queue_backlog_high',
  BATTERY_OPTIMIZATION_RISK: 'battery_optimization_risk'
} as const;

export type AndroidReceiverWarning =
  (typeof AndroidReceiverWarnings)[keyof typeof AndroidReceiverWarnings];

export interface AndroidReceiverRegistrationRequest {
  device_name?: string;
  app_version?: string;
  android_version?: string;
  public_key: string;
  install_id?: string;
  device_install_id?: string;
  supported_capabilities?: string[];
}

export interface AndroidReceiverRegistrationResponse {
  device_id: string;
  merchant_id: string;
  status: ReceiverDevice['status'];
  server_time: string;
  required_capabilities: readonly AndroidReceiverCapability[];
  bank_profiles?: readonly { id: string; display_name: string; status: BankProfileStatus }[];
}

export interface AndroidReceiverHeartbeatRequest {
  device_id: string;
  app_version?: string;
  android_version?: string;
  notification_access_enabled: boolean;
  listener_connected: boolean;
  allowed_bank_profile_ids?: string[];
  queue_length?: number;
  last_signal_observed_at?: string | null;
  battery_optimization_ignored?: boolean;
  timestamp?: string;
  signature?: string;
}

export interface AndroidReceiverHeartbeatResponse {
  device_status: ReceiverDevice['status'] | 'degraded';
  server_time: string;
  receiver_mode: 'active' | 'attention_required' | 'disabled';
  active_payment_sessions_count: number;
  warnings: AndroidReceiverWarning[];
  required_actions: string[];
}

export interface AndroidNotificationSnapshot {
  title?: string;
  text?: string;
  big_text?: string;
  sub_text?: string;
  summary_text?: string;
  text_lines?: string[];
  ticker_text?: string;
  channel_id?: string;
  category?: string;
  group_key?: string;
  sort_key?: string;
  notification_id: number;
  tag?: string;
  post_time: string;
  package_name: string;
}

export interface AndroidSignalCoalescingFields {
  coalescing_window_ms?: number;
  snapshot_count: number;
  first_snapshot_at?: string;
  last_snapshot_at?: string;
  coalesced_hash?: string;
  notification_hash: string;
  semantic_hash?: string;
}

export interface AndroidReceiverSignalUploadRequest extends AndroidSignalCoalescingFields {
  event_id: string;
  merchant_id: string;
  device_id: string;
  bank_profile_id: string;
  package_name: string;
  package_cert_sha256: string;
  observed_at: string;
  received_at?: string;
  coalesced: boolean;
  local_counter: number;
  amount_minor?: number;
  currency?: string;
  sender_phone_hmac?: string;
  sender_phone_masked?: string;
  reference_hmac?: string;
  reference_code_masked?: string;
  direction_hint?: DirectionLabel;
  shape_hash?: string;
  profile_version?: string;
  classification?: IntelligenceNotificationCategory;
  confidence?: number;
  reason_codes?: string[];
  auto_confirm_allowed?: false;
  parser_hint?: string;
  signal_quality_hint?: number;
  redacted_title?: string;
  redacted_body?: string;
  raw_text_present: false;
  signature: string;
}

export interface AndroidReceiverSignalUploadResponse {
  signal_id: string;
  status: 'received' | 'rejected';
  accepted: boolean;
  reason_codes: AndroidReceiverErrorCode[];
  server_time: string;
  next_action: 'backend_decision_pending' | 'fix_receiver_configuration' | 'drop_signal';
}

export type AndroidReceiverValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; code: AndroidReceiverErrorCode; field?: string };

export type AndroidReceiverHeartbeatValidationResult =
  | { valid: true; value: AndroidReceiverHeartbeatRequest; warnings: AndroidReceiverWarning[] }
  | { valid: false; code: AndroidReceiverErrorCode; field?: string };

export type AndroidReceiverSignalValidationResult =
  | {
      valid: true;
      value: AndroidReceiverSignalUploadRequest;
      package_verification_trust: 'trusted' | 'untrusted';
    }
  | { valid: false; code: AndroidReceiverErrorCode; field?: string };

export interface ReceiverRealNotificationShadowFlags {
  realNotificationShadowEnabled: boolean;
  requireRealNotificationConsent: boolean;
  realBankAutoConfirm: boolean;
  shadowAutoConfirmPrediction: boolean;
  rawNotificationStorage: boolean;
}

export type ReceiverRealNotificationShadowRequiredAction =
  | 'enable_real_notification_shadow_flag'
  | 'disable_real_bank_auto_confirm'
  | 'disable_raw_notification_storage'
  | 'operator_consent_required'
  | 'merchant_consent_required'
  | 'bank_selection_required'
  | 'bank_review_only_status_required'
  | 'notification_listener_access_required'
  | 'backend_health_required'
  | 'outbox_health_required';

export interface ReceiverRealNotificationShadowConsentInput {
  flags: ReceiverRealNotificationShadowFlags;
  operatorConsent: boolean;
  merchantConsent: boolean;
  selectedBankProfileId?: string;
  bankReviewOnlyReady: boolean;
  notificationListenerAccessEnabled: boolean;
  backendHealthy: boolean;
  outboxHealthy: boolean;
}

export interface ReceiverRealNotificationShadowConsentResult {
  allowed: boolean;
  mode: 'blocked' | 'shadow_review_only_ready';
  requiredActions: ReceiverRealNotificationShadowRequiredAction[];
  warnings: string[];
}

export type RealNotificationRedactionPreflightResult =
  | {
      valid: true;
      allowed_fields: readonly string[];
    }
  | {
      valid: false;
      code:
        | 'raw_phone_rejected'
        | 'raw_notification_rejected'
        | 'raw_customer_identifier_rejected'
        | 'payload_invalid';
      field?: string;
    };

export interface ShadowAutoConfirmPredictionInput {
  amountExact: boolean;
  currencyExact: boolean;
  incomingCustomerTransfer: boolean;
  senderPhoneOrReferenceExact: boolean;
  noCollision: boolean;
  deviceTrusted: boolean;
  bankProfileTrusted: boolean;
  templateReliable: boolean;
  uniqueEventId: boolean;
  uniqueNotificationHash: boolean;
  signalUnused: boolean;
  activeOrderAndSession: boolean;
}

export interface ShadowAutoConfirmPredictionResult {
  would_auto_confirm: boolean;
  confidence_score: number;
  missing_gates: string[];
  reason_codes: string[];
  mutates_order: false;
  emits_payment_confirmed_webhook: false;
  releases_fulfillment: false;
  confirmation_type: 'notification_signal';
  official_bank_confirmation: false;
}

export function buildSafeReceiverShadowFlags(
  env: Record<string, string | boolean | undefined>
): ReceiverRealNotificationShadowFlags {
  return {
    realNotificationShadowEnabled: parseBooleanFlag(env.SWIMPAY_REAL_NOTIFICATION_SHADOW_ENABLED, false),
    requireRealNotificationConsent: parseBooleanFlag(env.SWIMPAY_REQUIRE_REAL_NOTIFICATION_CONSENT, true),
    realBankAutoConfirm: parseBooleanFlag(env.SWIMPAY_REAL_BANK_AUTO_CONFIRM, false),
    shadowAutoConfirmPrediction: parseBooleanFlag(env.SWIMPAY_SHADOW_AUTO_CONFIRM_PREDICTION, true),
    rawNotificationStorage: parseBooleanFlag(env.SWIMPAY_RAW_NOTIFICATION_STORAGE, false)
  };
}

export function evaluateRealNotificationShadowConsentGate(
  input: ReceiverRealNotificationShadowConsentInput
): ReceiverRealNotificationShadowConsentResult {
  const requiredActions: ReceiverRealNotificationShadowRequiredAction[] = [];

  if (!input.flags.realNotificationShadowEnabled) {
    requiredActions.push('enable_real_notification_shadow_flag');
  }
  if (input.flags.realBankAutoConfirm) {
    requiredActions.push('disable_real_bank_auto_confirm');
  }
  if (input.flags.rawNotificationStorage) {
    requiredActions.push('disable_raw_notification_storage');
  }
  if (input.flags.requireRealNotificationConsent && !input.operatorConsent) {
    requiredActions.push('operator_consent_required');
  }
  if (input.flags.requireRealNotificationConsent && !input.merchantConsent) {
    requiredActions.push('merchant_consent_required');
  }
  if (!isNonEmptyString(input.selectedBankProfileId)) {
    requiredActions.push('bank_selection_required');
  }
  if (!input.bankReviewOnlyReady) {
    requiredActions.push('bank_review_only_status_required');
  }
  if (!input.notificationListenerAccessEnabled) {
    requiredActions.push('notification_listener_access_required');
  }
  if (!input.backendHealthy) {
    requiredActions.push('backend_health_required');
  }
  if (!input.outboxHealthy) {
    requiredActions.push('outbox_health_required');
  }

  return {
    allowed: requiredActions.length === 0,
    mode: requiredActions.length === 0 ? 'shadow_review_only_ready' : 'blocked',
    requiredActions,
    warnings: requiredActions.length === 0 ? ['real_notification_shadow_review_only'] : []
  };
}

export function validateRealNotificationRedactionPreflight(
  body: unknown
): RealNotificationRedactionPreflightResult {
  if (!isPlainRecord(body)) {
    return { valid: false, code: 'payload_invalid' };
  }

  const rawField = findForbiddenReceiverRawField(body);
  if (rawField?.kind === 'phone') {
    return { valid: false, code: 'raw_phone_rejected', field: rawField.field };
  }
  if (rawField?.kind === 'notification') {
    return { valid: false, code: 'raw_notification_rejected', field: rawField.field };
  }

  for (const [key, value] of Object.entries(body)) {
    if (/^(customer|buyer|sender)_(name|id|identifier)$/iu.test(key)) {
      return { valid: false, code: 'raw_customer_identifier_rejected', field: key };
    }
    if ((key === 'redacted_title' || key === 'redacted_body') && containsRawPhoneLikeValue(value)) {
      return { valid: false, code: 'raw_phone_rejected', field: key };
    }
  }

  const allowedFields = [
    'redacted_title',
    'redacted_body',
    'amount_minor',
    'currency',
    'sender_phone_hmac',
    'sender_phone_masked',
    'reference_hmac',
    'reference_code_masked',
    'reason_codes'
  ] as const;

  for (const key of Object.keys(body)) {
    if (!(allowedFields as readonly string[]).includes(key)) {
      return { valid: false, code: 'payload_invalid', field: key };
    }
  }

  return { valid: true, allowed_fields: allowedFields };
}

export function evaluateShadowAutoConfirmPrediction(
  input: ShadowAutoConfirmPredictionInput
): ShadowAutoConfirmPredictionResult {
  const gates: Array<[string, boolean]> = [
    ['amount_exact', input.amountExact],
    ['currency_exact', input.currencyExact],
    ['incoming_customer_transfer', input.incomingCustomerTransfer],
    ['sender_phone_or_reference_exact', input.senderPhoneOrReferenceExact],
    ['no_collision', input.noCollision],
    ['device_trusted', input.deviceTrusted],
    ['bank_profile_trusted', input.bankProfileTrusted],
    ['template_reliable', input.templateReliable],
    ['unique_event_id', input.uniqueEventId],
    ['unique_notification_hash', input.uniqueNotificationHash],
    ['signal_unused', input.signalUnused],
    ['active_order_and_session', input.activeOrderAndSession]
  ];
  const missingGates = gates.filter(([, passed]) => !passed).map(([gate]) => gate);
  const passedCount = gates.length - missingGates.length;
  const reasonCodes = ['shadow_prediction_only'];

  if (!input.bankProfileTrusted) {
    reasonCodes.push('review_only_bank_signal');
  }
  if (!input.templateReliable) {
    reasonCodes.push('template_not_reliable');
  }

  return {
    would_auto_confirm: missingGates.length === 0,
    confidence_score: Math.round((passedCount / gates.length) * 100),
    missing_gates: missingGates,
    reason_codes: reasonCodes,
    mutates_order: false,
    emits_payment_confirmed_webhook: false,
    releases_fulfillment: false,
    confirmation_type: 'notification_signal',
    official_bank_confirmation: false
  };
}

export function validateAndroidReceiverRegistrationRequest(
  body: unknown
): AndroidReceiverValidationResult<AndroidReceiverRegistrationRequest> {
  if (!isPlainRecord(body)) {
    return invalidAndroidReceiverPayload();
  }

  if (!isNonEmptyString(body.public_key)) {
    return invalidAndroidReceiverPayload('public_key');
  }

  const value: AndroidReceiverRegistrationRequest = {
    public_key: body.public_key.trim()
  };
  assignIfDefined(value, 'device_name', optionalString(body.device_name));
  assignIfDefined(value, 'app_version', optionalString(body.app_version));
  assignIfDefined(value, 'android_version', optionalString(body.android_version));
  assignIfDefined(value, 'install_id', optionalString(body.install_id));
  assignIfDefined(value, 'device_install_id', optionalString(body.device_install_id));
  assignIfDefined(value, 'supported_capabilities', optionalStringArray(body.supported_capabilities));

  return { valid: true, value };
}

export function validateAndroidReceiverHeartbeatRequest(
  body: unknown
): AndroidReceiverHeartbeatValidationResult {
  if (!isPlainRecord(body)) {
    return invalidAndroidReceiverPayload();
  }

  if (!isNonEmptyString(body.device_id)) {
    return invalidAndroidReceiverPayload('device_id');
  }

  if (typeof body.notification_access_enabled !== 'boolean') {
    return invalidAndroidReceiverPayload('notification_access_enabled');
  }

  if (typeof body.listener_connected !== 'boolean') {
    return invalidAndroidReceiverPayload('listener_connected');
  }

  if (
    body.queue_length !== undefined &&
    (typeof body.queue_length !== 'number' || !Number.isInteger(body.queue_length) || body.queue_length < 0)
  ) {
    return invalidAndroidReceiverPayload('queue_length');
  }

  if (body.timestamp !== undefined && !isIsoDateString(body.timestamp)) {
    return { valid: false, code: AndroidReceiverErrorCodes.TIMESTAMP_OUT_OF_RANGE, field: 'timestamp' };
  }

  if (body.last_signal_observed_at !== undefined && body.last_signal_observed_at !== null && !isIsoDateString(body.last_signal_observed_at)) {
    return { valid: false, code: AndroidReceiverErrorCodes.TIMESTAMP_OUT_OF_RANGE, field: 'last_signal_observed_at' };
  }

  const warnings: AndroidReceiverWarning[] = [];
  if (!body.notification_access_enabled) {
    warnings.push(AndroidReceiverWarnings.NOTIFICATION_ACCESS_DISABLED);
  }
  if (!body.listener_connected) {
    warnings.push(AndroidReceiverWarnings.LISTENER_DISCONNECTED);
  }
  if (Array.isArray(body.allowed_bank_profile_ids) && body.allowed_bank_profile_ids.length === 0) {
    warnings.push(AndroidReceiverWarnings.BANK_TARGETS_MISSING);
  }
  if (typeof body.queue_length === 'number' && body.queue_length >= 50) {
    warnings.push(AndroidReceiverWarnings.QUEUE_BACKLOG_HIGH);
  }
  if (body.battery_optimization_ignored === false) {
    warnings.push(AndroidReceiverWarnings.BATTERY_OPTIMIZATION_RISK);
  }

  const value: AndroidReceiverHeartbeatRequest = {
    device_id: body.device_id.trim(),
    notification_access_enabled: body.notification_access_enabled,
    listener_connected: body.listener_connected
  };
  assignIfDefined(value, 'app_version', optionalString(body.app_version));
  assignIfDefined(value, 'android_version', optionalString(body.android_version));
  if (Array.isArray(body.allowed_bank_profile_ids)) {
    value.allowed_bank_profile_ids = optionalStringArray(body.allowed_bank_profile_ids) ?? [];
  }
  if (typeof body.queue_length === 'number') {
    value.queue_length = body.queue_length;
  }
  if (typeof body.last_signal_observed_at === 'string') {
    value.last_signal_observed_at = new Date(body.last_signal_observed_at).toISOString();
  } else if (body.last_signal_observed_at === null) {
    value.last_signal_observed_at = null;
  }
  if (typeof body.battery_optimization_ignored === 'boolean') {
    value.battery_optimization_ignored = body.battery_optimization_ignored;
  }
  if (typeof body.timestamp === 'string') {
    value.timestamp = new Date(body.timestamp).toISOString();
  }
  assignIfDefined(value, 'signature', optionalString(body.signature));

  return { valid: true, value, warnings };
}

export function validateAndroidReceiverSignalUploadRequest(
  body: unknown
): AndroidReceiverSignalValidationResult {
  if (!isPlainRecord(body)) {
    return invalidAndroidReceiverPayload();
  }

  const rawField = findForbiddenReceiverRawField(body);
  if (rawField?.kind === 'phone' || rawField?.kind === 'card') {
    return { valid: false, code: AndroidReceiverErrorCodes.RAW_PHONE_REJECTED, field: rawField.field };
  }
  if (rawField?.kind === 'credential') {
    return invalidAndroidReceiverPayload(rawField.field);
  }
  if (rawField?.kind === 'notification') {
    return { valid: false, code: AndroidReceiverErrorCodes.RAW_NOTIFICATION_REJECTED, field: rawField.field };
  }

  if (body.raw_text_present !== false) {
    return { valid: false, code: AndroidReceiverErrorCodes.RAW_NOTIFICATION_REJECTED, field: 'raw_text_present' };
  }

  if (body.auto_confirm_allowed !== undefined && body.auto_confirm_allowed !== false) {
    return invalidAndroidReceiverPayload('auto_confirm_allowed');
  }

  if (!isNonEmptyString(body.signature)) {
    return { valid: false, code: AndroidReceiverErrorCodes.SIGNATURE_MISSING, field: 'signature' };
  }

  for (const field of [
    'event_id',
    'merchant_id',
    'device_id',
    'bank_profile_id',
    'package_name',
    'package_cert_sha256',
    'notification_hash',
    'observed_at'
  ]) {
    if (!isNonEmptyString(body[field])) {
      return invalidAndroidReceiverPayload(field);
    }
  }

  if (!isIsoDateString(body.observed_at)) {
    return { valid: false, code: AndroidReceiverErrorCodes.TIMESTAMP_OUT_OF_RANGE, field: 'observed_at' };
  }

  for (const field of ['received_at', 'first_snapshot_at', 'last_snapshot_at']) {
    if (body[field] !== undefined && !isIsoDateString(body[field])) {
      return { valid: false, code: AndroidReceiverErrorCodes.TIMESTAMP_OUT_OF_RANGE, field };
    }
  }

  if (!Number.isInteger(body.local_counter) || Number(body.local_counter) <= 0) {
    return { valid: false, code: AndroidReceiverErrorCodes.LOCAL_COUNTER_REPLAY, field: 'local_counter' };
  }

  if (!Number.isInteger(body.snapshot_count) || Number(body.snapshot_count) <= 0) {
    return invalidAndroidReceiverPayload('snapshot_count');
  }

  if (body.coalesced !== true && body.coalesced !== false) {
    return invalidAndroidReceiverPayload('coalesced');
  }

  if (body.amount_minor !== undefined && (!Number.isInteger(body.amount_minor) || Number(body.amount_minor) < 0)) {
    return invalidAndroidReceiverPayload('amount_minor');
  }

  if (body.currency !== undefined && body.currency !== 'RUB') {
    return invalidAndroidReceiverPayload('currency');
  }

  if (body.direction_hint !== undefined && !DirectionLabels.includes(body.direction_hint as DirectionLabel)) {
    return invalidAndroidReceiverPayload('direction_hint');
  }

  if (body.classification !== undefined && !IntelligenceNotificationCategories.includes(body.classification as IntelligenceNotificationCategory)) {
    return invalidAndroidReceiverPayload('classification');
  }

  if (body.confidence !== undefined && (!Number.isInteger(body.confidence) || Number(body.confidence) < 0 || Number(body.confidence) > 100)) {
    return invalidAndroidReceiverPayload('confidence');
  }

  const value: AndroidReceiverSignalUploadRequest = {
    event_id: String(body.event_id).trim(),
    merchant_id: String(body.merchant_id).trim(),
    device_id: String(body.device_id).trim(),
    bank_profile_id: String(body.bank_profile_id).trim(),
    package_name: String(body.package_name).trim(),
    package_cert_sha256: String(body.package_cert_sha256).trim(),
    observed_at: new Date(String(body.observed_at)).toISOString(),
    notification_hash: String(body.notification_hash).trim(),
    local_counter: Number(body.local_counter),
    snapshot_count: Number(body.snapshot_count),
    coalesced: Boolean(body.coalesced),
    raw_text_present: false,
    signature: String(body.signature).trim()
  };
  if (typeof body.received_at === 'string') {
    value.received_at = new Date(body.received_at).toISOString();
  }
  assignIfDefined(value, 'semantic_hash', optionalString(body.semantic_hash));
  if (Number.isInteger(body.coalescing_window_ms) && Number(body.coalescing_window_ms) >= 0) {
    value.coalescing_window_ms = Number(body.coalescing_window_ms);
  }
  if (typeof body.first_snapshot_at === 'string') {
    value.first_snapshot_at = new Date(body.first_snapshot_at).toISOString();
  }
  if (typeof body.last_snapshot_at === 'string') {
    value.last_snapshot_at = new Date(body.last_snapshot_at).toISOString();
  }
  assignIfDefined(value, 'coalesced_hash', optionalString(body.coalesced_hash));
  if (typeof body.amount_minor === 'number') {
    value.amount_minor = body.amount_minor;
  }
  assignIfDefined(value, 'currency', optionalString(body.currency));
  assignIfDefined(value, 'sender_phone_hmac', optionalString(body.sender_phone_hmac));
  assignIfDefined(value, 'sender_phone_masked', optionalString(body.sender_phone_masked));
  assignIfDefined(value, 'reference_hmac', optionalString(body.reference_hmac));
  assignIfDefined(value, 'reference_code_masked', optionalString(body.reference_code_masked));
  if (typeof body.direction_hint === 'string') {
    value.direction_hint = body.direction_hint as DirectionLabel;
  }
  assignIfDefined(value, 'shape_hash', optionalString(body.shape_hash));
  assignIfDefined(value, 'profile_version', optionalString(body.profile_version));
  if (typeof body.classification === 'string') {
    value.classification = body.classification as IntelligenceNotificationCategory;
  }
  if (typeof body.confidence === 'number') {
    value.confidence = body.confidence;
  }
  assignIfDefined(value, 'reason_codes', optionalStringArray(body.reason_codes));
  if (body.auto_confirm_allowed === false) {
    value.auto_confirm_allowed = false;
  }
  assignIfDefined(value, 'parser_hint', optionalString(body.parser_hint));
  if (typeof body.signal_quality_hint === 'number') {
    value.signal_quality_hint = body.signal_quality_hint;
  }
  assignIfDefined(value, 'redacted_title', optionalString(body.redacted_title));
  assignIfDefined(value, 'redacted_body', optionalString(body.redacted_body));

  return {
    valid: true,
    value,
    package_verification_trust:
      body.package_name === 'TO_VERIFY' || body.package_cert_sha256 === 'TO_VERIFY' ? 'untrusted' : 'trusted'
  };
}

export function validateIntelligenceFeedbackRequest(body: unknown): IntelligenceFeedbackValidationResult {
  if (!isPlainRecord(body)) {
    return invalidAndroidReceiverPayload();
  }

  const rawField = findForbiddenReceiverRawField(body);
  if (rawField?.kind === 'phone' || rawField?.kind === 'card') {
    return { valid: false, code: AndroidReceiverErrorCodes.RAW_PHONE_REJECTED, field: rawField.field };
  }
  if (rawField?.kind === 'credential') {
    return invalidAndroidReceiverPayload(rawField.field);
  }
  if (rawField?.kind === 'notification') {
    return { valid: false, code: AndroidReceiverErrorCodes.RAW_NOTIFICATION_REJECTED, field: rawField.field };
  }

  for (const field of ['shape_hash', 'bank_profile_id', 'package_name', 'profile_version', 'timestamp']) {
    if (!isNonEmptyString(body[field])) {
      return invalidAndroidReceiverPayload(field);
    }
  }

  if (!IntelligenceNotificationCategories.includes(body.classification_guess as IntelligenceNotificationCategory)) {
    return invalidAndroidReceiverPayload('classification_guess');
  }
  if (!IntelligenceNotificationCategories.includes(body.human_label as IntelligenceNotificationCategory)) {
    return invalidAndroidReceiverPayload('human_label');
  }
  if (!IntelligenceFeedbackActions.includes(body.feedback as IntelligenceFeedbackAction)) {
    return invalidAndroidReceiverPayload('feedback');
  }
  if (!isIsoDateString(body.timestamp)) {
    return { valid: false, code: AndroidReceiverErrorCodes.TIMESTAMP_OUT_OF_RANGE, field: 'timestamp' };
  }

  const profile = V1StaticBankProfiles.find((candidate) => candidate.bank_profile_id === body.bank_profile_id);
  if (!profile || profile.package_name !== body.package_name || profile.version !== body.profile_version) {
    return invalidAndroidReceiverPayload('bank_profile_id');
  }

  const learningMetadata = validateIntentBoundLearningMetadata(
    body.learning_metadata,
    profile.version,
    String(body.shape_hash).trim(),
    body.classification_guess as IntelligenceNotificationCategory
  );
  if (!learningMetadata.valid) {
    return invalidAndroidReceiverPayload(learningMetadata.field);
  }

  return {
    valid: true,
    value: {
      shape_hash: String(body.shape_hash).trim(),
      bank_profile_id: profile.bank_profile_id,
      package_name: profile.package_name,
      profile_version: profile.version,
      classification_guess: body.classification_guess as IntelligenceNotificationCategory,
      human_label: body.human_label as IntelligenceNotificationCategory,
      feedback: body.feedback as IntelligenceFeedbackAction,
      timestamp: new Date(String(body.timestamp)).toISOString(),
      review_status: 'pending',
      learning_metadata: learningMetadata.value,
      mutates_runtime_rules: false,
      promotes_profile: false,
      official_bank_confirmation: false,
      creates_payment_review: false
    }
  };
}

function validateIntentBoundLearningMetadata(
  value: unknown,
  profileVersion: string,
  shapeHash: string,
  classificationGuess: IntelligenceNotificationCategory
): { valid: true; value: IntentBoundLearningMetadata } | { valid: false; field: string } {
  if (value === undefined || value === null) {
    return {
      valid: true,
      value: buildIntentBoundLearningMetadata({
        intent_relation: classificationGuess === 'unknown' ? 'unknown_activity' : 'unrelated_bank_activity',
        active_payment_intent_present: false,
        collision_detected: false,
        payment_window_status: 'none',
        review_created: false,
        profile_version: profileVersion,
        shape_hash: shapeHash
      })
    };
  }

  if (!isPlainRecord(value)) {
    return { valid: false, field: 'learning_metadata' };
  }
  if (!PaymentIntentRelations.includes(value.intent_relation as PaymentIntentRelation)) {
    return { valid: false, field: 'learning_metadata.intent_relation' };
  }
  if (!['active', 'expired', 'none'].includes(String(value.payment_window_status))) {
    return { valid: false, field: 'learning_metadata.payment_window_status' };
  }
  for (const field of ['active_payment_intent_present', 'collision_detected', 'review_created'] as const) {
    if (typeof value[field] !== 'boolean') {
      return { valid: false, field: `learning_metadata.${field}` };
    }
  }
  if (value.profile_version !== profileVersion) {
    return { valid: false, field: 'learning_metadata.profile_version' };
  }
  if (value.shape_hash !== shapeHash) {
    return { valid: false, field: 'learning_metadata.shape_hash' };
  }

  const activePaymentIntentPresent = value.active_payment_intent_present;
  const collisionDetected = value.collision_detected;
  const reviewCreated = value.review_created;

  return {
    valid: true,
    value: buildIntentBoundLearningMetadata({
      intent_relation: value.intent_relation as PaymentIntentRelation,
      active_payment_intent_present: activePaymentIntentPresent as boolean,
      collision_detected: collisionDetected as boolean,
      payment_window_status: value.payment_window_status as PaymentWindowStatus,
      review_created: reviewCreated as boolean,
      profile_version: value.profile_version,
      shape_hash: value.shape_hash
    })
  };
}

export function validateAndroidNotificationSnapshot(
  body: unknown
): AndroidReceiverValidationResult<AndroidNotificationSnapshot> {
  if (!isPlainRecord(body)) {
    return invalidAndroidReceiverPayload();
  }

  if (!isNonEmptyString(body.package_name)) {
    return invalidAndroidReceiverPayload('package_name');
  }

  if (body.package_name !== 'TO_VERIFY') {
    return { valid: false, code: AndroidReceiverErrorCodes.PACKAGE_NOT_ALLOWED, field: 'package_name' };
  }

  if (!Number.isInteger(body.notification_id)) {
    return invalidAndroidReceiverPayload('notification_id');
  }

  if (!isIsoDateString(body.post_time)) {
    return { valid: false, code: AndroidReceiverErrorCodes.TIMESTAMP_OUT_OF_RANGE, field: 'post_time' };
  }

  const value: AndroidNotificationSnapshot = {
    notification_id: Number(body.notification_id),
    post_time: new Date(String(body.post_time)).toISOString(),
    package_name: String(body.package_name).trim()
  };
  assignIfDefined(value, 'title', optionalString(body.title));
  assignIfDefined(value, 'text', optionalString(body.text));
  assignIfDefined(value, 'big_text', optionalString(body.big_text));
  assignIfDefined(value, 'sub_text', optionalString(body.sub_text));
  assignIfDefined(value, 'summary_text', optionalString(body.summary_text));
  assignIfDefined(value, 'text_lines', optionalStringArray(body.text_lines));
  assignIfDefined(value, 'ticker_text', optionalString(body.ticker_text));
  assignIfDefined(value, 'channel_id', optionalString(body.channel_id));
  assignIfDefined(value, 'category', optionalString(body.category));
  assignIfDefined(value, 'group_key', optionalString(body.group_key));
  assignIfDefined(value, 'sort_key', optionalString(body.sort_key));
  assignIfDefined(value, 'tag', optionalString(body.tag));

  return { valid: true, value };
}

export function buildCanonicalReceiverSignalPayload(
  request: AndroidReceiverSignalUploadRequest | Record<string, unknown>
): string {
  const payload = { ...request };
  delete payload.signature;
  return stableStringify(payload);
}

function invalidAndroidReceiverPayload(field?: string) {
  return { valid: false, code: AndroidReceiverErrorCodes.PAYLOAD_INVALID, ...(field ? { field } : {}) } as const;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());

  return strings.length > 0 ? strings : undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assignIfDefined<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function parseBooleanFlag(value: string | boolean | undefined, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    return defaultValue;
  }

  return value.trim().toLowerCase() === 'true';
}

function containsRawPhoneLikeValue(value: unknown): boolean {
  return typeof value === 'string' && /\+?\d[\d\s().-]{7,}\d/u.test(value);
}

function findForbiddenReceiverRawField(
  value: unknown
): { kind: 'phone' | 'notification' | 'card' | 'credential'; field: string } | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findForbiddenReceiverRawField(item);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  if (!isPlainRecord(value)) {
    return null;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (isForbiddenRawPhoneField(key)) {
      return { kind: 'phone', field: key };
    }
    if (isForbiddenRawCardField(key)) {
      return { kind: 'card', field: key };
    }
    if (isForbiddenBankCredentialField(key)) {
      return { kind: 'credential', field: key };
    }
    if (isForbiddenRawNotificationField(key)) {
      return { kind: 'notification', field: key };
    }
    const nestedResult = findForbiddenReceiverRawField(nested);
    if (nestedResult) {
      return nestedResult;
    }
  }

  return null;
}

function isForbiddenRawPhoneField(key: string): boolean {
  return /^(phone|raw_phone|buyer_phone|sender_phone|normalized_phone)$/iu.test(key);
}

function isForbiddenRawNotificationField(key: string): boolean {
  return /^(notification_text|raw_notification|raw_notification_text|raw_text|raw_body|raw_title)$/iu.test(key);
}

function isForbiddenRawCardField(key: string): boolean {
  return /^(raw_card|card_number|buyer_source_card_number|source_card|source_card_number|pan|card_pan)$/iu.test(key);
}

function isForbiddenBankCredentialField(key: string): boolean {
  return /^(cvv|cvc|security_code|expiration|expiry|exp_month|exp_year|pin|sms_code|bank_password|password)$/iu.test(key);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}
