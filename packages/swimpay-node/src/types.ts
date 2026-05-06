export interface SwimPayClientOptions {
  secretKey: string;
  apiBaseUrl?: string | undefined;
  defaultRequestTimeoutMs?: number | undefined;
}

export interface SwimPayOrderCustomer {
  firstName?: string | undefined;
  lastName?: string | undefined;
  phone?: string | undefined;
}

export interface SwimPayOrderCreateInput {
  externalOrderId: string;
  amountMinor: number;
  currency: string;
  description?: string | undefined;
  returnUrl?: string | undefined;
  customer?: SwimPayOrderCustomer | undefined;
  metadata?: Record<string, unknown> | undefined;
  webhookUrl?: string | undefined;
}

export interface SwimPayOrderCreateOptions {
  idempotencyKey?: string | undefined;
  requestTimeoutMs?: number | undefined;
}

export interface SwimPayCheckout {
  orderId: string;
  paymentSessionId: string;
  checkoutUrl: string;
  status: string;
  expiresAt?: string | undefined;
}

export type SwimPayPublicWebhookEventType = 'payment.confirmed' | 'payment.rejected' | 'payment.expired';

export type SwimPayPublicWebhookDecision = 'manual_confirmed' | 'manual_rejected' | 'expired';

export interface SwimPayPublicWebhookEvent {
  id: string;
  type: SwimPayPublicWebhookEventType;
  createdAt: string;
  data: {
    externalOrderId?: string | undefined;
    orderId: string;
    paymentSessionId: string;
    amountMinor: number;
    currency: string;
    confirmationType?: 'notification_signal' | undefined;
    officialBankConfirmation: false;
    decision?: SwimPayPublicWebhookDecision | undefined;
  };
}

export type SwimPayWebhookHeaders =
  | Headers
  | Record<string, string | string[] | number | undefined>
  | {
      get(name: string): string | null | undefined;
    };
