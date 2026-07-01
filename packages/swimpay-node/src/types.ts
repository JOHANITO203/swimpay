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
  /** Order currency (echoed from the create input) so the integrator can render the amount. */
  currency: string;
  /** Order amount in minor units (echoed from the create input). */
  amountMinor: number;
  expiresAt?: string | undefined;
}

export type SwimPayPublicWebhookEventType = 'payment.confirmed' | 'payment.rejected' | 'payment.expired' | 'payment.currency_mismatch';

export type SwimPayPublicWebhookDecision = 'manual_confirmed' | 'manual_rejected' | 'expired';

export interface SwimPayPaymentEventData {
  externalOrderId?: string | undefined;
  orderId: string;
  paymentSessionId: string;
  amountMinor: number;
  currency: string;
  confirmationType?: 'notification_signal' | undefined;
  officialBankConfirmation: false;
  decision?: SwimPayPublicWebhookDecision | undefined;
}

export interface SwimPayCurrencyMismatchEventData {
  orderId: string;
  externalOrderId?: string | undefined;
  paymentSessionId: string;
  expectedCurrency: string;
  signalCurrency: string;
  expectedAmountMinor: number;
  signalAmountMinor?: number | undefined;
  matchedOn: 'reference' | 'amount';
  officialBankConfirmation: false;
}

export type SwimPayPublicWebhookEvent =
  | {
      id: string;
      type: 'payment.confirmed' | 'payment.rejected' | 'payment.expired';
      createdAt: string;
      data: SwimPayPaymentEventData;
    }
  | {
      id: string;
      type: 'payment.currency_mismatch';
      createdAt: string;
      data: SwimPayCurrencyMismatchEventData;
    };

export type SwimPayWebhookHeaders =
  | Headers
  | Record<string, string | string[] | number | undefined>
  | {
      get(name: string): string | null | undefined;
    };
