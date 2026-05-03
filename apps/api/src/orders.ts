import pg from 'pg';
import { hmacSha256, maskPhone, normalizeRussianPhone } from '@swimpay/security';
import type { OrderStatus, PaymentSessionStatus } from '@swimpay/contracts';

const { Pool } = pg;

export interface StoredOrderRecord {
  id: string;
  merchantId: string;
  externalId: string;
  productId?: string | undefined;
  productName?: string | undefined;
  productRiskLevel: string;
  amountMinor: number;
  currency: string;
  status: OrderStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredPaymentSessionRecord {
  id: string;
  orderId: string;
  merchantId: string;
  expectedAmountMinor: number;
  currency: string;
  buyerPhoneHmac?: string | undefined;
  buyerPhoneMasked?: string | undefined;
  buyerNameHmac?: string | undefined;
  referenceCode: string;
  referenceHmac: string;
  status: PaymentSessionStatus;
  selectedReceiverBankId?: string | undefined;
  selectedReceiverBankProfileId?: string | undefined;
  selectedPayerBankLauncherId?: string | undefined;
  paymentInstructionsShownAt?: string | undefined;
  buyerClaimedPaidAt?: string | undefined;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredAuditEventRecord {
  id: string;
  merchantId: string;
  eventType: string;
  objectType: 'order' | 'payment_session';
  objectId: string;
  payloadRedacted: Record<string, unknown>;
}

export interface CreateOrderWithSessionInput {
  merchantId: string;
  order: StoredOrderRecord;
  paymentSession: StoredPaymentSessionRecord;
  auditEvents: StoredAuditEventRecord[];
}

export type CreateOrderWithSessionResult =
  | {
      kind: 'created';
      order: StoredOrderRecord;
      paymentSession: StoredPaymentSessionRecord;
    }
  | {
      kind: 'duplicate_external_id';
    };

export interface CheckoutMutationBaseInput {
  merchantId: string;
  paymentSessionId: string;
  auditEventId: string;
  now: string;
}

export interface SelectReceiverBankInput extends CheckoutMutationBaseInput {
  receiverBankId: string;
  bankProfileId: string;
}

export interface SelectPayerBankLauncherInput extends CheckoutMutationBaseInput {
  payerBankLauncherId: string;
}

export type PaymentSessionCheckoutMutationResult =
  | {
      kind: 'updated';
      order: StoredOrderRecord;
      paymentSession: StoredPaymentSessionRecord;
    }
  | { kind: 'not_found' }
  | { kind: 'expired' };

export interface OrderRepository {
  createOrderWithSession(input: CreateOrderWithSessionInput): Promise<CreateOrderWithSessionResult>;
  getOrderById(
    merchantId: string,
    orderId: string
  ): Promise<{
    order: StoredOrderRecord;
    paymentSession: StoredPaymentSessionRecord | null;
  } | null>;
  getPaymentSessionById(
    merchantId: string,
    paymentSessionId: string
  ): Promise<{
    order: StoredOrderRecord;
      paymentSession: StoredPaymentSessionRecord;
    } | null>;
  selectReceiverBank(input: SelectReceiverBankInput): Promise<PaymentSessionCheckoutMutationResult>;
  selectPayerBankLauncher(input: SelectPayerBankLauncherInput): Promise<PaymentSessionCheckoutMutationResult>;
  markPaymentInstructionsShown(input: CheckoutMutationBaseInput): Promise<PaymentSessionCheckoutMutationResult>;
  markBuyerClaimedPaid(input: CheckoutMutationBaseInput): Promise<PaymentSessionCheckoutMutationResult>;
}

export interface IdGenerator {
  orderId: () => string;
  paymentSessionId: () => string;
  auditEventId: () => string;
  referenceCode: () => string;
}

export interface CreateOrderRequestBody {
  external_id: string;
  amount: {
    value: string;
    currency: string;
  };
  buyer?: {
    bank_phone?: string | undefined;
    name?: string | undefined;
  } | undefined;
  product?: {
    id?: string | undefined;
    name?: string | undefined;
    risk_level?: string | undefined;
  } | undefined;
  expires_in_seconds?: number | undefined;
}

export interface OrderCreateResponse {
  order_id: string;
  payment_session_id: string;
  status: PaymentSessionStatus;
  checkout_url: string;
  amount: {
    value: string;
    currency: string;
  };
  reference: string;
  expires_at: string;
}

export interface OrderReadResponse {
  order_id: string;
  external_id: string;
  status: string;
  payment_session_id: string | null;
  amount: {
    value: string;
    currency: string;
  };
  expires_at: string;
  latest_event: 'payment_session.receiver_arming_requested';
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

export class PgOrderRepository implements OrderRepository {
  private readonly pool: pg.Pool;

  public constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 5 });
  }

  public async createOrderWithSession(input: CreateOrderWithSessionInput): Promise<CreateOrderWithSessionResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query('SELECT id FROM orders WHERE merchant_id = $1 AND external_id = $2', [
        input.merchantId,
        input.order.externalId
      ]);

      if (existing.rowCount && existing.rowCount > 0) {
        await client.query('ROLLBACK');
        return { kind: 'duplicate_external_id' };
      }

      await client.query(
        `INSERT INTO orders (
          id, merchant_id, external_id, product_id, product_name, product_risk_level,
          amount_minor, currency, status, expires_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          input.order.id,
          input.order.merchantId,
          input.order.externalId,
          input.order.productId ?? null,
          input.order.productName ?? null,
          input.order.productRiskLevel,
          input.order.amountMinor,
          input.order.currency,
          input.order.status,
          input.order.expiresAt,
          input.order.createdAt,
          input.order.updatedAt
        ]
      );

      await client.query(
        `INSERT INTO payment_sessions (
          id, order_id, merchant_id, expected_amount_minor, currency, buyer_phone_hmac,
          buyer_phone_masked, buyer_name_hmac, reference_code, reference_hmac, status,
          valid_from, valid_until, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          input.paymentSession.id,
          input.paymentSession.orderId,
          input.paymentSession.merchantId,
          input.paymentSession.expectedAmountMinor,
          input.paymentSession.currency,
          input.paymentSession.buyerPhoneHmac ?? null,
          input.paymentSession.buyerPhoneMasked ?? null,
          input.paymentSession.buyerNameHmac ?? null,
          input.paymentSession.referenceCode,
          input.paymentSession.referenceHmac,
          input.paymentSession.status,
          input.paymentSession.validFrom,
          input.paymentSession.validUntil,
          input.paymentSession.createdAt,
          input.paymentSession.updatedAt
        ]
      );

      for (const auditEvent of input.auditEvents) {
        await client.query(
          `INSERT INTO audit_events (
            id, merchant_id, event_type, object_type, object_id, actor_type, payload_redacted
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            auditEvent.id,
            auditEvent.merchantId,
            auditEvent.eventType,
            auditEvent.objectType,
            auditEvent.objectId,
            'api',
            JSON.stringify(auditEvent.payloadRedacted)
          ]
        );
      }

      await client.query('COMMIT');

      return {
        kind: 'created',
        order: input.order,
        paymentSession: input.paymentSession
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async getOrderById(merchantId: string, orderId: string) {
    const orderResult = await this.pool.query(
      `SELECT id, merchant_id, external_id, product_id, product_name, product_risk_level,
        amount_minor, currency, status, expires_at, created_at, updated_at
       FROM orders WHERE merchant_id = $1 AND id = $2`,
      [merchantId, orderId]
    );

    if (orderResult.rowCount === 0) {
      return null;
    }

    const row = orderResult.rows[0] as Record<string, string | number | Date | null>;
    const paymentResult = await this.pool.query(
      `SELECT id, order_id, merchant_id, expected_amount_minor, currency, buyer_phone_hmac,
        buyer_phone_masked, buyer_name_hmac, reference_code, reference_hmac, status,
        selected_receiver_bank_id, selected_receiver_bank_profile_id, selected_payer_bank_launcher_id,
        payment_instructions_shown_at, buyer_claimed_paid_at,
        valid_from, valid_until, created_at, updated_at
       FROM payment_sessions WHERE merchant_id = $1 AND order_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [merchantId, orderId]
    );

    const order: StoredOrderRecord = {
      id: String(row.id),
      merchantId: String(row.merchant_id),
      externalId: String(row.external_id),
      productId: row.product_id ? String(row.product_id) : undefined,
      productName: row.product_name ? String(row.product_name) : undefined,
      productRiskLevel: String(row.product_risk_level),
      amountMinor: Number(row.amount_minor),
      currency: String(row.currency),
      status: String(row.status) as OrderStatus,
      expiresAt: new Date(String(row.expires_at)).toISOString(),
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString()
    };

    const paymentSession = paymentResult.rowCount ? toPaymentSession(paymentResult.rows[0] as Record<string, string | number | Date | null>) : null;

    return { order, paymentSession };
  }

  public async getPaymentSessionById(merchantId: string, paymentSessionId: string) {
    const paymentResult = await this.pool.query(
      `SELECT id, order_id, merchant_id, expected_amount_minor, currency, buyer_phone_hmac,
        buyer_phone_masked, buyer_name_hmac, reference_code, reference_hmac, status,
        selected_receiver_bank_id, selected_receiver_bank_profile_id, selected_payer_bank_launcher_id,
        payment_instructions_shown_at, buyer_claimed_paid_at,
        valid_from, valid_until, created_at, updated_at
       FROM payment_sessions WHERE merchant_id = $1 AND id = $2`,
      [merchantId, paymentSessionId]
    );

    if (paymentResult.rowCount === 0) {
      return null;
    }

    const paymentSession = toPaymentSession(paymentResult.rows[0] as Record<string, string | number | Date | null>);
    const orderResult = await this.pool.query(
      `SELECT id, merchant_id, external_id, product_id, product_name, product_risk_level,
        amount_minor, currency, status, expires_at, created_at, updated_at
       FROM orders WHERE merchant_id = $1 AND id = $2`,
      [merchantId, paymentSession.orderId]
    );

    if (orderResult.rowCount === 0) {
      return null;
    }

    return {
      order: toOrder(orderResult.rows[0] as Record<string, string | number | Date | null>),
      paymentSession
    };
  }

  public async selectReceiverBank(input: SelectReceiverBankInput): Promise<PaymentSessionCheckoutMutationResult> {
    return this.mutateCheckoutSession({
      input,
      auditEventType: 'checkout.receiver_bank_selected',
      apply: async (client) => {
        await client.query(
          `UPDATE payment_sessions
           SET selected_receiver_bank_id = $3,
               selected_receiver_bank_profile_id = $4,
               selected_payer_bank_launcher_id = NULL,
               payment_instructions_shown_at = NULL,
               updated_at = $5
           WHERE merchant_id = $1 AND id = $2`,
          [input.merchantId, input.paymentSessionId, input.receiverBankId, input.bankProfileId, input.now]
        );
      },
      payload: {
        receiver_bank_id: input.receiverBankId,
        bank_profile_id: input.bankProfileId,
        review_only: true,
        auto_confirm_enabled: false
      }
    });
  }

  public async selectPayerBankLauncher(input: SelectPayerBankLauncherInput): Promise<PaymentSessionCheckoutMutationResult> {
    return this.mutateCheckoutSession({
      input,
      auditEventType: 'checkout.payer_bank_launcher_selected',
      apply: async (client) => {
        await client.query(
          `UPDATE payment_sessions
           SET selected_payer_bank_launcher_id = $3,
               payment_instructions_shown_at = NULL,
               updated_at = $4
           WHERE merchant_id = $1 AND id = $2`,
          [input.merchantId, input.paymentSessionId, input.payerBankLauncherId, input.now]
        );
      },
      payload: {
        payer_bank_launcher_id: input.payerBankLauncherId,
        does_not_confirm_payment: true,
        auto_confirm_enabled: false
      }
    });
  }

  public async markPaymentInstructionsShown(input: CheckoutMutationBaseInput): Promise<PaymentSessionCheckoutMutationResult> {
    return this.mutateCheckoutSession({
      input,
      auditEventType: 'checkout.payment_instructions_shown',
      apply: async (client) => {
        await client.query(
          `UPDATE payment_sessions
           SET status = 'awaiting_payment',
               payment_instructions_shown_at = COALESCE(payment_instructions_shown_at, $3::timestamptz),
               updated_at = $3
           WHERE merchant_id = $1 AND id = $2`,
          [input.merchantId, input.paymentSessionId, input.now]
        );
        await client.query(
          `UPDATE orders
           SET status = 'awaiting_payment', updated_at = $3
           WHERE merchant_id = $1
             AND id = (SELECT order_id FROM payment_sessions WHERE merchant_id = $1 AND id = $2)`,
          [input.merchantId, input.paymentSessionId, input.now]
        );
      },
      payload: {
        next_status: 'awaiting_payment'
      }
    });
  }

  public async markBuyerClaimedPaid(input: CheckoutMutationBaseInput): Promise<PaymentSessionCheckoutMutationResult> {
    return this.mutateCheckoutSession({
      input,
      auditEventType: 'checkout.buyer_claimed_paid',
      apply: async (client) => {
        await client.query(
          `UPDATE payment_sessions
           SET status = 'buyer_claimed_paid',
               buyer_claimed_paid_at = COALESCE(buyer_claimed_paid_at, $3::timestamptz),
               updated_at = $3
           WHERE merchant_id = $1 AND id = $2`,
          [input.merchantId, input.paymentSessionId, input.now]
        );
        await client.query(
          `UPDATE orders
           SET status = 'buyer_claimed_paid', updated_at = $3
           WHERE merchant_id = $1
             AND id = (SELECT order_id FROM payment_sessions WHERE merchant_id = $1 AND id = $2)`,
          [input.merchantId, input.paymentSessionId, input.now]
        );
      },
      payload: {
        buyer_claimed_paid: true,
        does_not_confirm_payment: true
      }
    });
  }

  private async mutateCheckoutSession(params: {
    input: CheckoutMutationBaseInput;
    auditEventType: string;
    apply: (client: pg.PoolClient) => Promise<void>;
    payload: Record<string, unknown>;
  }): Promise<PaymentSessionCheckoutMutationResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const current = await client.query(
        `SELECT ps.id, ps.valid_until
         FROM payment_sessions ps
         WHERE ps.merchant_id = $1 AND ps.id = $2
         FOR UPDATE`,
        [params.input.merchantId, params.input.paymentSessionId]
      );
      if (current.rowCount === 0) {
        await client.query('ROLLBACK');
        return { kind: 'not_found' };
      }
      const row = current.rows[0] as { valid_until: string | Date };
      if (new Date(row.valid_until).getTime() <= new Date(params.input.now).getTime()) {
        await client.query('ROLLBACK');
        return { kind: 'expired' };
      }

      await params.apply(client);
      await client.query(
        `INSERT INTO audit_events (
          id, merchant_id, event_type, object_type, object_id, actor_type, payload_redacted, created_at
        ) VALUES ($1, $2, $3, 'payment_session', $4, 'api', $5::jsonb, $6)`,
        [
          params.input.auditEventId,
          params.input.merchantId,
          params.auditEventType,
          params.input.paymentSessionId,
          JSON.stringify({
            payment_session_id: params.input.paymentSessionId,
            ...params.payload
          }),
          params.input.now
        ]
      );
      await client.query('COMMIT');

      const updated = await this.getPaymentSessionById(params.input.merchantId, params.input.paymentSessionId);
      return updated ? { kind: 'updated', order: updated.order, paymentSession: updated.paymentSession } : { kind: 'not_found' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

function toOrder(row: Record<string, string | number | Date | null>): StoredOrderRecord {
  return {
    id: String(row.id),
    merchantId: String(row.merchant_id),
    externalId: String(row.external_id),
    productId: row.product_id ? String(row.product_id) : undefined,
    productName: row.product_name ? String(row.product_name) : undefined,
    productRiskLevel: String(row.product_risk_level),
    amountMinor: Number(row.amount_minor),
    currency: String(row.currency),
    status: String(row.status) as OrderStatus,
    expiresAt: new Date(String(row.expires_at)).toISOString(),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function toPaymentSession(row: Record<string, string | number | Date | null>): StoredPaymentSessionRecord {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    merchantId: String(row.merchant_id),
    expectedAmountMinor: Number(row.expected_amount_minor),
    currency: String(row.currency),
    buyerPhoneHmac: row.buyer_phone_hmac ? String(row.buyer_phone_hmac) : undefined,
    buyerPhoneMasked: row.buyer_phone_masked ? String(row.buyer_phone_masked) : undefined,
    buyerNameHmac: row.buyer_name_hmac ? String(row.buyer_name_hmac) : undefined,
    referenceCode: String(row.reference_code),
    referenceHmac: String(row.reference_hmac),
    status: String(row.status) as PaymentSessionStatus,
    selectedReceiverBankId: row.selected_receiver_bank_id ? String(row.selected_receiver_bank_id) : undefined,
    selectedReceiverBankProfileId: row.selected_receiver_bank_profile_id
      ? String(row.selected_receiver_bank_profile_id)
      : undefined,
    selectedPayerBankLauncherId: row.selected_payer_bank_launcher_id
      ? String(row.selected_payer_bank_launcher_id)
      : undefined,
    paymentInstructionsShownAt: row.payment_instructions_shown_at
      ? new Date(String(row.payment_instructions_shown_at)).toISOString()
      : undefined,
    buyerClaimedPaidAt: row.buyer_claimed_paid_at ? new Date(String(row.buyer_claimed_paid_at)).toISOString() : undefined,
    validFrom: new Date(String(row.valid_from)).toISOString(),
    validUntil: new Date(String(row.valid_until)).toISOString(),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

export function parseMerchantId(authorization: string | undefined): string | null {
  const match = authorization?.match(/^Bearer\s+test_([A-Za-z0-9_-]+)$/);
  if (!match) {
    return null;
  }

  return match[1] ?? null;
}

export function parseAmountMinor(value: string): number | null {
  if (!/^\d+(\.\d{2})$/.test(value)) {
    return null;
  }

  const [major = '0', minor = '0'] = value.split('.');
  const amount = Number.parseInt(major, 10) * 100 + Number.parseInt(minor, 10);
  return amount > 0 ? amount : null;
}

export function formatAmountMinor(amountMinor: number): string {
  const major = Math.floor(amountMinor / 100);
  const minor = String(amountMinor % 100).padStart(2, '0');
  return `${major}.${minor}`;
}

export function validateCreateOrderBody(body: unknown): CreateOrderRequestBody | ApiErrorResponse {
  if (!body || typeof body !== 'object') {
    return invalidRequest('Order request body must be a JSON object.', {});
  }

  const candidate = body as Partial<CreateOrderRequestBody>;
  const amount = candidate.amount;

  if (
    typeof candidate.external_id !== 'string' ||
    !candidate.external_id.trim() ||
    !amount ||
    typeof amount.value !== 'string' ||
    typeof amount.currency !== 'string'
  ) {
    return invalidRequest('Order request is missing required fields.', {});
  }

  return {
    external_id: candidate.external_id.trim(),
    amount: {
      value: amount.value,
      currency: amount.currency
    },
    buyer: candidate.buyer,
    product: candidate.product,
    expires_in_seconds: candidate.expires_in_seconds
  };
}

export function invalidRequest(message: string, details: Record<string, unknown>): ApiErrorResponse {
  return {
    error: {
      code: 'invalid_request',
      message,
      details
    }
  };
}

export function buildOrderCreateInput(params: {
  body: CreateOrderRequestBody;
  merchantId: string;
  phoneHmacSecret: string;
  idGenerator: IdGenerator;
  clock: () => Date;
}): CreateOrderWithSessionInput | ApiErrorResponse {
  const amountMinor = parseAmountMinor(params.body.amount.value);

  if (amountMinor === null || params.body.amount.currency !== 'RUB') {
    return invalidRequest('Order amount must be positive and currency must be RUB.', {
      amount: params.body.amount.value,
      currency: params.body.amount.currency
    });
  }

  const now = params.clock();
  const expiresInSeconds = params.body.expires_in_seconds ?? 900;
  const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);
  const orderId = params.idGenerator.orderId();
  const paymentSessionId = params.idGenerator.paymentSessionId();
  const referenceCode = params.idGenerator.referenceCode();
  const normalizedPhone = params.body.buyer?.bank_phone ? normalizeRussianPhone(params.body.buyer.bank_phone) : null;
  const buyerName = params.body.buyer?.name?.trim();

  const order: StoredOrderRecord = {
    id: orderId,
    merchantId: params.merchantId,
    externalId: params.body.external_id,
    productId: params.body.product?.id,
    productName: params.body.product?.name,
    productRiskLevel: params.body.product?.risk_level ?? 'low',
    amountMinor,
    currency: params.body.amount.currency,
    status: 'receiver_arming',
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  const paymentSession: StoredPaymentSessionRecord = {
    id: paymentSessionId,
    orderId,
    merchantId: params.merchantId,
    expectedAmountMinor: amountMinor,
    currency: params.body.amount.currency,
    buyerPhoneHmac: normalizedPhone ? hmacSha256(normalizedPhone, params.phoneHmacSecret) : undefined,
    buyerPhoneMasked: normalizedPhone ? maskPhone(normalizedPhone) : undefined,
    buyerNameHmac: buyerName ? hmacSha256(buyerName, params.phoneHmacSecret) : undefined,
    referenceCode,
    referenceHmac: hmacSha256(referenceCode, params.phoneHmacSecret),
    status: 'receiver_arming',
    validFrom: now.toISOString(),
    validUntil: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  const auditEvents: StoredAuditEventRecord[] = [
    {
      id: params.idGenerator.auditEventId(),
      merchantId: params.merchantId,
      eventType: 'order.created',
      objectType: 'order',
      objectId: orderId,
      payloadRedacted: {
        external_id: params.body.external_id,
        amount_minor: amountMinor,
        currency: params.body.amount.currency,
        payment_session_id: paymentSessionId,
        buyer_phone_masked: paymentSession.buyerPhoneMasked
      }
    },
    {
      id: params.idGenerator.auditEventId(),
      merchantId: params.merchantId,
      eventType: 'payment_session.created',
      objectType: 'payment_session',
      objectId: paymentSessionId,
      payloadRedacted: {
        order_id: orderId,
        expected_amount_minor: amountMinor,
        currency: params.body.amount.currency,
        valid_until: expiresAt.toISOString()
      }
    },
    {
      id: params.idGenerator.auditEventId(),
      merchantId: params.merchantId,
      eventType: 'payment_session.receiver_arming_requested',
      objectType: 'payment_session',
      objectId: paymentSessionId,
      payloadRedacted: {
        order_id: orderId,
        reference_hmac: paymentSession.referenceHmac,
        buyer_phone_masked: paymentSession.buyerPhoneMasked
      }
    }
  ];

  return {
    merchantId: params.merchantId,
    order,
    paymentSession,
    auditEvents
  };
}
