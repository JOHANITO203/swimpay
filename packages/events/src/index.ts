export const EventTypes = {
  ORDER_CREATED: 'order.created',
  ORDER_EXPIRED: 'order.expired',
  PAYMENT_SESSION_CREATED: 'payment_session.created',
  PAYMENT_SESSION_RECEIVER_ARMING_REQUESTED: 'payment_session.receiver_arming_requested',
  PAYMENT_SESSION_RECEIVER_ARMED: 'payment_session.receiver_armed',
  RECEIVER_HEARTBEAT_RECEIVED: 'receiver.heartbeat_received',
  RECEIVER_HEALTH_DEGRADED: 'receiver.health_degraded',
  SIGNAL_RECEIVED: 'signal.received',
  SIGNAL_VERIFIED: 'signal.verified',
  SIGNAL_PARSED: 'signal.parsed',
  SIGNAL_QUALITY_SCORED: 'signal.quality_scored',
  TEMPLATE_OBSERVED: 'template.observed',
  TEMPLATE_DRIFT_DETECTED: 'template.drift_detected',
  MATCH_CANDIDATES_FOUND: 'match.candidates_found',
  MATCH_COLLISION_DETECTED: 'match.collision_detected',
  MATCH_SCORED: 'match.scored',
  DECISION_AUTO_CONFIRMED: 'decision.auto_confirmed',
  DECISION_NEEDS_REVIEW: 'decision.needs_review',
  DECISION_REJECTED: 'decision.rejected',
  REVIEW_CREATED: 'review.created',
  REVIEW_CONFIRMED: 'review.confirmed',
  REVIEW_REJECTED: 'review.rejected',
  WEBHOOK_DELIVERY_REQUESTED: 'webhook.delivery_requested',
  WEBHOOK_DELIVERED: 'webhook.delivered',
  WEBHOOK_FAILED: 'webhook.failed'
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

export interface EventEnvelope<TData extends Record<string, unknown> = Record<string, unknown>> {
  eventId: string;
  eventType: EventType;
  version: 1;
  occurredAt: string;
  merchantId?: string;
  idempotencyKey: string;
  data: TData;
}

export const PUBLIC_EVENT_SIGNAL_DISCLOSURE = {
  confirmation_type: 'notification_signal',
  official_bank_confirmation: false
} as const;
