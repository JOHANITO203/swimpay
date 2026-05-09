import pg from 'pg';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { hmacSha256, maskPhone, normalizeRussianPhone } from '@swimpay/security';
import {
  ReceivingRouteRailTypes,
  ReceivingRouteReviewPolicies,
  ReceiverIdentifierTypes,
  V1ReceiverBankOptions,
  deriveExpectedPaymentProfile,
  maskReceiverIdentifier,
  receivingRailForBuyerPaymentMethod,
  type BuyerCheckoutPaymentMethod,
  type ExpectedPaymentProfile,
  type MerchantReceivingRoute,
  type OrderStatus,
  type PaymentSessionStatus,
  type ReceivingRouteRailType,
  type ReceivingRouteReviewPolicy,
  type ReceiverIdentifierType
} from '@swimpay/contracts';

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
  selectedReceivingRouteId?: string | undefined;
  selectedPayerBankLauncherId?: string | undefined;
  buyerSenderPhoneHmac?: string | undefined;
  buyerSenderPhoneMasked?: string | undefined;
  paymentMethod?: BuyerCheckoutPaymentMethod | undefined;
  senderBankId?: string | undefined;
  senderCardLast4?: string | undefined;
  senderCardMasked?: string | undefined;
  senderCardHmac?: string | undefined;
  senderPhoneMasked?: string | undefined;
  senderPhoneHmac?: string | undefined;
  buyerFirstNameRaw?: string | undefined;
  buyerLastNameRaw?: string | undefined;
  buyerNameScriptDetected?: string | undefined;
  buyerNameNormalized?: string | undefined;
  buyerNameLatinVariants?: string[] | undefined;
  buyerNameCyrillicVariants?: string[] | undefined;
  buyerNameInitialVariants?: string[] | undefined;
  buyerNameReversedOrderVariants?: string[] | undefined;
  buyerNameFingerprint?: string | undefined;
  displayAmountMinor?: number | undefined;
  payableAmountMinor?: number | undefined;
  reconciliationDeltaMinor?: number | undefined;
  expectedPaymentFingerprint?: string | undefined;
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
  objectType: 'order' | 'payment_session' | 'merchant_receiving_route';
  objectId: string;
  payloadRedacted: Record<string, unknown>;
}

export type StoredMerchantReceivingRouteRecord = MerchantReceivingRoute;

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

export interface CreateReceivingRouteInput {
  route: StoredMerchantReceivingRouteRecord;
  auditEventId: string;
}

export type CreateReceivingRouteResult =
  | { kind: 'created'; route: StoredMerchantReceivingRouteRecord }
  | { kind: 'duplicate_route_code' }
  | { kind: 'duplicate_receiver_identifier' };

export interface UpdateReceivingRouteInput {
  merchantId: string;
  routeId: string;
  patch: Partial<Pick<StoredMerchantReceivingRouteRecord, 'enabled' | 'recommended' | 'display_label' | 'fees_hint'>>;
  auditEventId: string;
  now: string;
}

export type ReceivingRouteMutationResult =
  | { kind: 'updated'; route: StoredMerchantReceivingRouteRecord }
  | { kind: 'not_found' };

export interface DeleteReceivingRouteInput {
  merchantId: string;
  routeId: string;
  auditEventId: string;
  now: string;
}

export interface SelectReceivingRouteInput extends CheckoutMutationBaseInput {
  receivingRouteId: string;
}

export interface SaveBuyerSenderPhoneHintInput extends CheckoutMutationBaseInput {
  buyerSenderPhoneHmac: string;
  buyerSenderPhoneMasked: string;
}

export interface SaveExpectedPaymentProfileInput extends CheckoutMutationBaseInput {
  profile: ExpectedPaymentProfile;
  receiverBankId: string;
  bankProfileId: string;
  payerBankLauncherId: string;
}

export type ReceivingRouteCopyDetailsResult =
  | {
      kind: 'found';
      order: StoredOrderRecord;
      paymentSession: StoredPaymentSessionRecord;
      route: StoredMerchantReceivingRouteRecord;
      receiverIdentifier: string;
    }
  | { kind: 'not_found' }
  | { kind: 'not_selected' }
  | { kind: 'expired' }
  | { kind: 'inactive' };

export type PaymentSessionCheckoutMutationResult =
  | {
      kind: 'updated';
      order: StoredOrderRecord;
      paymentSession: StoredPaymentSessionRecord;
    }
  | { kind: 'not_found' }
  | { kind: 'expired' }
  | { kind: 'invalid_transition'; currentStatus: PaymentSessionStatus };

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
  getCheckoutSessionById(paymentSessionId: string): Promise<{
    order: StoredOrderRecord;
    paymentSession: StoredPaymentSessionRecord;
  } | null>;
  createReceivingRoute(input: CreateReceivingRouteInput): Promise<CreateReceivingRouteResult>;
  listReceivingRoutes(merchantId: string): Promise<StoredMerchantReceivingRouteRecord[]>;
  updateReceivingRoute(input: UpdateReceivingRouteInput): Promise<ReceivingRouteMutationResult>;
  deleteReceivingRoute(input: DeleteReceivingRouteInput): Promise<ReceivingRouteMutationResult>;
  listReceiverBanksForCheckout(
    merchantId: string,
    paymentSessionId: string
  ): Promise<StoredMerchantReceivingRouteRecord[]>;
  listReceivingRoutesForCheckoutBank(
    merchantId: string,
    paymentSessionId: string,
    bankProfileId: string
  ): Promise<StoredMerchantReceivingRouteRecord[]>;
  getSelectedReceivingRouteCopyDetails(input: {
    merchantId: string;
    paymentSessionId: string;
    encryptionSecret: string;
    now: string;
  }): Promise<ReceivingRouteCopyDetailsResult>;
  recordCheckoutDestinationCopied(input: {
    merchantId: string;
    paymentSessionId: string;
    routeId: string;
    railType: string;
    receiverIdentifierMasked: string;
    auditEventId: string;
    now: string;
  }): Promise<void>;
  selectReceiverBank(input: SelectReceiverBankInput): Promise<PaymentSessionCheckoutMutationResult>;
  selectReceivingRoute(input: SelectReceivingRouteInput): Promise<PaymentSessionCheckoutMutationResult>;
  selectPayerBankLauncher(input: SelectPayerBankLauncherInput): Promise<PaymentSessionCheckoutMutationResult>;
  saveExpectedPaymentProfile(input: SaveExpectedPaymentProfileInput): Promise<PaymentSessionCheckoutMutationResult>;
  saveBuyerSenderPhoneHint(input: SaveBuyerSenderPhoneHintInput): Promise<PaymentSessionCheckoutMutationResult>;
  markReceiverArmed(input: CheckoutMutationBaseInput): Promise<PaymentSessionCheckoutMutationResult>;
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

export interface ExpectedPaymentProfileRequestBody {
  buyer_first_name: string;
  buyer_last_name: string;
  payment_method: BuyerCheckoutPaymentMethod;
  sender_bank_id: string;
  sender_card_number?: string | undefined;
  sender_phone?: string | undefined;
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
        selected_receiver_bank_id, selected_receiver_bank_profile_id, selected_receiving_route_id,
        selected_payer_bank_launcher_id, buyer_sender_phone_hmac, buyer_sender_phone_masked,
        payment_method, sender_bank_id, sender_card_last4, sender_card_masked, sender_card_hmac,
        sender_phone_masked, sender_phone_hmac, buyer_first_name_raw, buyer_last_name_raw,
        buyer_name_script_detected, buyer_name_normalized, buyer_name_latin_variants,
        buyer_name_cyrillic_variants, buyer_name_initial_variants, buyer_name_reversed_order_variants,
        buyer_name_fingerprint, display_amount_minor, payable_amount_minor, reconciliation_delta_minor,
        expected_payment_fingerprint, payment_instructions_shown_at, buyer_claimed_paid_at,
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
        selected_receiver_bank_id, selected_receiver_bank_profile_id, selected_receiving_route_id,
        selected_payer_bank_launcher_id, buyer_sender_phone_hmac, buyer_sender_phone_masked,
        payment_method, sender_bank_id, sender_card_last4, sender_card_masked, sender_card_hmac,
        sender_phone_masked, sender_phone_hmac, buyer_first_name_raw, buyer_last_name_raw,
        buyer_name_script_detected, buyer_name_normalized, buyer_name_latin_variants,
        buyer_name_cyrillic_variants, buyer_name_initial_variants, buyer_name_reversed_order_variants,
        buyer_name_fingerprint, display_amount_minor, payable_amount_minor, reconciliation_delta_minor,
        expected_payment_fingerprint, payment_instructions_shown_at, buyer_claimed_paid_at,
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

  public async getCheckoutSessionById(paymentSessionId: string) {
    const paymentResult = await this.pool.query(
      `SELECT id, order_id, merchant_id, expected_amount_minor, currency, buyer_phone_hmac,
        buyer_phone_masked, buyer_name_hmac, reference_code, reference_hmac, status,
        selected_receiver_bank_id, selected_receiver_bank_profile_id, selected_receiving_route_id,
        selected_payer_bank_launcher_id, buyer_sender_phone_hmac, buyer_sender_phone_masked,
        payment_method, sender_bank_id, sender_card_last4, sender_card_masked, sender_card_hmac,
        sender_phone_masked, sender_phone_hmac, buyer_first_name_raw, buyer_last_name_raw,
        buyer_name_script_detected, buyer_name_normalized, buyer_name_latin_variants,
        buyer_name_cyrillic_variants, buyer_name_initial_variants, buyer_name_reversed_order_variants,
        buyer_name_fingerprint, display_amount_minor, payable_amount_minor, reconciliation_delta_minor,
        expected_payment_fingerprint, payment_instructions_shown_at, buyer_claimed_paid_at,
        valid_from, valid_until, created_at, updated_at
       FROM payment_sessions WHERE id = $1`,
      [paymentSessionId]
    );

    if (paymentResult.rowCount === 0) {
      return null;
    }

    const paymentSession = toPaymentSession(paymentResult.rows[0] as Record<string, string | number | Date | null>);
    const orderResult = await this.pool.query(
      `SELECT id, merchant_id, external_id, product_id, product_name, product_risk_level,
        amount_minor, currency, status, expires_at, created_at, updated_at
       FROM orders WHERE merchant_id = $1 AND id = $2`,
      [paymentSession.merchantId, paymentSession.orderId]
    );

    if (orderResult.rowCount === 0) {
      return null;
    }

    return {
      order: toOrder(orderResult.rows[0] as Record<string, string | number | Date | null>),
      paymentSession
    };
  }

  public async createReceivingRoute(input: CreateReceivingRouteInput): Promise<CreateReceivingRouteResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const duplicate = await client.query<{ route_code: string; receiver_identifier_hmac: string | null }>(
        `SELECT route_code, receiver_identifier_hmac
         FROM merchant_receiving_routes
         WHERE merchant_id = $1
           AND deleted_at IS NULL
           AND (
             route_code = $2
             OR (receiver_identifier_hmac IS NOT NULL AND receiver_identifier_hmac = $3)
           )
         LIMIT 1`,
        [input.route.merchant_id, input.route.route_code, input.route.receiver_identifier_hmac]
      );
      if (duplicate.rowCount && duplicate.rowCount > 0) {
        await client.query('ROLLBACK');
        if (duplicate.rows[0]?.receiver_identifier_hmac === input.route.receiver_identifier_hmac) {
          return { kind: 'duplicate_receiver_identifier' };
        }
        return { kind: 'duplicate_route_code' };
      }

      await client.query(
        `INSERT INTO merchant_receiving_routes (
          id, merchant_id, bank_profile_id, rail_type, receiver_identifier_type,
          receiver_identifier_encrypted, receiver_identifier_hmac, receiver_identifier_masked,
          receiver_identifier_last4, route_code, display_label,
          enabled, recommended, review_policy, fees_hint, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          input.route.route_id,
          input.route.merchant_id,
          input.route.bank_profile_id,
          input.route.rail_type,
          input.route.receiver_identifier_type,
          input.route.receiver_identifier_encrypted,
          input.route.receiver_identifier_hmac,
          input.route.receiver_identifier_masked,
          input.route.receiver_identifier_last4,
          input.route.route_code,
          input.route.display_label,
          input.route.enabled,
          input.route.recommended,
          input.route.review_policy,
          input.route.fees_hint ?? null,
          input.route.created_at,
          input.route.updated_at
        ]
      );
      await client.query(
        `INSERT INTO audit_events (
          id, merchant_id, event_type, object_type, object_id, actor_type, payload_redacted, created_at
        ) VALUES ($1, $2, 'merchant_receiving_route.created', 'merchant_receiving_route', $3, 'api', $4::jsonb, $5)`,
        [
          input.auditEventId,
          input.route.merchant_id,
          input.route.route_id,
          JSON.stringify(toReceivingRouteAuditPayload(input.route)),
          input.route.created_at
        ]
      );
      await client.query('COMMIT');
      return { kind: 'created', route: input.route };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async listReceivingRoutes(merchantId: string): Promise<StoredMerchantReceivingRouteRecord[]> {
    const result = await this.pool.query(
      `SELECT id, merchant_id, bank_profile_id, rail_type, receiver_identifier_type,
        receiver_identifier_encrypted, receiver_identifier_hmac, receiver_identifier_masked,
        receiver_identifier_last4, route_code, display_label,
        enabled, recommended, review_policy, fees_hint, created_at, updated_at, deleted_at
       FROM merchant_receiving_routes
       WHERE merchant_id = $1 AND deleted_at IS NULL
       ORDER BY recommended DESC, created_at ASC`,
      [merchantId]
    );
    return result.rows.map((row) => toMerchantReceivingRoute(row as Record<string, string | boolean | Date | null>));
  }

  public async updateReceivingRoute(input: UpdateReceivingRouteInput): Promise<ReceivingRouteMutationResult> {
    const route = await this.getReceivingRoute(input.merchantId, input.routeId);
    if (!route) {
      return { kind: 'not_found' };
    }
    const updatedRoute: StoredMerchantReceivingRouteRecord = {
      ...route,
      ...input.patch,
      updated_at: input.now
    };
    if (updatedRoute.recommended) {
      await this.pool.query(
        `UPDATE merchant_receiving_routes
         SET recommended = false, updated_at = $4
         WHERE merchant_id = $1 AND rail_type = $2 AND id <> $3 AND deleted_at IS NULL`,
        [input.merchantId, updatedRoute.rail_type, input.routeId, input.now]
      );
    }
    const result = await this.pool.query(
      `UPDATE merchant_receiving_routes
       SET enabled = $3,
           recommended = $4,
           display_label = $5,
           fees_hint = $6,
           updated_at = $7
       WHERE merchant_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING id, merchant_id, bank_profile_id, rail_type, receiver_identifier_type,
        receiver_identifier_encrypted, receiver_identifier_hmac, receiver_identifier_masked,
        receiver_identifier_last4, route_code, display_label,
        enabled, recommended, review_policy, fees_hint, created_at, updated_at, deleted_at`,
      [
        input.merchantId,
        input.routeId,
        updatedRoute.enabled,
        updatedRoute.recommended,
        updatedRoute.display_label,
        updatedRoute.fees_hint ?? null,
        input.now
      ]
    );
    if (result.rowCount === 0) {
      return { kind: 'not_found' };
    }
    const updated = toMerchantReceivingRoute(result.rows[0] as Record<string, string | boolean | Date | null>);
    await this.pool.query(
      `INSERT INTO audit_events (
        id, merchant_id, event_type, object_type, object_id, actor_type, payload_redacted, created_at
      ) VALUES ($1, $2, 'merchant_receiving_route.updated', 'merchant_receiving_route', $3, 'api', $4::jsonb, $5)`,
      [input.auditEventId, input.merchantId, input.routeId, JSON.stringify(toReceivingRouteAuditPayload(updated)), input.now]
    );
    return { kind: 'updated', route: updated };
  }

  public async deleteReceivingRoute(input: DeleteReceivingRouteInput): Promise<ReceivingRouteMutationResult> {
    const route = await this.getReceivingRoute(input.merchantId, input.routeId);
    if (!route) {
      return { kind: 'not_found' };
    }
    const result = await this.pool.query(
      `UPDATE merchant_receiving_routes
       SET enabled = false,
           recommended = false,
           deleted_at = $3,
           updated_at = $3
       WHERE merchant_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING id, merchant_id, bank_profile_id, rail_type, receiver_identifier_type,
        receiver_identifier_encrypted, receiver_identifier_hmac, receiver_identifier_masked,
        receiver_identifier_last4, route_code, display_label,
        enabled, recommended, review_policy, fees_hint, created_at, updated_at, deleted_at`,
      [input.merchantId, input.routeId, input.now]
    );
    if (result.rowCount === 0) {
      return { kind: 'not_found' };
    }
    const deleted = toMerchantReceivingRoute(result.rows[0] as Record<string, string | boolean | Date | null>);
    await this.pool.query(
      `INSERT INTO audit_events (
        id, merchant_id, event_type, object_type, object_id, actor_type, payload_redacted, created_at
      ) VALUES ($1, $2, 'merchant_receiving_route.deleted', 'merchant_receiving_route', $3, 'api', $4::jsonb, $5)`,
      [input.auditEventId, input.merchantId, input.routeId, JSON.stringify(toReceivingRouteAuditPayload(deleted)), input.now]
    );
    return { kind: 'updated', route: deleted };
  }

  public async listReceiverBanksForCheckout(merchantId: string, paymentSessionId: string) {
    void paymentSessionId;
    const result = await this.pool.query(
      `SELECT id, merchant_id, bank_profile_id, rail_type, receiver_identifier_type,
        receiver_identifier_encrypted, receiver_identifier_hmac, receiver_identifier_masked,
        receiver_identifier_last4, route_code, display_label,
        enabled, recommended, review_policy, fees_hint, created_at, updated_at, deleted_at
       FROM merchant_receiving_routes
       WHERE merchant_id = $1 AND enabled = true AND deleted_at IS NULL
       ORDER BY recommended DESC, created_at ASC`,
      [merchantId]
    );
    return result.rows.map((row) => toMerchantReceivingRoute(row as Record<string, string | boolean | Date | null>));
  }

  public async listReceivingRoutesForCheckoutBank(merchantId: string, paymentSessionId: string, bankProfileId: string) {
    void paymentSessionId;
    const result = await this.pool.query(
      `SELECT id, merchant_id, bank_profile_id, rail_type, receiver_identifier_type,
        receiver_identifier_encrypted, receiver_identifier_hmac, receiver_identifier_masked,
        receiver_identifier_last4, route_code, display_label,
        enabled, recommended, review_policy, fees_hint, created_at, updated_at, deleted_at
       FROM merchant_receiving_routes
       WHERE merchant_id = $1 AND bank_profile_id = $2 AND enabled = true AND deleted_at IS NULL
       ORDER BY recommended DESC, created_at ASC`,
      [merchantId, bankProfileId]
    );
    return result.rows.map((row) => toMerchantReceivingRoute(row as Record<string, string | boolean | Date | null>));
  }

  public async getSelectedReceivingRouteCopyDetails(input: {
    merchantId: string;
    paymentSessionId: string;
    encryptionSecret: string;
    now: string;
  }): Promise<ReceivingRouteCopyDetailsResult> {
    const loaded = await this.getPaymentSessionById(input.merchantId, input.paymentSessionId);
    if (!loaded) {
      return { kind: 'not_found' };
    }
    if (new Date(loaded.paymentSession.validUntil).getTime() <= new Date(input.now).getTime()) {
      return { kind: 'expired' };
    }
    if (!copyDetailsAllowedSessionStatuses.has(loaded.paymentSession.status)) {
      return { kind: 'inactive' };
    }
    if (!loaded.paymentSession.selectedReceiverBankProfileId || !loaded.paymentSession.selectedReceivingRouteId) {
      return { kind: 'not_selected' };
    }

    const route = await this.getReceivingRoute(input.merchantId, loaded.paymentSession.selectedReceivingRouteId);
    if (!route || !route.enabled || route.bank_profile_id !== loaded.paymentSession.selectedReceiverBankProfileId) {
      return { kind: 'not_found' };
    }

    return {
      kind: 'found',
      order: loaded.order,
      paymentSession: loaded.paymentSession,
      route,
      receiverIdentifier: decryptReceiverIdentifier(route.receiver_identifier_encrypted, input.encryptionSecret)
    };
  }

  public async recordCheckoutDestinationCopied(input: {
    merchantId: string;
    paymentSessionId: string;
    routeId: string;
    railType: string;
    receiverIdentifierMasked: string;
    auditEventId: string;
    now: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_events (
        id, merchant_id, event_type, object_type, object_id, actor_type, payload_redacted, created_at
      ) VALUES ($1, $2, 'checkout.destination_copied', 'payment_session', $3, 'api', $4::jsonb, $5)`,
      [
        input.auditEventId,
        input.merchantId,
        input.paymentSessionId,
        JSON.stringify({
          payment_session_id: input.paymentSessionId,
          receiving_route_id: input.routeId,
          rail_type: input.railType,
          receiver_identifier_masked: input.receiverIdentifierMasked,
          auto_confirm_enabled: false,
          official_bank_confirmation: false
        }),
        input.now
      ]
    );
  }

  public async selectReceiverBank(input: SelectReceiverBankInput): Promise<PaymentSessionCheckoutMutationResult> {
    return this.mutateCheckoutSession({
      input,
      allowedStatuses: ['created', 'receiver_arming'],
      auditEventType: 'checkout.receiver_bank_selected',
      apply: async (client) => {
        await client.query(
          `UPDATE payment_sessions
           SET selected_receiver_bank_id = $3,
               selected_receiver_bank_profile_id = $4,
               selected_receiving_route_id = NULL,
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

  public async selectReceivingRoute(input: SelectReceivingRouteInput): Promise<PaymentSessionCheckoutMutationResult> {
    const loaded = await this.getPaymentSessionById(input.merchantId, input.paymentSessionId);
    if (!loaded?.paymentSession.selectedReceiverBankProfileId) {
      return { kind: 'not_found' };
    }
    const route = await this.getReceivingRoute(input.merchantId, input.receivingRouteId);
    if (!route || route.bank_profile_id !== loaded.paymentSession.selectedReceiverBankProfileId || !route.enabled) {
      return { kind: 'not_found' };
    }
    if (
      loaded.paymentSession.paymentMethod &&
      route.rail_type !== receivingRailForBuyerPaymentMethod(loaded.paymentSession.paymentMethod)
    ) {
      return { kind: 'not_found' };
    }

    return this.mutateCheckoutSession({
      input,
      allowedStatuses: ['created', 'receiver_arming'],
      auditEventType: 'checkout.receiving_route_selected',
      apply: async (client) => {
        await client.query(
          `UPDATE payment_sessions
           SET selected_receiving_route_id = $3,
               selected_payer_bank_launcher_id = NULL,
               payment_instructions_shown_at = NULL,
               updated_at = $4
           WHERE merchant_id = $1 AND id = $2`,
          [input.merchantId, input.paymentSessionId, input.receivingRouteId, input.now]
        );
      },
      payload: {
        receiving_route_id: input.receivingRouteId,
        receiver_route_code: route.route_code,
        rail_type: route.rail_type,
        review_policy: route.review_policy,
        auto_confirm_enabled: false
      }
    });
  }

  public async selectPayerBankLauncher(input: SelectPayerBankLauncherInput): Promise<PaymentSessionCheckoutMutationResult> {
    return this.mutateCheckoutSession({
      input,
      allowedStatuses: ['created', 'receiver_arming'],
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

  public async saveExpectedPaymentProfile(input: SaveExpectedPaymentProfileInput): Promise<PaymentSessionCheckoutMutationResult> {
    return this.mutateCheckoutSession({
      input,
      allowedStatuses: ['created', 'receiver_arming'],
      auditEventType: 'checkout.expected_payment_profile_saved',
      apply: async (client) => {
        await client.query(
          `UPDATE payment_sessions
           SET payment_method = $3,
               sender_bank_id = $4,
               sender_card_last4 = $5,
               sender_card_masked = $6,
               sender_card_hmac = $7,
               sender_phone_masked = $8,
               sender_phone_hmac = $9,
               buyer_first_name_raw = $10,
               buyer_last_name_raw = $11,
               buyer_name_script_detected = $12,
               buyer_name_normalized = $13,
               buyer_name_latin_variants = $14::jsonb,
               buyer_name_cyrillic_variants = $15::jsonb,
               buyer_name_initial_variants = $16::jsonb,
               buyer_name_reversed_order_variants = $17::jsonb,
               buyer_name_fingerprint = $18,
               display_amount_minor = $19,
               payable_amount_minor = $20,
               reconciliation_delta_minor = $21,
               expected_payment_fingerprint = $22,
               expected_amount_minor = $20,
               selected_receiver_bank_id = $23,
               selected_receiver_bank_profile_id = $24,
               selected_receiving_route_id = NULL,
               selected_payer_bank_launcher_id = $25,
               payment_instructions_shown_at = NULL,
               updated_at = $26
           WHERE merchant_id = $1 AND id = $2`,
          [
            input.merchantId,
            input.paymentSessionId,
            input.profile.payment_method,
            input.profile.sender_bank_id,
            input.profile.sender_card_last4 ?? null,
            input.profile.sender_card_masked ?? null,
            input.profile.sender_card_hmac ?? null,
            input.profile.sender_phone_masked ?? null,
            input.profile.sender_phone_hmac ?? null,
            input.profile.buyer_first_name_raw,
            input.profile.buyer_last_name_raw,
            input.profile.buyer_name_script_detected,
            input.profile.buyer_name_normalized,
            JSON.stringify(input.profile.buyer_name_latin_variants),
            JSON.stringify(input.profile.buyer_name_cyrillic_variants),
            JSON.stringify(input.profile.buyer_name_initial_variants),
            JSON.stringify(input.profile.buyer_name_reversed_order_variants),
            input.profile.buyer_name_fingerprint,
            input.profile.display_amount_minor,
            input.profile.payable_amount_minor,
            input.profile.reconciliation_delta_minor,
            input.profile.expected_payment_fingerprint,
            input.receiverBankId,
            input.bankProfileId,
            input.payerBankLauncherId,
            input.now
          ]
        );
      },
      payload: {
        payment_method: input.profile.payment_method,
        sender_bank_id: input.profile.sender_bank_id,
        sender_card_masked: input.profile.sender_card_masked,
        sender_phone_masked: input.profile.sender_phone_masked,
        display_amount_minor: input.profile.display_amount_minor,
        payable_amount_minor: input.profile.payable_amount_minor,
        reconciliation_delta_minor: input.profile.reconciliation_delta_minor,
        selected_receiver_bank_id: input.receiverBankId,
        selected_payer_bank_launcher_id: input.payerBankLauncherId,
        does_not_confirm_payment: true,
        official_bank_confirmation: false
      }
    });
  }

  public async saveBuyerSenderPhoneHint(input: SaveBuyerSenderPhoneHintInput): Promise<PaymentSessionCheckoutMutationResult> {
    return this.mutateCheckoutSession({
      input,
      auditEventType: 'checkout.buyer_sender_phone_hint_saved',
      apply: async (client) => {
        await client.query(
          `UPDATE payment_sessions
           SET buyer_sender_phone_hmac = $3,
               buyer_sender_phone_masked = $4,
               updated_at = $5
           WHERE merchant_id = $1 AND id = $2`,
          [
            input.merchantId,
            input.paymentSessionId,
            input.buyerSenderPhoneHmac,
            input.buyerSenderPhoneMasked,
            input.now
          ]
        );
      },
      payload: {
        buyer_sender_phone_masked: input.buyerSenderPhoneMasked,
        does_not_confirm_payment: true
      }
    });
  }

  public async markReceiverArmed(input: CheckoutMutationBaseInput): Promise<PaymentSessionCheckoutMutationResult> {
    return this.mutateCheckoutSession({
      input,
      allowedStatuses: ['receiver_arming'],
      auditEventType: 'checkout.continue_to_bank',
      apply: async (client) => {
        await client.query(
          `UPDATE payment_sessions
           SET status = 'receiver_armed',
               payment_instructions_shown_at = COALESCE(payment_instructions_shown_at, $3::timestamptz),
               updated_at = $3
           WHERE merchant_id = $1 AND id = $2`,
          [input.merchantId, input.paymentSessionId, input.now]
        );
        await client.query(
          `UPDATE orders
           SET status = 'receiver_armed', updated_at = $3
           WHERE merchant_id = $1
             AND id = (SELECT order_id FROM payment_sessions WHERE merchant_id = $1 AND id = $2)`,
          [input.merchantId, input.paymentSessionId, input.now]
        );
      },
      payload: {
        receiver_status: 'armed',
        launcher_result: 'no_supported_launcher',
        bank_launcher_attempted: false,
        does_not_confirm_payment: true,
        auto_confirm_enabled: false
      }
    });
  }

  public async markPaymentInstructionsShown(input: CheckoutMutationBaseInput): Promise<PaymentSessionCheckoutMutationResult> {
    return this.mutateCheckoutSession({
      input,
      allowedStatuses: ['receiver_arming', 'receiver_armed'],
      auditEventType: 'checkout.payment_instructions_shown',
      apply: async (client) => {
        await client.query(
          `UPDATE payment_sessions
           SET payment_instructions_shown_at = COALESCE(payment_instructions_shown_at, $3::timestamptz),
               updated_at = $3
           WHERE merchant_id = $1 AND id = $2`,
          [input.merchantId, input.paymentSessionId, input.now]
        );
        await client.query(
          `UPDATE orders
           SET status = 'payment_instructions_shown', updated_at = $3
           WHERE merchant_id = $1
             AND id = (SELECT order_id FROM payment_sessions WHERE merchant_id = $1 AND id = $2)`,
          [input.merchantId, input.paymentSessionId, input.now]
        );
      },
      payload: {
        next_status: 'payment_instructions_shown',
        does_not_confirm_payment: true
      }
    });
  }

  public async markBuyerClaimedPaid(input: CheckoutMutationBaseInput): Promise<PaymentSessionCheckoutMutationResult> {
    return this.mutateCheckoutSession({
      input,
      allowedStatuses: ['receiver_armed'],
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

  private async getReceivingRoute(
    merchantId: string,
    routeId: string
  ): Promise<StoredMerchantReceivingRouteRecord | null> {
    const result = await this.pool.query(
      `SELECT id, merchant_id, bank_profile_id, rail_type, receiver_identifier_type,
        receiver_identifier_encrypted, receiver_identifier_hmac, receiver_identifier_masked,
        receiver_identifier_last4, route_code, display_label,
        enabled, recommended, review_policy, fees_hint, created_at, updated_at, deleted_at
       FROM merchant_receiving_routes
       WHERE merchant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [merchantId, routeId]
    );
    return result.rowCount
      ? toMerchantReceivingRoute(result.rows[0] as Record<string, string | boolean | Date | null>)
      : null;
  }

  private async mutateCheckoutSession(params: {
    input: CheckoutMutationBaseInput;
    allowedStatuses?: readonly PaymentSessionStatus[] | undefined;
    auditEventType: string;
    apply: (client: pg.PoolClient) => Promise<void>;
    payload: Record<string, unknown>;
  }): Promise<PaymentSessionCheckoutMutationResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const current = await client.query(
        `SELECT ps.id, ps.valid_until, ps.status
         FROM payment_sessions ps
         WHERE ps.merchant_id = $1 AND ps.id = $2
         FOR UPDATE`,
        [params.input.merchantId, params.input.paymentSessionId]
      );
      if (current.rowCount === 0) {
        await client.query('ROLLBACK');
        return { kind: 'not_found' };
      }
      const row = current.rows[0] as { valid_until: string | Date; status: PaymentSessionStatus };
      if (new Date(row.valid_until).getTime() <= new Date(params.input.now).getTime()) {
        await client.query('ROLLBACK');
        return { kind: 'expired' };
      }
      if (params.allowedStatuses && !params.allowedStatuses.includes(row.status)) {
        await client.query('ROLLBACK');
        return { kind: 'invalid_transition', currentStatus: row.status };
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
    selectedReceivingRouteId: row.selected_receiving_route_id ? String(row.selected_receiving_route_id) : undefined,
    selectedPayerBankLauncherId: row.selected_payer_bank_launcher_id
      ? String(row.selected_payer_bank_launcher_id)
      : undefined,
    buyerSenderPhoneHmac: row.buyer_sender_phone_hmac ? String(row.buyer_sender_phone_hmac) : undefined,
    buyerSenderPhoneMasked: row.buyer_sender_phone_masked ? String(row.buyer_sender_phone_masked) : undefined,
    paymentMethod: row.payment_method ? String(row.payment_method) as BuyerCheckoutPaymentMethod : undefined,
    senderBankId: row.sender_bank_id ? String(row.sender_bank_id) : undefined,
    senderCardLast4: row.sender_card_last4 ? String(row.sender_card_last4) : undefined,
    senderCardMasked: row.sender_card_masked ? String(row.sender_card_masked) : undefined,
    senderCardHmac: row.sender_card_hmac ? String(row.sender_card_hmac) : undefined,
    senderPhoneMasked: row.sender_phone_masked ? String(row.sender_phone_masked) : undefined,
    senderPhoneHmac: row.sender_phone_hmac ? String(row.sender_phone_hmac) : undefined,
    buyerFirstNameRaw: row.buyer_first_name_raw ? String(row.buyer_first_name_raw) : undefined,
    buyerLastNameRaw: row.buyer_last_name_raw ? String(row.buyer_last_name_raw) : undefined,
    buyerNameScriptDetected: row.buyer_name_script_detected ? String(row.buyer_name_script_detected) : undefined,
    buyerNameNormalized: row.buyer_name_normalized ? String(row.buyer_name_normalized) : undefined,
    buyerNameLatinVariants: parseJsonStringArray(row.buyer_name_latin_variants),
    buyerNameCyrillicVariants: parseJsonStringArray(row.buyer_name_cyrillic_variants),
    buyerNameInitialVariants: parseJsonStringArray(row.buyer_name_initial_variants),
    buyerNameReversedOrderVariants: parseJsonStringArray(row.buyer_name_reversed_order_variants),
    buyerNameFingerprint: row.buyer_name_fingerprint ? String(row.buyer_name_fingerprint) : undefined,
    displayAmountMinor: row.display_amount_minor !== null && row.display_amount_minor !== undefined ? Number(row.display_amount_minor) : undefined,
    payableAmountMinor: row.payable_amount_minor !== null && row.payable_amount_minor !== undefined ? Number(row.payable_amount_minor) : undefined,
    reconciliationDeltaMinor: row.reconciliation_delta_minor !== null && row.reconciliation_delta_minor !== undefined ? Number(row.reconciliation_delta_minor) : undefined,
    expectedPaymentFingerprint: row.expected_payment_fingerprint ? String(row.expected_payment_fingerprint) : undefined,
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

function parseJsonStringArray(value: unknown): string[] | undefined {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  try {
    const parsed = JSON.parse(String(value)) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : undefined;
  } catch {
    return undefined;
  }
}

function toMerchantReceivingRoute(row: Record<string, string | boolean | Date | null>): StoredMerchantReceivingRouteRecord {
  return {
    route_id: String(row.id),
    merchant_id: String(row.merchant_id),
    bank_profile_id: String(row.bank_profile_id),
    rail_type: String(row.rail_type) as ReceivingRouteRailType,
    receiver_identifier_type: String(row.receiver_identifier_type) as ReceiverIdentifierType,
    receiver_identifier_encrypted: String(row.receiver_identifier_encrypted),
    receiver_identifier_hmac: String(row.receiver_identifier_hmac ?? ''),
    receiver_identifier_masked: String(row.receiver_identifier_masked),
    receiver_identifier_last4: String(row.receiver_identifier_last4 ?? ''),
    route_code: String(row.route_code),
    display_label: String(row.display_label),
    enabled: Boolean(row.enabled),
    recommended: Boolean(row.recommended),
    review_policy: String(row.review_policy) as ReceivingRouteReviewPolicy,
    fees_hint: row.fees_hint ? String(row.fees_hint) : undefined,
    created_at: new Date(String(row.created_at)).toISOString(),
    updated_at: new Date(String(row.updated_at)).toISOString(),
    deleted_at: row.deleted_at ? new Date(String(row.deleted_at)).toISOString() : null
  };
}

const copyDetailsAllowedSessionStatuses = new Set<PaymentSessionStatus>([
  'receiver_arming',
  'receiver_armed',
  'awaiting_payment',
  'buyer_claimed_paid',
  'signal_detected',
  'matching',
  'needs_review'
]);

export function buildMerchantReceivingRouteRecord(input: {
  routeId: string;
  merchantId: string;
  bankProfileId: string;
  railType: ReceivingRouteRailType;
  receiverIdentifier: string;
  routeCode: string;
  displayLabel: string;
  enabled?: boolean | undefined;
  recommended?: boolean | undefined;
  reviewPolicy?: ReceivingRouteReviewPolicy | undefined;
  feesHint?: string | undefined;
  encryptionSecret: string;
  now: string;
}): StoredMerchantReceivingRouteRecord | ApiErrorResponse {
  if (!V1ReceiverBankOptions.some((bank) => bank.bank_profile_id === input.bankProfileId)) {
    return invalidRequest('bank_profile_id is not supported for receiving routes.', {
      bank_profile_id: input.bankProfileId
    });
  }
  if (!ReceivingRouteRailTypes.includes(input.railType)) {
    return invalidRequest('rail_type is not supported.', { rail_type: input.railType });
  }
  const receiverIdentifierType = receiverIdentifierTypeForRail(input.railType);
  if (!ReceiverIdentifierTypes.includes(receiverIdentifierType)) {
    return invalidRequest('receiver identifier type is not supported.', { rail_type: input.railType });
  }
  if (!input.receiverIdentifier.trim()) {
    return invalidRequest('receiver_identifier is required.', {});
  }
  const normalizedIdentifier = normalizeReceiverIdentifier(receiverIdentifierType, input.receiverIdentifier);
  if (!normalizedIdentifier) {
    return invalidRequest('receiver_identifier is not valid for the selected receiving route.', {
      type: receiverIdentifierType
    });
  }
  const routeCode = sanitizeRouteCode(input.routeCode);
  if (!routeCode) {
    return invalidRequest('route_code must contain letters, numbers, dash or underscore.', {});
  }
  const displayLabel = input.displayLabel.trim();
  if (!displayLabel) {
    return invalidRequest('display_label is required.', {});
  }

  const reviewPolicy = input.reviewPolicy ?? defaultReviewPolicyForRail(input.railType);
  if (!ReceivingRouteReviewPolicies.includes(reviewPolicy)) {
    return invalidRequest('review_policy is not supported.', { review_policy: reviewPolicy });
  }

  return {
    route_id: input.routeId,
    merchant_id: input.merchantId,
    bank_profile_id: input.bankProfileId,
    rail_type: input.railType,
    receiver_identifier_type: receiverIdentifierType,
    receiver_identifier_encrypted: encryptReceiverIdentifier(input.receiverIdentifier, input.encryptionSecret),
    receiver_identifier_hmac: hmacSha256(`${input.merchantId}:${input.railType}:${normalizedIdentifier}`, input.encryptionSecret),
    receiver_identifier_masked: maskReceiverIdentifier(receiverIdentifierType, normalizedIdentifier),
    receiver_identifier_last4: normalizedIdentifier.replace(/\D/g, '').slice(-4),
    route_code: routeCode,
    display_label: displayLabel,
    enabled: input.enabled ?? true,
    recommended: input.recommended ?? false,
    review_policy: reviewPolicy,
    fees_hint: input.feesHint?.trim() || undefined,
    created_at: input.now,
    updated_at: input.now
  };
}

export function receiverIdentifierTypeForRail(railType: ReceivingRouteRailType): ReceiverIdentifierType {
  return railType === 'phone_transfer' ? 'phone' : 'card';
}

export function defaultReviewPolicyForRail(railType: ReceivingRouteRailType): ReceivingRouteReviewPolicy {
  return railType === 'phone_transfer' ? 'eligible_low_risk_later' : 'review_first';
}

function normalizeReceiverIdentifier(type: ReceiverIdentifierType, value: string): string | null {
  if (type === 'phone') {
    return normalizeRussianPhone(value);
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) {
    return null;
  }
  return digits;
}

function encryptReceiverIdentifier(value: string, secret: string): string {
  const iv = randomBytes(12);
  const key = createHash('sha256').update(`swimpay_receiver_route:${secret}`, 'utf8').digest();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `aes256gcm:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decryptReceiverIdentifier(value: string, secret: string): string {
  const [scheme, ivBase64, tagBase64, ciphertextBase64] = value.split(':');
  if (scheme !== 'aes256gcm' || !ivBase64 || !tagBase64 || !ciphertextBase64) {
    throw new Error('Unsupported receiver route encryption envelope.');
  }

  const key = createHash('sha256').update(`swimpay_receiver_route:${secret}`, 'utf8').digest();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivBase64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextBase64, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

function sanitizeRouteCode(routeCode: string): string | null {
  const value = routeCode.trim().toUpperCase();
  return /^[A-Z0-9_-]{3,64}$/.test(value) ? value : null;
}

function toReceivingRouteAuditPayload(route: StoredMerchantReceivingRouteRecord): Record<string, unknown> {
  return {
    route_id: route.route_id,
    bank_profile_id: route.bank_profile_id,
    rail_type: route.rail_type,
    receiver_identifier_type: route.receiver_identifier_type,
    receiver_identifier_masked: route.receiver_identifier_masked,
    receiver_identifier_last4: route.receiver_identifier_last4,
    route_code: route.route_code,
    enabled: route.enabled,
    recommended: route.recommended,
    review_policy: route.review_policy,
    deleted_at: route.deleted_at ?? null,
    auto_confirm_enabled: false
  };
}

export function parseMerchantId(
  authorization: string | undefined,
  options: { allowTestBearer?: boolean } = {}
): string | null {
  if (options.allowTestBearer !== true) {
    return null;
  }

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

  if ('auto_confirm' in body) {
    return invalidRequest('auto_confirm is not supported in SwimPay V1 order creation.', {
      field: 'auto_confirm'
    });
  }
  if ('autoConfirm' in body) {
    return invalidRequest('autoConfirm is not supported in SwimPay V1 order creation.', {
      field: 'autoConfirm'
    });
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

export function buildExpectedPaymentProfileMutation(params: {
  body: unknown;
  loaded: { order: StoredOrderRecord; paymentSession: StoredPaymentSessionRecord };
  phoneHmacSecret: string;
  auditEventId: string;
  now: string;
}): SaveExpectedPaymentProfileInput | ApiErrorResponse {
  const body = validateExpectedPaymentProfileBody(params.body);
  if ('error' in body) {
    return body;
  }

  try {
    const profile = deriveExpectedPaymentProfile({
      payment_session_id: params.loaded.paymentSession.id,
      merchant_id: params.loaded.paymentSession.merchantId,
      buyer_first_name_raw: body.buyer_first_name,
      buyer_last_name_raw: body.buyer_last_name,
      payment_method: body.payment_method,
      sender_bank_id: body.sender_bank_id,
      sender_card_number: body.sender_card_number,
      sender_phone: body.sender_phone,
      display_amount_minor: params.loaded.order.amountMinor,
      currency: params.loaded.order.currency,
      generated_reference: params.loaded.paymentSession.referenceCode,
      expires_at: params.loaded.paymentSession.validUntil,
      hmac: (scope, value) => hmacSha256(`${scope}:${value}`, params.phoneHmacSecret)
    });

    return {
      merchantId: params.loaded.paymentSession.merchantId,
      paymentSessionId: params.loaded.paymentSession.id,
      auditEventId: params.auditEventId,
      now: params.now,
      profile,
      receiverBankId: profile.sender_bank_id,
      bankProfileId: profile.sender_bank_id,
      payerBankLauncherId: profile.sender_bank_id
    };
  } catch (error) {
    return invalidRequest(error instanceof Error ? error.message : 'Expected payment profile is invalid.', {});
  }
}

export function validateExpectedPaymentProfileBody(body: unknown): ExpectedPaymentProfileRequestBody | ApiErrorResponse {
  if (!body || typeof body !== 'object') {
    return invalidRequest('Expected payment profile body must be a JSON object.', {});
  }
  const candidate = body as Partial<ExpectedPaymentProfileRequestBody> & Record<string, unknown>;
  const forbiddenCredentialField = /^(cvv|cvc|cvc2|security_code|expiration|expiry|exp_month|exp_year|pin|sms_code|bank_password|password)$/iu;
  for (const key of Object.keys(candidate)) {
    if (forbiddenCredentialField.test(key)) {
      return invalidRequest('Buyer payment profile must not include card secrets or bank credentials.', { field: key });
    }
  }
  if (
    typeof candidate.buyer_first_name !== 'string' ||
    typeof candidate.buyer_last_name !== 'string' ||
    typeof candidate.payment_method !== 'string' ||
    typeof candidate.sender_bank_id !== 'string'
  ) {
    return invalidRequest('Expected payment profile is missing required fields.', {});
  }
  if (!['card', 'sbp'].includes(candidate.payment_method)) {
    return invalidRequest('payment_method is not supported.', { payment_method: candidate.payment_method });
  }
  if (!V1ReceiverBankOptions.some((bank) => bank.bank_profile_id === candidate.sender_bank_id)) {
    return invalidRequest('sender_bank_id is not supported.', { sender_bank_id: candidate.sender_bank_id });
  }
  const senderCardNumber = typeof candidate.sender_card_number === 'string' ? candidate.sender_card_number.trim() : undefined;
  const senderPhone = typeof candidate.sender_phone === 'string' ? candidate.sender_phone.trim() : undefined;

  if (!candidate.buyer_first_name.trim() || !candidate.buyer_last_name.trim()) {
    return invalidRequest('Buyer first and last names are required.', {});
  }
  if (candidate.payment_method === 'card' && !senderCardNumber) {
    return invalidRequest('sender_card_number is required for card payments.', { payment_method: candidate.payment_method });
  }
  if (candidate.payment_method === 'card' && senderPhone) {
    return invalidRequest('sender_phone must not be submitted for card payments.', { payment_method: candidate.payment_method });
  }
  if (candidate.payment_method === 'sbp' && !senderPhone) {
    return invalidRequest('sender_phone is required for phone payments.', { payment_method: candidate.payment_method });
  }
  if (candidate.payment_method === 'sbp' && senderCardNumber) {
    return invalidRequest('sender_card_number must not be submitted for phone payments.', { payment_method: candidate.payment_method });
  }

  return {
    buyer_first_name: candidate.buyer_first_name.trim(),
    buyer_last_name: candidate.buyer_last_name.trim(),
    payment_method: candidate.payment_method as BuyerCheckoutPaymentMethod,
    sender_bank_id: candidate.sender_bank_id.trim(),
    sender_card_number: candidate.payment_method === 'card' ? senderCardNumber : undefined,
    sender_phone: candidate.payment_method === 'sbp' ? senderPhone : undefined
  };
}
