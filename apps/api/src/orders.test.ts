import { afterEach, describe, expect, test, vi } from 'vitest';
import { InMemoryMetricsRegistry, MetricNames } from '@swimpay/observability';
import { InMemoryMerchantApiKeyVerifier } from './auth-bff.js';
import { InMemoryMerchantIntegrationRepository } from './developer-integration.js';
import { parseMerchantId } from './orders.js';
import {
  buildApiServer,
  type OrderRepository,
  type StoredOrderRecord,
  type StoredPaymentSessionRecord
} from './server.js';
import {
  PgOrderRepository,
  type PaymentSessionCheckoutMutationResult,
  type SaveExpectedPaymentProfileInput,
  type StoredMerchantReceivingRouteRecord
} from './orders.js';

function checkoutReadyRoute(merchantId: string): StoredMerchantReceivingRouteRecord {
  return {
    route_id: 'route_ready_card',
    merchant_id: merchantId,
    bank_profile_id: 'sber_ru',
    rail_type: 'card_transfer',
    receiver_identifier_type: 'card',
    receiver_identifier_encrypted: 'encrypted',
    receiver_identifier_hmac: 'hmac',
    receiver_identifier_masked: '2202 **** **** 7890',
    receiver_identifier_last4: '7890',
    route_code: 'SBER-CARD',
    display_label: 'Sberbank card',
    enabled: true,
    recommended: true,
    review_policy: 'review_first',
    lifecycle_status: 'active',
    created_at: '2026-05-02T10:00:00.000Z',
    updated_at: '2026-05-02T10:00:00.000Z'
  };
}

type FakePgRow = Record<string, unknown>;
type FakePgQueryResult = { rowCount: number; rows: FakePgRow[] };

interface FakeAmountLeaseRow {
  id: string;
  merchant_id: string;
  payment_session_id: string;
  route_id: string;
  rail: 'card' | 'sbp';
  display_amount_minor: number;
  reconciliation_delta_minor: number;
  payable_amount_minor: number;
  currency: string;
  status: 'active' | 'used' | 'expired' | 'released' | 'collision';
  expires_at: string;
  created_at: string;
  updated_at: string;
}

class FakeCheckoutPgClient {
  public readonly queries: Array<{ text: string; values: readonly unknown[] }> = [];
  public orderRow: FakePgRow;
  public paymentSessionRow: FakePgRow;
  public routeRow: FakePgRow;
  public amountLeases: FakeAmountLeaseRow[];
  private transactionSnapshot:
    | {
        orderRow: FakePgRow;
        paymentSessionRow: FakePgRow;
        amountLeases: FakeAmountLeaseRow[];
      }
    | undefined;

  public constructor(options: {
    validUntil?: string;
    sessionStatus?: string;
    orderStatus?: string;
    activeLeases?: FakeAmountLeaseRow[];
    amountLeaseId?: string | null;
  } = {}) {
    const now = '2026-05-02T10:00:00.000Z';
    const validUntil = options.validUntil ?? '2026-05-02T10:15:00.000Z';
    this.orderRow = {
      id: 'ord_pg_01',
      merchant_id: 'mch_pg_01',
      external_id: 'order_pg_01',
      product_id: null,
      product_name: null,
      product_risk_level: 'low',
      amount_minor: 13_700,
      currency: 'RUB',
      status: options.orderStatus ?? 'receiver_arming',
      expires_at: validUntil,
      created_at: now,
      updated_at: now
    };
    this.paymentSessionRow = {
      id: 'ps_pg_01',
      order_id: 'ord_pg_01',
      merchant_id: 'mch_pg_01',
      expected_amount_minor: 13_700,
      currency: 'RUB',
      buyer_phone_hmac: null,
      buyer_phone_masked: null,
      buyer_name_hmac: null,
      reference_code: 'SWP-PG1',
      reference_hmac: 'hmac_ref_pg',
      status: options.sessionStatus ?? 'receiver_arming',
      selected_receiver_bank_id: null,
      selected_receiver_bank_profile_id: null,
      selected_receiving_route_id: null,
      selected_payer_bank_launcher_id: null,
      buyer_sender_phone_hmac: null,
      buyer_sender_phone_masked: null,
      payment_method: null,
      sender_bank_id: null,
      sender_card_last4: null,
      sender_card_masked: null,
      sender_card_hmac: null,
      sender_phone_masked: null,
      sender_phone_hmac: null,
      buyer_first_name_raw: null,
      buyer_last_name_raw: null,
      buyer_name_script_detected: null,
      buyer_name_normalized: null,
      buyer_name_latin_variants: null,
      buyer_name_cyrillic_variants: null,
      buyer_name_initial_variants: null,
      buyer_name_reversed_order_variants: null,
      buyer_name_fingerprint: null,
      display_amount_minor: null,
      payable_amount_minor: null,
      reconciliation_delta_minor: null,
      expected_payment_fingerprint: null,
      payment_instructions_shown_at: null,
      receiver_armed_at: null,
      buyer_claimed_paid_at: null,
      no_notification_manual_check_requested_at: null,
      route_locked_at: null,
      route_lock_expires_at: null,
      amount_lease_id: options.amountLeaseId ?? null,
      valid_from: now,
      valid_until: validUntil,
      created_at: now,
      updated_at: now
    };
    this.routeRow = {
      id: 'route_pg_card',
      merchant_id: 'mch_pg_01',
      bank_profile_id: 'sber_ru',
      rail_type: 'card_transfer',
      receiver_identifier_type: 'card',
      receiver_identifier_encrypted: 'encrypted',
      receiver_identifier_hmac: 'hmac_route',
      receiver_identifier_masked: '2202 **** **** 7890',
      receiver_identifier_last4: '7890',
      route_code: 'SBER-CARD',
      display_label: 'Sberbank card',
      enabled: true,
      recommended: true,
      review_policy: 'review_first',
      fees_hint: null,
      lifecycle_status: 'active',
      pending_disable_at: null,
      disabled_at: null,
      revoked_at: null,
      revocation_reason: null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };
    this.amountLeases = options.activeLeases ? cloneAmountLeases(options.activeLeases) : [];
  }

  public async query(text: string, values: readonly unknown[] = []): Promise<FakePgQueryResult> {
    this.queries.push({ text, values });

    if (text === 'BEGIN') {
      this.transactionSnapshot = {
        orderRow: { ...this.orderRow },
        paymentSessionRow: { ...this.paymentSessionRow },
        amountLeases: cloneAmountLeases(this.amountLeases)
      };
      return emptyPgResult();
    }
    if (text === 'COMMIT') {
      this.transactionSnapshot = undefined;
      return emptyPgResult();
    }
    if (text === 'ROLLBACK') {
      if (this.transactionSnapshot) {
        this.orderRow = { ...this.transactionSnapshot.orderRow };
        this.paymentSessionRow = { ...this.transactionSnapshot.paymentSessionRow };
        this.amountLeases = cloneAmountLeases(this.transactionSnapshot.amountLeases);
      }
      this.transactionSnapshot = undefined;
      return emptyPgResult();
    }
    if (text.trimStart().startsWith('SELECT') && text.includes('FROM payment_sessions WHERE merchant_id = $1 AND id = $2')) {
      return { rowCount: 1, rows: [{ ...this.paymentSessionRow }] };
    }
    if (text.trimStart().startsWith('SELECT') && text.includes('FROM orders WHERE merchant_id = $1 AND id = $2')) {
      return { rowCount: 1, rows: [{ ...this.orderRow }] };
    }
    if (text.includes('FROM merchant_receiving_routes')) {
      return { rowCount: 1, rows: [{ ...this.routeRow }] };
    }
    if (text.includes('FROM bank_route_certifications')) {
      return { rowCount: 1, rows: [{ runtime_status: 'certified', rail_supported: ['card'] }] };
    }
    if (text.includes('FROM payment_sessions ps') && text.includes('FOR UPDATE')) {
      return {
        rowCount: 1,
        rows: [
          {
            id: this.paymentSessionRow.id,
            valid_until: this.paymentSessionRow.valid_until,
            status: this.paymentSessionRow.status
          }
        ]
      };
    }
    if (text.includes('FROM amount_leases') && text.includes('payment_session_id = $2') && text.includes('LIMIT 1')) {
      const existing = this.amountLeases.find(
        (lease) =>
          lease.merchant_id === values[0] &&
          lease.payment_session_id === values[1] &&
          lease.route_id === values[2] &&
          lease.rail === values[3] &&
          lease.status === 'active'
      );
      return existing ? { rowCount: 1, rows: [{ ...existing }] } : emptyPgResult();
    }
    if (text.includes('SET status = \'released\'') && text.includes('UPDATE amount_leases')) {
      for (const lease of this.amountLeases) {
        if (lease.merchant_id === values[0] && lease.payment_session_id === values[1] && lease.status === 'active') {
          lease.status = 'released';
          lease.updated_at = String(values[2]);
        }
      }
      return emptyPgResult();
    }
    if (text.includes('SELECT payable_amount_minor') && text.includes('FROM amount_leases')) {
      const rows = this.amountLeases
        .filter(
          (lease) =>
            lease.merchant_id === values[0] &&
            lease.route_id === values[1] &&
            lease.rail === values[2] &&
            lease.status === 'active'
        )
        .map((lease) => ({ payable_amount_minor: lease.payable_amount_minor }));
      return { rowCount: rows.length, rows };
    }
    if (text.includes('INSERT INTO amount_leases')) {
      const lease: FakeAmountLeaseRow = {
        id: 'lease_allocated_01',
        merchant_id: String(values[0]),
        payment_session_id: String(values[1]),
        route_id: String(values[2]),
        rail: values[3] as 'card' | 'sbp',
        display_amount_minor: Number(values[4]),
        reconciliation_delta_minor: Number(values[5]),
        payable_amount_minor: Number(values[6]),
        currency: String(values[7]),
        status: 'active',
        expires_at: String(values[8]),
        created_at: String(values[9]),
        updated_at: String(values[9])
      };
      const duplicateActive = this.amountLeases.some(
        (existing) =>
          existing.merchant_id === lease.merchant_id &&
          existing.route_id === lease.route_id &&
          existing.rail === lease.rail &&
          existing.payable_amount_minor === lease.payable_amount_minor &&
          existing.status === 'active'
      );
      if (duplicateActive) {
        return emptyPgResult();
      }
      this.amountLeases.push(lease);
      return { rowCount: 1, rows: [{ id: lease.id, payable_amount_minor: lease.payable_amount_minor }] };
    }
    if (text.includes('UPDATE payment_sessions') && text.includes("SET status = 'expired'")) {
      this.paymentSessionRow.status = 'expired';
      this.paymentSessionRow.route_lock_expires_at = null;
      this.paymentSessionRow.amount_lease_id = null;
      this.paymentSessionRow.updated_at = values[2];
      return emptyPgResult();
    }
    if (text.includes('UPDATE orders') && text.includes("SET status = 'expired'")) {
      this.orderRow.status = 'expired';
      this.orderRow.updated_at = values[2];
      return emptyPgResult();
    }
    if (text.includes('UPDATE amount_leases') && text.includes('expires_at <= $4::timestamptz')) {
      const nowMs = Date.parse(String(values[3]));
      for (const lease of this.amountLeases) {
        if (
          lease.merchant_id === values[0] &&
          lease.route_id === values[1] &&
          lease.rail === values[2] &&
          lease.status === 'active' &&
          Date.parse(lease.expires_at) <= nowMs
        ) {
          lease.status = 'expired';
          lease.updated_at = String(values[3]);
        }
      }
      return emptyPgResult();
    }
    if (text.includes('UPDATE amount_leases') && text.includes("SET status = 'expired'")) {
      for (const lease of this.amountLeases) {
        if (lease.merchant_id === values[0] && lease.payment_session_id === values[1] && lease.status === 'active') {
          lease.status = 'expired';
          lease.updated_at = String(values[2]);
        }
      }
      return emptyPgResult();
    }
    if (text.includes('UPDATE payment_sessions') && text.includes('selected_receiving_route_id = $3')) {
      const allocatedLease = this.amountLeases.find(
        (lease) =>
          lease.merchant_id === values[0] &&
          lease.payment_session_id === values[1] &&
          lease.route_id === values[2] &&
          lease.status === 'active'
      );
      this.paymentSessionRow.selected_receiving_route_id = values[2];
      this.paymentSessionRow.selected_payer_bank_launcher_id = null;
      this.paymentSessionRow.payment_instructions_shown_at = null;
      this.paymentSessionRow.display_amount_minor = allocatedLease?.display_amount_minor ?? values[3];
      this.paymentSessionRow.payable_amount_minor = allocatedLease?.payable_amount_minor ?? values[4];
      this.paymentSessionRow.reconciliation_delta_minor = allocatedLease?.reconciliation_delta_minor ?? values[5];
      this.paymentSessionRow.expected_amount_minor = allocatedLease?.payable_amount_minor ?? values[4];
      this.paymentSessionRow.expected_payment_fingerprint = values[6];
      this.paymentSessionRow.amount_lease_id = allocatedLease?.id ?? values[7];
      this.paymentSessionRow.updated_at = values[8];
      return emptyPgResult();
    }
    if (text.includes('UPDATE payment_sessions') && text.includes('payment_method = $3')) {
      const allocatedLease = this.amountLeases.find(
        (lease) =>
          lease.merchant_id === values[0] &&
          lease.payment_session_id === values[1] &&
          lease.route_id === values[24] &&
          lease.status === 'active'
      );
      this.paymentSessionRow.payment_method = values[2];
      this.paymentSessionRow.sender_bank_id = values[3];
      this.paymentSessionRow.sender_card_last4 = values[4];
      this.paymentSessionRow.sender_card_masked = values[5];
      this.paymentSessionRow.sender_card_hmac = values[6];
      this.paymentSessionRow.buyer_first_name_raw = values[9];
      this.paymentSessionRow.buyer_last_name_raw = values[10];
      this.paymentSessionRow.buyer_name_script_detected = values[11];
      this.paymentSessionRow.buyer_name_normalized = values[12];
      this.paymentSessionRow.buyer_name_latin_variants = values[13];
      this.paymentSessionRow.buyer_name_cyrillic_variants = values[14];
      this.paymentSessionRow.buyer_name_initial_variants = values[15];
      this.paymentSessionRow.buyer_name_reversed_order_variants = values[16];
      this.paymentSessionRow.buyer_name_fingerprint = values[17];
      this.paymentSessionRow.display_amount_minor = allocatedLease?.display_amount_minor ?? values[18];
      this.paymentSessionRow.payable_amount_minor = allocatedLease?.payable_amount_minor ?? values[19];
      this.paymentSessionRow.reconciliation_delta_minor = allocatedLease?.reconciliation_delta_minor ?? values[20];
      this.paymentSessionRow.expected_payment_fingerprint = values[21];
      this.paymentSessionRow.expected_amount_minor = allocatedLease?.payable_amount_minor ?? values[19];
      this.paymentSessionRow.selected_receiver_bank_id = values[22];
      this.paymentSessionRow.selected_receiver_bank_profile_id = values[23];
      this.paymentSessionRow.selected_receiving_route_id = values[24];
      this.paymentSessionRow.selected_payer_bank_launcher_id = values[25];
      this.paymentSessionRow.amount_lease_id = allocatedLease?.id ?? null;
      this.paymentSessionRow.payment_instructions_shown_at = null;
      this.paymentSessionRow.updated_at = values.length > 27 ? values[27] : values[26];
      return emptyPgResult();
    }
    if (text.includes('INSERT INTO audit_events')) {
      return emptyPgResult();
    }

    throw new Error(`Unexpected fake PG query: ${text}`);
  }

  public release(): void {}
}

class FakeCheckoutPgPool {
  public constructor(private readonly client: FakeCheckoutPgClient) {}

  public async connect(): Promise<FakeCheckoutPgClient> {
    return this.client;
  }

  public async query(text: string, values: readonly unknown[] = []): Promise<FakePgQueryResult> {
    return this.client.query(text, values);
  }
}

function buildPgOrderRepositoryForTest(client: FakeCheckoutPgClient): PgOrderRepository {
  const repository = new PgOrderRepository('postgres://swimpay:swimpay@localhost:5432/swimpay_test');
  (repository as unknown as { pool: FakeCheckoutPgPool }).pool = new FakeCheckoutPgPool(client);
  return repository;
}

function emptyPgResult(): FakePgQueryResult {
  return { rowCount: 0, rows: [] };
}

function cloneAmountLeases(leases: FakeAmountLeaseRow[]): FakeAmountLeaseRow[] {
  return leases.map((lease) => ({ ...lease }));
}

function makeActiveLease(payableAmountMinor: number, overrides: Partial<FakeAmountLeaseRow> = {}): FakeAmountLeaseRow {
  return {
    id: `lease_${payableAmountMinor}`,
    merchant_id: 'mch_pg_01',
    payment_session_id: 'other_session',
    route_id: 'route_pg_card',
    rail: 'card',
    display_amount_minor: 13_700,
    reconciliation_delta_minor: payableAmountMinor - 13_700,
    payable_amount_minor: payableAmountMinor,
    currency: 'RUB',
    status: 'active',
    expires_at: '2026-05-02T10:15:00.000Z',
    created_at: '2026-05-02T10:00:00.000Z',
    updated_at: '2026-05-02T10:00:00.000Z',
    ...overrides
  };
}

function saveExpectedPaymentProfileInput(): SaveExpectedPaymentProfileInput {
  return {
    merchantId: 'mch_pg_01',
    paymentSessionId: 'ps_pg_01',
    auditEventId: 'aud_pg_01',
    now: '2026-05-02T10:01:00.000Z',
    receiverBankId: 'sber_ru',
    bankProfileId: 'sber_ru',
    receivingRouteId: 'route_pg_card',
    payerBankLauncherId: 'sber_ru',
    profile: {
      payment_session_id: 'ps_pg_01',
      merchant_id: 'mch_pg_01',
      buyer_first_name_raw: 'Ivan',
      buyer_last_name_raw: 'Petrov',
      buyer_name_script_detected: 'latin',
      buyer_name_normalized: 'ivan petrov',
      buyer_name_latin_variants: ['ivan petrov'],
      buyer_name_cyrillic_variants: [],
      buyer_name_initial_variants: ['i. petrov'],
      buyer_name_reversed_order_variants: ['petrov ivan'],
      buyer_name_fingerprint: 'hmac_buyer_name',
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      sender_card_last4: '4242',
      sender_card_masked: '4242 **** **** 4242',
      sender_card_hmac: 'hmac_card',
      display_amount_minor: 13_700,
      payable_amount_minor: 13_707,
      reconciliation_delta_minor: 7,
      currency: 'RUB',
      generated_reference: 'SWP-PG1',
      expires_at: '2026-05-02T10:15:00.000Z',
      expected_payment_fingerprint: 'hmac_expected_payment'
    },
    expectedPaymentFingerprintForPayableAmount: (payableAmountMinor) => `hmac_expected_payment_${payableAmountMinor}`
  };
}

class InMemoryOrderRepository implements OrderRepository {
  public readonly orders = new Map<string, StoredOrderRecord>();
  public readonly orderExternalIds = new Set<string>();
  public readonly paymentSessions: StoredPaymentSessionRecord[] = [];
  public readonly auditEvents: Array<{
    merchantId: string;
    eventType: string;
    objectType: string;
    objectId: string;
    payloadRedacted: Record<string, unknown>;
  }> = [];

  async createOrderWithSession(input: Parameters<OrderRepository['createOrderWithSession']>[0]) {
    const dedupeKey = `${input.merchantId}:${input.order.externalId}`;
    if (this.orderExternalIds.has(dedupeKey)) {
      return { kind: 'duplicate_external_id' as const };
    }

    this.orderExternalIds.add(dedupeKey);
    this.orders.set(input.order.id, input.order);
    this.paymentSessions.push(input.paymentSession);
    this.auditEvents.push(...input.auditEvents);

    return {
      kind: 'created' as const,
      order: input.order,
      paymentSession: input.paymentSession
    };
  }

  async getOrderById(merchantId: string, orderId: string) {
    const order = this.orders.get(orderId);
    if (!order || order.merchantId !== merchantId) {
      return null;
    }

    const paymentSession = this.paymentSessions.find((session) => session.orderId === orderId) ?? null;
    return { order, paymentSession };
  }

  async getPaymentSessionById(merchantId: string, paymentSessionId: string) {
    const paymentSession = this.paymentSessions.find((session) => session.id === paymentSessionId);
    if (!paymentSession || paymentSession.merchantId !== merchantId) {
      return null;
    }

    const order = this.orders.get(paymentSession.orderId);
    return order ? { order, paymentSession } : null;
  }

  async getCheckoutSessionById(paymentSessionId: string) {
    const paymentSession = this.paymentSessions.find((session) => session.id === paymentSessionId);
    if (!paymentSession) {
      return null;
    }

    const order = this.orders.get(paymentSession.orderId);
    return order ? { order, paymentSession } : null;
  }

  async createReceivingRoute(input: Parameters<OrderRepository['createReceivingRoute']>[0]) {
    return { kind: 'created' as const, route: input.route };
  }

  async listReceivingRoutes(merchantId: string) {
    return [checkoutReadyRoute(merchantId)];
  }

  async updateReceivingRoute() {
    return { kind: 'not_found' as const };
  }

  async deleteReceivingRoute() {
    return { kind: 'not_found' as const };
  }

  async listReceiverBanksForCheckout(merchantId: string) {
    return [checkoutReadyRoute(merchantId)];
  }

  async listReceivingRoutesForCheckoutBank(merchantId: string) {
    return [checkoutReadyRoute(merchantId)];
  }

  async getSelectedReceivingRouteCopyDetails() {
    return { kind: 'not_found' as const };
  }

  async recordCheckoutDestinationCopied(input: Parameters<OrderRepository['recordCheckoutDestinationCopied']>[0]) {
    this.auditEvents.push({
      merchantId: input.merchantId,
      eventType: 'checkout.destination_copied',
      objectType: 'payment_session',
      objectId: input.paymentSessionId,
      payloadRedacted: {
        receiving_route_id: input.routeId,
        rail_type: input.railType,
        receiver_identifier_masked: input.receiverIdentifierMasked,
        official_bank_confirmation: false
      }
    });
  }

  async selectReceiverBank(input: Parameters<OrderRepository['selectReceiverBank']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.selectedReceiverBankId = input.receiverBankId;
    found.paymentSession.selectedReceiverBankProfileId = input.bankProfileId;
    found.paymentSession.selectedPayerBankLauncherId = undefined;
    found.paymentSession.paymentInstructionsShownAt = undefined;
    return { kind: 'updated' as const, ...found };
  }

  async selectReceivingRoute(input: Parameters<OrderRepository['selectReceivingRoute']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.selectedReceivingRouteId = input.receivingRouteId;
    found.paymentSession.selectedPayerBankLauncherId = undefined;
    found.paymentSession.paymentInstructionsShownAt = undefined;
    return { kind: 'updated' as const, ...found };
  }

  async selectPayerBankLauncher(input: Parameters<OrderRepository['selectPayerBankLauncher']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.selectedPayerBankLauncherId = input.payerBankLauncherId;
    found.paymentSession.paymentInstructionsShownAt = undefined;
    return { kind: 'updated' as const, ...found };
  }

  async saveExpectedPaymentProfile(input: Parameters<OrderRepository['saveExpectedPaymentProfile']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.paymentMethod = input.profile.payment_method;
    found.paymentSession.senderBankId = input.profile.sender_bank_id;
    found.paymentSession.senderCardLast4 = input.profile.sender_card_last4;
    found.paymentSession.senderCardMasked = input.profile.sender_card_masked;
    found.paymentSession.senderCardHmac = input.profile.sender_card_hmac;
    found.paymentSession.senderPhoneMasked = input.profile.sender_phone_masked;
    found.paymentSession.senderPhoneHmac = input.profile.sender_phone_hmac;
    found.paymentSession.buyerFirstNameRaw = input.profile.buyer_first_name_raw;
    found.paymentSession.buyerLastNameRaw = input.profile.buyer_last_name_raw;
    found.paymentSession.buyerNameScriptDetected = input.profile.buyer_name_script_detected;
    found.paymentSession.buyerNameNormalized = input.profile.buyer_name_normalized;
    found.paymentSession.buyerNameFingerprint = input.profile.buyer_name_fingerprint;
    found.paymentSession.displayAmountMinor = input.profile.display_amount_minor;
    found.paymentSession.payableAmountMinor = input.profile.payable_amount_minor;
    found.paymentSession.reconciliationDeltaMinor = input.profile.reconciliation_delta_minor;
    found.paymentSession.expectedPaymentFingerprint = input.profile.expected_payment_fingerprint;
    found.paymentSession.expectedAmountMinor = input.profile.payable_amount_minor;
    found.paymentSession.selectedReceiverBankId = input.receiverBankId;
    found.paymentSession.selectedReceiverBankProfileId = input.bankProfileId;
    found.paymentSession.selectedReceivingRouteId = input.receivingRouteId;
    found.paymentSession.selectedPayerBankLauncherId = input.payerBankLauncherId;
    found.paymentSession.paymentInstructionsShownAt = undefined;
    return { kind: 'updated' as const, ...found };
  }

  async saveBuyerSenderPhoneHint(input: Parameters<OrderRepository['saveBuyerSenderPhoneHint']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.buyerSenderPhoneHmac = input.buyerSenderPhoneHmac;
    found.paymentSession.buyerSenderPhoneMasked = input.buyerSenderPhoneMasked;
    return { kind: 'updated' as const, ...found };
  }

  async markPaymentInstructionsShown(input: Parameters<OrderRepository['markPaymentInstructionsShown']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.status = 'awaiting_payment';
    found.paymentSession.paymentInstructionsShownAt = input.now;
    return { kind: 'updated' as const, ...found };
  }

  async markReceiverArmed(input: Parameters<OrderRepository['markReceiverArmed']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.status = 'receiver_armed';
    found.order.status = 'receiver_armed';
    return { kind: 'updated' as const, ...found };
  }

  async markBuyerClaimedPaid(input: Parameters<OrderRepository['markBuyerClaimedPaid']>[0]) {
    const found = await this.requireMutablePaymentSession(input.merchantId, input.paymentSessionId);
    if ('kind' in found) {
      return found;
    }
    found.paymentSession.status = 'buyer_claimed_paid';
    found.paymentSession.buyerClaimedPaidAt = input.now;
    return { kind: 'updated' as const, ...found };
  }

  async requestNoNotificationManualCheck() {
    return { kind: 'not_found' as const };
  }

  private async requireMutablePaymentSession(merchantId: string, paymentSessionId: string) {
    const found = await this.getPaymentSessionById(merchantId, paymentSessionId);
    if (!found) {
      return { kind: 'not_found' as const };
    }
    if (found.paymentSession.status === 'expired') {
      return { kind: 'expired' as const };
    }
    return found;
  }
}

function buildTestServer(repository: InMemoryOrderRepository, metrics?: InMemoryMetricsRegistry) {
  return buildApiServer({
    environment: 'test',
    orderRepository: repository,
    ...(metrics ? { metrics } : {}),
    phoneHmacSecret: 'test_secret',
    checkoutBaseUrl: 'https://pay.test/checkout',
    idGenerator: {
      orderId: () => 'ord_test_01',
      paymentSessionId: () => 'ps_test_01',
      auditEventId: () => 'aud_test_01',
      referenceCode: () => 'SWP-TEST1'
    },
    clock: () => new Date('2026-05-02T10:00:00.000Z'),
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    }
  });
}

function buildProductionOrderServer(repository: InMemoryOrderRepository) {
  const merchantApiKeyVerifier = new InMemoryMerchantApiKeyVerifier();
  const server = buildApiServer({
    environment: 'production',
    orderRepository: repository,
    merchantIntegrationRepository: new InMemoryMerchantIntegrationRepository(),
    merchantApiKeyVerifier,
    phoneHmacSecret: 'production_phone_hmac_secret_for_tests',
    checkoutBaseUrl: 'https://pay.swimpay.example/checkout',
    idGenerator: {
      orderId: () => 'ord_prod_01',
      paymentSessionId: () => 'ps_prod_01',
      auditEventId: () => 'aud_prod_01',
      referenceCode: () => 'SWP-PROD1'
    },
    clock: () => new Date('2026-05-02T10:00:00.000Z'),
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    },
    adminAuth: {
      mode: 'signed_token',
      environment: 'production',
      tokenHmacSecret: 'production_admin_hmac_secret_for_tests'
    }
  });
  return { server, merchantApiKeyVerifier };
}

const validOrderPayload = {
  external_id: 'order_888',
  amount: {
    value: '137.00',
    currency: 'RUB'
  },
  buyer: {
    bank_phone: '+7 (999) 123-45-67',
    name: 'Ivan'
  },
  product: {
    id: 'premium_pack',
    name: 'Premium Pack',
    risk_level: 'low'
  },
  expires_in_seconds: 900
};

describe('pg order repository checkout amount leases', () => {
  test('saveExpectedPaymentProfile allocates and persists an amount lease for the selected receiving route', async () => {
    const client = new FakeCheckoutPgClient();
    const repository = buildPgOrderRepositoryForTest(client);

    const result = await repository.saveExpectedPaymentProfile(saveExpectedPaymentProfileInput());

    expect(result.kind).toBe('updated');
    if (result.kind !== 'updated') {
      return;
    }
    expect(result.paymentSession.amountLeaseId).toBe('lease_allocated_01');
    expect(result.paymentSession.payableAmountMinor).toBe(13_707);
    expect(result.paymentSession.expectedAmountMinor).toBe(13_707);
    expect(result.paymentSession.expectedPaymentFingerprint).toBe('hmac_expected_payment_13707');
    expect(client.amountLeases).toContainEqual(
      expect.objectContaining({
        id: 'lease_allocated_01',
        payment_session_id: 'ps_pg_01',
        route_id: 'route_pg_card',
        status: 'active',
        payable_amount_minor: 13_707
      })
    );
    expect(client.queries.some((query) => query.text.includes('INSERT INTO amount_leases'))).toBe(true);
  });

  test('saveExpectedPaymentProfile keeps fingerprint aligned when a different amount lease delta is allocated', async () => {
    const client = new FakeCheckoutPgClient({
      activeLeases: [makeActiveLease(13_707)]
    });
    const repository = buildPgOrderRepositoryForTest(client);

    const result = await repository.saveExpectedPaymentProfile(saveExpectedPaymentProfileInput());

    expect(result.kind).toBe('updated');
    if (result.kind !== 'updated') {
      return;
    }
    expect(result.paymentSession.payableAmountMinor).toBe(13_701);
    expect(result.paymentSession.reconciliationDeltaMinor).toBe(1);
    expect(result.paymentSession.expectedPaymentFingerprint).toBe('hmac_expected_payment_13701');
  });

  test('saveExpectedPaymentProfile expires stale active leases before choosing a payable amount', async () => {
    const client = new FakeCheckoutPgClient({
      activeLeases: [
        makeActiveLease(13_707, {
          id: 'lease_stale_13707',
          expires_at: '2026-05-02T09:59:00.000Z'
        })
      ]
    });
    const repository = buildPgOrderRepositoryForTest(client);

    const result = await repository.saveExpectedPaymentProfile(saveExpectedPaymentProfileInput());

    expect(result.kind).toBe('updated');
    if (result.kind !== 'updated') {
      return;
    }
    expect(result.paymentSession.payableAmountMinor).toBe(13_707);
    expect(client.amountLeases).toContainEqual(
      expect.objectContaining({
        id: 'lease_stale_13707',
        status: 'expired'
      })
    );
  });

  test('selectReceivingRoute recalculates fingerprint when route selection reallocates amount lease', async () => {
    const client = new FakeCheckoutPgClient({
      activeLeases: [makeActiveLease(13_707)]
    });
    client.paymentSessionRow.selected_receiver_bank_profile_id = 'sber_ru';
    client.paymentSessionRow.payment_method = 'card';
    client.paymentSessionRow.sender_bank_id = 'sber_ru';
    client.paymentSessionRow.expected_payment_fingerprint = 'stale_fingerprint';
    const repository = buildPgOrderRepositoryForTest(client);

    const result = await repository.selectReceivingRoute({
      merchantId: 'mch_pg_01',
      paymentSessionId: 'ps_pg_01',
      receivingRouteId: 'route_pg_card',
      expectedPaymentFingerprintForPayableAmount: (payableAmountMinor) => `hmac_route_${payableAmountMinor}`,
      auditEventId: 'aud_route_pg',
      now: '2026-05-02T10:00:00.000Z'
    });

    expect(result.kind).toBe('updated');
    if (result.kind !== 'updated') {
      return;
    }
    expect(result.paymentSession.payableAmountMinor).toBe(13_701);
    expect(result.paymentSession.expectedPaymentFingerprint).toBe('hmac_route_13701');
  });

  test('saveExpectedPaymentProfile returns amount_lease_unavailable instead of throwing a generic error', async () => {
    const exhaustedAmounts = Array.from({ length: 99 }, (_value, index) => makeActiveLease(13_701 + index));
    const client = new FakeCheckoutPgClient({ activeLeases: exhaustedAmounts });
    const repository = buildPgOrderRepositoryForTest(client);

    const result = (await repository.saveExpectedPaymentProfile(
      saveExpectedPaymentProfileInput()
    )) as PaymentSessionCheckoutMutationResult;

    expect(result).toEqual({ kind: 'amount_lease_unavailable' });
    expect(client.paymentSessionRow.amount_lease_id).toBeNull();
    expect(client.amountLeases.filter((lease) => lease.payment_session_id === 'ps_pg_01')).toHaveLength(0);
  });

  test('expired checkout mutations persist order and session expiry and release the active amount lease', async () => {
    const activeLease = makeActiveLease(13_707, {
      id: 'lease_active_pg',
      payment_session_id: 'ps_pg_01'
    });
    const client = new FakeCheckoutPgClient({
      validUntil: '2026-05-02T09:59:00.000Z',
      sessionStatus: 'receiver_armed',
      orderStatus: 'receiver_armed',
      amountLeaseId: 'lease_active_pg',
      activeLeases: [activeLease]
    });
    const repository = buildPgOrderRepositoryForTest(client);

    const result = await repository.markPaymentInstructionsShown({
      merchantId: 'mch_pg_01',
      paymentSessionId: 'ps_pg_01',
      auditEventId: 'aud_expire_pg',
      now: '2026-05-02T10:01:00.000Z'
    });

    expect(result).toEqual({ kind: 'expired' });
    expect(client.paymentSessionRow.status).toBe('expired');
    expect(client.paymentSessionRow.amount_lease_id).toBeNull();
    expect(client.orderRow.status).toBe('expired');
    expect(client.amountLeases).toContainEqual(
      expect.objectContaining({
        id: 'lease_active_pg',
        status: 'expired'
      })
    );
    expect(client.queries.some((query) => query.text === 'COMMIT')).toBe(true);
    expect(
      client.queries.some(
        (query) => query.text.includes('payment_session.status_changed') && query.values.includes('aud_expire_pg')
      )
    ).toBe(true);
  });
});

describe('order api', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('does not parse development test merchant bearers unless explicitly allowed', () => {
    expect(parseMerchantId('Bearer test_mch_01')).toBeNull();
    expect(parseMerchantId('Bearer test_mch_01', { allowTestBearer: true })).toBe('mch_01');
  });

  test('creates an order, payment session placeholder and audit event without storing raw phone', async () => {
    const repository = new InMemoryOrderRepository();
    const metrics = new InMemoryMetricsRegistry();
    const server = buildTestServer(repository, metrics);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: {
        authorization: 'Bearer test_mch_01'
      },
      payload: validOrderPayload
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      order_id: 'ord_test_01',
      payment_session_id: 'ps_test_01',
      status: 'receiver_arming',
      checkout_url: 'https://pay.test/checkout/ps_test_01',
      amount: {
        value: '137.00',
        currency: 'RUB'
      },
      reference: 'SWP-TEST1',
      expires_at: '2026-05-02T10:15:00.000Z'
    });

    expect(repository.orders.get('ord_test_01')).toMatchObject({
      merchantId: 'mch_01',
      externalId: 'order_888',
      amountMinor: 13700,
      currency: 'RUB',
      status: 'receiver_arming'
    });
    expect(repository.paymentSessions[0]).toMatchObject({
      orderId: 'ord_test_01',
      buyerPhoneMasked: '+7 *** *** **67',
      status: 'receiver_arming'
    });
    expect(repository.paymentSessions[0]?.buyerPhoneHmac).toMatch(/^hmac_sha256:/);
    expect(JSON.stringify(repository.orders)).not.toContain('+7 (999) 123-45-67');
    expect(JSON.stringify(repository.paymentSessions)).not.toContain('+7 (999) 123-45-67');
    expect(repository.auditEvents).toHaveLength(3);
    expect(repository.auditEvents[0]).toMatchObject({
      merchantId: 'mch_01',
      eventType: 'order.created',
      objectType: 'order',
      objectId: 'ord_test_01'
    });
    expect(repository.auditEvents[1]).toMatchObject({
      eventType: 'payment_session.created',
      objectType: 'payment_session',
      objectId: 'ps_test_01'
    });
    expect(repository.auditEvents[2]).toMatchObject({
      eventType: 'payment_session.receiver_arming_requested',
      objectType: 'payment_session',
      objectId: 'ps_test_01'
    });
    expect(metrics.counterValue(MetricNames.ORDERS_CREATED_TOTAL)).toBe(1);
    expect(metrics.counterValue(MetricNames.PAYMENT_SESSIONS_CREATED_TOTAL)).toBe(1);
  });

  test('stores a safe SDK return_url for hosted checkout return UX', async () => {
    const repository = new InMemoryOrderRepository();
    const server = buildTestServer(repository);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        ...validOrderPayload,
        return_url: 'merchantapp://swimpay-return?order_id=order_888'
      }
    });

    expect(response.statusCode).toBe(201);
    expect(repository.orders.get('ord_test_01')?.returnUrl).toBe('merchantapp://swimpay-return?order_id=order_888');
    expect(repository.auditEvents[0]?.payloadRedacted).toMatchObject({
      return_url_present: true
    });

    const read = await server.inject({
      method: 'GET',
      url: '/v1/orders/ord_test_01',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    expect(read.statusCode).toBe(200);
    expect(read.json()).toMatchObject({
      external_id: 'order_888',
      return_url: 'merchantapp://swimpay-return?order_id=order_888'
    });
  });

  test('rejects unsafe return_url values that could leak secrets or execute browser code', async () => {
    const repository = new InMemoryOrderRepository();
    const server = buildTestServer(repository);

    const unsafeScript = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        ...validOrderPayload,
        return_url: 'javascript:alert(1)'
      }
    });
    const unsafeSecret = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        ...validOrderPayload,
        return_url: 'https://merchant.example/orders/888?webhook_secret=whsec_secret'
      }
    });

    expect(unsafeScript.statusCode).toBe(400);
    expect(unsafeSecret.statusCode).toBe(400);
    expect(repository.orders.size).toBe(0);
  });

  test('rejects duplicate external id for a merchant', async () => {
    const repository = new InMemoryOrderRepository();
    const server = buildTestServer(repository);

    await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: validOrderPayload
    });

    const duplicate = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: validOrderPayload
    });

    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({
      error: {
        code: 'duplicate_external_id',
        message: 'Order external_id already exists for this merchant.',
        details: {
          external_id: 'order_888'
        }
      }
    });
  });

  test('validates amount and currency', async () => {
    const repository = new InMemoryOrderRepository();
    const server = buildTestServer(repository);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        ...validOrderPayload,
        amount: {
          value: '0.00',
          currency: 'USD'
        }
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: 'invalid_request',
        message: 'Order amount must be positive and currency must be RUB.',
        details: {
          amount: '0.00',
          currency: 'USD'
        }
      }
    });
  });

  test('retrieves an order by id for the authenticated merchant', async () => {
    const repository = new InMemoryOrderRepository();
    const server = buildTestServer(repository);

    await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: validOrderPayload
    });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/orders/ord_test_01',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      order_id: 'ord_test_01',
      external_id: 'order_888',
      status: 'receiver_arming',
      payment_session_id: 'ps_test_01',
      amount: {
        value: '137.00',
        currency: 'RUB'
      },
      expires_at: '2026-05-02T10:15:00.000Z',
      latest_event: 'payment_session.receiver_arming_requested'
    });
  });

  test('rejects production test bearer tokens on SDK order routes', async () => {
    const repository = new InMemoryOrderRepository();
    const { server } = buildProductionOrderServer(repository);

    const create = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: validOrderPayload
    });
    expect(create.statusCode).toBe(401);

    const read = await server.inject({
      method: 'GET',
      url: '/v1/orders/ord_prod_01',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    expect(read.statusCode).toBe(401);
  });

  test('enforces API key scopes for SDK order creation and reads', async () => {
    const repository = new InMemoryOrderRepository();
    const { server, merchantApiKeyVerifier } = buildProductionOrderServer(repository);
    merchantApiKeyVerifier.seedRawKey('sk_live_read_only', {
      merchantId: 'merchant_prod_01',
      apiKeyId: 'key_read_only',
      scopes: ['orders.read']
    });
    merchantApiKeyVerifier.seedRawKey('sk_live_write_only', {
      merchantId: 'merchant_prod_01',
      apiKeyId: 'key_write_only',
      scopes: ['orders.write']
    });

    const forbiddenCreate = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer sk_live_read_only' },
      payload: validOrderPayload
    });
    expect(forbiddenCreate.statusCode).toBe(403);
    expect(repository.orders.size).toBe(0);

    const created = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer sk_live_write_only' },
      payload: validOrderPayload
    });
    expect(created.statusCode).toBe(201);

    const forbiddenRead = await server.inject({
      method: 'GET',
      url: '/v1/orders/ord_prod_01',
      headers: { authorization: 'Bearer sk_live_write_only' }
    });
    expect(forbiddenRead.statusCode).toBe(403);

    const read = await server.inject({
      method: 'GET',
      url: '/v1/orders/ord_prod_01',
      headers: { authorization: 'Bearer sk_live_read_only' }
    });
    expect(read.statusCode).toBe(200);
  });

  test('fails fast when production phone HMAC secret is missing', () => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('PHONE_HMAC_SECRET', '');

    expect(() =>
      buildApiServer({
        environment: 'production',
        orderRepository: new InMemoryOrderRepository(),
        healthChecks: {
          database: async () => 'skipped',
          nats: async () => 'skipped',
          valkey: async () => 'skipped'
        },
        adminAuth: {
          mode: 'signed_token',
          environment: 'production',
          tokenHmacSecret: 'production_admin_hmac_secret_for_tests'
        }
      })
    ).toThrow(/PHONE_HMAC_SECRET/u);
  });
});
