import {
  V1ReceiverBankOptions,
  getPayerBankLauncherOption,
  getReceiverBankOption,
  toAvailableSenderBanks,
  payerLaunchersForCurrency,
  mapCheckoutStateToBuyerSafeStatus,
  mapPaymentSessionToCheckoutState,
  toBuyerSafeReceivingRoute,
  bankLogoAssetKey,
  buildReceiverConsumerLink,
  buyerMethodTypeForRail,
  receivingCurrencyForBankProfile,
  type AvailableReceivingMethod,
  type AvailableSenderBank,
  type BuyerSafeCheckoutStatus,
  type BuyerSafeReceivingRoute,
  type BuyerCheckoutPaymentMethod,
  type CheckoutFallbackAction,
  type CheckoutSessionState,
  type CheckoutUnavailableReason,
  type MerchantReceivingRoute,
  type PaymentCompatibilityPair,
  type PaymentSessionStatus,
  type PayerBankLauncherOption,
  type ReceivingRouteRailType,
  type ReceiverBankOption
} from '@swimpay/contracts';
import { formatAmountMinor, type StoredOrderRecord, type StoredPaymentSessionRecord } from './orders.js';

export type ReceiverStatus = 'arming' | 'armed' | 'waiting' | 'expired' | 'review' | 'complete' | 'rejected';

const allowedPaymentSessionTransitions: Record<PaymentSessionStatus, PaymentSessionStatus[]> = {
  created: ['receiver_arming', 'expired'],
  receiver_arming: ['receiver_armed', 'expired'],
  receiver_armed: ['awaiting_payment', 'expired'],
  awaiting_payment: ['buyer_claimed_paid', 'signal_detected', 'expired'],
  buyer_claimed_paid: ['signal_detected', 'expired'],
  signal_detected: ['matching', 'expired'],
  matching: ['needs_review', 'manual_confirmed', 'rejected', 'expired'],
  needs_review: ['manual_confirmed', 'rejected', 'expired'],
  manual_confirmed: [],
  rejected: [],
  expired: []
};

const expirableStatuses = new Set<PaymentSessionStatus>([
  'created',
  'receiver_arming',
  'receiver_armed',
  'awaiting_payment',
  'buyer_claimed_paid',
  'signal_detected',
  'matching',
  'needs_review'
]);

export interface PaymentSessionReadResponse {
  payment_session_id: string;
  order_id: string;
  external_id?: string | undefined;
  status: PaymentSessionStatus;
  checkout_state: CheckoutSessionState;
  buyer_safe_status: BuyerSafeCheckoutStatus;
  amount: {
    value: string;
    currency: string;
  };
  reference: string;
  receiver_status: ReceiverStatus;
  expires_at: string;
  selected_receiver_bank_id?: string | undefined;
  selected_receiving_route_id?: string | undefined;
  receiving_route_id?: string | undefined;
  receiver_method_type?: BuyerCheckoutPaymentMethod | undefined;
  selected_payer_bank_launcher_id?: string | undefined;
  buyer_sender_phone_masked?: string | undefined;
  payment_method?: BuyerCheckoutPaymentMethod | undefined;
  sender_bank_id?: string | undefined;
  sender_card_masked?: string | undefined;
  sender_phone_masked?: string | undefined;
  selected_sender_bank_id?: string | undefined;
  sender_bank_name?: string | undefined;
  sender_bank_logo_asset_key?: string | undefined;
  receiver_bank_name?: string | undefined;
  receiver_bank_logo_asset_key?: string | undefined;
  display_amount?: { value: string; currency: string } | undefined;
  payable_amount?: { value: string; currency: string } | undefined;
  reconciliation_delta_minor?: number | undefined;
  route_locked_at?: string | undefined;
  route_lock_expires_at?: string | undefined;
  available_payment_methods?: AvailableCheckoutPaymentMethods | undefined;
  available_receiving_methods?: readonly AvailableReceivingMethod[] | undefined;
  available_sender_banks?: readonly AvailableSenderBank[] | undefined;
  available_routes?: readonly AvailableCheckoutRoute[] | undefined;
  available_compatibility_pairs?: readonly PaymentCompatibilityPair[] | undefined;
  unavailable_reason?: CheckoutUnavailableReason | undefined;
  fallback_actions?: readonly CheckoutFallbackAction[] | undefined;
  return_url?: string | undefined;
  /** Present when baseCurrency is set and differs from the current session currency.
   * Enables dual-currency display: shows the original base amount alongside the quoted amount. */
  base_amount?: { value: string; currency: string } | undefined;
  official_bank_confirmation: false;
}

export interface CheckoutStatusResponse {
  payment_session_id: string;
  order_id: string;
  external_id?: string | undefined;
  status: PaymentSessionStatus;
  checkout_state: CheckoutSessionState;
  buyer_safe_status: BuyerSafeCheckoutStatus;
  amount: {
    value: string;
    currency: string;
  };
  reference: string;
  expires_at: string;
  receiver_status: ReceiverStatus;
  selected_receiver_bank_id?: string | undefined;
  selected_receiving_route_id?: string | undefined;
  receiving_route_id?: string | undefined;
  receiver_method_type?: BuyerCheckoutPaymentMethod | undefined;
  selected_payer_bank_launcher_id?: string | undefined;
  buyer_sender_phone_masked?: string | undefined;
  payment_method?: BuyerCheckoutPaymentMethod | undefined;
  sender_bank_id?: string | undefined;
  sender_card_masked?: string | undefined;
  sender_phone_masked?: string | undefined;
  selected_sender_bank_id?: string | undefined;
  sender_bank_name?: string | undefined;
  sender_bank_logo_asset_key?: string | undefined;
  receiver_bank_name?: string | undefined;
  receiver_bank_logo_asset_key?: string | undefined;
  display_amount?: { value: string; currency: string } | undefined;
  payable_amount?: { value: string; currency: string } | undefined;
  reconciliation_delta_minor?: number | undefined;
  route_locked_at?: string | undefined;
  route_lock_expires_at?: string | undefined;
  available_payment_methods?: AvailableCheckoutPaymentMethods | undefined;
  available_receiving_methods?: readonly AvailableReceivingMethod[] | undefined;
  available_sender_banks?: readonly AvailableSenderBank[] | undefined;
  available_routes?: readonly AvailableCheckoutRoute[] | undefined;
  available_compatibility_pairs?: readonly PaymentCompatibilityPair[] | undefined;
  unavailable_reason?: CheckoutUnavailableReason | undefined;
  fallback_actions?: readonly CheckoutFallbackAction[] | undefined;
  receiver_bank_status?: ReceiverBankOption['status'] | undefined;
  return_url?: string | undefined;
  base_amount?: { value: string; currency: string } | undefined;
  official_bank_confirmation: false;
}

export interface AvailableCheckoutPaymentMethods {
  card: boolean;
  sbp: boolean;
  mobile_money: boolean;
  wallet: boolean;
}

export interface AvailableCheckoutRoute {
  route_id: string;
  method_type: BuyerCheckoutPaymentMethod;
  receiver_bank_id: string;
  bank_id: string;
  masked_value: string;
  certification_status: 'checkout_allowed';
  status: 'active';
}

export interface ReceiverBanksResponse {
  payment_session_id: string;
  receiver_banks: readonly ReceiverBankOption[];
  selected_receiver_bank_id?: string | undefined;
  official_bank_confirmation: false;
}

export interface ReceivingRoutesForBankResponse {
  payment_session_id: string;
  bank_profile_id: string;
  routes: readonly BuyerSafeReceivingRoute[];
  official_bank_confirmation: false;
}

export interface ReceivingRouteCopyDetailsResponse {
  payment_session_id: string;
  receiving_route_id: string;
  rail_type: ReceivingRouteRailType;
  receiver_identifier_type: MerchantReceivingRoute['receiver_identifier_type'];
  receiver_identifier_masked: string;
  masked_identifier: string;
  receiver_identifier_copy_value: string;
  destination_value: string;
  /** Personal-tier link that opens the payer's app pre-targeted on the merchant (e.g. a Revolut
   *  revtag → revolut.me/<tag>). null when the rail/identifier has no shareable personal link. */
  receiver_consumer_link: string | null;
  reveal_expires_at: string;
  copy_action: 'explicit_buyer_copy';
  does_not_confirm_payment: true;
  official_bank_confirmation: false;
}

export interface PayerBankLaunchersResponse {
  payment_session_id: string;
  payer_bank_launchers: readonly PayerBankLauncherOption[];
  selected_payer_bank_launcher_id?: string | undefined;
  does_not_confirm_payment: true;
  official_bank_confirmation: false;
}

export function isPaymentSessionTransitionAllowed(from: PaymentSessionStatus, to: PaymentSessionStatus): boolean {
  return allowedPaymentSessionTransitions[from].includes(to);
}

export function resolvePaymentSessionStatusForRead(
  session: Pick<StoredPaymentSessionRecord, 'status' | 'validUntil'>,
  now: Date
): PaymentSessionStatus {
  if (expirableStatuses.has(session.status) && new Date(session.validUntil).getTime() <= now.getTime()) {
    return 'expired';
  }

  return session.status;
}

export function receiverStatusFromPaymentSessionStatus(status: PaymentSessionStatus): ReceiverStatus {
  switch (status) {
    case 'receiver_arming':
      return 'arming';
    case 'receiver_armed':
      return 'armed';
    case 'awaiting_payment':
    case 'buyer_claimed_paid':
    case 'signal_detected':
    case 'matching':
      return 'waiting';
    case 'needs_review':
      return 'review';
    case 'manual_confirmed':
      return 'complete';
    case 'rejected':
      return 'rejected';
    case 'created':
      return 'arming';
    case 'expired':
      return 'expired';
  }
}

export function toPaymentSessionReadResponse(params: {
  order: StoredOrderRecord;
  paymentSession: StoredPaymentSessionRecord;
  now: Date;
  availableRoutes?: readonly MerchantReceivingRoute[] | undefined;
  /** Count of currencies the merchant can receive. When provided and >= 2, triggers the
   * currency_selection step if no currency has been chosen yet.
   * Computed from merchant receivable_currencies BEFORE FX quoting (availability of FX
   * only affects which currencies appear in the GET /payable-currencies listing, not
   * whether the step itself is shown). */
  payableCurrencyCount?: number | undefined;
}): PaymentSessionReadResponse {
  const status = resolvePaymentSessionStatusForRead(params.paymentSession, params.now);
  const checkoutState = checkoutStateForPaymentSession(params.paymentSession, status, params.payableCurrencyCount);
  const availability = params.availableRoutes ? buildCheckoutAvailability(params.paymentSession, params.availableRoutes) : null;
  const senderBank = params.paymentSession.senderBankId
    ? getPayerBankLauncherOption(params.paymentSession.senderBankId)
    : null;
  const receiverBank = params.paymentSession.selectedReceiverBankId
    ? getReceiverBankOption(params.paymentSession.selectedReceiverBankId)
    : null;

  return stripUndefined({
    payment_session_id: params.paymentSession.id,
    order_id: params.order.id,
    external_id: params.order.externalId,
    status,
    checkout_state: checkoutState,
    buyer_safe_status: mapCheckoutStateToBuyerSafeStatus(checkoutState),
    amount: {
      value: formatAmountMinor(params.paymentSession.expectedAmountMinor, params.paymentSession.currency),
      currency: params.paymentSession.currency
    },
    reference: params.paymentSession.referenceCode,
    receiver_status: receiverStatusFromPaymentSessionStatus(status),
    expires_at: params.paymentSession.validUntil,
    selected_receiver_bank_id: params.paymentSession.selectedReceiverBankId,
    selected_receiving_route_id: params.paymentSession.selectedReceivingRouteId,
    receiving_route_id: params.paymentSession.selectedReceivingRouteId,
    receiver_method_type: receiverMethodTypeForSession(params.paymentSession),
    selected_payer_bank_launcher_id: params.paymentSession.selectedPayerBankLauncherId,
    buyer_sender_phone_masked: params.paymentSession.buyerSenderPhoneMasked,
    payment_method: params.paymentSession.paymentMethod,
    sender_bank_id: params.paymentSession.senderBankId,
    sender_card_masked: params.paymentSession.senderCardMasked,
    sender_phone_masked: params.paymentSession.senderPhoneMasked,
    selected_sender_bank_id: params.paymentSession.senderBankId,
    sender_bank_name: senderBank?.display_name,
    sender_bank_logo_asset_key: params.paymentSession.senderBankId ? bankLogoAssetKey(params.paymentSession.senderBankId) : undefined,
    receiver_bank_name: receiverBank?.display_name,
    receiver_bank_logo_asset_key: params.paymentSession.selectedReceiverBankId
      ? bankLogoAssetKey(params.paymentSession.selectedReceiverBankId)
      : undefined,
    display_amount: params.paymentSession.displayAmountMinor !== undefined
      ? { value: formatAmountMinor(params.paymentSession.displayAmountMinor, params.paymentSession.currency), currency: params.paymentSession.currency }
      : undefined,
    payable_amount: params.paymentSession.payableAmountMinor !== undefined
      ? { value: formatAmountMinor(params.paymentSession.payableAmountMinor, params.paymentSession.currency), currency: params.paymentSession.currency }
      : undefined,
    reconciliation_delta_minor: params.paymentSession.reconciliationDeltaMinor,
    route_locked_at: params.paymentSession.routeLockedAt,
    route_lock_expires_at: params.paymentSession.routeLockExpiresAt,
    available_payment_methods: availability?.available_payment_methods,
    available_receiving_methods: availability?.available_receiving_methods,
    available_sender_banks: toAvailableSenderBanks(payerLaunchersForCurrency(params.paymentSession.currency)),
    available_routes: availability?.available_routes,
    available_compatibility_pairs: availability?.available_compatibility_pairs,
    unavailable_reason: availability?.unavailable_reason,
    fallback_actions: availability?.fallback_actions,
    return_url: params.order.returnUrl,
    // Dual-currency display: show original base amount when a re-quote has changed the currency.
    base_amount:
      params.paymentSession.baseCurrency &&
      params.paymentSession.baseAmountMinor !== undefined &&
      params.paymentSession.baseCurrency !== params.paymentSession.currency
        ? {
            value: formatAmountMinor(params.paymentSession.baseAmountMinor, params.paymentSession.baseCurrency),
            currency: params.paymentSession.baseCurrency
          }
        : undefined,
    official_bank_confirmation: false
  }) as unknown as PaymentSessionReadResponse;
}

export function toCheckoutStatusResponse(params: {
  order: StoredOrderRecord;
  paymentSession: StoredPaymentSessionRecord;
  now: Date;
  availableRoutes?: readonly MerchantReceivingRoute[] | undefined;
  payableCurrencyCount?: number | undefined;
}): CheckoutStatusResponse {
  const read = toPaymentSessionReadResponse(params);
  const receiverBank = params.paymentSession.selectedReceiverBankId
    ? getReceiverBankOption(params.paymentSession.selectedReceiverBankId)
    : null;

  return stripUndefined({
    payment_session_id: read.payment_session_id,
    order_id: read.order_id,
    external_id: read.external_id,
    status: read.status,
    checkout_state: read.checkout_state,
    buyer_safe_status: read.buyer_safe_status,
    amount: read.amount,
    reference: read.reference,
    expires_at: read.expires_at,
    receiver_status: read.receiver_status,
    selected_receiver_bank_id: read.selected_receiver_bank_id,
    selected_receiving_route_id: read.selected_receiving_route_id,
    receiving_route_id: read.receiving_route_id,
    receiver_method_type: read.receiver_method_type,
    selected_payer_bank_launcher_id: read.selected_payer_bank_launcher_id,
    buyer_sender_phone_masked: read.buyer_sender_phone_masked,
    payment_method: read.payment_method,
    sender_bank_id: read.sender_bank_id,
    sender_card_masked: read.sender_card_masked,
    sender_phone_masked: read.sender_phone_masked,
    selected_sender_bank_id: read.selected_sender_bank_id,
    sender_bank_name: read.sender_bank_name,
    sender_bank_logo_asset_key: read.sender_bank_logo_asset_key,
    receiver_bank_name: read.receiver_bank_name,
    receiver_bank_logo_asset_key: read.receiver_bank_logo_asset_key,
    display_amount: read.display_amount,
    payable_amount: read.payable_amount,
    reconciliation_delta_minor: read.reconciliation_delta_minor,
    route_locked_at: read.route_locked_at,
    route_lock_expires_at: read.route_lock_expires_at,
    available_payment_methods: read.available_payment_methods,
    available_receiving_methods: read.available_receiving_methods,
    available_sender_banks: read.available_sender_banks,
    available_routes: read.available_routes,
    available_compatibility_pairs: read.available_compatibility_pairs,
    unavailable_reason: read.unavailable_reason,
    fallback_actions: read.fallback_actions,
    receiver_bank_status: receiverBank?.status,
    return_url: read.return_url,
    official_bank_confirmation: false
  }) as unknown as CheckoutStatusResponse;
}

function receiverMethodTypeForSession(
  paymentSession: Pick<StoredPaymentSessionRecord, 'paymentMethod' | 'selectedReceivingRouteId'>
): BuyerCheckoutPaymentMethod | undefined {
  if (!paymentSession.selectedReceivingRouteId || !paymentSession.paymentMethod) {
    return undefined;
  }
  return paymentSession.paymentMethod;
}

export function buildCheckoutAvailability(
  paymentSession: Pick<
    StoredPaymentSessionRecord,
    | 'id'
    | 'merchantId'
    | 'paymentMethod'
    | 'senderBankId'
    | 'selectedReceivingRouteId'
    | 'displayAmountMinor'
    | 'payableAmountMinor'
    | 'reconciliationDeltaMinor'
    | 'currency'
    | 'currencySelectedAt'
  >,
  routes: readonly MerchantReceivingRoute[]
): {
  available_payment_methods: AvailableCheckoutPaymentMethods;
  available_receiving_methods: readonly AvailableReceivingMethod[];
  available_routes: readonly AvailableCheckoutRoute[];
  available_compatibility_pairs: readonly PaymentCompatibilityPair[];
  unavailable_reason?: CheckoutUnavailableReason | undefined;
  fallback_actions: readonly CheckoutFallbackAction[];
} {
  const availableRoutes = routes
    .filter((route) => route.enabled && route.lifecycle_status === 'active')
    // Currency-first: once the buyer has chosen a currency, only surface the routes (and hence
    // methods) that settle in it — otherwise a card/SBP method leaks into an XOF/USD checkout and
    // the buyer submits sbp+XOF, which the expected-payment-profile rejects ("XOF not supported
    // for sbp"). Before any choice (single-currency / legacy), keep every route.
    .filter((route) =>
      !paymentSession.currencySelectedAt ||
      receivingCurrencyForBankProfile(route.bank_profile_id) === paymentSession.currency
    )
    .map((route) => ({
      route_id: route.route_id,
      method_type: buyerMethodTypeForRail(route.rail_type),
      receiver_bank_id: route.bank_profile_id,
      bank_id: route.bank_profile_id,
      masked_value: route.receiver_identifier_masked,
      certification_status: 'checkout_allowed' as const,
      status: 'active' as const
    }));
  const availableReceivingMethods = availableRoutes.map((route) => {
    const receiverBank = getReceiverBankOption(route.receiver_bank_id);
    return {
      method: route.method_type,
      label:
        route.method_type === 'card'
          ? ('Carte' as const)
          : route.method_type === 'mobile_money'
            ? ('Mobile money' as const)
            : route.method_type === 'wallet'
              ? ('Wallet' as const)
              : ('SBP' as const),
      available: true,
      route_id: route.route_id,
      receiver_bank_id: route.receiver_bank_id,
      receiver_bank_name: receiverBank?.display_name ?? route.receiver_bank_id,
      receiver_bank_logo_asset_key: receiverBank?.logo_asset_key ?? bankLogoAssetKey(route.receiver_bank_id),
      settlement_currency: receivingCurrencyForBankProfile(route.receiver_bank_id),
      status: 'active' as const
    };
  });
  const methods: AvailableCheckoutPaymentMethods = {
    card: availableRoutes.some((route) => route.method_type === 'card'),
    sbp: availableRoutes.some((route) => route.method_type === 'sbp'),
    mobile_money: availableRoutes.some((route) => route.method_type === 'mobile_money'),
    wallet: availableRoutes.some((route) => route.method_type === 'wallet')
  };
  const unavailableReason = !methods.card && !methods.sbp && !methods.mobile_money && !methods.wallet
    ? 'merchant_no_active_receiving_method'
    : paymentSession.paymentMethod && !methods[paymentSession.paymentMethod]
      ? 'method_not_supported_by_merchant'
      : undefined;
  const compatibilityPairs = buildPaymentCompatibilityPairs(paymentSession, routes);
  const fallbackActions = buildCheckoutFallbackActions(methods);

  return stripUndefined({
    available_payment_methods: methods,
    available_receiving_methods: availableReceivingMethods,
    available_routes: availableRoutes,
    available_compatibility_pairs: compatibilityPairs,
    fallback_actions: fallbackActions,
    unavailable_reason: unavailableReason
  }) as {
    available_payment_methods: AvailableCheckoutPaymentMethods;
    available_receiving_methods: readonly AvailableReceivingMethod[];
    available_routes: readonly AvailableCheckoutRoute[];
    available_compatibility_pairs: readonly PaymentCompatibilityPair[];
    unavailable_reason?: CheckoutUnavailableReason | undefined;
    fallback_actions: readonly CheckoutFallbackAction[];
  };
}

function buildPaymentCompatibilityPairs(
  paymentSession: Pick<
    StoredPaymentSessionRecord,
    | 'id'
    | 'merchantId'
    | 'senderBankId'
    | 'selectedReceivingRouteId'
    | 'displayAmountMinor'
    | 'payableAmountMinor'
    | 'reconciliationDeltaMinor'
  >,
  routes: readonly MerchantReceivingRoute[]
): readonly PaymentCompatibilityPair[] {
  return routes
    .filter((route) => route.enabled && route.lifecycle_status === 'active')
    .map((route) => {
      const method = buyerMethodTypeForRail(route.rail_type);
      const selected = route.route_id === paymentSession.selectedReceivingRouteId;
      return stripUndefined({
        pair_id: `${paymentSession.id}:${route.route_id}:${method}`,
        payment_session_id: paymentSession.id,
        merchant_id: paymentSession.merchantId,
        receiving_route_id: route.route_id,
        receiver_bank_id: route.bank_profile_id,
        receiver_method_type: method,
        payer_method_type: method,
        sender_bank_id: paymentSession.senderBankId,
        payer_bank_launcher_id: paymentSession.senderBankId,
        compatibility_status: 'compatible',
        fallback_strategy: paymentSession.senderBankId ? 'manual_copy_paste' : 'none',
        can_open_bank_app: Boolean(paymentSession.senderBankId),
        can_prefill_payment: false,
        requires_manual_copy: true,
        display_amount_minor: selected ? paymentSession.displayAmountMinor : undefined,
        reconciliation_delta_minor: selected ? paymentSession.reconciliationDeltaMinor : undefined,
        payable_amount_minor: selected ? paymentSession.payableAmountMinor : undefined,
        reason_labels: [
          'merchant_receiving_route_active',
          'method_pair_compatible',
          'certification_checkout_allowed',
          'manual_confirmation_required_v1'
        ]
      }) as unknown as PaymentCompatibilityPair;
    });
}

function buildCheckoutFallbackActions(methods: AvailableCheckoutPaymentMethods): readonly CheckoutFallbackAction[] {
  const actions: CheckoutFallbackAction[] = [];
  if (methods.card) actions.push('switch_to_card');
  if (methods.sbp) actions.push('switch_to_sbp');
  actions.push('refresh_methods', 'return_to_merchant');
  return actions;
}

export function toReceiverBanksResponse(
  paymentSession: StoredPaymentSessionRecord,
  routes: readonly MerchantReceivingRoute[] = []
): ReceiverBanksResponse {
  return stripUndefined({
    payment_session_id: paymentSession.id,
    receiver_banks: V1ReceiverBankOptions.map((bank) => withRouteSummary(bank, routes)),
    selected_receiver_bank_id: paymentSession.selectedReceiverBankId,
    official_bank_confirmation: false
  }) as unknown as ReceiverBanksResponse;
}

export function toPayerBankLaunchersResponse(paymentSession: StoredPaymentSessionRecord): PayerBankLaunchersResponse {
  return stripUndefined({
    payment_session_id: paymentSession.id,
    // Currency-scoped, identical source of truth as available_sender_banks
    // (toPaymentSessionReadResponse): a session never shows payer banks it
    // cannot route. XOF/XAF -> West Africa launchers, everything else -> RU.
    payer_bank_launchers: payerLaunchersForCurrency(paymentSession.currency),
    selected_payer_bank_launcher_id: paymentSession.selectedPayerBankLauncherId,
    does_not_confirm_payment: true,
    official_bank_confirmation: false
  }) as unknown as PayerBankLaunchersResponse;
}

export function buildReceiverBankSelectionResponse(params: {
  order: StoredOrderRecord;
  paymentSession: StoredPaymentSessionRecord;
  now: Date;
  availableRoutes?: readonly MerchantReceivingRoute[] | undefined;
}): Record<string, unknown> {
  const status = toCheckoutStatusResponse(params);
  return stripUndefined({
    ...status,
    selected_receiver_bank: params.paymentSession.selectedReceiverBankId
      ? getReceiverBankOption(params.paymentSession.selectedReceiverBankId)
      : null
  });
}

export function toReceivingRoutesForBankResponse(params: {
  paymentSession: StoredPaymentSessionRecord;
  bankProfileId: string;
  routes: readonly MerchantReceivingRoute[];
}): ReceivingRoutesForBankResponse {
  return {
    payment_session_id: params.paymentSession.id,
    bank_profile_id: params.bankProfileId,
    routes: params.routes.map((route) => toBuyerSafeReceivingRoute(route)),
    official_bank_confirmation: false
  };
}

export function toReceivingRouteCopyDetailsResponse(params: {
  paymentSession: StoredPaymentSessionRecord;
  route: MerchantReceivingRoute;
  receiverIdentifier: string;
  revealExpiresAt: string;
}): ReceivingRouteCopyDetailsResponse {
  return {
    payment_session_id: params.paymentSession.id,
    receiving_route_id: params.route.route_id,
    rail_type: params.route.rail_type,
    receiver_identifier_type: params.route.receiver_identifier_type,
    receiver_identifier_masked: params.route.receiver_identifier_masked,
    masked_identifier: params.route.receiver_identifier_masked,
    receiver_identifier_copy_value: params.receiverIdentifier,
    destination_value: params.receiverIdentifier,
    receiver_consumer_link: buildReceiverConsumerLink({
      bankProfileId: params.route.bank_profile_id,
      receiverIdentifierType: params.route.receiver_identifier_type,
      receiverIdentifier: params.receiverIdentifier
    }),
    reveal_expires_at: params.revealExpiresAt,
    copy_action: 'explicit_buyer_copy',
    does_not_confirm_payment: true,
    official_bank_confirmation: false
  };
}

export function buildReceivingRouteSelectionResponse(params: {
  order: StoredOrderRecord;
  paymentSession: StoredPaymentSessionRecord;
  now: Date;
  route: MerchantReceivingRoute | null;
}): Record<string, unknown> {
  return stripUndefined({
    ...toCheckoutStatusResponse(params),
    selected_receiving_route: params.route ? toBuyerSafeReceivingRoute(params.route) : null
  });
}

export function buildBuyerSenderPhoneHintResponse(params: {
  order: StoredOrderRecord;
  paymentSession: StoredPaymentSessionRecord;
  now: Date;
}): Record<string, unknown> {
  return stripUndefined({
    ...toCheckoutStatusResponse(params),
    buyer_sender_phone_masked: params.paymentSession.buyerSenderPhoneMasked,
    does_not_confirm_payment: true
  });
}

export function buildPayerBankLauncherSelectionResponse(params: {
  order: StoredOrderRecord;
  paymentSession: StoredPaymentSessionRecord;
  now: Date;
}): Record<string, unknown> {
  const status = toCheckoutStatusResponse(params);
  return stripUndefined({
    ...status,
    selected_payer_bank_launcher: params.paymentSession.selectedPayerBankLauncherId
      ? getPayerBankLauncherOption(params.paymentSession.selectedPayerBankLauncherId)
      : null,
    does_not_confirm_payment: true
  });
}

export function buildCheckoutActionResponse(params: {
  order: StoredOrderRecord;
  paymentSession: StoredPaymentSessionRecord;
  now: Date;
  buyerClaimedPaid?: boolean;
  buyerClaimResult?: string | undefined;
}): Record<string, unknown> {
  return stripUndefined({
    ...toCheckoutStatusResponse(params),
    buyer_claimed_paid: params.buyerClaimedPaid,
    claim_result: params.buyerClaimResult,
    does_not_confirm_payment: true
  });
}

function checkoutStateForPaymentSession(
  paymentSession: StoredPaymentSessionRecord,
  status: PaymentSessionStatus,
  payableCurrencyCount?: number | undefined
): CheckoutSessionState {
  return mapPaymentSessionToCheckoutState({
    paymentSessionStatus: status,
    paymentMethod: paymentSession.paymentMethod,
    selectedReceiverBankId: paymentSession.selectedReceiverBankId,
    selectedReceivingRouteId: paymentSession.selectedReceivingRouteId,
    selectedPayerBankLauncherId: paymentSession.selectedPayerBankLauncherId,
    paymentInstructionsShownAt: paymentSession.paymentInstructionsShownAt,
    // Thread currency-selection gating. When undefined, mapPaymentSessionToCheckoutState
    // preserves byte-identical legacy behavior (the currency_selection state is never reached).
    payableCurrencyCount,
    currencySelectedAt: paymentSession.currencySelectedAt
  });
}

function withRouteSummary(bank: ReceiverBankOption, routes: readonly MerchantReceivingRoute[]): ReceiverBankOption {
  const bankRoutes = routes.filter((route) => route.bank_profile_id === bank.bank_profile_id && route.enabled && route.lifecycle_status === 'active');
  const railTypes = [...new Set(bankRoutes.map((route) => route.rail_type))] as ReceivingRouteRailType[];
  const recommended = bankRoutes.find((route) => route.recommended) ?? bankRoutes[0] ?? null;
  return stripUndefined({
    ...bank,
    available_route_count: bankRoutes.length,
    rail_types: railTypes,
    recommended_rail_type: recommended?.rail_type ?? null
  }) as unknown as ReceiverBankOption;
}

function stripUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
