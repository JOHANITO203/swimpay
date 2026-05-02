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
  'auto_confirmed',
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
  'auto_confirmed',
  'manual_confirmed',
  'rejected',
  'expired'
] as const;

export type PaymentSessionStatus = (typeof PaymentSessionStatuses)[number];

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
  'incoming_cashback',
  'incoming_refund',
  'outgoing_payment',
  'failed_transfer',
  'promo',
  'balance_update',
  'unknown',
  'unknown_ambiguous_direction'
] as const;

export type DirectionLabel = (typeof DirectionLabels)[number];

export const Decisions = ['auto_confirmed', 'needs_review', 'rejected', 'wait'] as const;
export type Decision = (typeof Decisions)[number];

export const ReviewStatuses = ['open', 'confirmed', 'rejected', 'cancelled'] as const;
export type ReviewStatus = (typeof ReviewStatuses)[number];

export const WebhookDeliveryStatuses = ['pending', 'delivered', 'failed', 'retrying', 'cancelled'] as const;
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
  status: 'pending' | 'active' | 'suspended' | 'revoked';
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
