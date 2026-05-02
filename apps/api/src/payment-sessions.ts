import type { PaymentSessionStatus } from '@swimpay/contracts';
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
  amount: {
    value: string;
    currency: string;
  };
  reference: string;
  receiver_status: ReceiverStatus;
  expires_at: string;
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

  return {
    payment_session_id: params.paymentSession.id,
    order_id: params.order.id,
    status,
    amount: {
      value: formatAmountMinor(params.paymentSession.expectedAmountMinor),
      currency: params.paymentSession.currency
    },
    reference: params.paymentSession.referenceCode,
    receiver_status: receiverStatusFromPaymentSessionStatus(status),
    expires_at: params.paymentSession.validUntil
  };
}
