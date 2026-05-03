import {
  PayerBankLauncherRegistry,
  V1ReceiverBankOptions,
  getPayerBankLauncherOption,
  getReceiverBankOption,
  mapCheckoutStateToBuyerSafeStatus,
  mapPaymentSessionToCheckoutState,
  type BuyerSafeCheckoutStatus,
  type CheckoutSessionState,
  type PaymentSessionStatus,
  type PayerBankLauncherOption,
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
  matching: ['needs_review', 'auto_confirmed', 'manual_confirmed', 'rejected', 'expired'],
  needs_review: ['manual_confirmed', 'rejected', 'expired'],
  auto_confirmed: [],
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
  selected_payer_bank_launcher_id?: string | undefined;
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
  selected_receiver_bank_id?: string | undefined;
  selected_payer_bank_launcher_id?: string | undefined;
  receiver_bank_status?: ReceiverBankOption['status'] | undefined;
  official_bank_confirmation: false;
}

export interface ReceiverBanksResponse {
  payment_session_id: string;
  receiver_banks: readonly ReceiverBankOption[];
  selected_receiver_bank_id?: string | undefined;
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
    case 'auto_confirmed':
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
}): PaymentSessionReadResponse {
  const status = resolvePaymentSessionStatusForRead(params.paymentSession, params.now);
  const checkoutState = checkoutStateForPaymentSession(params.paymentSession, status);

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
    selected_payer_bank_launcher_id: params.paymentSession.selectedPayerBankLauncherId,
    official_bank_confirmation: false
  }) as unknown as PaymentSessionReadResponse;
}

export function toCheckoutStatusResponse(params: {
  order: StoredOrderRecord;
  paymentSession: StoredPaymentSessionRecord;
  now: Date;
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
    selected_receiver_bank_id: read.selected_receiver_bank_id,
    selected_payer_bank_launcher_id: read.selected_payer_bank_launcher_id,
    receiver_bank_status: receiverBank?.status,
    official_bank_confirmation: false
  }) as unknown as CheckoutStatusResponse;
}

export function toReceiverBanksResponse(paymentSession: StoredPaymentSessionRecord): ReceiverBanksResponse {
  return stripUndefined({
    payment_session_id: paymentSession.id,
    receiver_banks: V1ReceiverBankOptions,
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
}): Record<string, unknown> {
  const status = toCheckoutStatusResponse(params);
  return stripUndefined({
    ...status,
    selected_receiver_bank: params.paymentSession.selectedReceiverBankId
      ? getReceiverBankOption(params.paymentSession.selectedReceiverBankId)
      : null
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
    selectedReceiverBankId: paymentSession.selectedReceiverBankId,
    selectedPayerBankLauncherId: paymentSession.selectedPayerBankLauncherId,
    paymentInstructionsShownAt: paymentSession.paymentInstructionsShownAt
  });
}

function stripUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
