import pg from 'pg';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { hmacSha256, maskPhone, normalizeRussianPhone } from '@swimpay/security';
import {
  ReceivingRouteRailTypes,
  ReceivingRouteReviewPolicies,
  ReceiverIdentifierTypes,
  PayerBankLauncherRegistry,
  AllReceiverBankProfiles,
  InternationalReceiverBankProfiles,
  WestAfricaReceiverBankProfiles,
  deriveExpectedPaymentProfile,
  maskReceiverIdentifier,
  receivingRailForBuyerPaymentMethod,
  detectCurrencyFromDisplayPrice,
  type BuyerCheckoutPaymentMethod,
  type ExpectedPaymentProfile,
  type MerchantReceivingRoute,
  type OrderStatus,
  type PaymentSessionStatus,
  type ReceivingRouteLifecycleStatus,
  type ReceivingRouteRailType,
  type ReceivingRouteReviewPolicy,
  type ReceiverIdentifierType
} from '@swimpay/contracts';
import type { FxRateService } from './fx.js';

const { Pool } = pg;

export interface StoredOrderRecord {
  id: string;
  merchantId: string;
  externalId: string;
  returnUrl?: string | undefined;
  productId?: string | undefined;
  productName?: string | undefined;
  productRiskLevel: string;
  amountMinor: number;
  currency: string;
  detectionSource?: 'display_price_parsed' | undefined;
  detectionRawInput?: string | undefined;
  originalCurrency?: string | undefined;
  originalAmountMinor?: number | undefined;
  fxRate?: string | undefined;
  fxRateTimestamp?: string | undefined;
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
  receiverArmedAt?: string | undefined;
  buyerClaimedPaidAt?: string | undefined;
  noNotificationManualCheckRequestedAt?: string | undefined;
  routeLockedAt?: string | undefined;
  routeLockExpiresAt?: string | undefined;
  amountLeaseId?: string | undefined;
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
  patch: Partial<Pick<StoredMerchantReceivingRouteRecord, 'enabled' | 'recommended' | 'display_label' | 'fees_hint' | 'lifecycle_status' | 'revocation_reason'>>;
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
  expectedPaymentFingerprintForPayableAmount?: ((payableAmountMinor: number) => string) | undefined;
}

export interface SaveBuyerSenderPhoneHintInput extends CheckoutMutationBaseInput {
  buyerSenderPhoneHmac: string;
  buyerSenderPhoneMasked: string;
}

export interface SaveExpectedPaymentProfileInput extends CheckoutMutationBaseInput {
  profile: ExpectedPaymentProfile;
  receivingRouteId: string;
  receiverBankId: string;
  bankProfileId: string;
  payerBankLauncherId: string;
  expectedPaymentFingerprintForPayableAmount?: ((payableAmountMinor: number) => string) | undefined;
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
      claimResult?: BuyerClaimResult | undefined;
    }
  | {
      kind: 'already_final';
      order: StoredOrderRecord;
      paymentSession: StoredPaymentSessionRecord;
      claimResult: BuyerClaimResult;
    }
  | { kind: 'not_found' }
  | { kind: 'expired' }
  | { kind: 'amount_lease_unavailable' }
  | { kind: 'invalid_transition'; currentStatus: PaymentSessionStatus };

export type BuyerClaimResult =
  | 'claim_recorded'
  | 'pending_review'
  | 'already_confirmed'
  | 'already_rejected'
  | 'already_expired';

export interface RequestNoNotificationManualCheckInput extends CheckoutMutationBaseInput {
  reviewId: string;
}

export type NoNotificationManualCheckResult =
  | {
      kind: 'created';
      reviewId: string;
      orderId: string;
      paymentSessionId: string;
      reasonLabel: 'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT';
    }
  | { kind: 'not_found' }
  | { kind: 'expired' }
  | { kind: 'not_due'; elapsedSeconds: number }
  | { kind: 'not_eligible'; reason: 'not_armed' | 'expected_profile_missing' | 'signal_or_review_exists' | 'already_requested' };

export interface ActiveReceiverPaymentSession {
  order: StoredOrderRecord;
  paymentSession: StoredPaymentSessionRecord;
}

export interface OrderRepository {
  createOrderWithSession(input: CreateOrderWithSessionInput): Promise<CreateOrderWithSessionResult>;
  listMerchantOrders?(
    merchantId: string,
    input?: { limit?: number | undefined }
  ): Promise<StoredOrderRecord[]>;
  listActiveReceiverPaymentSessions?(
    merchantId: string,
    now: string
  ): Promise<ActiveReceiverPaymentSession[]>;
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
  requestNoNotificationManualCheck(input: RequestNoNotificationManualCheckInput): Promise<NoNotificationManualCheckResult>;
}

export type AmountLeaseRail = 'sbp' | 'card';

export interface AmountLeaseCandidate {
  reconciliationDeltaMinor: number;
  payableAmountMinor: number;
}

export type BankRouteCertificationRuntimeStatus =
  | 'certified'
  | 'observed'
  | 'experimental'
  | 'review_only'
  | 'package_validation_pending'
  | 'disabled';

const CHECKOUT_SELECTABLE_BANK_ROUTE_CERTIFICATION_STATUSES = new Set<BankRouteCertificationRuntimeStatus>([
  'certified',
  'observed',
  'experimental',
  'review_only'
]);

const ROUTE_FINAL_SESSION_STATUSES = new Set<PaymentSessionStatus>(['manual_confirmed', 'rejected', 'expired']);

class AmountLeaseUnavailableError extends Error {
  public constructor() {
    super('No amount lease is available for this merchant receiving route.');
    this.name = 'AmountLeaseUnavailableError';
  }
}

/** Reconciliation deltas stay <=1% of the display amount (min 1 minor unit, max 99). */
export function maxReconciliationDeltaMinor(displayAmountMinor: number): number {
  return Math.min(99, Math.max(1, Math.floor(displayAmountMinor / 100)));
}

export function selectAmountLeaseCandidate(input: {
  displayAmountMinor: number;
  preferredDeltaMinor: number;
  unavailablePayableAmounts: ReadonlySet<number>;
}): AmountLeaseCandidate | null {
  if (!Number.isInteger(input.displayAmountMinor) || input.displayAmountMinor <= 0) {
    return null;
  }

  const maxDelta = maxReconciliationDeltaMinor(input.displayAmountMinor);
  const preferredDelta = normalizeReconciliationDelta(input.preferredDeltaMinor, maxDelta);
  const deltas = [
    preferredDelta,
    ...Array.from({ length: maxDelta }, (_value, index) => index + 1).filter((delta) => delta !== preferredDelta)
  ];

  for (const delta of deltas) {
    const payableAmountMinor = input.displayAmountMinor + delta;
    if (!input.unavailablePayableAmounts.has(payableAmountMinor)) {
      return {
        reconciliationDeltaMinor: delta,
        payableAmountMinor
      };
    }
  }

  return null;
}

export function bankCertificationAllowsCheckoutRoute(input: {
  status?: BankRouteCertificationRuntimeStatus | undefined;
  railSupported?: readonly string[] | undefined;
  routeRailType: ReceivingRouteRailType;
}): boolean {
  if (!input.status) {
    return false;
  }
  if (!CHECKOUT_SELECTABLE_BANK_ROUTE_CERTIFICATION_STATUSES.has(input.status)) {
    return false;
  }

  return (input.railSupported ?? []).includes(amountLeaseRailForRoute(input.routeRailType));
}

export interface IdGenerator {
  orderId: () => string;
  paymentSessionId: () => string;
  auditEventId: () => string;
  referenceCode: () => string;
}

export interface CreateOrderRequestBody {
  external_id: string;
  return_url?: string | undefined;
  web_return_url?: string | undefined;
  success_url?: string | undefined;
  cancel_url?: string | undefined;
  merchant_return_url?: string | undefined;
  app_link_url?: string | undefined;
  android_deep_link?: string | undefined;
  amount?: {
    value: string;
    currency: string;
  } | undefined;
  display_price?: string | undefined;
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
  return_url?: string | undefined;
  amount: {
    value: string;
    currency: string;
  };
  expires_at: string;
  latest_event: 'payment_session.created';
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
          id, merchant_id, external_id, return_url, product_id, product_name, product_risk_level,
          amount_minor, currency, status, expires_at, created_at, updated_at,
          detection_source, detection_raw_input, original_currency, original_amount_minor, fx_rate, fx_rate_timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          input.order.id,
          input.order.merchantId,
          input.order.externalId,
          input.order.returnUrl ?? null,
          input.order.productId ?? null,
          input.order.productName ?? null,
          input.order.productRiskLevel,
          input.order.amountMinor,
          input.order.currency,
          input.order.status,
          input.order.expiresAt,
          input.order.createdAt,
          input.order.updatedAt,
          input.order.detectionSource ?? null,
          input.order.detectionRawInput ?? null,
          input.order.originalCurrency ?? null,
          input.order.originalAmountMinor ?? null,
          input.order.fxRate ?? null,
          input.order.fxRateTimestamp ?? null
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

  public async listMerchantOrders(
    merchantId: string,
    input: { limit?: number | undefined } = {}
  ): Promise<StoredOrderRecord[]> {
    const limit = Math.max(1, Math.min(input.limit ?? 50, 100));
    const result = await this.pool.query(
      `SELECT id, merchant_id, external_id, product_id, product_name, product_risk_level,
        return_url, amount_minor, currency, detection_source, detection_raw_input,
        original_currency, original_amount_minor, fx_rate, fx_rate_timestamp,
        status, expires_at, created_at, updated_at
       FROM orders
       WHERE merchant_id = $1
         AND status IN ('manual_confirmed', 'fulfilled', 'rejected', 'expired')
       ORDER BY updated_at DESC, created_at DESC
       LIMIT $2`,
      [merchantId, limit]
    );

    return result.rows.map((row) => toOrder(row as Record<string, string | number | Date | null>));
  }

  public async listActiveReceiverPaymentSessions(
    merchantId: string,
    now: string
  ): Promise<ActiveReceiverPaymentSession[]> {
    const result = await this.pool.query(
      `SELECT
         o.id AS order_id, o.merchant_id, o.external_id, o.return_url, o.product_id, o.product_name,
         o.product_risk_level, o.amount_minor, o.currency AS order_currency, o.status AS order_status,
         o.expires_at AS order_expires_at, o.created_at AS order_created_at, o.updated_at AS order_updated_at,
         ps.id AS payment_session_id, ps.expected_amount_minor, ps.currency AS payment_currency,
         ps.buyer_phone_hmac, ps.buyer_phone_masked, ps.buyer_name_hmac,
         ps.reference_code, ps.reference_hmac, ps.status AS payment_status,
         ps.selected_receiver_bank_id, ps.selected_receiver_bank_profile_id,
         ps.selected_receiving_route_id, ps.selected_payer_bank_launcher_id,
         ps.buyer_sender_phone_hmac, ps.buyer_sender_phone_masked,
         ps.payment_method, ps.sender_bank_id, ps.sender_card_last4, ps.sender_card_masked,
         ps.sender_card_hmac, ps.sender_phone_masked, ps.sender_phone_hmac,
         ps.buyer_first_name_raw, ps.buyer_last_name_raw, ps.buyer_name_script_detected,
         ps.buyer_name_normalized, ps.buyer_name_latin_variants, ps.buyer_name_cyrillic_variants,
         ps.buyer_name_initial_variants, ps.buyer_name_reversed_order_variants,
         ps.buyer_name_fingerprint, ps.display_amount_minor, ps.payable_amount_minor,
         ps.reconciliation_delta_minor, ps.expected_payment_fingerprint,
         ps.payment_instructions_shown_at, ps.receiver_armed_at, ps.buyer_claimed_paid_at,
         ps.no_notification_manual_check_requested_at, ps.route_locked_at, ps.route_lock_expires_at,
         ps.amount_lease_id, ps.valid_from, ps.valid_until,
         ps.created_at AS payment_created_at, ps.updated_at AS payment_updated_at
       FROM payment_sessions ps
       INNER JOIN orders o ON o.id = ps.order_id AND o.merchant_id = ps.merchant_id
       WHERE ps.merchant_id = $1
         AND ps.status IN ('receiver_armed', 'awaiting_payment', 'buyer_claimed_paid')
         AND ps.valid_until > $2::timestamptz
         AND ps.expected_payment_fingerprint IS NOT NULL
         AND ps.payment_method IS NOT NULL
         AND ps.selected_receiving_route_id IS NOT NULL
         AND ps.selected_receiver_bank_profile_id IS NOT NULL
         AND ps.route_locked_at IS NOT NULL
         AND ps.route_lock_expires_at IS NOT NULL
         AND ps.route_lock_expires_at > $2::timestamptz
       ORDER BY ps.receiver_armed_at DESC NULLS LAST, ps.updated_at DESC
       LIMIT 10`,
      [merchantId, now]
    );

    return result.rows.map((row) => {
      const record = row as Record<string, string | number | Date | null>;
      return {
        order: toOrder({
          id: record.order_id,
          merchant_id: record.merchant_id,
          external_id: record.external_id,
          return_url: record.return_url,
          product_id: record.product_id,
          product_name: record.product_name,
          product_risk_level: record.product_risk_level,
          amount_minor: record.amount_minor,
          currency: record.order_currency,
          status: record.order_status,
          expires_at: record.order_expires_at,
          created_at: record.order_created_at,
          updated_at: record.order_updated_at
        } as Record<string, string | number | Date | null>),
        paymentSession: toPaymentSession({
          id: record.payment_session_id,
          order_id: record.order_id,
          merchant_id: record.merchant_id,
          expected_amount_minor: record.expected_amount_minor,
          currency: record.payment_currency,
          buyer_phone_hmac: record.buyer_phone_hmac,
          buyer_phone_masked: record.buyer_phone_masked,
          buyer_name_hmac: record.buyer_name_hmac,
          reference_code: record.reference_code,
          reference_hmac: record.reference_hmac,
          status: record.payment_status,
          selected_receiver_bank_id: record.selected_receiver_bank_id,
          selected_receiver_bank_profile_id: record.selected_receiver_bank_profile_id,
          selected_receiving_route_id: record.selected_receiving_route_id,
          selected_payer_bank_launcher_id: record.selected_payer_bank_launcher_id,
          buyer_sender_phone_hmac: record.buyer_sender_phone_hmac,
          buyer_sender_phone_masked: record.buyer_sender_phone_masked,
          payment_method: record.payment_method,
          sender_bank_id: record.sender_bank_id,
          sender_card_last4: record.sender_card_last4,
          sender_card_masked: record.sender_card_masked,
          sender_card_hmac: record.sender_card_hmac,
          sender_phone_masked: record.sender_phone_masked,
          sender_phone_hmac: record.sender_phone_hmac,
          buyer_first_name_raw: record.buyer_first_name_raw,
          buyer_last_name_raw: record.buyer_last_name_raw,
          buyer_name_script_detected: record.buyer_name_script_detected,
          buyer_name_normalized: record.buyer_name_normalized,
          buyer_name_latin_variants: record.buyer_name_latin_variants,
          buyer_name_cyrillic_variants: record.buyer_name_cyrillic_variants,
          buyer_name_initial_variants: record.buyer_name_initial_variants,
          buyer_name_reversed_order_variants: record.buyer_name_reversed_order_variants,
          buyer_name_fingerprint: record.buyer_name_fingerprint,
          display_amount_minor: record.display_amount_minor,
          payable_amount_minor: record.payable_amount_minor,
          reconciliation_delta_minor: record.reconciliation_delta_minor,
          expected_payment_fingerprint: record.expected_payment_fingerprint,
          payment_instructions_shown_at: record.payment_instructions_shown_at,
          receiver_armed_at: record.receiver_armed_at,
          buyer_claimed_paid_at: record.buyer_claimed_paid_at,
          no_notification_manual_check_requested_at: record.no_notification_manual_check_requested_at,
          route_locked_at: record.route_locked_at,
          route_lock_expires_at: record.route_lock_expires_at,
          amount_lease_id: record.amount_lease_id,
          valid_from: record.valid_from,
          valid_until: record.valid_until,
          created_at: record.payment_created_at,
          updated_at: record.payment_updated_at
        } as Record<string, string | number | Date | null>)
      };
    });
  }

  public async getOrderById(merchantId: string, orderId: string) {
    const orderResult = await this.pool.query(
      `SELECT id, merchant_id, external_id, product_id, product_name, product_risk_level,
        return_url, amount_minor, currency, detection_source, detection_raw_input,
        original_currency, original_amount_minor, fx_rate, fx_rate_timestamp,
        status, expires_at, created_at, updated_at
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
        expected_payment_fingerprint, payment_instructions_shown_at, receiver_armed_at,
        buyer_claimed_paid_at, no_notification_manual_check_requested_at,
        route_locked_at, route_lock_expires_at, amount_lease_id,
        valid_from, valid_until, created_at, updated_at
       FROM payment_sessions WHERE merchant_id = $1 AND order_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [merchantId, orderId]
    );

    const order: StoredOrderRecord = toOrder(row);

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
        expected_payment_fingerprint, payment_instructions_shown_at, receiver_armed_at,
        buyer_claimed_paid_at, no_notification_manual_check_requested_at,
        route_locked_at, route_lock_expires_at, amount_lease_id,
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
        return_url, amount_minor, currency, detection_source, detection_raw_input,
        original_currency, original_amount_minor, fx_rate, fx_rate_timestamp,
        status, expires_at, created_at, updated_at
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
        expected_payment_fingerprint, payment_instructions_shown_at, receiver_armed_at,
        buyer_claimed_paid_at, no_notification_manual_check_requested_at,
        route_locked_at, route_lock_expires_at, amount_lease_id,
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
        return_url, amount_minor, currency, detection_source, detection_raw_input,
        original_currency, original_amount_minor, fx_rate, fx_rate_timestamp,
        status, expires_at, created_at, updated_at
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
          enabled, recommended, review_policy, fees_hint, lifecycle_status,
          pending_disable_at, disabled_at, revoked_at, revocation_reason, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::timestamptz, $18::timestamptz, $19::timestamptz, $20, $21, $22)`,
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
          input.route.lifecycle_status,
          input.route.pending_disable_at ?? null,
          input.route.disabled_at ?? null,
          input.route.revoked_at ?? null,
          input.route.revocation_reason ?? null,
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
        enabled, recommended, review_policy, fees_hint, lifecycle_status, pending_disable_at,
        disabled_at, revoked_at, revocation_reason, created_at, updated_at, deleted_at
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
    const lifecyclePatch = await this.resolveRouteLifecyclePatch({
      merchantId: input.merchantId,
      route,
      patch: input.patch,
      now: input.now
    });
    const updatedRoute: StoredMerchantReceivingRouteRecord = {
      ...route,
      ...input.patch,
      ...lifecyclePatch,
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
           lifecycle_status = $7,
           pending_disable_at = $8::timestamptz,
           disabled_at = $9::timestamptz,
           revoked_at = $10::timestamptz,
           revocation_reason = $11,
           updated_at = $12
       WHERE merchant_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING id, merchant_id, bank_profile_id, rail_type, receiver_identifier_type,
        receiver_identifier_encrypted, receiver_identifier_hmac, receiver_identifier_masked,
        receiver_identifier_last4, route_code, display_label,
        enabled, recommended, review_policy, fees_hint, lifecycle_status, pending_disable_at,
        disabled_at, revoked_at, revocation_reason, created_at, updated_at, deleted_at`,
      [
        input.merchantId,
        input.routeId,
        updatedRoute.enabled,
        updatedRoute.recommended,
        updatedRoute.display_label,
        updatedRoute.fees_hint ?? null,
        updatedRoute.lifecycle_status,
        updatedRoute.pending_disable_at ?? null,
        updatedRoute.disabled_at ?? null,
        updatedRoute.revoked_at ?? null,
        updatedRoute.revocation_reason ?? null,
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
           lifecycle_status = 'deleted',
           deleted_at = $3,
           updated_at = $3
       WHERE merchant_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING id, merchant_id, bank_profile_id, rail_type, receiver_identifier_type,
        receiver_identifier_encrypted, receiver_identifier_hmac, receiver_identifier_masked,
        receiver_identifier_last4, route_code, display_label,
        enabled, recommended, review_policy, fees_hint, lifecycle_status, pending_disable_at,
        disabled_at, revoked_at, revocation_reason, created_at, updated_at, deleted_at`,
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

  private async resolveRouteLifecyclePatch(input: {
    merchantId: string;
    route: StoredMerchantReceivingRouteRecord;
    patch: UpdateReceivingRouteInput['patch'];
    now: string;
  }): Promise<Partial<Pick<
    StoredMerchantReceivingRouteRecord,
    'enabled' | 'recommended' | 'lifecycle_status' | 'pending_disable_at' | 'disabled_at' | 'revoked_at' | 'revocation_reason'
  >>> {
    if (input.patch.lifecycle_status === 'revoked') {
      return {
        enabled: false,
        recommended: false,
        lifecycle_status: 'revoked',
        revoked_at: input.now,
        revocation_reason: input.patch.revocation_reason ?? 'merchant_requested_revoke'
      };
    }

    if (input.patch.enabled === true) {
      if (input.route.lifecycle_status === 'revoked' || input.route.lifecycle_status === 'deleted') {
        return {};
      }
      return {
        enabled: true,
        lifecycle_status: 'active',
        pending_disable_at: null,
        disabled_at: null
      };
    }

    if (input.patch.enabled === false) {
      const activeLocks = await this.countActiveRouteLocks(input.merchantId, input.route.route_id, input.now);
      if (activeLocks > 0) {
        return {
          enabled: false,
          recommended: false,
          lifecycle_status: 'pending_disable',
          pending_disable_at: input.now
        };
      }
      return {
        enabled: false,
        recommended: false,
        lifecycle_status: 'disabled',
        disabled_at: input.now
      };
    }

    return {};
  }

  private async countActiveRouteLocks(merchantId: string, routeId: string, now: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS active_locks
       FROM payment_sessions
       WHERE merchant_id = $1
         AND selected_receiving_route_id = $2::uuid
         AND route_lock_expires_at IS NOT NULL
         AND route_lock_expires_at > $3::timestamptz
         AND status NOT IN ('manual_confirmed', 'rejected', 'expired')`,
      [merchantId, routeId, now]
    );
    return Number((result.rows[0] as { active_locks?: number | string } | undefined)?.active_locks ?? 0);
  }

  public async listReceiverBanksForCheckout(merchantId: string, paymentSessionId: string) {
    void paymentSessionId;
    const result = await this.pool.query(
      `SELECT id, merchant_id, bank_profile_id, rail_type, receiver_identifier_type,
        receiver_identifier_encrypted, receiver_identifier_hmac, receiver_identifier_masked,
        receiver_identifier_last4, route_code, display_label,
        enabled, recommended, review_policy, fees_hint, lifecycle_status, pending_disable_at,
        disabled_at, revoked_at, revocation_reason, created_at, updated_at, deleted_at
       FROM merchant_receiving_routes
       WHERE merchant_id = $1
         AND enabled = true
         AND lifecycle_status = 'active'
         AND deleted_at IS NULL
         AND EXISTS (
           SELECT 1
           FROM bank_route_certifications brc
           WHERE brc.bank_id = merchant_receiving_routes.bank_profile_id
             AND brc.runtime_status IN ('certified', 'observed', 'experimental', 'review_only')
             AND CASE merchant_receiving_routes.rail_type
               WHEN 'phone_transfer' THEN 'sbp'
               ELSE 'card'
             END = ANY(brc.rail_supported)
         )
       ORDER BY recommended DESC, created_at ASC`,
      [merchantId]
    );
    return result.rows.map((row) => toMerchantReceivingRoute(row as Record<string, string | boolean | Date | null>));
  }

  public async listReceivingRoutesForCheckoutBank(merchantId: string, paymentSessionId: string, bankProfileId: string) {
    const result = await this.pool.query(
      `SELECT id, merchant_id, bank_profile_id, rail_type, receiver_identifier_type,
        receiver_identifier_encrypted, receiver_identifier_hmac, receiver_identifier_masked,
        receiver_identifier_last4, route_code, display_label,
        enabled, recommended, review_policy, fees_hint, lifecycle_status, pending_disable_at,
        disabled_at, revoked_at, revocation_reason, created_at, updated_at, deleted_at
       FROM merchant_receiving_routes
       WHERE merchant_id = $1
         AND bank_profile_id = $2
         AND deleted_at IS NULL
         AND (
           (enabled = true AND lifecycle_status = 'active')
           OR (
             lifecycle_status = 'pending_disable'
             AND id = (
               SELECT selected_receiving_route_id
               FROM payment_sessions
               WHERE merchant_id = $1
                 AND id = $3
                 AND route_lock_expires_at IS NOT NULL
                 AND route_lock_expires_at > now()
                 AND status NOT IN ('manual_confirmed', 'rejected', 'expired')
             )
           )
         )
         AND EXISTS (
           SELECT 1
           FROM bank_route_certifications brc
           WHERE brc.bank_id = merchant_receiving_routes.bank_profile_id
             AND brc.runtime_status IN ('certified', 'observed', 'experimental', 'review_only')
             AND CASE merchant_receiving_routes.rail_type
               WHEN 'phone_transfer' THEN 'sbp'
               ELSE 'card'
             END = ANY(brc.rail_supported)
         )
       ORDER BY recommended DESC, created_at ASC`,
      [merchantId, bankProfileId, paymentSessionId]
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
    if (
      !route ||
      route.bank_profile_id !== loaded.paymentSession.selectedReceiverBankProfileId ||
      !isReceivingRouteUsableForSession(route, loaded.paymentSession)
    ) {
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
    if (!route || route.bank_profile_id !== loaded.paymentSession.selectedReceiverBankProfileId || !isReceivingRouteVisibleToNewCheckout(route)) {
      return { kind: 'not_found' };
    }
    if (
      loaded.paymentSession.paymentMethod &&
      route.rail_type !== receivingRailForBuyerPaymentMethod(loaded.paymentSession.paymentMethod)
    ) {
      return { kind: 'not_found' };
    }
    if (!(await this.isReceivingRouteCertifiedForCheckout(route))) {
      return { kind: 'not_found' };
    }

    return this.mutateCheckoutSession({
      input,
      allowedStatuses: ['created', 'receiver_arming'],
      auditEventType: 'checkout.receiving_route_selected',
      apply: async (client) => {
        const amountLease = await allocateAmountLeaseForRoute(client, {
          merchantId: input.merchantId,
          paymentSessionId: input.paymentSessionId,
          route,
          order: loaded.order,
          paymentSession: loaded.paymentSession,
          now: input.now
        });
        const expectedPaymentFingerprint =
          input.expectedPaymentFingerprintForPayableAmount?.(amountLease.payableAmountMinor) ??
          (loaded.paymentSession.expectedPaymentFingerprint &&
          loaded.paymentSession.payableAmountMinor === amountLease.payableAmountMinor
            ? loaded.paymentSession.expectedPaymentFingerprint
            : null);
        await client.query(
          `UPDATE payment_sessions
           SET selected_receiving_route_id = $3,
               selected_payer_bank_launcher_id = NULL,
               payment_instructions_shown_at = NULL,
               display_amount_minor = $4,
               payable_amount_minor = $5,
               reconciliation_delta_minor = $6,
               expected_amount_minor = $5,
               expected_payment_fingerprint = $7,
               amount_lease_id = $8::uuid,
               updated_at = $9
           WHERE merchant_id = $1 AND id = $2`,
          [
            input.merchantId,
            input.paymentSessionId,
            input.receivingRouteId,
            amountLease.displayAmountMinor,
            amountLease.payableAmountMinor,
            amountLease.reconciliationDeltaMinor,
            expectedPaymentFingerprint,
            amountLease.id,
            input.now
          ]
        );
      },
      payload: {
        receiving_route_id: input.receivingRouteId,
        receiver_route_code: route.route_code,
        rail_type: route.rail_type,
        review_policy: route.review_policy,
        amount_lease_allocated: true,
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
    const loaded = await this.getPaymentSessionById(input.merchantId, input.paymentSessionId);
    if (!loaded) {
      return { kind: 'not_found' };
    }
    const route = await this.getReceivingRoute(input.merchantId, input.receivingRouteId);
    if (
      !route ||
      route.bank_profile_id !== input.bankProfileId ||
      route.rail_type !== receivingRailForBuyerPaymentMethod(input.profile.payment_method) ||
      !isReceivingRouteVisibleToNewCheckout(route)
    ) {
      return { kind: 'not_found' };
    }
    if (!(await this.isReceivingRouteCertifiedForCheckout(route))) {
      return { kind: 'not_found' };
    }
    const leasePaymentSession: StoredPaymentSessionRecord = {
      ...loaded.paymentSession,
      displayAmountMinor: input.profile.display_amount_minor,
      payableAmountMinor: input.profile.payable_amount_minor,
      reconciliationDeltaMinor: input.profile.reconciliation_delta_minor,
      expectedAmountMinor: input.profile.payable_amount_minor,
      currency: input.profile.currency,
      validUntil: input.profile.expires_at
    };

    return this.mutateCheckoutSession({
      input,
      allowedStatuses: ['created', 'receiver_arming'],
      auditEventType: 'checkout.expected_payment_profile_saved',
      apply: async (client) => {
        const amountLease = await allocateAmountLeaseForRoute(client, {
          merchantId: input.merchantId,
          paymentSessionId: input.paymentSessionId,
          route,
          order: loaded.order,
          paymentSession: leasePaymentSession,
          now: input.now
        });
        const expectedPaymentFingerprint =
          input.expectedPaymentFingerprintForPayableAmount?.(amountLease.payableAmountMinor) ??
          input.profile.expected_payment_fingerprint;
        await client.query(
          `UPDATE payment_sessions
           SET status = 'receiver_arming',
               payment_method = $3,
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
               selected_receiving_route_id = $25,
               selected_payer_bank_launcher_id = $26,
               amount_lease_id = $27::uuid,
               payment_instructions_shown_at = NULL,
               updated_at = $28
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
            amountLease.displayAmountMinor,
            amountLease.payableAmountMinor,
            amountLease.reconciliationDeltaMinor,
            expectedPaymentFingerprint,
            input.receiverBankId,
            input.bankProfileId,
            input.receivingRouteId,
            input.payerBankLauncherId,
            amountLease.id,
            input.now
          ]
        );
        await client.query(
          `UPDATE orders
           SET status = 'receiver_arming', updated_at = $3
           WHERE merchant_id = $1
             AND id = (SELECT order_id FROM payment_sessions WHERE merchant_id = $1 AND id = $2)`,
          [input.merchantId, input.paymentSessionId, input.now]
        );
      },
      payload: {
        payment_method: input.profile.payment_method,
        sender_bank_id: input.profile.sender_bank_id,
        sender_card_masked: input.profile.sender_card_masked,
        sender_phone_masked: input.profile.sender_phone_masked,
        display_amount_minor: input.profile.display_amount_minor,
        selected_receiver_bank_id: input.receiverBankId,
        selected_receiving_route_id: input.receivingRouteId,
        selected_payer_bank_launcher_id: input.payerBankLauncherId,
        payable_amount_source: 'amount_lease',
        amount_lease_allocated: true,
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
               receiver_armed_at = COALESCE(receiver_armed_at, $3::timestamptz),
               receiver_arm_expires_at = COALESCE(receiver_arm_expires_at, valid_until),
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
               route_locked_at = COALESCE(route_locked_at, $3::timestamptz),
               route_lock_expires_at = valid_until,
               amount_lease_id = COALESCE(
                 amount_lease_id,
                 (
                   SELECT id FROM amount_leases
                   WHERE merchant_id = $1
                     AND payment_session_id = $2
                     AND route_id = payment_sessions.selected_receiving_route_id
                     AND status = 'active'
                   ORDER BY created_at DESC
                   LIMIT 1
                 )
               ),
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
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const current = await client.query(
        `SELECT ps.id, ps.valid_until, ps.status, ps.buyer_claimed_paid_at, o.status AS order_status
         FROM payment_sessions ps
         INNER JOIN orders o ON o.id = ps.order_id AND o.merchant_id = ps.merchant_id
         WHERE ps.merchant_id = $1 AND ps.id = $2
         FOR UPDATE OF ps, o`,
        [input.merchantId, input.paymentSessionId]
      );
      if (current.rowCount === 0) {
        await client.query('ROLLBACK');
        return { kind: 'not_found' };
      }

      const row = current.rows[0] as {
        valid_until: string | Date;
        status: PaymentSessionStatus;
        order_status: OrderStatus;
        buyer_claimed_paid_at: string | Date | null;
      };
      const finalClaim = buyerClaimResultForFinalStatus(row.status, row.order_status);
      if (finalClaim) {
        await client.query('ROLLBACK');
        const loaded = await this.getPaymentSessionById(input.merchantId, input.paymentSessionId);
        return loaded
          ? { kind: 'already_final', order: loaded.order, paymentSession: loaded.paymentSession, claimResult: finalClaim }
          : { kind: 'not_found' };
      }

      if (new Date(row.valid_until).getTime() <= new Date(input.now).getTime()) {
        await markCheckoutSessionExpired(client, input, row.status);
        await client.query('COMMIT');
        const loaded = await this.getPaymentSessionById(input.merchantId, input.paymentSessionId);
        return loaded
          ? { kind: 'already_final', order: loaded.order, paymentSession: loaded.paymentSession, claimResult: 'already_expired' }
          : { kind: 'not_found' };
      }

      if (row.status === 'buyer_claimed_paid') {
        await client.query('ROLLBACK');
        const loaded = await this.getPaymentSessionById(input.merchantId, input.paymentSessionId);
        return loaded
          ? { kind: 'updated', order: loaded.order, paymentSession: loaded.paymentSession, claimResult: 'claim_recorded' }
          : { kind: 'not_found' };
      }

      if (['signal_detected', 'matching', 'needs_review'].includes(row.status)) {
        if (row.buyer_claimed_paid_at) {
          await client.query('ROLLBACK');
          const loaded = await this.getPaymentSessionById(input.merchantId, input.paymentSessionId);
          return loaded
            ? { kind: 'updated', order: loaded.order, paymentSession: loaded.paymentSession, claimResult: 'pending_review' }
            : { kind: 'not_found' };
        }
        await client.query(
          `UPDATE payment_sessions
           SET buyer_claimed_paid_at = COALESCE(buyer_claimed_paid_at, $3::timestamptz),
               updated_at = $3
           WHERE merchant_id = $1 AND id = $2`,
          [input.merchantId, input.paymentSessionId, input.now]
        );
        await insertCheckoutAuditEvent(client, {
          merchantId: input.merchantId,
          paymentSessionId: input.paymentSessionId,
          auditEventId: input.auditEventId,
          eventType: 'checkout.buyer_claimed_paid',
          payload: {
            payment_session_id: input.paymentSessionId,
            buyer_claimed_paid: true,
            claim_result: 'pending_review',
            preserved_status: row.status,
            does_not_confirm_payment: true
          },
          now: input.now
        });
        await client.query('COMMIT');
        const loaded = await this.getPaymentSessionById(input.merchantId, input.paymentSessionId);
        return loaded
          ? { kind: 'updated', order: loaded.order, paymentSession: loaded.paymentSession, claimResult: 'pending_review' }
          : { kind: 'not_found' };
      }

      if (row.status !== 'receiver_armed') {
        await client.query('ROLLBACK');
        return { kind: 'invalid_transition', currentStatus: row.status };
      }

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
      await insertCheckoutAuditEvent(client, {
        merchantId: input.merchantId,
        paymentSessionId: input.paymentSessionId,
        auditEventId: input.auditEventId,
        eventType: 'checkout.buyer_claimed_paid',
        payload: {
          payment_session_id: input.paymentSessionId,
          buyer_claimed_paid: true,
          claim_result: 'claim_recorded',
          does_not_confirm_payment: true
        },
        now: input.now
      });
      await client.query('COMMIT');
      const updated = await this.getPaymentSessionById(input.merchantId, input.paymentSessionId);
      return updated
        ? { kind: 'updated', order: updated.order, paymentSession: updated.paymentSession, claimResult: 'claim_recorded' }
        : { kind: 'not_found' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async requestNoNotificationManualCheck(
    input: RequestNoNotificationManualCheckInput
  ): Promise<NoNotificationManualCheckResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT
           ps.id,
           ps.order_id,
           ps.status,
           ps.valid_until,
           ps.receiver_armed_at,
           ps.expected_payment_fingerprint,
           ps.payment_method,
           ps.no_notification_manual_check_requested_at,
           o.amount_minor,
           o.currency,
           o.status AS order_status
         FROM payment_sessions ps
         INNER JOIN orders o ON o.id = ps.order_id AND o.merchant_id = ps.merchant_id
         WHERE ps.merchant_id = $1 AND ps.id = $2
         FOR UPDATE OF ps, o`,
        [input.merchantId, input.paymentSessionId]
      );

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return { kind: 'not_found' };
      }

      const row = result.rows[0] as {
        id: string;
        order_id: string;
        status: PaymentSessionStatus;
        valid_until: Date | string;
        receiver_armed_at: Date | string | null;
        expected_payment_fingerprint: string | null;
        payment_method: string | null;
        no_notification_manual_check_requested_at: Date | string | null;
      };
      const nowMs = new Date(input.now).getTime();

      if (new Date(row.valid_until).getTime() <= nowMs) {
        await client.query('COMMIT');
        return { kind: 'expired' };
      }

      if (row.no_notification_manual_check_requested_at) {
        await client.query('ROLLBACK');
        return { kind: 'not_eligible', reason: 'already_requested' };
      }

      if (!['receiver_armed', 'buyer_claimed_paid', 'awaiting_payment'].includes(row.status)) {
        await client.query('ROLLBACK');
        return { kind: 'not_eligible', reason: 'not_armed' };
      }

      if (!row.expected_payment_fingerprint || !row.payment_method) {
        await client.query('ROLLBACK');
        return { kind: 'not_eligible', reason: 'expected_profile_missing' };
      }

      if (!row.receiver_armed_at) {
        await client.query('ROLLBACK');
        return { kind: 'not_eligible', reason: 'not_armed' };
      }

      const elapsedSeconds = Math.floor((nowMs - new Date(row.receiver_armed_at).getTime()) / 1000);
      if (elapsedSeconds < 120) {
        await client.query('ROLLBACK');
        return { kind: 'not_due', elapsedSeconds };
      }

      const existingSignalOrReview = await client.query(
        `SELECT 1
         WHERE EXISTS (
           SELECT 1 FROM review_queue
           WHERE merchant_id = $1 AND payment_session_id = $2
         )
         OR EXISTS (
           SELECT 1 FROM signal_matches
           WHERE payment_session_id = $2
         )
         LIMIT 1`,
        [input.merchantId, input.paymentSessionId]
      );
      if (existingSignalOrReview.rowCount && existingSignalOrReview.rowCount > 0) {
        await client.query('ROLLBACK');
        return { kind: 'not_eligible', reason: 'signal_or_review_exists' };
      }

      await client.query(
        `INSERT INTO review_queue (
          id, merchant_id, order_id, payment_session_id, signal_id, reason_code, status, created_at
        ) VALUES ($1, $2, $3, $4, NULL, $5, 'open', $6)`,
        [
          input.reviewId,
          input.merchantId,
          row.order_id,
          input.paymentSessionId,
          'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT',
          input.now
        ]
      );

      await client.query(
        `UPDATE payment_sessions
         SET status = 'needs_review',
             no_notification_manual_check_requested_at = $3,
             updated_at = $3
         WHERE merchant_id = $1 AND id = $2
           AND status NOT IN ('manual_confirmed', 'rejected', 'expired')`,
        [input.merchantId, input.paymentSessionId, input.now]
      );

      await client.query(
        `UPDATE orders
         SET status = 'needs_review',
             updated_at = $3
         WHERE merchant_id = $1 AND id = $2
           AND status NOT IN ('manual_confirmed', 'fulfilled', 'rejected', 'expired')`,
        [input.merchantId, row.order_id, input.now]
      );

      await client.query(
        `INSERT INTO audit_events (
          id, merchant_id, event_type, object_type, object_id, actor_type, payload_redacted, created_at
        ) VALUES ($1, $2, 'no_notification_manual_check_requested', 'payment_session', $3, 'system', $4::jsonb, $5)`,
        [
          input.auditEventId,
          input.merchantId,
          input.paymentSessionId,
          JSON.stringify({
            payment_session_id: input.paymentSessionId,
            order_id: row.order_id,
            review_id: input.reviewId,
            reason_label: 'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT',
            elapsed_seconds: elapsedSeconds,
            does_not_confirm_payment: true,
            emits_webhook: false,
            official_bank_confirmation: false
          }),
          input.now
        ]
      );

      await client.query('COMMIT');
      return {
        kind: 'created',
        reviewId: input.reviewId,
        orderId: String(row.order_id),
        paymentSessionId: input.paymentSessionId,
        reasonLabel: 'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async getReceivingRoute(
    merchantId: string,
    routeId: string
  ): Promise<StoredMerchantReceivingRouteRecord | null> {
    const result = await this.pool.query(
      `SELECT id, merchant_id, bank_profile_id, rail_type, receiver_identifier_type,
        receiver_identifier_encrypted, receiver_identifier_hmac, receiver_identifier_masked,
        receiver_identifier_last4, route_code, display_label,
        enabled, recommended, review_policy, fees_hint, lifecycle_status, pending_disable_at,
        disabled_at, revoked_at, revocation_reason, created_at, updated_at, deleted_at
       FROM merchant_receiving_routes
       WHERE merchant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [merchantId, routeId]
    );
    return result.rowCount
      ? toMerchantReceivingRoute(result.rows[0] as Record<string, string | boolean | Date | null>)
      : null;
  }

  private async isReceivingRouteCertifiedForCheckout(route: StoredMerchantReceivingRouteRecord): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT runtime_status, rail_supported
       FROM bank_route_certifications
       WHERE bank_id = $1
         AND runtime_status IN ('certified', 'observed', 'experimental', 'review_only')
         AND $2 = ANY(rail_supported)
       ORDER BY CASE runtime_status
         WHEN 'certified' THEN 1
         WHEN 'observed' THEN 2
         WHEN 'experimental' THEN 3
         ELSE 4
       END
       LIMIT 1`,
      [route.bank_profile_id, amountLeaseRailForRoute(route.rail_type)]
    );
    const row = result.rows[0] as { runtime_status?: BankRouteCertificationRuntimeStatus; rail_supported?: string[] } | undefined;
    return bankCertificationAllowsCheckoutRoute({
      status: row?.runtime_status,
      railSupported: row?.rail_supported,
      routeRailType: route.rail_type
    });
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
        await client.query(
          `UPDATE payment_sessions
           SET status = 'expired',
               route_lock_expires_at = NULL,
               amount_lease_id = NULL,
               updated_at = $3::timestamptz
           WHERE merchant_id = $1
             AND id = $2
             AND status NOT IN ('manual_confirmed', 'rejected', 'expired')`,
          [params.input.merchantId, params.input.paymentSessionId, params.input.now]
        );
        await client.query(
          `UPDATE orders
           SET status = 'expired',
               updated_at = $3::timestamptz
           WHERE merchant_id = $1
             AND id = (SELECT order_id FROM payment_sessions WHERE merchant_id = $1 AND id = $2)
             AND status NOT IN ('manual_confirmed', 'fulfilled', 'rejected', 'expired')`,
          [params.input.merchantId, params.input.paymentSessionId, params.input.now]
        );
        await client.query(
          `UPDATE amount_leases
           SET status = 'expired',
               updated_at = $3::timestamptz
           WHERE merchant_id = $1
             AND payment_session_id = $2
             AND status = 'active'`,
          [params.input.merchantId, params.input.paymentSessionId, params.input.now]
        );
        await client.query(
          `INSERT INTO audit_events (
            id, merchant_id, event_type, object_type, object_id, actor_type, payload_redacted, created_at
          ) VALUES ($1, $2, 'payment_session.status_changed', 'payment_session', $3, 'system', $4::jsonb, $5)`,
          [
            params.input.auditEventId,
            params.input.merchantId,
            params.input.paymentSessionId,
            JSON.stringify({
              payment_session_id: params.input.paymentSessionId,
              from_status: row.status,
              to_status: 'expired',
              reason: 'checkout_session_expired',
              official_bank_confirmation: false
            }),
            params.input.now
          ]
        );
        await client.query('COMMIT');
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
      if (error instanceof AmountLeaseUnavailableError) {
        return { kind: 'amount_lease_unavailable' };
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

function buyerClaimResultForFinalStatus(
  paymentSessionStatus: PaymentSessionStatus,
  orderStatus: OrderStatus
): BuyerClaimResult | null {
  if (paymentSessionStatus === 'manual_confirmed' || orderStatus === 'manual_confirmed' || orderStatus === 'fulfilled') {
    return 'already_confirmed';
  }
  if (paymentSessionStatus === 'rejected' || orderStatus === 'rejected') {
    return 'already_rejected';
  }
  if (paymentSessionStatus === 'expired' || orderStatus === 'expired') {
    return 'already_expired';
  }
  return null;
}

async function markCheckoutSessionExpired(
  client: pg.PoolClient,
  input: CheckoutMutationBaseInput,
  fromStatus: PaymentSessionStatus
): Promise<void> {
  await client.query(
    `UPDATE payment_sessions
     SET status = 'expired',
         route_lock_expires_at = NULL,
         amount_lease_id = NULL,
         updated_at = $3::timestamptz
     WHERE merchant_id = $1
       AND id = $2
       AND status NOT IN ('manual_confirmed', 'rejected', 'expired')`,
    [input.merchantId, input.paymentSessionId, input.now]
  );
  await client.query(
    `UPDATE orders
     SET status = 'expired',
         updated_at = $3::timestamptz
     WHERE merchant_id = $1
       AND id = (SELECT order_id FROM payment_sessions WHERE merchant_id = $1 AND id = $2)
       AND status NOT IN ('manual_confirmed', 'fulfilled', 'rejected', 'expired')`,
    [input.merchantId, input.paymentSessionId, input.now]
  );
  await client.query(
    `UPDATE amount_leases
     SET status = 'expired',
         updated_at = $3::timestamptz
     WHERE merchant_id = $1
       AND payment_session_id = $2
       AND status = 'active'`,
    [input.merchantId, input.paymentSessionId, input.now]
  );
  await insertCheckoutAuditEvent(client, {
    merchantId: input.merchantId,
    paymentSessionId: input.paymentSessionId,
    auditEventId: input.auditEventId,
    eventType: 'payment_session.status_changed',
    payload: {
      payment_session_id: input.paymentSessionId,
      from_status: fromStatus,
      to_status: 'expired',
      reason: 'checkout_session_expired',
      official_bank_confirmation: false
    },
    now: input.now,
    actorType: 'system'
  });
}

async function insertCheckoutAuditEvent(
  client: pg.PoolClient,
  params: {
    merchantId: string;
    paymentSessionId: string;
    auditEventId: string;
    eventType: string;
    payload: Record<string, unknown>;
    now: string;
    actorType?: 'api' | 'system' | undefined;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO audit_events (
      id, merchant_id, event_type, object_type, object_id, actor_type, payload_redacted, created_at
    ) VALUES ($1, $2, $3, 'payment_session', $4, $5, $6::jsonb, $7)`,
    [
      params.auditEventId,
      params.merchantId,
      params.eventType,
      params.paymentSessionId,
      params.actorType ?? 'api',
      JSON.stringify(params.payload),
      params.now
    ]
  );
}

async function allocateAmountLeaseForRoute(
  client: pg.PoolClient,
  input: {
    merchantId: string;
    paymentSessionId: string;
    route: StoredMerchantReceivingRouteRecord;
    order: StoredOrderRecord;
    paymentSession: StoredPaymentSessionRecord;
    now: string;
  }
): Promise<AmountLeaseCandidate & { id: string; displayAmountMinor: number }> {
  const rail = amountLeaseRailForRoute(input.route.rail_type);
  await client.query(
    `UPDATE amount_leases
     SET status = 'expired',
         updated_at = $4::timestamptz
     WHERE merchant_id = $1
       AND route_id = $2::uuid
       AND rail = $3
       AND status = 'active'
       AND expires_at <= $4::timestamptz`,
    [input.merchantId, input.route.route_id, rail, input.now]
  );

  const existing = await client.query(
    `SELECT id, display_amount_minor, reconciliation_delta_minor, payable_amount_minor
     FROM amount_leases
     WHERE merchant_id = $1
       AND payment_session_id = $2
       AND route_id = $3::uuid
       AND rail = $4
       AND status = 'active'
     FOR UPDATE
     LIMIT 1`,
    [input.merchantId, input.paymentSessionId, input.route.route_id, rail]
  );
  if (existing.rows[0]) {
    const row = existing.rows[0] as {
      id: string;
      display_amount_minor: number | string;
      reconciliation_delta_minor: number | string;
      payable_amount_minor: number | string;
    };
    return {
      id: row.id,
      displayAmountMinor: Number(row.display_amount_minor),
      reconciliationDeltaMinor: Number(row.reconciliation_delta_minor),
      payableAmountMinor: Number(row.payable_amount_minor)
    };
  }

  await client.query(
    `UPDATE amount_leases
     SET status = 'released', updated_at = $3::timestamptz
     WHERE merchant_id = $1
       AND payment_session_id = $2
       AND status = 'active'`,
    [input.merchantId, input.paymentSessionId, input.now]
  );

  const displayAmountMinor = input.paymentSession.displayAmountMinor ?? input.order.amountMinor ?? input.paymentSession.expectedAmountMinor;
  const preferredDeltaMinor =
    input.paymentSession.reconciliationDeltaMinor ??
    Math.max(1, (input.paymentSession.payableAmountMinor ?? displayAmountMinor + 1) - displayAmountMinor);
  const unavailableResult = await client.query(
    `SELECT payable_amount_minor
     FROM amount_leases
     WHERE merchant_id = $1
       AND route_id = $2::uuid
       AND rail = $3
       AND status = 'active'
     FOR UPDATE`,
    [input.merchantId, input.route.route_id, rail]
  );
  const unavailablePayableAmounts = new Set(
    unavailableResult.rows.map((row: { payable_amount_minor: number | string }) => Number(row.payable_amount_minor))
  );

  while (true) {
    const candidate = selectAmountLeaseCandidate({
      displayAmountMinor,
      preferredDeltaMinor,
      unavailablePayableAmounts
    });
    if (!candidate) {
      throw new AmountLeaseUnavailableError();
    }

    const inserted = await client.query(
      `INSERT INTO amount_leases (
        merchant_id, payment_session_id, route_id, rail, display_amount_minor,
        reconciliation_delta_minor, payable_amount_minor, currency, status, expires_at,
        created_at, updated_at
      )
      VALUES ($1, $2, $3::uuid, $4, $5, $6, $7, $8, 'active', $9::timestamptz, $10::timestamptz, $10::timestamptz)
      ON CONFLICT DO NOTHING
      RETURNING id, payable_amount_minor`,
      [
        input.merchantId,
        input.paymentSessionId,
        input.route.route_id,
        rail,
        displayAmountMinor,
        candidate.reconciliationDeltaMinor,
        candidate.payableAmountMinor,
        input.paymentSession.currency,
        input.paymentSession.validUntil,
        input.now
      ]
    );
    if ((inserted.rowCount ?? 0) > 0) {
      return {
        id: String((inserted.rows[0] as { id: string }).id),
        displayAmountMinor,
        ...candidate
      };
    }

    unavailablePayableAmounts.add(candidate.payableAmountMinor);
  }
}

function toOrder(row: Record<string, string | number | Date | null>): StoredOrderRecord {
  return {
    id: String(row.id),
    merchantId: String(row.merchant_id),
    externalId: String(row.external_id),
    returnUrl: row.return_url ? String(row.return_url) : undefined,
    productId: row.product_id ? String(row.product_id) : undefined,
    productName: row.product_name ? String(row.product_name) : undefined,
    productRiskLevel: String(row.product_risk_level),
    amountMinor: Number(row.amount_minor),
    currency: String(row.currency),
    detectionSource: row.detection_source ? (String(row.detection_source) as 'display_price_parsed') : undefined,
    detectionRawInput: row.detection_raw_input ? String(row.detection_raw_input) : undefined,
    originalCurrency: row.original_currency ? String(row.original_currency) : undefined,
    originalAmountMinor: row.original_amount_minor != null ? Number(row.original_amount_minor) : undefined,
    fxRate: row.fx_rate ? String(row.fx_rate) : undefined,
    fxRateTimestamp: row.fx_rate_timestamp ? new Date(String(row.fx_rate_timestamp)).toISOString() : undefined,
    status: String(row.status) as OrderStatus,
    expiresAt: new Date(String(row.expires_at)).toISOString(),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

export function normalizeOrderReturnUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return undefined;
  }

  const protocol = parsed.protocol.replace(/:$/u, '').toLowerCase();
  if (['javascript', 'data', 'file', 'content', 'intent', 'android-app', 'http'].includes(protocol)) {
    return undefined;
  }
  if (protocol !== 'https' && !/^[a-z][a-z0-9+.-]{1,40}$/u.test(protocol)) {
    return undefined;
  }

  for (const [key, parameter] of parsed.searchParams.entries()) {
    if (/(^|[_-])(secret|token|api[_-]?key|password|bearer|authorization)([_-]|$)/iu.test(key)) {
      return undefined;
    }
    if (/sk_(live|test)_|whsec_|spm_|Bearer\s+/iu.test(parameter)) {
      return undefined;
    }
  }

  return parsed.toString();
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
    receiverArmedAt: row.receiver_armed_at ? new Date(String(row.receiver_armed_at)).toISOString() : undefined,
    buyerClaimedPaidAt: row.buyer_claimed_paid_at ? new Date(String(row.buyer_claimed_paid_at)).toISOString() : undefined,
    noNotificationManualCheckRequestedAt: row.no_notification_manual_check_requested_at
      ? new Date(String(row.no_notification_manual_check_requested_at)).toISOString()
      : undefined,
    routeLockedAt: row.route_locked_at ? new Date(String(row.route_locked_at)).toISOString() : undefined,
    routeLockExpiresAt: row.route_lock_expires_at
      ? new Date(String(row.route_lock_expires_at)).toISOString()
      : undefined,
    amountLeaseId: row.amount_lease_id ? String(row.amount_lease_id) : undefined,
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
    lifecycle_status: routeLifecycleFromRow(row),
    pending_disable_at: row.pending_disable_at ? new Date(String(row.pending_disable_at)).toISOString() : null,
    disabled_at: row.disabled_at ? new Date(String(row.disabled_at)).toISOString() : null,
    revoked_at: row.revoked_at ? new Date(String(row.revoked_at)).toISOString() : null,
    revocation_reason: row.revocation_reason ? String(row.revocation_reason) : null,
    created_at: new Date(String(row.created_at)).toISOString(),
    updated_at: new Date(String(row.updated_at)).toISOString(),
    deleted_at: row.deleted_at ? new Date(String(row.deleted_at)).toISOString() : null
  };
}

function routeLifecycleFromRow(row: Record<string, string | boolean | Date | null>): ReceivingRouteLifecycleStatus {
  const lifecycle = row.lifecycle_status ? String(row.lifecycle_status) as ReceivingRouteLifecycleStatus : undefined;
  if (lifecycle && ['active', 'pending_disable', 'disabled', 'revoked', 'deleted'].includes(lifecycle)) {
    return lifecycle;
  }
  if (row.deleted_at) {
    return 'deleted';
  }
  return row.enabled ? 'active' : 'disabled';
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
  if (!AllReceiverBankProfiles.some((bank) => bank.bank_profile_id === input.bankProfileId)) {
    return invalidRequest('bank_profile_id is not supported for receiving routes.', {
      bank_profile_id: input.bankProfileId
    });
  }
  if (input.railType === 'mobile_money' && !WestAfricaReceiverBankProfiles.some((bank) => bank.bank_profile_id === input.bankProfileId)) {
    return invalidRequest('mobile_money rail requires a West Africa receiving profile.', {
      bank_profile_id: input.bankProfileId,
      rail_type: input.railType
    });
  }
  if (input.railType === 'wallet_transfer' && !InternationalReceiverBankProfiles.some((bank) => bank.bank_profile_id === input.bankProfileId)) {
    return invalidRequest('wallet_transfer rail requires an international receiving profile.', {
      bank_profile_id: input.bankProfileId,
      rail_type: input.railType
    });
  }
  if (!ReceivingRouteRailTypes.includes(input.railType)) {
    return invalidRequest('rail_type is not supported.', { rail_type: input.railType });
  }
  let receiverIdentifierType: ReceiverIdentifierType;
  let normalizedIdentifier: string | null;
  if (input.railType === 'wallet_transfer') {
    const wallet = normalizeWalletIdentifier(input.receiverIdentifier);
    if (!wallet) {
      return invalidRequest('receiver_identifier is not valid for a wallet receiving route.', {
        rail_type: input.railType
      });
    }
    receiverIdentifierType = wallet.type;
    normalizedIdentifier = wallet.normalized;
  } else {
    receiverIdentifierType = receiverIdentifierTypeForRail(input.railType);
    if (!ReceiverIdentifierTypes.includes(receiverIdentifierType)) {
      return invalidRequest('receiver identifier type is not supported.', { rail_type: input.railType });
    }
    if (!input.receiverIdentifier.trim()) {
      return invalidRequest('receiver_identifier is required.', {});
    }
    normalizedIdentifier = normalizeReceiverIdentifier(receiverIdentifierType, input.receiverIdentifier, input.railType);
    if (!normalizedIdentifier) {
      return invalidRequest('receiver_identifier is not valid for the selected receiving route.', {
        type: receiverIdentifierType
      });
    }
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
    receiver_identifier_masked: maskReceiverIdentifier(receiverIdentifierType, normalizedIdentifier, {
      international: input.railType === 'mobile_money' || input.railType === 'wallet_transfer'
    }),
    receiver_identifier_last4:
      receiverIdentifierType === 'email' || receiverIdentifierType === 'tag'
        ? normalizedIdentifier.slice(-4)
        : normalizedIdentifier.replace(/\D/g, '').slice(-4),
    route_code: routeCode,
    display_label: displayLabel,
    enabled: input.enabled ?? true,
    recommended: input.recommended ?? false,
    review_policy: reviewPolicy,
    fees_hint: input.feesHint?.trim() || undefined,
    lifecycle_status: input.enabled === false ? 'disabled' : 'active',
    pending_disable_at: null,
    disabled_at: input.enabled === false ? input.now : null,
    revoked_at: null,
    revocation_reason: null,
    created_at: input.now,
    updated_at: input.now
  };
}

function isReceivingRouteVisibleToNewCheckout(route: StoredMerchantReceivingRouteRecord): boolean {
  return route.enabled && route.lifecycle_status === 'active' && !route.deleted_at;
}

function isReceivingRouteUsableForSession(
  route: StoredMerchantReceivingRouteRecord,
  paymentSession: Pick<StoredPaymentSessionRecord, 'selectedReceivingRouteId' | 'routeLockExpiresAt' | 'status'>
): boolean {
  if (route.deleted_at || route.lifecycle_status === 'revoked' || route.lifecycle_status === 'disabled' || route.lifecycle_status === 'deleted') {
    return false;
  }
  if (route.lifecycle_status === 'active') {
    return route.enabled;
  }
  if (route.lifecycle_status !== 'pending_disable') {
    return false;
  }
  if (route.route_id !== paymentSession.selectedReceivingRouteId || !paymentSession.routeLockExpiresAt) {
    return false;
  }
  if (ROUTE_FINAL_SESSION_STATUSES.has(paymentSession.status)) {
    return false;
  }
  return true;
}

export function receiverIdentifierTypeForRail(railType: ReceivingRouteRailType): ReceiverIdentifierType {
  // Mobile money accounts are addressed by phone number, like SBP. Wallet rails
  // resolve their identifier type from the value (normalizeWalletIdentifier).
  if (railType === 'wallet_transfer') {
    return 'email';
  }
  return railType === 'phone_transfer' || railType === 'mobile_money' ? 'phone' : 'card';
}

export function defaultReviewPolicyForRail(railType: ReceivingRouteRailType): ReceivingRouteReviewPolicy {
  // Only the device-validated RU SBP rail is eligible for low-risk-later; new
  // rails (card, mobile money) stay review-first until proven.
  return railType === 'phone_transfer' ? 'eligible_low_risk_later' : 'review_first';
}

function amountLeaseRailForRoute(railType: ReceivingRouteRailType): AmountLeaseRail {
  // Mobile money and wallet transfers are account-addressed; reuse the 'sbp' lease
  // bucket so amount de-duplication stays within the existing amount_leases.rail
  // CHECK domain.
  return railType === 'card_transfer' ? 'card' : 'sbp';
}

function normalizeReconciliationDelta(value: number, maxDelta = 99): number {
  if (!Number.isInteger(value) || value < 1) {
    return 1;
  }
  return value > maxDelta ? 1 + ((value - 1) % maxDelta) : value;
}

function normalizeReceiverIdentifier(
  type: ReceiverIdentifierType,
  value: string,
  railType?: ReceivingRouteRailType
): string | null {
  if (type === 'phone') {
    if (railType === 'mobile_money') {
      return normalizeWestAfricaMobileNumber(value);
    }
    return normalizeRussianPhone(value);
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 16) {
    return null;
  }
  return digits;
}

/**
 * Normalizes a West Africa (UEMOA) mobile-money number to E.164 digits.
 * Permissive on purpose: the merchant enters their OWN receiving number.
 * Keeps a leading country code, strips formatting, requires 8..15 digits.
 */
function normalizeWestAfricaMobileNumber(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return null;
  }
  return `+${digits}`;
}

/**
 * Normalizes a wallet (neobank) receiving identifier. Wise/Payoneer use email,
 * Wise/Revolut also use a tag (@wisetag / @revtag), Revolut accepts a phone.
 * The merchant enters their OWN identifier, so validation stays permissive.
 */
export function normalizeWalletIdentifier(value: string): { type: ReceiverIdentifierType; normalized: string } | null {
  const trimmed = value.trim();
  if (trimmed.includes('@') && !trimmed.startsWith('@')) {
    const email = trimmed.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email) ? { type: 'email', normalized: email } : null;
  }
  if (trimmed.startsWith('@')) {
    const tag = trimmed.slice(1).toLowerCase();
    return /^[a-z0-9_]{3,32}$/u.test(tag) ? { type: 'tag', normalized: tag } : null;
  }
  const phone = normalizeWestAfricaMobileNumber(trimmed);
  return phone ? { type: 'phone', normalized: phone } : null;
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
    lifecycle_status: route.lifecycle_status,
    pending_disable_at: route.pending_disable_at ?? null,
    disabled_at: route.disabled_at ?? null,
    revoked_at: route.revoked_at ?? null,
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

export function parseAmountMinor(value: string, currency?: string): number | null {
  const digits = currencyMinorDigits(currency);
  if (digits === 0) {
    // Franc CFA (XOF/XAF) and other zero-decimal currencies: the value IS the
    // integer minor amount, no fractional part allowed.
    if (!/^\d+$/.test(value)) {
      return null;
    }
    const amount = Number.parseInt(value, 10);
    return amount > 0 ? amount : null;
  }

  const decimalPattern = new RegExp(`^\\d+\\.\\d{${digits}}$`);
  if (!decimalPattern.test(value)) {
    return null;
  }
  const [major = '0', minor = '0'] = value.split('.');
  const factor = 10 ** digits;
  const amount = Number.parseInt(major, 10) * factor + Number.parseInt(minor, 10);
  return amount > 0 ? amount : null;
}

const CURRENCY_MINOR_DIGITS: Readonly<Record<string, number>> = {
  RUB: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  XOF: 0,
  XAF: 0
};

// Platform-supported order currencies. Per-merchant symmetry (the merchant must
// actually have a receiving route in the currency) is enforced separately at the
// order-creation handler, so this set is the platform ceiling, not the per-merchant rule.
export const ACCEPTED_ORDER_CURRENCIES: ReadonlySet<string> = new Set(['RUB', 'XOF', 'XAF', 'USD']);

/** Decimal places for a currency. Defaults to 2 (preserves V1 RUB behavior); XOF/XAF (franc CFA) use 0. */
export function currencyMinorDigits(currency?: string): number {
  if (!currency) {
    return 2;
  }
  return CURRENCY_MINOR_DIGITS[currency.toUpperCase()] ?? 2;
}

export function formatAmountMinor(amountMinor: number, currency?: string): string {
  const digits = currencyMinorDigits(currency);
  if (digits === 0) {
    // Franc CFA (XOF/XAF): no sub-unit, the minor amount IS the integer amount.
    return String(Math.trunc(amountMinor));
  }
  const factor = 10 ** digits;
  const major = Math.floor(amountMinor / factor);
  const minor = String(amountMinor % factor).padStart(digits, '0');
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

  const candidate = body as Partial<CreateOrderRequestBody> & Record<string, unknown>;
  const amount = candidate.amount as { value?: unknown; currency?: unknown } | undefined;
  const displayPrice = typeof candidate.display_price === 'string' ? candidate.display_price : undefined;

  if (typeof candidate.external_id !== 'string' || !candidate.external_id.trim()) {
    return invalidRequest('Order request is missing required fields.', {});
  }

  if (amount !== undefined && (typeof amount.value !== 'string' || typeof amount.currency !== 'string')) {
    return invalidRequest('Order request is missing required fields.', {});
  }

  if (!amount && !displayPrice) {
    return invalidRequest('Order requires either amount or display_price.', {});
  }

  const requestedReturnUrl =
    candidate.return_url ??
    candidate.web_return_url ??
    candidate.success_url ??
    candidate.merchant_return_url ??
    candidate.app_link_url ??
    candidate.android_deep_link;
  if (requestedReturnUrl !== undefined && typeof requestedReturnUrl !== 'string') {
    return invalidRequest('Order return_url must be a string when provided.', { field: 'return_url' });
  }
  const returnUrl = requestedReturnUrl === undefined ? undefined : normalizeOrderReturnUrl(requestedReturnUrl as string);
  if (requestedReturnUrl !== undefined && !returnUrl) {
    return invalidRequest('Order return_url must be a safe HTTPS URL, app link or custom app scheme without secrets.', {
      field: 'return_url'
    });
  }

  return {
    external_id: (candidate.external_id as string).trim(),
    return_url: returnUrl,
    amount: amount ? { value: amount.value as string, currency: amount.currency as string } : undefined,
    display_price: displayPrice?.trim() || undefined,
    buyer: candidate.buyer as CreateOrderRequestBody['buyer'],
    product: candidate.product as CreateOrderRequestBody['product'],
    expires_in_seconds: candidate.expires_in_seconds as number | undefined
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

export interface OrderAmountResolution {
  amountMinor: number;
  currency: string;
  detection?: {
    source: 'display_price_parsed';
    rawInput: string;
    originalCurrency?: string | undefined;
    originalAmountMinor?: number | undefined;
    fxRate?: string | undefined;
    fxRateTimestamp?: string | undefined;
  } | undefined;
}

/**
 * Resolves the order amount/currency. Explicit amount has precedence (V1
 * behavior, untouched). display_price goes through detection: native
 * RUB/USD/XOF stay as-is, any other detected currency is FX-converted to USD.
 * Note: XAF stays accepted as an EXPLICIT amount currency, but a detected
 * "XAF" display price is convertible (→ USD) — natives are RUB/USD/XOF only.
 */
export async function resolveOrderAmount(
  body: CreateOrderRequestBody,
  fx: Pick<FxRateService, 'quoteToUsd'> | null
): Promise<OrderAmountResolution | ApiErrorResponse> {
  if (body.amount) {
    const currency = body.amount.currency;
    const amountMinor = parseAmountMinor(body.amount.value, currency);
    if (amountMinor === null || !ACCEPTED_ORDER_CURRENCIES.has(currency)) {
      return invalidRequest(
        `Order amount must be positive and currency must be one of: ${[...ACCEPTED_ORDER_CURRENCIES].join(', ')}.`,
        { amount: body.amount.value, currency }
      );
    }
    return { amountMinor, currency };
  }

  const detected = detectCurrencyFromDisplayPrice(body.display_price ?? '');
  if (detected.kind !== 'detected') {
    return {
      error: {
        code: detected.kind === 'ambiguous' ? 'currency_detection_ambiguous' : 'invalid_request',
        message:
          detected.kind === 'ambiguous'
            ? 'display_price currency could not be detected unambiguously. Include a currency symbol or ISO code.'
            : 'display_price amount is not valid for the detected currency.',
        details: { display_price: body.display_price }
      }
    };
  }

  if (!detected.needs_conversion) {
    return {
      amountMinor: detected.amount_minor,
      currency: detected.currency,
      detection: { source: 'display_price_parsed', rawInput: detected.raw_input }
    };
  }

  if (!fx) {
    return { error: { code: 'fx_rate_unavailable', message: 'FX conversion is not configured.', details: {} } };
  }
  const quoted = await fx.quoteToUsd(detected.currency, detected.amount_minor, currencyMinorDigits(detected.currency));
  if (quoted.kind !== 'ok') {
    return {
      error: {
        code: 'fx_rate_unavailable',
        message: 'No current FX rate is available to convert the detected currency to USD.',
        details: { original_currency: detected.currency }
      }
    };
  }
  return {
    amountMinor: quoted.quote.amountMinorUsd,
    currency: 'USD',
    detection: {
      source: 'display_price_parsed',
      rawInput: detected.raw_input,
      originalCurrency: detected.currency,
      originalAmountMinor: detected.amount_minor,
      fxRate: quoted.quote.rate,
      fxRateTimestamp: quoted.quote.rateTimestamp
    }
  };
}

export function buildOrderCreateInput(params: {
  body: CreateOrderRequestBody;
  merchantId: string;
  phoneHmacSecret: string;
  idGenerator: IdGenerator;
  clock: () => Date;
  resolvedAmount: OrderAmountResolution;
}): CreateOrderWithSessionInput {
  const { amountMinor, currency, detection } = params.resolvedAmount;

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
    returnUrl: params.body.return_url,
    productId: params.body.product?.id,
    productName: params.body.product?.name,
    productRiskLevel: params.body.product?.risk_level ?? 'low',
    amountMinor,
    currency,
    detectionSource: detection?.source,
    detectionRawInput: detection?.rawInput,
    originalCurrency: detection?.originalCurrency,
    originalAmountMinor: detection?.originalAmountMinor,
    fxRate: detection?.fxRate,
    fxRateTimestamp: detection?.fxRateTimestamp,
    status: 'payment_session_created',
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  const paymentSession: StoredPaymentSessionRecord = {
    id: paymentSessionId,
    orderId,
    merchantId: params.merchantId,
    expectedAmountMinor: amountMinor,
    currency,
    buyerPhoneHmac: normalizedPhone ? hmacSha256(normalizedPhone, params.phoneHmacSecret) : undefined,
    buyerPhoneMasked: normalizedPhone ? maskPhone(normalizedPhone) : undefined,
    buyerNameHmac: buyerName ? hmacSha256(buyerName, params.phoneHmacSecret) : undefined,
    referenceCode,
    referenceHmac: hmacSha256(referenceCode, params.phoneHmacSecret),
    status: 'created',
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
        return_url_present: Boolean(params.body.return_url),
        amount_minor: amountMinor,
        currency,
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
        currency,
        valid_until: expiresAt.toISOString()
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
  compatibility: {
    receivingRouteId: string;
    receiverBankId: string;
    bankProfileId: string;
    payerBankLauncherId: string;
  };
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
    const expectedPaymentFingerprintForPayableAmount = (payableAmountMinor: number): string =>
      hmacSha256(
        `expected_payment_fingerprint:${[
          params.loaded.paymentSession.merchantId,
          params.loaded.paymentSession.id,
          String(payableAmountMinor),
          params.loaded.paymentSession.referenceCode,
          body.sender_bank_id,
          body.payment_method,
          new Date(params.loaded.paymentSession.validUntil).toISOString()
        ].join('|')}`,
        params.phoneHmacSecret
      );

    return {
      merchantId: params.loaded.paymentSession.merchantId,
      paymentSessionId: params.loaded.paymentSession.id,
      auditEventId: params.auditEventId,
      now: params.now,
      profile,
      receivingRouteId: params.compatibility.receivingRouteId,
      receiverBankId: params.compatibility.receiverBankId,
      bankProfileId: params.compatibility.bankProfileId,
      payerBankLauncherId: params.compatibility.payerBankLauncherId,
      expectedPaymentFingerprintForPayableAmount
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
  if (!PayerBankLauncherRegistry.some((bank) => bank.payer_bank_launcher_id === candidate.sender_bank_id && bank.enabled)) {
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
  if (candidate.payment_method === 'card' && senderCardNumber && !isPlausibleCheckoutCardNumber(senderCardNumber)) {
    return invalidRequest('Sender card number is not plausible.', { payment_method: candidate.payment_method });
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

function isPlausibleCheckoutCardNumber(value: string): boolean {
  const normalizedCard = value.replace(/\D/g, '');
  if (normalizedCard.length < 13 || normalizedCard.length > 19) {
    return false;
  }
  let sum = 0;
  let shouldDouble = false;
  for (let index = normalizedCard.length - 1; index >= 0; index -= 1) {
    let digit = Number(normalizedCard[index]);
    if (!Number.isInteger(digit)) {
      return false;
    }
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum > 0 && sum % 10 === 0;
}
