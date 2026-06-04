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
  'buyer_identity',
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
  'rejected',
  'not_validated'
] as const;

export type BuyerSafeCheckoutStatus = (typeof BuyerSafeCheckoutStatuses)[number];

export type ReceiverBankBuyerStatus = 'available' | 'review_required_beta' | 'temporarily_unavailable';
export type ReceiverRouteBuyerStatus = 'review_beta' | 'temporarily_unavailable';

export const BuyerCheckoutPaymentMethods = ['card', 'sbp', 'mobile_money'] as const;
export type BuyerCheckoutPaymentMethod = (typeof BuyerCheckoutPaymentMethods)[number];

export const ReceivingRouteRailTypes = ['phone_transfer', 'card_transfer', 'mobile_money'] as const;
export type ReceivingRouteRailType = (typeof ReceivingRouteRailTypes)[number];

export const ReceiverIdentifierTypes = ['phone', 'card'] as const;
export type ReceiverIdentifierType = (typeof ReceiverIdentifierTypes)[number];

export const ReceivingRouteReviewPolicies = ['review_first', 'eligible_low_risk_later'] as const;
export type ReceivingRouteReviewPolicy = (typeof ReceivingRouteReviewPolicies)[number];

export const ReceivingRouteLifecycleStatuses = ['active', 'pending_disable', 'disabled', 'revoked', 'deleted'] as const;
export type ReceivingRouteLifecycleStatus = (typeof ReceivingRouteLifecycleStatuses)[number];

export const MerchantSetupStatuses = [
  'onboarding_incomplete',
  'receiving_method_required',
  'receiver_required',
  'developer_integration_required',
  'ready_for_manual_payments',
  'ready_for_signal_assisted_payments'
] as const;

export type MerchantSetupStatus = (typeof MerchantSetupStatuses)[number];

export interface MerchantPaymentReadiness {
  merchant_setup_status: MerchantSetupStatus;
  payment_ready: boolean;
  active_receiving_route_count: number;
  available_payment_methods: {
    card: boolean;
    sbp: boolean;
    mobile_money: boolean;
  };
  /** Currencies the merchant has at least one active receiving route for. */
  receivable_currencies: readonly string[];
  setup_actions: readonly string[];
  unavailable_reason?: 'merchant_no_active_receiving_method' | undefined;
  manual_fallback_ready: boolean;
  signal_assisted_ready: boolean;
  official_bank_confirmation: false;
}

/** Currency a receiving bank profile collects in. West Africa profiles = XOF; RU = RUB. */
export function receivingCurrencyForBankProfile(bankProfileId: string): string {
  return WestAfricaReceiverBankProfiles.some((bank) => bank.bank_profile_id === bankProfileId) ? 'XOF' : 'RUB';
}

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
  logo_asset_key: string;
  selectable: boolean;
  supported_roles: readonly ('sender_bank' | 'receiver_bank')[];
  runtime_capture_status: 'runtime_verified' | 'observed' | 'review_only' | 'package_validation_pending';
  runtime_verified: boolean;
  runtime_verified_by?: 'operator' | undefined;
  runtime_verified_at?: string | undefined;
  package_name: string;
  package_cert_sha256: string;
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
  receiver_identifier_hmac: string;
  receiver_identifier_masked: string;
  receiver_identifier_last4: string;
  route_code: string;
  display_label: string;
  enabled: boolean;
  recommended: boolean;
  review_policy: ReceivingRouteReviewPolicy;
  fees_hint?: string | undefined;
  lifecycle_status: ReceivingRouteLifecycleStatus;
  pending_disable_at?: string | null | undefined;
  disabled_at?: string | null | undefined;
  revoked_at?: string | null | undefined;
  revocation_reason?: string | null | undefined;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null | undefined;
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

export type PayerBankLaunchStrategy =
  | 'deeplink_then_package'
  | 'explicit_activity_then_package'
  | 'package_hint_only'
  | 'ussd_dial'
  | 'manual_only';
export type PayerBankFallbackStrategy = 'copy_details_manual_transfer';
export type PayerBankLauncherTestedStatus = 'validated' | 'not_validated';
/** ISO-3166 codes for payer launchers. RU = V1 device-validated; the rest are UEMOA / XOF (West Africa). */
export type PayerBankCountry = 'RU' | 'SN' | 'CI' | 'ML' | 'BF' | 'BJ' | 'TG' | 'NE' | 'GW';
export type PaymentCompatibilityStatus =
  | 'compatible'
  | 'incompatible_method'
  | 'route_unavailable'
  | 'certification_blocked'
  | 'launcher_unavailable'
  | 'manual_fallback_required';
export type PaymentCompatibilityFallbackStrategy =
  | 'none'
  | 'switch_method'
  | 'switch_route'
  | 'manual_copy_paste'
  | 'manual_bank_check'
  | 'return_to_merchant';
export type CheckoutFallbackAction =
  | 'switch_to_card'
  | 'switch_to_sbp'
  | 'switch_route'
  | 'manual_copy_paste'
  | 'refresh_methods'
  | 'return_to_merchant';
export type CheckoutUnavailableReason =
  | 'merchant_no_active_receiving_method'
  | 'method_not_supported_by_merchant'
  | 'route_disabled'
  | 'route_revoked'
  | 'route_expired'
  | 'certification_blocked'
  | 'amount_lease_unavailable'
  | 'receiver_offline'
  | 'launcher_unavailable';

export interface PaymentCompatibilityPair {
  pair_id: string;
  payment_session_id: string;
  merchant_id: string;
  receiving_route_id: string;
  receiver_bank_id: string;
  receiver_method_type: BuyerCheckoutPaymentMethod;
  payer_method_type: BuyerCheckoutPaymentMethod;
  sender_bank_id?: string | undefined;
  payer_bank_launcher_id?: string | undefined;
  compatibility_status: PaymentCompatibilityStatus;
  fallback_strategy: PaymentCompatibilityFallbackStrategy;
  can_open_bank_app: boolean;
  can_prefill_payment: boolean;
  requires_manual_copy: boolean;
  amount_lease_id?: string | undefined;
  display_amount_minor?: number | undefined;
  reconciliation_delta_minor?: number | undefined;
  payable_amount_minor?: number | undefined;
  reason_labels: readonly string[];
}

export interface PayerBankLauncherOption {
  payer_bank_launcher_id: string;
  bank_id: string;
  display_name: string;
  country: PayerBankCountry;
  android_package_candidates: readonly string[];
  android_package_hint: string | null;
  android_explicit_activity_name?: string | undefined;
  deeplink_uri_template: string | null;
  deeplink_schemes: readonly string[];
  launch_url: string | null;
  ussd_transfer_template?: string | undefined;
  launch_strategy: PayerBankLaunchStrategy;
  fallback_strategy: PayerBankFallbackStrategy;
  can_prefill_receiver_card: false;
  can_prefill_receiver_phone: false;
  can_prefill_amount: false;
  can_prefill_reference: false;
  tested_status: PayerBankLauncherTestedStatus;
  enabled: boolean;
  detection_supported: false;
  runtime_verified: boolean;
  runtime_verified_source?: string | undefined;
  does_not_confirm_payment: true;
  official_bank_confirmation: false;
}

export interface AvailableSenderBank {
  bank_id: string;
  payer_bank_launcher_id: string;
  display_name: string;
  logo_asset_key: string;
  selectable: boolean;
  runtime_capture_status: ReceiverBankOption['runtime_capture_status'];
  runtime_verified: boolean;
  auto_confirm_enabled: false;
  official_bank_confirmation: false;
}

export interface AvailableReceivingMethod {
  method: BuyerCheckoutPaymentMethod;
  label: 'Carte' | 'SBP';
  available: boolean;
  route_id: string;
  receiver_bank_id: string;
  receiver_bank_name: string;
  receiver_bank_logo_asset_key: string;
  status: 'active';
}

export const V1ReceiverBankOptions: readonly ReceiverBankOption[] = [
  receiverBank('sber_ru', 'Sberbank'),
  receiverBank('tbank_ru', 'Tinkoff / T-Bank'),
  receiverBank('vtb_ru', 'VTB'),
  receiverBank('alfa_ru', 'Alfa-Bank'),
  receiverBank('gazprombank_ru', 'Gazprombank'),
  receiverBank('ozon_bank', 'Ozon Банк', {
    runtimeCaptureStatus: 'runtime_verified',
    runtimeVerified: true,
    runtimeVerifiedBy: 'operator',
    runtimeVerifiedAt: '2026-05-12T00:00:00.000Z',
    packageName: 'ru.ozon.fintech.finance',
    packageCertSha256: 'documented_unknown'
  })
] as const;

/**
 * West Africa (UEMOA / XOF) receiving profiles — the merchant-side mirror of
 * WestAfricaPayerBankLauncherRegistry. Mobile-money wallets receive on a phone
 * number (rail mobile_money); they are kept in a separate registry so the RU
 * checkout receiver list is not polluted. Validation and resolution use the
 * combined AllReceiverBankProfiles.
 */
export const WestAfricaReceiverBankProfiles: readonly ReceiverBankOption[] = [
  receiverBank('orange_money_sn', 'Orange Money (Sénégal)'),
  receiverBank('orange_money_ci', "Orange Money (Côte d'Ivoire)"),
  receiverBank('wave_sn', 'Wave (Sénégal)'),
  receiverBank('mtn_momo_ci', "MTN MoMo (Côte d'Ivoire)"),
  receiverBank('moov_money_ci', "Moov Money (Côte d'Ivoire)"),
  receiverBank('free_money_sn', 'Free Money / Mixx by Yas (Sénégal)'),
  receiverBank('wizall_sn', 'Wizall Money (Sénégal)'),
  receiverBank('djamo_ci', "Djamo (Côte d'Ivoire)"),
  receiverBank('ecobank_ci', "Ecobank (Côte d'Ivoire)"),
  receiverBank('sg_connect_ci', "SG Connect (Côte d'Ivoire)")
] as const;

/** Every receiver bank profile the platform recognises (RU V1 + West Africa). */
export const AllReceiverBankProfiles: readonly ReceiverBankOption[] = [
  ...V1ReceiverBankOptions,
  ...WestAfricaReceiverBankProfiles
] as const;

export const PayerBankLauncherRegistry: readonly PayerBankLauncherOption[] = [
  payerLauncher('sber_ru', 'Sberbank', ['ru.sberbankmobile'], {
    androidExplicitActivityName:
      'ru.sberbank.mobile.feature.externalstarttransfer.impl.presentation.NativeContactShortcutActivity',
    deeplinkSchemes: ['tel'],
    launchStrategy: 'explicit_activity_then_package',
    runtimeVerified: true,
    runtimeVerifiedSource: 'real_device_explicit_activity_open_only',
    testedStatus: 'validated'
  }),
  payerLauncher('tbank_ru', 'T-Bank', ['com.idamob.tinkoff.android'], {
    deeplinkSchemes: ['bank100000000004', 'bank10000000004', 'tbank', 'tcalls', 'tel', 'tinkoffbank'],
    deeplinkUriTemplate: 'bank100000000004://tbank.ru/transfer',
    launchStrategy: 'deeplink_then_package',
    runtimeVerified: true,
    runtimeVerifiedSource: 'real_device_deeplink_open_only',
    testedStatus: 'validated'
  }),
  payerLauncher('vtb_ru', 'VTB', ['ru.vtb24.mobilebanking.android'], {
    deeplinkSchemes: ['bank100000000005', 'bank110000000005', 'bank120000000005', 'bank200000000005', 'extvtb', 'shortcut', 'vtb', 'vtb-help'],
    deeplinkUriTemplate: 'bank100000000005://online.vtb.ru/',
    launchStrategy: 'deeplink_then_package',
    runtimeVerified: true,
    runtimeVerifiedSource: 'real_device_deeplink_open_only',
    testedStatus: 'validated'
  }),
  payerLauncher('alfa_ru', 'Alfa-Bank', ['ru.alfabank.mobile.android'], {
    deeplinkSchemes: ['alfabank', 'esia'],
    runtimeVerified: true,
    runtimeVerifiedSource: 'real_device_package_launch_open_only',
    testedStatus: 'validated'
  }),
  payerLauncher('gazprombank_ru', 'Gazprombank', ['ru.gazprombank.android.mobilebank.app'], {
    deeplinkSchemes: ['bank100000000001', 'gpbapp'],
    deeplinkUriTemplate: 'gpbapp://open',
    launchStrategy: 'deeplink_then_package',
    runtimeVerified: true,
    runtimeVerifiedSource: 'real_device_deeplink_open_only',
    testedStatus: 'validated'
  }),
  payerLauncher('ozon_bank', 'Ozon Банк', ['ru.ozon.fintech.finance'], {
    deeplinkSchemes: ['bank100000000273', 'ozonbank', 'ozonplatiqr', 'tel', 'vk53864657'],
    deeplinkUriTemplate: 'bank100000000273://finance.ozon.ru/transfer',
    launchStrategy: 'deeplink_then_package',
    runtimeVerified: true,
    runtimeVerifiedSource: 'real_device_deeplink_open_only',
    testedStatus: 'validated'
  })
] as const;

/**
 * West Africa (UEMOA / XOF) payer launchers. Packages + USSD codes are sourced
 * docs; deeplink_schemes are decoded from the real app AndroidManifest
 * (see docs/WEST_AFRICA_PAYER_LAUNCHERS.md + scripts/apk-deeplink-harvest.sh).
 * The open/prefill path is NOT yet device-validated, so every entry keeps
 * tested_status:'not_validated' / runtime_verified:false, but is enabled and
 * surfaced to buyers for XOF/XAF sessions via payerLaunchersForCurrency(). The
 * always-present copy_details_manual_transfer fallback covers a deeplink miss.
 *
 * Amount prefill capability is expressed by {amount}/{recipient} placeholders in
 * ussd_transfer_template (Orange SN/ML one-shot); can_prefill_amount stays false
 * to preserve the V1 launcher invariant. {secret}/PIN is never auto-filled.
 */
export const WestAfricaPayerBankLauncherRegistry: readonly PayerBankLauncherOption[] = [
  payerLauncher('orange_money_sn', 'Orange Money / Max it', ['com.orange.myorange.osn', 'com.orange.mobile.orangemoney'], {
    country: 'SN',
    deeplinkSchemes: ['sameaosnapp'],
    launchStrategy: 'ussd_dial',
    ussdTransferTemplate: '#144#21*{recipient}*{amount}*{secret}#',
    enabled: true
  }),
  payerLauncher('orange_money_ci', 'Orange Money / Max it', ['com.orange.myorange.oci', 'com.orange.orangemoneyafrique'], {
    country: 'CI',
    deeplinkSchemes: ['omk', 'orangemoneyafrique'],
    launchStrategy: 'deeplink_then_package',
    enabled: true
  }),
  payerLauncher('orange_money_africa', 'Orange Money Africa', ['com.orange.orangemoneyafrique'], {
    country: 'CI',
    deeplinkSchemes: ['omk', 'orangemoneyafrique'],
    launchStrategy: 'deeplink_then_package',
    enabled: true
  }),
  payerLauncher('wave_sn', 'Wave', ['com.wave.personal'], {
    country: 'SN',
    deeplinkSchemes: ['wave'],
    launchStrategy: 'deeplink_then_package',
    enabled: true
  }),
  payerLauncher('mtn_momo_ci', 'MTN MoMo', ['mtnft.momo.consumer'], {
    country: 'CI',
    launchStrategy: 'package_hint_only',
    ussdTransferTemplate: '*133#',
    enabled: true
  }),
  payerLauncher('moov_money_ci', 'Moov Money', ['ci.moovmoney.mmpayapi'], {
    country: 'CI',
    launchStrategy: 'package_hint_only',
    ussdTransferTemplate: '*155#',
    enabled: true
  }),
  payerLauncher('free_money_sn', 'Free Money / Mixx by Yas', ['sn.free.app'], {
    country: 'SN',
    launchStrategy: 'package_hint_only',
    ussdTransferTemplate: '#150#',
    enabled: true
  }),
  payerLauncher('wizall_sn', 'Wizall Money', ['com.wizall.wizallclient'], {
    country: 'SN',
    launchStrategy: 'package_hint_only',
    enabled: true
  }),
  payerLauncher('djamo_ci', 'Djamo', ['com.djamo.app'], {
    country: 'CI',
    launchStrategy: 'package_hint_only',
    enabled: true
  }),
  payerLauncher('sg_connect_ci', 'SG Connect', ['com.socgen.bankup'], {
    country: 'CI',
    deeplinkSchemes: ['socgen.unibank.front'],
    launchStrategy: 'deeplink_then_package',
    enabled: true
  }),
  payerLauncher('ecobank_ci', 'Ecobank', ['com.app.ecobank'], {
    country: 'CI',
    launchStrategy: 'package_hint_only',
    enabled: true
  })
] as const;

const XOF_CURRENCIES = new Set(['XOF', 'XAF']);

/**
 * Selects the payer-bank launcher registry for a payment session's currency.
 * XOF/XAF (franc CFA / UEMOA) -> West Africa launchers; everything else -> RU.
 * This activates West Africa on the buyer side without touching the
 * device-validated RU flow.
 */
export function payerLaunchersForCurrency(currency: string | undefined): readonly PayerBankLauncherOption[] {
  return currency && XOF_CURRENCIES.has(currency.toUpperCase())
    ? WestAfricaPayerBankLauncherRegistry
    : PayerBankLauncherRegistry;
}

export interface CheckoutStateInput {
  paymentSessionStatus: PaymentSessionStatus;
  paymentMethod?: BuyerCheckoutPaymentMethod | null | undefined;
  selectedReceiverBankId?: string | null | undefined;
  selectedReceivingRouteId?: string | null | undefined;
  selectedPayerBankLauncherId?: string | null | undefined;
  paymentInstructionsShownAt?: string | null | undefined;
}

export function getReceiverBankOption(receiverBankId: string): ReceiverBankOption | null {
  return AllReceiverBankProfiles.find((bank) => bank.receiver_bank_id === receiverBankId) ?? null;
}

export function getPayerBankLauncherOption(payerBankLauncherId: string): PayerBankLauncherOption | null {
  return PayerBankLauncherRegistry.find((launcher) => launcher.payer_bank_launcher_id === payerBankLauncherId) ?? null;
}

export function toAvailableSenderBanks(
  launchers: readonly PayerBankLauncherOption[] = PayerBankLauncherRegistry
): readonly AvailableSenderBank[] {
  return launchers
    .filter((launcher) => launcher.enabled)
    .map((launcher) => ({
      bank_id: launcher.bank_id,
      payer_bank_launcher_id: launcher.payer_bank_launcher_id,
      display_name: launcher.display_name,
      logo_asset_key: bankLogoAssetKey(launcher.bank_id),
      selectable: true,
      runtime_capture_status: launcher.runtime_verified ? 'runtime_verified' : 'observed',
      runtime_verified: launcher.runtime_verified,
      auto_confirm_enabled: false,
      official_bank_confirmation: false
    }));
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
      if (!input.paymentMethod && !input.selectedReceiverBankId) {
        return 'buyer_identity';
      }
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
    case 'buyer_identity':
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
      return 'rejected';
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

export function maskReceiverIdentifier(
  type: ReceiverIdentifierType,
  value: string,
  options: { international?: boolean } = {}
): string {
  const digits = value.replace(/\D/g, '');
  if (type === 'phone') {
    const lastTwo = digits.slice(-2).padStart(2, '*');
    if (options.international) {
      // West Africa / mobile money: no Russian +7 assumption.
      return `+••• ••• ••${lastTwo}`;
    }
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

export type BuyerNameScriptDetected = 'latin' | 'cyrillic' | 'mixed' | 'unknown';

export interface BuyerIdentityNormalizationInput {
  first_name: string;
  last_name: string;
}

export interface BuyerIdentityNormalizationResult {
  normalized_full_name: string;
  script_detected: BuyerNameScriptDetected;
  latin_variants: readonly string[];
  cyrillic_variants: readonly string[];
  initials_variants: readonly string[];
  reversed_order_variants: readonly string[];
  normalized_name_tokens: readonly string[];
  buyer_name_fingerprint: string;
}

export interface ExpectedPaymentProfileInput {
  payment_session_id: string;
  merchant_id: string;
  buyer_first_name_raw: string;
  buyer_last_name_raw: string;
  payment_method: BuyerCheckoutPaymentMethod;
  sender_bank_id: string;
  sender_card_number?: string | undefined;
  sender_phone?: string | undefined;
  display_amount_minor: number;
  currency: string;
  generated_reference: string;
  expires_at: string;
  hmac(scope: string, value: string): string;
}

export interface ExpectedPaymentProfile {
  payment_session_id: string;
  merchant_id: string;
  buyer_first_name_raw: string;
  buyer_last_name_raw: string;
  buyer_name_script_detected: BuyerNameScriptDetected;
  buyer_name_normalized: string;
  buyer_name_latin_variants: readonly string[];
  buyer_name_cyrillic_variants: readonly string[];
  buyer_name_initial_variants: readonly string[];
  buyer_name_reversed_order_variants: readonly string[];
  buyer_name_fingerprint: string;
  payment_method: BuyerCheckoutPaymentMethod;
  sender_bank_id: string;
  sender_card_last4?: string | undefined;
  sender_card_masked?: string | undefined;
  sender_card_hmac?: string | undefined;
  sender_phone_masked?: string | undefined;
  sender_phone_hmac?: string | undefined;
  display_amount_minor: number;
  payable_amount_minor: number;
  reconciliation_delta_minor: number;
  currency: string;
  generated_reference: string;
  expires_at: string;
  expected_payment_fingerprint: string;
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

export interface P0MatchConfidenceVector {
  amount: 'exact' | 'delta_match' | 'mismatch';
  rail: 'sbp' | 'card' | 'unknown';
  direction: 'incoming' | 'outgoing' | 'refund' | 'cashback' | 'promo' | 'unknown';
  time_window: 'inside' | 'late' | 'too_old';
  receiver_route: 'exact' | 'compatible' | 'missing';
  bank_package: 'trusted_cert' | 'package_only' | 'unknown';
  template: 'known_high' | 'known_medium' | 'unknown_shape';
  sender_name: 'strong' | 'weak' | 'missing' | 'mismatch';
  sender_phone: 'hmac_match' | 'masked_match' | 'not_observed';
  sender_card: 'hmac_match' | 'last4_match' | 'not_observed';
  reference: 'exact' | 'not_observed' | 'mismatch';
  collision_pressure: number;
}

export interface SignalEvidenceEnvelope {
  envelope_version: 1;
  official_bank_confirmation: false;
  merchant_id: string;
  receiver_device_id: string;
  payment_session_id?: string | undefined;
  signal_id: string;
  bank_package: string;
  bank_cert_fingerprint?: string | undefined;
  notification_posted_at: string;
  received_at_device: string;
  received_at_backend: string;
  parser_version: string;
  template_id?: string | undefined;
  shape_hash: string;
  semantic_hash: string;
  redacted_fields: {
    amount_minor?: number | undefined;
    currency?: string | undefined;
    direction?: 'incoming' | 'outgoing' | 'refund' | 'cashback' | 'promo' | 'unknown' | undefined;
    rail?: 'sbp' | 'card' | 'unknown' | undefined;
    sender_name_hint_hash?: string | undefined;
    receiver_route_hint?: string | undefined;
  };
  match_vector?: P0MatchConfidenceVector | undefined;
  device_signature: string;
  backend_signature: string;
}

export interface ReceiverHealth {
  status: 'healthy' | 'degraded' | 'offline';
  notification_access: boolean;
  listener_connected_recently: boolean;
  last_heartbeat_at: string;
  encrypted_outbox_depth: number;
  supported_bank_routes_online: number;
  device_key_attested: boolean;
  app_integrity_recent: boolean;
  clock_skew_ms: number;
}

export interface BankRouteCertification {
  bank_id: string;
  package_name: string;
  accepted_signing_cert_sha256: readonly string[];
  rail_supported: readonly ('sbp' | 'card')[];
  templates: readonly {
    template_id: string;
    category: 'incoming_sbp' | 'incoming_card' | 'refund' | 'outgoing' | 'cashback' | 'promo' | 'unknown';
    confidence: 'certified' | 'observed' | 'experimental';
    parser_version: string;
  }[];
  notification_reliability: {
    live_posted_seen: boolean;
    active_sweep_seen: boolean;
    snoozed_seen?: boolean | undefined;
    delay_p95_ms?: number | undefined;
  };
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

export function normalizeBuyerIdentity(input: BuyerIdentityNormalizationInput): BuyerIdentityNormalizationResult {
  const firstName = normalizeNameToken(input.first_name);
  const lastName = normalizeNameToken(input.last_name);
  if (!firstName || !lastName) {
    throw new Error('Buyer first and last names are required.');
  }

  const tokens = [firstName, lastName];
  const normalizedFullName = tokens.join(' ');
  const latin = /[a-z]/iu.test(normalizedFullName);
  const cyrillic = /[а-яё]/iu.test(normalizedFullName);
  const scriptDetected: BuyerNameScriptDetected = latin && cyrillic ? 'mixed' : latin ? 'latin' : cyrillic ? 'cyrillic' : 'unknown';
  const cyrillicFirst = transliterateLatinToCyrillic(firstName);
  const cyrillicLast = transliterateLatinToCyrillic(lastName);
  const latinFirst = transliterateCyrillicToLatin(firstName);
  const latinLast = transliterateCyrillicToLatin(lastName);
  const latinVariants = uniqueNameVariants([
    `${latinFirst} ${latinLast}`,
    `${firstName} ${lastName}`,
    `${latinLast} ${latinFirst}`
  ]);
  const cyrillicVariants = uniqueNameVariants([
    `${cyrillicFirst} ${cyrillicLast}`,
    `${firstName} ${lastName}`,
    `${cyrillicLast} ${cyrillicFirst}`
  ]);
  const initialsVariants = uniqueNameVariants([
    `${firstName.slice(0, 1)}. ${lastName}`,
    `${lastName} ${firstName.slice(0, 1)}.`,
    `${cyrillicFirst.slice(0, 1)}. ${cyrillicLast}`,
    `${cyrillicLast} ${cyrillicFirst.slice(0, 1)}.`,
    `${latinFirst.slice(0, 1)}. ${latinLast}`,
    `${latinLast} ${latinFirst.slice(0, 1)}.`
  ]);
  const reversedOrderVariants = uniqueNameVariants([
    `${lastName} ${firstName}`,
    `${latinLast} ${latinFirst}`,
    `${cyrillicLast} ${cyrillicFirst}`
  ]);

  return {
    normalized_full_name: normalizedFullName,
    script_detected: scriptDetected,
    latin_variants: latinVariants,
    cyrillic_variants: cyrillicVariants,
    initials_variants: initialsVariants,
    reversed_order_variants: reversedOrderVariants,
    normalized_name_tokens: tokens,
    buyer_name_fingerprint: fingerprintNameVariants([
      normalizedFullName,
      ...latinVariants,
      ...cyrillicVariants,
      ...initialsVariants,
      ...reversedOrderVariants
    ])
  };
}

export function deriveExpectedPaymentProfile(input: ExpectedPaymentProfileInput): ExpectedPaymentProfile {
  assertNoProhibitedBuyerCredentialFields(input as unknown as Record<string, unknown>);
  if (!BuyerCheckoutPaymentMethods.includes(input.payment_method)) {
    throw new Error('Unsupported buyer payment method.');
  }
  if (!PayerBankLauncherRegistry.some((bank) => bank.payer_bank_launcher_id === input.sender_bank_id && bank.enabled)) {
    throw new Error('Unsupported sender bank.');
  }
  if (!Number.isInteger(input.display_amount_minor) || input.display_amount_minor <= 0) {
    throw new Error('Display amount must be a positive minor-unit integer.');
  }
  if (input.currency !== 'RUB') {
    throw new Error('Expected payment profile currency must be RUB.');
  }

  const identity = normalizeBuyerIdentity({
    first_name: input.buyer_first_name_raw,
    last_name: input.buyer_last_name_raw
  });
  const reconciliationDeltaMinor = deriveReconciliationDeltaMinor(input.payment_session_id, input.generated_reference);
  const payableAmountMinor = input.display_amount_minor + reconciliationDeltaMinor;
  const base = {
    payment_session_id: input.payment_session_id,
    merchant_id: input.merchant_id,
    buyer_first_name_raw: input.buyer_first_name_raw.trim(),
    buyer_last_name_raw: input.buyer_last_name_raw.trim(),
    buyer_name_script_detected: identity.script_detected,
    buyer_name_normalized: identity.normalized_full_name,
    buyer_name_latin_variants: identity.latin_variants,
    buyer_name_cyrillic_variants: identity.cyrillic_variants,
    buyer_name_initial_variants: identity.initials_variants,
    buyer_name_reversed_order_variants: identity.reversed_order_variants,
    buyer_name_fingerprint: input.hmac('buyer_name', identity.buyer_name_fingerprint),
    payment_method: input.payment_method,
    sender_bank_id: input.sender_bank_id,
    display_amount_minor: input.display_amount_minor,
    payable_amount_minor: payableAmountMinor,
    reconciliation_delta_minor: reconciliationDeltaMinor,
    currency: input.currency,
    generated_reference: input.generated_reference,
    expires_at: new Date(input.expires_at).toISOString()
  };

  if (input.payment_method === 'card' && normalizeDigits(input.sender_phone ?? '').length > 0) {
    throw new Error('Sender phone must not be submitted for card payments.');
  }
  if (input.payment_method === 'sbp' && normalizeDigits(input.sender_card_number ?? '').length > 0) {
    throw new Error('Sender card number must not be submitted for phone payments.');
  }

  const methodFields =
    input.payment_method === 'card'
      ? deriveExpectedCardFields(input.sender_card_number, input.hmac)
      : deriveExpectedPhoneFields(input.sender_phone, input.hmac);
  const fingerprintPayload = [
    input.merchant_id,
    input.payment_session_id,
    String(payableAmountMinor),
    input.generated_reference,
    input.sender_bank_id,
    input.payment_method,
    base.expires_at
  ].join('|');

  return {
    ...base,
    ...methodFields,
    expected_payment_fingerprint: input.hmac('expected_payment_fingerprint', fingerprintPayload)
  };
}

export function receivingRailForBuyerPaymentMethod(method: BuyerCheckoutPaymentMethod): ReceivingRouteRailType {
  switch (method) {
    case 'card':
      return 'card_transfer';
    case 'mobile_money':
      return 'mobile_money';
    case 'sbp':
    default:
      return 'phone_transfer';
  }
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

function normalizeRussianPhoneForCheckout(value: string): string | null {
  const digits = normalizeDigits(value);
  if (digits.length === 11 && digits.startsWith('8')) {
    return `7${digits.slice(1)}`;
  }
  if (digits.length === 11 && digits.startsWith('7')) {
    return digits;
  }
  if (digits.length === 10) {
    return `7${digits}`;
  }
  return null;
}

function deriveExpectedCardFields(
  value: string | undefined,
  hmac: (scope: string, normalizedValue: string) => string
): Pick<ExpectedPaymentProfile, 'sender_card_last4' | 'sender_card_masked' | 'sender_card_hmac'> {
  const normalizedCard = normalizeDigits(value ?? '');
  if (normalizedCard.length < 13 || normalizedCard.length > 19 || !passesLuhn(normalizedCard)) {
    throw new Error('Sender card number is not plausible.');
  }
  return {
    sender_card_last4: normalizedCard.slice(-4),
    sender_card_masked: maskBuyerSourceCard(normalizedCard),
    sender_card_hmac: hmac('sender_card_pan', normalizedCard)
  };
}

function passesLuhn(value: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (!Number.isInteger(digit)) {
      return false;
    }
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum > 0 && sum % 10 === 0;
}

function deriveExpectedPhoneFields(
  value: string | undefined,
  hmac: (scope: string, normalizedValue: string) => string
): Pick<ExpectedPaymentProfile, 'sender_phone_masked' | 'sender_phone_hmac'> {
  const normalizedPhone = normalizeRussianPhoneForCheckout(value ?? '');
  if (!normalizedPhone) {
    throw new Error('Sender phone number must be a valid Russian phone number.');
  }
  return {
    sender_phone_masked: maskBuyerPhone(normalizedPhone),
    sender_phone_hmac: hmac('sender_phone', normalizedPhone)
  };
}

function normalizeNameToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/giu, 'е')
    .replace(/[^\p{L}\s'-]+/giu, '')
    .replace(/\s+/gu, ' ');
}

const latinToCyrillicPairs: readonly [string, string][] = [
  ['shch', 'щ'],
  ['yo', 'е'],
  ['zh', 'ж'],
  ['kh', 'х'],
  ['ts', 'ц'],
  ['ch', 'ч'],
  ['sh', 'ш'],
  ['yu', 'ю'],
  ['ya', 'я'],
  ['a', 'а'],
  ['b', 'б'],
  ['v', 'в'],
  ['g', 'г'],
  ['d', 'д'],
  ['e', 'е'],
  ['z', 'з'],
  ['i', 'и'],
  ['y', 'й'],
  ['k', 'к'],
  ['l', 'л'],
  ['m', 'м'],
  ['n', 'н'],
  ['o', 'о'],
  ['p', 'п'],
  ['r', 'р'],
  ['s', 'с'],
  ['t', 'т'],
  ['u', 'у'],
  ['f', 'ф'],
  ['h', 'х']
];

const cyrillicToLatin: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ы: 'y', э: 'e', ю: 'yu', я: 'ya',
  ь: '', ъ: ''
};

function transliterateLatinToCyrillic(value: string): string {
  let result = value;
  for (const [latin, cyrillic] of latinToCyrillicPairs) {
    result = result.replace(new RegExp(latin, 'gu'), cyrillic);
  }
  return result;
}

function transliterateCyrillicToLatin(value: string): string {
  return [...value].map((char) => cyrillicToLatin[char] ?? char).join('');
}

function uniqueNameVariants(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function fingerprintNameVariants(values: readonly string[]): string {
  return uniqueNameVariants(values).sort().join('|');
}

function deriveReconciliationDeltaMinor(paymentSessionId: string, reference: string): number {
  const seed = [...`${paymentSessionId}:${reference}`].reduce((total, char) => total + char.charCodeAt(0), 0);
  return (seed % 99) + 1;
}

function receiverBank(
  bankProfileId: string,
  displayName: string,
  options: {
    runtimeCaptureStatus?: ReceiverBankOption['runtime_capture_status'];
    runtimeVerified?: boolean;
    runtimeVerifiedBy?: ReceiverBankOption['runtime_verified_by'];
    runtimeVerifiedAt?: string;
    packageName?: string;
    packageCertSha256?: string;
  } = {}
): ReceiverBankOption {
  const option: ReceiverBankOption = {
    receiver_bank_id: bankProfileId,
    bank_profile_id: bankProfileId,
    display_name: displayName,
    logo_asset_key: bankLogoAssetKey(bankProfileId),
    selectable: true,
    supported_roles: ['sender_bank', 'receiver_bank'],
    runtime_capture_status: options.runtimeCaptureStatus ?? 'observed',
    runtime_verified: options.runtimeVerified ?? false,
    package_name: options.packageName ?? bankPackageName(bankProfileId),
    package_cert_sha256: options.packageCertSha256 ?? 'documented_unknown',
    status: 'review_required_beta',
    review_only: true,
    detection_supported: true,
    merchant_receiver_account_id: null,
    beta_ready: true,
    disabled_reason: null,
    auto_confirm_enabled: false,
    official_bank_confirmation: false
  };
  assignIfDefined(option, 'runtime_verified_by', options.runtimeVerifiedBy);
  assignIfDefined(option, 'runtime_verified_at', options.runtimeVerifiedAt);
  return option;
}

export function bankLogoAssetKey(bankProfileId: string): string {
  switch (bankProfileId) {
    case 'sber_ru':
      return 'ic_bank_sberbank';
    case 'tbank_ru':
      return 'ic_bank_tbank';
    case 'vtb_ru':
      return 'ic_bank_vtb';
    case 'alfa_ru':
      return 'ic_bank_alfa';
    case 'gazprombank_ru':
      return 'ic_bank_gazprombank';
    case 'ozon_bank':
      return 'ic_bank_ozon';
    case 'orange_money_sn':
    case 'orange_money_ci':
    case 'orange_money_africa':
      return 'ic_bank_orange_money';
    case 'wave_sn':
      return 'ic_bank_wave';
    case 'mtn_momo_ci':
      return 'ic_bank_mtn_momo';
    case 'moov_money_ci':
      return 'ic_bank_moov';
    case 'free_money_sn':
      return 'ic_bank_free_money';
    case 'wizall_sn':
      return 'ic_bank_wizall';
    case 'djamo_ci':
      return 'ic_bank_djamo';
    case 'sg_connect_ci':
      return 'ic_bank_sg';
    case 'ecobank_ci':
      return 'ic_bank_ecobank';
    default:
      return 'ic_bank_unknown';
  }
}

function bankPackageName(bankProfileId: string): string {
  switch (bankProfileId) {
    case 'sber_ru':
      return 'ru.sberbankmobile';
    case 'tbank_ru':
      return 'com.idamob.tinkoff.android';
    case 'vtb_ru':
      return 'ru.vtb24.mobilebanking.android';
    case 'alfa_ru':
      return 'ru.alfabank.mobile.android';
    case 'gazprombank_ru':
      return 'ru.gazprombank.android.mobilebank.app';
    case 'ozon_bank':
      return 'ru.ozon.fintech.finance';
    default:
      return 'documented_unknown';
  }
}

function payerLauncher(
  payerBankLauncherId: string,
  displayName: string,
  androidPackageCandidates: readonly string[],
  options: {
    androidExplicitActivityName?: string;
    deeplinkSchemes?: readonly string[];
    deeplinkUriTemplate?: string;
    launchStrategy?: PayerBankLaunchStrategy;
    runtimeVerified?: boolean;
    runtimeVerifiedSource?: string;
    testedStatus?: PayerBankLauncherTestedStatus;
    country?: PayerBankCountry;
    ussdTransferTemplate?: string;
    enabled?: boolean;
  } = {}
): PayerBankLauncherOption {
  const androidPackageHint = androidPackageCandidates[0] ?? null;
  const launchStrategy = options.launchStrategy ?? (androidPackageHint ? 'package_hint_only' : 'manual_only');
  const launcher: PayerBankLauncherOption = {
    payer_bank_launcher_id: payerBankLauncherId,
    bank_id: payerBankLauncherId,
    display_name: displayName,
    country: options.country ?? 'RU',
    android_package_candidates: androidPackageCandidates,
    android_package_hint: androidPackageHint,
    deeplink_uri_template: options.deeplinkUriTemplate ?? null,
    deeplink_schemes: options.deeplinkSchemes ?? [],
    launch_url: androidPackageHint && launchStrategy !== 'ussd_dial'
      ? androidLaunchUrl({
          packageName: androidPackageHint,
          explicitActivityName: launchStrategy === 'explicit_activity_then_package' ? options.androidExplicitActivityName : undefined,
          deeplinkUriTemplate: launchStrategy === 'deeplink_then_package' ? options.deeplinkUriTemplate : undefined
        })
      : null,
    launch_strategy: launchStrategy,
    fallback_strategy: 'copy_details_manual_transfer',
    can_prefill_receiver_card: false,
    can_prefill_receiver_phone: false,
    can_prefill_amount: false,
    can_prefill_reference: false,
    tested_status: options.testedStatus ?? 'not_validated',
    enabled: options.enabled ?? true,
    detection_supported: false,
    runtime_verified: options.runtimeVerified ?? false,
    does_not_confirm_payment: true,
    official_bank_confirmation: false
  };
  assignIfDefined(launcher, 'android_explicit_activity_name', options.androidExplicitActivityName);
  assignIfDefined(launcher, 'runtime_verified_source', options.runtimeVerifiedSource);
  assignIfDefined(launcher, 'ussd_transfer_template', options.ussdTransferTemplate);
  return launcher;
}

function androidLaunchUrl(input: {
  packageName: string;
  explicitActivityName?: string | undefined;
  deeplinkUriTemplate?: string | undefined;
}): string {
  if (input.deeplinkUriTemplate) {
    const uri = new URL(input.deeplinkUriTemplate);
    const path = `${uri.host}${uri.pathname}`;
    return `intent://${path}#Intent;scheme=${uri.protocol.replace(':', '')};package=${input.packageName};category=android.intent.category.BROWSABLE;end`;
  }
  if (input.explicitActivityName) {
    return `intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${input.packageName};component=${input.packageName}/${input.explicitActivityName};end`;
  }
  return `intent://#Intent;package=${input.packageName};end`;
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

export const FallbackReviewReasons = [
  'no_notification_after_receiver_armed',
  'receiver_offline_after_arming',
  'notification_access_missing',
  'bank_target_missing',
  'launcher_failed_manual_transfer_possible'
] as const;
export type FallbackReviewReason = (typeof FallbackReviewReasons)[number];

export interface ManualBankCheckReview {
  review_id: string;
  payment_session_id: string;
  merchant_id: string;
  order_id: string;
  review_type: 'manual_bank_check';
  status: 'needs_review';
  official_bank_confirmation: false;
  payment_confirmed: false;
  webhook_sent: false;
  amount_expected_minor: number;
  display_amount_minor: number;
  reconciliation_delta_minor: number;
  currency: 'RUB';
  receiver_bank_id: string;
  receiving_route_id: string;
  fallback_reason: FallbackReviewReason;
  receiver_armed_at: string;
  fallback_due_at: string;
  created_at: string;
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

export const AndroidMerchantAccountAuthPaths = {
  DEVICE_LOOKUP: '/v1/android-merchant/auth/device-lookup',
  DEVICE_RECOVER: '/v1/android-merchant/auth/device-recover',
  CREATE_ACCOUNT: '/v1/android-merchant/auth/create-account',
  GOOGLE_EXCHANGE: '/v1/android-merchant/auth/google/exchange',
  GOOGLE_LINK: '/v1/android-merchant/auth/google/link',
  SESSION_REFRESH: '/v1/android-merchant/auth/session-refresh'
} as const;

export type AndroidMerchantAccountAuthPath =
  (typeof AndroidMerchantAccountAuthPaths)[keyof typeof AndroidMerchantAccountAuthPaths];

export const AndroidMerchantProfileTypes = {
  PERSONAL: 'personal',
  BUSINESS: 'business'
} as const;

export type AndroidMerchantProfileType =
  (typeof AndroidMerchantProfileTypes)[keyof typeof AndroidMerchantProfileTypes];

export const AndroidMerchantDeviceLookupIntents = {
  CREATE_ACCOUNT: 'create_account',
  RECOVER_ACCOUNT: 'recover_account'
} as const;

export type AndroidMerchantDeviceLookupIntent =
  (typeof AndroidMerchantDeviceLookupIntents)[keyof typeof AndroidMerchantDeviceLookupIntents];

export const AndroidMerchantDeviceLookupStatuses = {
  NEW_DEVICE: 'new_device',
  KNOWN_DEVICE: 'known_device',
  RECOVERY_REQUIRED: 'recovery_required'
} as const;

export type AndroidMerchantDeviceLookupStatus =
  (typeof AndroidMerchantDeviceLookupStatuses)[keyof typeof AndroidMerchantDeviceLookupStatuses];

export const AndroidMerchantDeviceStatuses = {
  ACTIVE: 'active',
  RECOVERY_REQUIRED: 'recovery_required',
  REVOKED: 'revoked'
} as const;

export type AndroidMerchantDeviceStatus =
  (typeof AndroidMerchantDeviceStatuses)[keyof typeof AndroidMerchantDeviceStatuses];

export const AndroidMerchantDeviceProofTypes = {
  INSTALL_KEYPAIR_SIGNED_CHALLENGE: 'install_keypair_signed_challenge'
} as const;

export type AndroidMerchantDeviceProofType =
  (typeof AndroidMerchantDeviceProofTypes)[keyof typeof AndroidMerchantDeviceProofTypes];

export const AndroidMerchantPermissionProfiles = {
  MERCHANT: 'merchant'
} as const;

export type AndroidMerchantPermissionProfile =
  (typeof AndroidMerchantPermissionProfiles)[keyof typeof AndroidMerchantPermissionProfiles];

export const AndroidMerchantMobileSessionTokenTypes = {
  SWIMPAY_MOBILE_SESSION: 'swimpay_mobile_session'
} as const;

export type AndroidMerchantMobileSessionTokenType =
  (typeof AndroidMerchantMobileSessionTokenTypes)[keyof typeof AndroidMerchantMobileSessionTokenTypes];

export const AndroidMerchantAccountErrorCodes = {
  PAYLOAD_INVALID: 'payload_invalid',
  RAW_DEVICE_IDENTIFIER_REJECTED: 'raw_device_identifier_rejected',
  MERCHANT_IDENTITY_NAME_REJECTED: 'merchant_identity_name_rejected',
  GOOGLE_RECOVERY_UNCONFIGURED: 'google_recovery_unconfigured',
  SERVICE_UNAVAILABLE: 'service_unavailable'
} as const;

export type AndroidMerchantAccountErrorCode =
  (typeof AndroidMerchantAccountErrorCodes)[keyof typeof AndroidMerchantAccountErrorCodes];

export const AndroidMerchantRawDeviceIdentifierFields = [
  'imei',
  'android_id',
  'advertising_id',
  'raw_fingerprint',
  'phone_number',
  'raw_phone',
  'contact_phone'
] as const;

export type AndroidMerchantRawDeviceIdentifierField = (typeof AndroidMerchantRawDeviceIdentifierFields)[number];

export const AndroidMerchantIdentityNameFields = [
  'first_name',
  'last_name',
  'full_name',
  'given_name',
  'family_name',
  'name'
] as const;

export type AndroidMerchantIdentityNameField = (typeof AndroidMerchantIdentityNameFields)[number];

export interface AndroidMerchantDeviceProof {
  install_public_key: string;
  challenge_id: string;
  challenge_signature: string;
}

export interface AndroidMerchantDeviceLookupRequest {
  lookup_intent: AndroidMerchantDeviceLookupIntent;
  device_proof: AndroidMerchantDeviceProof;
}

export interface AndroidMerchantDeviceRecoverRequest {
  device_proof: AndroidMerchantDeviceProof;
}

export interface AndroidMerchantCreateAccountRequest {
  profile_type: AndroidMerchantProfileType;
  business_label?: string;
  device_proof: AndroidMerchantDeviceProof;
}

export interface AndroidMerchantDeviceLookupResponse {
  device_status: AndroidMerchantDeviceLookupStatus;
  device_id: string | null;
  merchant_id: string | null;
  recovery_required: boolean;
  recovery_options: readonly 'google'[];
  google_required: false;
  raw_device_identifiers_allowed: false;
  device_proof_type: AndroidMerchantDeviceProofType;
}

export interface AndroidMerchantAccountCreateResponse {
  account: {
    user_id: string;
    merchant_id: string;
    profile_type: AndroidMerchantProfileType;
    display_handle: string;
    permission_profile: AndroidMerchantPermissionProfile;
    permissions: readonly string[];
    collected_identity_fields: readonly string[];
    google_required: false;
  };
  device: {
    device_id: string;
    device_status: typeof AndroidMerchantDeviceLookupStatuses.KNOWN_DEVICE;
    raw_device_identifiers_allowed: false;
  };
  mobile_session: {
    token: string;
    token_type: AndroidMerchantMobileSessionTokenType;
    expires_at: string;
  };
  onboarding: {
    starts_after_account_creation: true;
    android_confirms_payments: false;
  };
}

export type AndroidMerchantAccountValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; code: AndroidMerchantAccountErrorCode; field?: string };

export function validateAndroidMerchantDeviceLookupRequest(
  body: unknown
): AndroidMerchantAccountValidationResult<AndroidMerchantDeviceLookupRequest> {
  if (!isPlainRecord(body)) {
    return invalidAndroidMerchantAccountPayload();
  }

  const rawIdentifierField = findRawAndroidMerchantDeviceIdentifierField(body);
  if (rawIdentifierField) {
    return {
      valid: false,
      code: AndroidMerchantAccountErrorCodes.RAW_DEVICE_IDENTIFIER_REJECTED,
      field: rawIdentifierField
    };
  }

  const deviceProof = parseAndroidMerchantDeviceProofContract(body.device_proof);
  if (!deviceProof) {
    return invalidAndroidMerchantAccountPayload('device_proof');
  }

  return {
    valid: true,
    value: {
      lookup_intent: parseAndroidMerchantDeviceLookupIntentContract(body.lookup_intent),
      device_proof: deviceProof
    }
  };
}

export function validateAndroidMerchantDeviceRecoverRequest(
  body: unknown
): AndroidMerchantAccountValidationResult<AndroidMerchantDeviceRecoverRequest> {
  if (!isPlainRecord(body)) {
    return invalidAndroidMerchantAccountPayload();
  }

  const rawIdentifierField = findRawAndroidMerchantDeviceIdentifierField(body);
  if (rawIdentifierField) {
    return {
      valid: false,
      code: AndroidMerchantAccountErrorCodes.RAW_DEVICE_IDENTIFIER_REJECTED,
      field: rawIdentifierField
    };
  }

  const deviceProof = parseAndroidMerchantDeviceProofContract(body.device_proof);
  if (!deviceProof) {
    return invalidAndroidMerchantAccountPayload('device_proof');
  }

  return {
    valid: true,
    value: {
      device_proof: deviceProof
    }
  };
}

export function validateAndroidMerchantCreateAccountRequest(
  body: unknown
): AndroidMerchantAccountValidationResult<AndroidMerchantCreateAccountRequest> {
  if (!isPlainRecord(body)) {
    return invalidAndroidMerchantAccountPayload();
  }

  const rawIdentifierField = findRawAndroidMerchantDeviceIdentifierField(body);
  if (rawIdentifierField) {
    return {
      valid: false,
      code: AndroidMerchantAccountErrorCodes.RAW_DEVICE_IDENTIFIER_REJECTED,
      field: rawIdentifierField
    };
  }

  const identityNameField = findAndroidMerchantIdentityNameField(body);
  if (identityNameField) {
    return {
      valid: false,
      code: AndroidMerchantAccountErrorCodes.MERCHANT_IDENTITY_NAME_REJECTED,
      field: identityNameField
    };
  }

  const profileType = parseAndroidMerchantProfileTypeContract(body.profile_type);
  if (!profileType) {
    return invalidAndroidMerchantAccountPayload('profile_type');
  }

  const deviceProof = parseAndroidMerchantDeviceProofContract(body.device_proof);
  if (!deviceProof) {
    return invalidAndroidMerchantAccountPayload('device_proof');
  }

  const value: AndroidMerchantCreateAccountRequest = {
    profile_type: profileType,
    device_proof: deviceProof
  };
  assignIfDefined(value, 'business_label', optionalString(body.business_label));
  return { valid: true, value };
}

export function buildAndroidMerchantDeviceLookupResponse(input: {
  device_status: AndroidMerchantDeviceLookupStatus;
  device_id: string | null;
  merchant_id: string | null;
}): AndroidMerchantDeviceLookupResponse {
  const recoveryRequired = input.device_status === AndroidMerchantDeviceLookupStatuses.RECOVERY_REQUIRED;
  return {
    device_status: input.device_status,
    device_id: input.device_id,
    merchant_id: input.merchant_id,
    recovery_required: recoveryRequired,
    recovery_options: recoveryRequired ? ['google'] : [],
    google_required: false,
    raw_device_identifiers_allowed: false,
    device_proof_type: AndroidMerchantDeviceProofTypes.INSTALL_KEYPAIR_SIGNED_CHALLENGE
  };
}

export function buildAndroidMerchantAccountCreateResponse(input: {
  user_id: string;
  merchant_id: string;
  device_id: string;
  profile_type: AndroidMerchantProfileType;
  display_handle: string;
  permissions: readonly string[];
  mobile_session_token: string;
  mobile_session_expires_at: string;
}): AndroidMerchantAccountCreateResponse {
  return {
    account: {
      user_id: input.user_id,
      merchant_id: input.merchant_id,
      profile_type: input.profile_type,
      display_handle: input.display_handle,
      permission_profile: AndroidMerchantPermissionProfiles.MERCHANT,
      permissions: [...input.permissions],
      collected_identity_fields: [],
      google_required: false
    },
    device: {
      device_id: input.device_id,
      device_status: AndroidMerchantDeviceLookupStatuses.KNOWN_DEVICE,
      raw_device_identifiers_allowed: false
    },
    mobile_session: {
      token: input.mobile_session_token,
      token_type: AndroidMerchantMobileSessionTokenTypes.SWIMPAY_MOBILE_SESSION,
      expires_at: input.mobile_session_expires_at
    },
    onboarding: {
      starts_after_account_creation: true,
      android_confirms_payments: false
    }
  };
}

function parseAndroidMerchantDeviceProofContract(value: unknown): AndroidMerchantDeviceProof | null {
  if (!isPlainRecord(value)) {
    return null;
  }

  const installPublicKey = optionalString(value.install_public_key);
  const challengeId = optionalString(value.challenge_id);
  const challengeSignature = optionalString(value.challenge_signature);
  if (!installPublicKey || !challengeId || !challengeSignature) {
    return null;
  }

  return {
    install_public_key: installPublicKey,
    challenge_id: challengeId,
    challenge_signature: challengeSignature
  };
}

function parseAndroidMerchantDeviceLookupIntentContract(value: unknown): AndroidMerchantDeviceLookupIntent {
  return value === AndroidMerchantDeviceLookupIntents.RECOVER_ACCOUNT
    ? AndroidMerchantDeviceLookupIntents.RECOVER_ACCOUNT
    : AndroidMerchantDeviceLookupIntents.CREATE_ACCOUNT;
}

function parseAndroidMerchantProfileTypeContract(value: unknown): AndroidMerchantProfileType | null {
  return value === AndroidMerchantProfileTypes.PERSONAL || value === AndroidMerchantProfileTypes.BUSINESS
    ? value
    : null;
}

function findRawAndroidMerchantDeviceIdentifierField(value: unknown, path = ''): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findRawAndroidMerchantDeviceIdentifierField(value[index], `${path}[${index}]`);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (!isPlainRecord(value)) {
    return null;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.trim().toLowerCase();
    const fieldPath = path ? `${path}.${key}` : key;
    if ((AndroidMerchantRawDeviceIdentifierFields as readonly string[]).includes(normalizedKey)) {
      return fieldPath;
    }
    const found = findRawAndroidMerchantDeviceIdentifierField(nestedValue, fieldPath);
    if (found) {
      return found;
    }
  }

  return null;
}

function findAndroidMerchantIdentityNameField(value: unknown, path = ''): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findAndroidMerchantIdentityNameField(value[index], `${path}[${index}]`);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (!isPlainRecord(value)) {
    return null;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.trim().toLowerCase();
    const fieldPath = path ? `${path}.${key}` : key;
    if ((AndroidMerchantIdentityNameFields as readonly string[]).includes(normalizedKey)) {
      return fieldPath;
    }
    const found = findAndroidMerchantIdentityNameField(nestedValue, fieldPath);
    if (found) {
      return found;
    }
  }

  return null;
}

function invalidAndroidMerchantAccountPayload(field?: string) {
  return {
    valid: false,
    code: AndroidMerchantAccountErrorCodes.PAYLOAD_INVALID,
    ...(field ? { field } : {})
  } as const;
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
  ECDSA_P256_SHA256_DER_V1: 'ecdsa_p256_sha256_der_v1'
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
  payload_hash: string;
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

  if (!isNonEmptyString(body.public_key) || !isReceiverPublicKeyPem(body.public_key)) {
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
    'payload_hash',
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
    payload_hash: String(body.payload_hash).trim(),
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

function isReceiverPublicKeyPem(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.startsWith('-----BEGIN PUBLIC KEY-----') &&
    trimmed.endsWith('-----END PUBLIC KEY-----') &&
    !/^spk_/u.test(trimmed) &&
    !trimmed.includes('PRIVATE KEY')
  );
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
  return /^(raw_card|card_number|cardNumber|card_pan|cardPan|buyer_source_card_number|source_card|source_card_number|full_card|pan)$/iu.test(key);
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
