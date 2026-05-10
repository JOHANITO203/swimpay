import {
  PayerBankLauncherRegistry,
  V1ReceiverBankOptions,
  getPayerBankLauncherOption,
  getReceiverBankOption,
  mapCheckoutStateToBuyerSafeStatus,
  mapPaymentSessionToCheckoutState,
  toBuyerSafeReceivingRoute,
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
  display_amount?: { value: string; currency: string } | undefined;
  payable_amount?: { value: string; currency: string } | undefined;
  reconciliation_delta_minor?: number | undefined;
  available_payment_methods?: AvailableCheckoutPaymentMethods | undefined;
  available_routes?: readonly AvailableCheckoutRoute[] | undefined;
  available_compatibility_pairs?: readonly PaymentCompatibilityPair[] | undefined;
  unavailable_reason?: CheckoutUnavailableReason | undefined;
  fallback_actions?: readonly CheckoutFallbackAction[] | undefined;
  official_bank_confirmation: false;
}

export interface CheckoutStatusResponse {
  payment_session_id: string;
  order_id: string;
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
  display_amount?: { value: string; currency: string } | undefined;
  payable_amount?: { value: string; currency: string } | undefined;
  reconciliation_delta_minor?: number | undefined;
  available_payment_methods?: AvailableCheckoutPaymentMethods | undefined;
  available_routes?: readonly AvailableCheckoutRoute[] | undefined;
  available_compatibility_pairs?: readonly PaymentCompatibilityPair[] | undefined;
  unavailable_reason?: CheckoutUnavailableReason | undefined;
  fallback_actions?: readonly CheckoutFallbackAction[] | undefined;
  receiver_bank_status?: ReceiverBankOption['status'] | undefined;
  official_bank_confirmation: false;
}

export interface AvailableCheckoutPaymentMethods {
  card: boolean;
  sbp: boolean;
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
}): PaymentSessionReadResponse {
  const status = resolvePaymentSessionStatusForRead(params.paymentSession, params.now);
  const checkoutState = checkoutStateForPaymentSession(params.paymentSession, status);
  const availability = params.availableRoutes ? buildCheckoutAvailability(params.paymentSession, params.availableRoutes) : null;

  return stripUndefined({
    payment_session_id: params.paymentSession.id,
    order_id: params.order.id,
    status,
    checkout_state: checkoutState,
    buyer_safe_status: mapCheckoutStateToBuyerSafeStatus(checkoutState),
    amount: {
      value: formatAmountMinor(params.paymentSession.expectedAmountMinor),
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
    display_amount: params.paymentSession.displayAmountMinor !== undefined
      ? { value: formatAmountMinor(params.paymentSession.displayAmountMinor), currency: params.paymentSession.currency }
      : undefined,
    payable_amount: params.paymentSession.payableAmountMinor !== undefined
      ? { value: formatAmountMinor(params.paymentSession.payableAmountMinor), currency: params.paymentSession.currency }
      : undefined,
    reconciliation_delta_minor: params.paymentSession.reconciliationDeltaMinor,
    available_payment_methods: availability?.available_payment_methods,
    available_routes: availability?.available_routes,
    available_compatibility_pairs: availability?.available_compatibility_pairs,
    unavailable_reason: availability?.unavailable_reason,
    fallback_actions: availability?.fallback_actions,
    official_bank_confirmation: false
  }) as unknown as PaymentSessionReadResponse;
}

export function toCheckoutStatusResponse(params: {
  order: StoredOrderRecord;
  paymentSession: StoredPaymentSessionRecord;
  now: Date;
  availableRoutes?: readonly MerchantReceivingRoute[] | undefined;
}): CheckoutStatusResponse {
  const read = toPaymentSessionReadResponse(params);
  const receiverBank = params.paymentSession.selectedReceiverBankId
    ? getReceiverBankOption(params.paymentSession.selectedReceiverBankId)
    : null;

  return stripUndefined({
    payment_session_id: read.payment_session_id,
    order_id: read.order_id,
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
    display_amount: read.display_amount,
    payable_amount: read.payable_amount,
    reconciliation_delta_minor: read.reconciliation_delta_minor,
    available_payment_methods: read.available_payment_methods,
    available_routes: read.available_routes,
    available_compatibility_pairs: read.available_compatibility_pairs,
    unavailable_reason: read.unavailable_reason,
    fallback_actions: read.fallback_actions,
    receiver_bank_status: receiverBank?.status,
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
  >,
  routes: readonly MerchantReceivingRoute[]
): {
  available_payment_methods: AvailableCheckoutPaymentMethods;
  available_routes: readonly AvailableCheckoutRoute[];
  available_compatibility_pairs: readonly PaymentCompatibilityPair[];
  unavailable_reason?: CheckoutUnavailableReason | undefined;
  fallback_actions: readonly CheckoutFallbackAction[];
} {
  const availableRoutes = routes
    .filter((route) => route.enabled)
    .map((route) => ({
      route_id: route.route_id,
      method_type: route.rail_type === 'phone_transfer' ? 'sbp' as const : 'card' as const,
      receiver_bank_id: route.bank_profile_id,
      bank_id: route.bank_profile_id,
      masked_value: route.receiver_identifier_masked,
      certification_status: 'checkout_allowed' as const,
      status: 'active' as const
    }));
  const methods: AvailableCheckoutPaymentMethods = {
    card: availableRoutes.some((route) => route.method_type === 'card'),
    sbp: availableRoutes.some((route) => route.method_type === 'sbp')
  };
  const unavailableReason = !methods.card && !methods.sbp
    ? 'merchant_no_active_receiving_method'
    : paymentSession.paymentMethod && !methods[paymentSession.paymentMethod]
      ? 'method_not_supported_by_merchant'
      : undefined;
  const compatibilityPairs = buildPaymentCompatibilityPairs(paymentSession, routes);
  const fallbackActions = buildCheckoutFallbackActions(methods);

  return stripUndefined({
    available_payment_methods: methods,
    available_routes: availableRoutes,
    available_compatibility_pairs: compatibilityPairs,
    fallback_actions: fallbackActions,
    unavailable_reason: unavailableReason
  }) as {
    available_payment_methods: AvailableCheckoutPaymentMethods;
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
    .filter((route) => route.enabled)
    .map((route) => {
      const method = route.rail_type === 'phone_transfer' ? 'sbp' as const : 'card' as const;
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
    payer_bank_launchers: PayerBankLauncherRegistry,
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
}): Record<string, unknown> {
  return stripUndefined({
    ...toCheckoutStatusResponse(params),
    buyer_claimed_paid: params.buyerClaimedPaid,
    does_not_confirm_payment: true
  });
}

function checkoutStateForPaymentSession(
  paymentSession: StoredPaymentSessionRecord,
  status: PaymentSessionStatus
): CheckoutSessionState {
  return mapPaymentSessionToCheckoutState({
    paymentSessionStatus: status,
    paymentMethod: paymentSession.paymentMethod,
    selectedReceiverBankId: paymentSession.selectedReceiverBankId,
    selectedReceivingRouteId: paymentSession.selectedReceivingRouteId,
    selectedPayerBankLauncherId: paymentSession.selectedPayerBankLauncherId,
    paymentInstructionsShownAt: paymentSession.paymentInstructionsShownAt
  });
}

function withRouteSummary(bank: ReceiverBankOption, routes: readonly MerchantReceivingRoute[]): ReceiverBankOption {
  const bankRoutes = routes.filter((route) => route.bank_profile_id === bank.bank_profile_id && route.enabled);
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
