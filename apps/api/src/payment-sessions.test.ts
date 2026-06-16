import { describe, expect, test } from 'vitest';
import { getPayerBankLauncherOption, getReceiverBankOption } from '@swimpay/contracts';
import { buildApiServer, type OrderRepository, type StoredOrderRecord, type StoredPaymentSessionRecord } from './server.js';
import { InMemoryChainReader } from './settlement/chain-reader.js';
import type { TokenConfig } from './settlement/payment-intent.js';
import { InMemoryMerchantApiKeyVerifier } from './auth-bff.js';
import { bankCertificationAllowsCheckoutRoute, decryptReceiverIdentifier, selectAmountLeaseCandidate, type RequotePaymentSessionCurrencyResult } from './orders.js';
import { isPaymentSessionTransitionAllowed, resolvePaymentSessionStatusForRead, toPayerBankLaunchersResponse } from './payment-sessions.js';

interface TestReceivingRoute {
  route_id: string;
  merchant_id: string;
  bank_profile_id: string;
  rail_type: 'phone_transfer' | 'card_transfer';
  receiver_identifier_type: 'phone' | 'card';
  receiver_identifier_encrypted: string;
  receiver_identifier_hmac: string;
  receiver_identifier_masked: string;
  receiver_identifier_last4: string;
  route_code: string;
  display_label: string;
  enabled: boolean;
  recommended: boolean;
  review_policy: 'review_first' | 'eligible_low_risk_later';
  fees_hint?: string | undefined;
  lifecycle_status: 'active' | 'pending_disable' | 'disabled' | 'revoked' | 'deleted';
  pending_disable_at?: string | null | undefined;
  disabled_at?: string | null | undefined;
  revoked_at?: string | null | undefined;
  revocation_reason?: string | null | undefined;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null | undefined;
}

type TestBankRouteCertificationStatus =
  | 'certified'
  | 'observed'
  | 'experimental'
  | 'review_only'
  | 'package_validation_pending'
  | 'disabled';

class InMemoryPaymentSessionRepository implements OrderRepository {
  public readonly orders = new Map<string, StoredOrderRecord>();
  public readonly paymentSessions = new Map<string, StoredPaymentSessionRecord>();
  public readonly receivingRoutes = new Map<string, TestReceivingRoute>();
  public readonly bankCertifications = new Map<string, { status: TestBankRouteCertificationStatus; rails: readonly string[] }>();
  public readonly fallbackReviews = new Map<string, { reviewId: string; reasonLabel: string; status: string }>();
  public readonly externalIds = new Set<string>();
  public readonly auditEvents: Array<{ eventType: string; objectId: string; payloadRedacted?: Record<string, unknown> }> = [];

  async createOrderWithSession(input: Parameters<OrderRepository['createOrderWithSession']>[0]) {
    const externalKey = `${input.merchantId}:${input.order.externalId}`;
    if (this.externalIds.has(externalKey)) {
      return { kind: 'duplicate_external_id' as const };
    }

    this.externalIds.add(externalKey);
    this.orders.set(input.order.id, input.order);
    this.paymentSessions.set(input.paymentSession.id, input.paymentSession);
    this.auditEvents.push(...input.auditEvents.map((event) => ({ eventType: event.eventType, objectId: event.objectId })));

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

    const paymentSession = [...this.paymentSessions.values()].find((session) => session.orderId === orderId) ?? null;
    return { order, paymentSession };
  }

  async getPaymentSessionById(merchantId: string, paymentSessionId: string) {
    const paymentSession = this.paymentSessions.get(paymentSessionId);
    if (!paymentSession || paymentSession.merchantId !== merchantId) {
      return null;
    }

    const order = this.orders.get(paymentSession.orderId);
    return order ? { order, paymentSession } : null;
  }

  async getCheckoutSessionById(paymentSessionId: string) {
    const paymentSession = this.paymentSessions.get(paymentSessionId);
    if (!paymentSession) {
      return null;
    }

    const order = this.orders.get(paymentSession.orderId);
    return order ? { order, paymentSession } : null;
  }

  async selectReceiverBank(input: Parameters<OrderRepository['selectReceiverBank']>[0]) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now);
    if (result.kind !== 'ok') {
      return result;
    }

    result.paymentSession.selectedReceiverBankId = input.receiverBankId;
    result.paymentSession.selectedReceiverBankProfileId = input.bankProfileId;
    result.paymentSession.selectedReceivingRouteId = undefined;
    result.paymentSession.selectedPayerBankLauncherId = undefined;
    result.paymentSession.updatedAt = input.now;
    this.auditEvents.push({ eventType: 'checkout.receiver_bank_selected', objectId: input.paymentSessionId });
    return { kind: 'updated' as const, order: result.order, paymentSession: result.paymentSession };
  }

  async selectPayerBankLauncher(input: Parameters<OrderRepository['selectPayerBankLauncher']>[0]) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now);
    if (result.kind !== 'ok') {
      return result;
    }

    result.paymentSession.selectedPayerBankLauncherId = input.payerBankLauncherId;
    result.paymentSession.updatedAt = input.now;
    this.auditEvents.push({ eventType: 'checkout.payer_bank_launcher_selected', objectId: input.paymentSessionId });
    return { kind: 'updated' as const, order: result.order, paymentSession: result.paymentSession };
  }

  async saveExpectedPaymentProfile(input: Parameters<OrderRepository['saveExpectedPaymentProfile']>[0]) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now, ['created', 'receiver_arming']);
    if (result.kind !== 'ok') {
      return result;
    }

    result.paymentSession.status = 'receiver_arming';
    result.order.status = 'receiver_arming';
    result.paymentSession.paymentMethod = input.profile.payment_method;
    result.paymentSession.senderBankId = input.profile.sender_bank_id;
    result.paymentSession.senderCardLast4 = input.profile.sender_card_last4;
    result.paymentSession.senderCardMasked = input.profile.sender_card_masked;
    result.paymentSession.senderCardHmac = input.profile.sender_card_hmac;
    result.paymentSession.senderPhoneMasked = input.profile.sender_phone_masked;
    result.paymentSession.senderPhoneHmac = input.profile.sender_phone_hmac;
    result.paymentSession.buyerFirstNameRaw = input.profile.buyer_first_name_raw;
    result.paymentSession.buyerLastNameRaw = input.profile.buyer_last_name_raw;
    result.paymentSession.buyerNameScriptDetected = input.profile.buyer_name_script_detected;
    result.paymentSession.buyerNameNormalized = input.profile.buyer_name_normalized;
    result.paymentSession.buyerNameLatinVariants = [...input.profile.buyer_name_latin_variants];
    result.paymentSession.buyerNameCyrillicVariants = [...input.profile.buyer_name_cyrillic_variants];
    result.paymentSession.buyerNameInitialVariants = [...input.profile.buyer_name_initial_variants];
    result.paymentSession.buyerNameReversedOrderVariants = [...input.profile.buyer_name_reversed_order_variants];
    result.paymentSession.buyerNameFingerprint = input.profile.buyer_name_fingerprint;
    result.paymentSession.displayAmountMinor = input.profile.display_amount_minor;
    result.paymentSession.payableAmountMinor = input.profile.payable_amount_minor;
    result.paymentSession.reconciliationDeltaMinor = input.profile.reconciliation_delta_minor;
    result.paymentSession.expectedPaymentFingerprint = input.profile.expected_payment_fingerprint;
    result.paymentSession.expectedAmountMinor = input.profile.payable_amount_minor;
    result.paymentSession.selectedReceiverBankId = input.receiverBankId;
    result.paymentSession.selectedReceiverBankProfileId = input.bankProfileId;
    result.paymentSession.selectedReceivingRouteId = input.receivingRouteId;
    result.paymentSession.selectedPayerBankLauncherId = input.payerBankLauncherId;
    result.paymentSession.amountLeaseId = undefined;
    result.paymentSession.paymentInstructionsShownAt = undefined;
    result.paymentSession.updatedAt = input.now;
    this.auditEvents.push({
      eventType: 'checkout.expected_payment_profile_saved',
      objectId: input.paymentSessionId,
      payloadRedacted: {
        payment_method: input.profile.payment_method,
        sender_bank_id: input.profile.sender_bank_id,
        sender_card_masked: input.profile.sender_card_masked,
        sender_phone_masked: input.profile.sender_phone_masked
      }
    });
    return { kind: 'updated' as const, order: result.order, paymentSession: result.paymentSession };
  }

  async createReceivingRoute(input: {
    route: TestReceivingRoute;
    auditEventId: string;
  }) {
    const duplicate = [...this.receivingRoutes.values()].find(
      (route) =>
        route.merchant_id === input.route.merchant_id &&
        (route.route_code === input.route.route_code || route.receiver_identifier_hmac === input.route.receiver_identifier_hmac)
    );
    if (duplicate) {
      return duplicate.receiver_identifier_hmac === input.route.receiver_identifier_hmac
        ? { kind: 'duplicate_receiver_identifier' as const }
        : { kind: 'duplicate_route_code' as const };
    }
    this.receivingRoutes.set(input.route.route_id, input.route);
    this.auditEvents.push({ eventType: 'merchant_receiving_route.created', objectId: input.route.route_id });
    return { kind: 'created' as const, route: input.route };
  }

  async listReceivingRoutes(merchantId: string) {
    return [...this.receivingRoutes.values()].filter((route) => route.merchant_id === merchantId && !route.deleted_at);
  }

  async updateReceivingRoute(input: {
    merchantId: string;
    routeId: string;
    patch: Partial<Pick<TestReceivingRoute, 'enabled' | 'recommended' | 'display_label' | 'fees_hint' | 'lifecycle_status' | 'revocation_reason'>>;
    auditEventId: string;
    now: string;
  }) {
    const route = this.receivingRoutes.get(input.routeId);
    if (!route || route.merchant_id !== input.merchantId || route.deleted_at) {
      return { kind: 'not_found' as const };
    }
    if (input.patch.recommended) {
      for (const existingRoute of this.receivingRoutes.values()) {
        if (existingRoute.merchant_id === input.merchantId && existingRoute.rail_type === route.rail_type && existingRoute.route_id !== input.routeId) {
          existingRoute.recommended = false;
        }
      }
    }
    const lifecyclePatch = this.resolveRouteLifecyclePatch(route, input.patch, input.now);
    Object.assign(route, input.patch, lifecyclePatch, { updated_at: input.now });
    this.auditEvents.push({ eventType: 'merchant_receiving_route.updated', objectId: input.routeId });
    return { kind: 'updated' as const, route };
  }

  async deleteReceivingRoute(input: {
    merchantId: string;
    routeId: string;
    auditEventId: string;
    now: string;
  }) {
    void input.auditEventId;
    const route = this.receivingRoutes.get(input.routeId);
    if (!route || route.merchant_id !== input.merchantId || route.deleted_at) {
      return { kind: 'not_found' as const };
    }
    Object.assign(route, { enabled: false, recommended: false, lifecycle_status: 'deleted', deleted_at: input.now, updated_at: input.now });
    this.auditEvents.push({ eventType: 'merchant_receiving_route.deleted', objectId: input.routeId });
    return { kind: 'updated' as const, route };
  }

  async listReceiverBanksForCheckout(merchantId: string, paymentSessionId: string) {
    void paymentSessionId;
    return [...this.receivingRoutes.values()].filter(
      (route) => route.merchant_id === merchantId && this.routeVisibleToNewCheckout(route) && this.routeCertificationAllowsCheckout(route)
    );
  }

  async listReceivingRoutesForCheckoutBank(merchantId: string, paymentSessionId: string, bankProfileId: string) {
    const paymentSession = this.paymentSessions.get(paymentSessionId);
    return [...this.receivingRoutes.values()].filter(
      (route) =>
        route.merchant_id === merchantId &&
        route.bank_profile_id === bankProfileId &&
        !route.deleted_at &&
        (this.routeVisibleToNewCheckout(route) || this.routeUsableForLockedSession(route, paymentSession)) &&
        this.routeCertificationAllowsCheckout(route)
    );
  }

  async getSelectedReceivingRouteCopyDetails(input: {
    merchantId: string;
    paymentSessionId: string;
    encryptionSecret: string;
    now: string;
  }) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now);
    if (result.kind !== 'ok') {
      if (result.kind === 'invalid_transition') {
        return { kind: 'inactive' as const };
      }
      return result;
    }
    if (!copyDetailsAllowedStatuses.has(result.paymentSession.status)) {
      return { kind: 'inactive' as const };
    }
    if (!result.paymentSession.selectedReceivingRouteId) {
      return { kind: 'not_selected' as const };
    }
    const route = this.receivingRoutes.get(result.paymentSession.selectedReceivingRouteId);
    if (!route || route.deleted_at || route.merchant_id !== input.merchantId || !this.routeUsableForLockedSession(route, result.paymentSession)) {
      return { kind: 'not_found' as const };
    }

    return {
      kind: 'found' as const,
      order: result.order,
      paymentSession: result.paymentSession,
      route,
      receiverIdentifier: decryptReceiverIdentifier(route.receiver_identifier_encrypted, input.encryptionSecret)
    };
  }

  async recordCheckoutDestinationCopied(input: {
    merchantId: string;
    paymentSessionId: string;
    routeId: string;
    railType: string;
    receiverIdentifierMasked: string;
    auditEventId: string;
    now: string;
  }) {
    void input.now;
    this.auditEvents.push({
      eventType: 'checkout.destination_copied',
      objectId: input.paymentSessionId,
      payloadRedacted: {
        payment_session_id: input.paymentSessionId,
        receiving_route_id: input.routeId,
        rail_type: input.railType,
        receiver_identifier_masked: input.receiverIdentifierMasked,
        auto_confirm_enabled: false
      }
    });
  }

  async selectReceivingRoute(input: {
    merchantId: string;
    paymentSessionId: string;
    receivingRouteId: string;
    auditEventId: string;
    now: string;
  }) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now);
    if (result.kind !== 'ok') {
      return result;
    }
    const route = this.receivingRoutes.get(input.receivingRouteId);
    if (!route || route.deleted_at || route.merchant_id !== input.merchantId || route.bank_profile_id !== result.paymentSession.selectedReceiverBankProfileId || !this.routeVisibleToNewCheckout(route)) {
      return { kind: 'not_found' as const };
    }
    if (result.paymentSession.paymentMethod === 'card' && route.rail_type !== 'card_transfer') {
      return { kind: 'not_found' as const };
    }
    if (result.paymentSession.paymentMethod === 'sbp' && route.rail_type !== 'phone_transfer') {
      return { kind: 'not_found' as const };
    }
    if (!this.routeCertificationAllowsCheckout(route)) {
      return { kind: 'not_found' as const };
    }

    result.paymentSession.selectedReceivingRouteId = input.receivingRouteId;
    result.paymentSession.selectedPayerBankLauncherId = undefined;
    result.paymentSession.amountLeaseId = `lease_${input.receivingRouteId}`;
    result.paymentSession.paymentInstructionsShownAt = undefined;
    result.paymentSession.updatedAt = input.now;
    this.auditEvents.push({ eventType: 'checkout.receiving_route_selected', objectId: input.paymentSessionId });
    return { kind: 'updated' as const, order: result.order, paymentSession: result.paymentSession };
  }

  setBankCertification(
    bankProfileId: string,
    status: TestBankRouteCertificationStatus,
    rails: readonly string[] = ['sbp', 'card']
  ): void {
    this.bankCertifications.set(bankProfileId, { status, rails });
  }

  private routeCertificationAllowsCheckout(route: TestReceivingRoute): boolean {
    const certification = this.bankCertifications.get(route.bank_profile_id);
    if (!certification) {
      return true;
    }

    return bankCertificationAllowsCheckoutRoute({
      status: certification.status,
      railSupported: certification.rails,
      routeRailType: route.rail_type
    });
  }

  private routeVisibleToNewCheckout(route: TestReceivingRoute): boolean {
    return route.enabled && (route.lifecycle_status ?? 'active') === 'active' && !route.deleted_at;
  }

  private routeUsableForLockedSession(route: TestReceivingRoute, paymentSession: StoredPaymentSessionRecord | undefined): boolean {
    if (!paymentSession || route.route_id !== paymentSession.selectedReceivingRouteId) {
      return false;
    }
    const lifecycle = route.lifecycle_status ?? (route.enabled ? 'active' : 'disabled');
    if (lifecycle === 'active') {
      return route.enabled;
    }
    return lifecycle === 'pending_disable' && Boolean(paymentSession.routeLockExpiresAt);
  }

  private resolveRouteLifecyclePatch(
    route: TestReceivingRoute,
    patch: Partial<Pick<TestReceivingRoute, 'enabled' | 'recommended' | 'display_label' | 'fees_hint' | 'lifecycle_status' | 'revocation_reason'>>,
    now: string
  ): Partial<TestReceivingRoute> {
    if (patch.lifecycle_status === 'revoked') {
      return {
        enabled: false,
        recommended: false,
        lifecycle_status: 'revoked',
        revoked_at: now,
        revocation_reason: patch.revocation_reason ?? 'merchant_requested_revoke'
      };
    }
    if (patch.enabled === true) {
      return {
        enabled: true,
        lifecycle_status: 'active',
        pending_disable_at: null,
        disabled_at: null
      };
    }
    if (patch.enabled === false) {
      const activeLockedSession = [...this.paymentSessions.values()].some(
        (session) =>
          session.selectedReceivingRouteId === route.route_id &&
          Boolean(session.routeLockExpiresAt) &&
          !['manual_confirmed', 'rejected', 'expired'].includes(session.status)
      );
      return activeLockedSession
        ? {
            enabled: false,
            recommended: false,
            lifecycle_status: 'pending_disable',
            pending_disable_at: now
          }
        : {
            enabled: false,
            recommended: false,
            lifecycle_status: 'disabled',
            disabled_at: now
          };
    }
    return {};
  }

  async saveBuyerSenderPhoneHint(input: {
    merchantId: string;
    paymentSessionId: string;
    buyerSenderPhoneHmac: string;
    buyerSenderPhoneMasked: string;
    auditEventId: string;
    now: string;
  }) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now);
    if (result.kind !== 'ok') {
      return result;
    }
    result.paymentSession.buyerSenderPhoneHmac = input.buyerSenderPhoneHmac;
    result.paymentSession.buyerSenderPhoneMasked = input.buyerSenderPhoneMasked;
    result.paymentSession.updatedAt = input.now;
    this.auditEvents.push({ eventType: 'checkout.buyer_sender_phone_hint_saved', objectId: input.paymentSessionId });
    return { kind: 'updated' as const, order: result.order, paymentSession: result.paymentSession };
  }

  async markPaymentInstructionsShown(input: Parameters<OrderRepository['markPaymentInstructionsShown']>[0]) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now, ['receiver_arming', 'receiver_armed']);
    if (result.kind !== 'ok') {
      return result;
    }

    result.paymentSession.paymentInstructionsShownAt = input.now;
    result.paymentSession.routeLockedAt = result.paymentSession.routeLockedAt ?? input.now;
    result.paymentSession.routeLockExpiresAt = result.paymentSession.routeLockExpiresAt ?? result.paymentSession.validUntil;
    result.paymentSession.amountLeaseId = result.paymentSession.amountLeaseId ?? `lease_${result.paymentSession.selectedReceivingRouteId ?? 'unknown'}`;
    result.paymentSession.updatedAt = input.now;
    result.order.status = 'payment_instructions_shown';
    result.order.updatedAt = input.now;
    this.auditEvents.push({ eventType: 'checkout.payment_instructions_shown', objectId: input.paymentSessionId });
    return { kind: 'updated' as const, order: result.order, paymentSession: result.paymentSession };
  }

  async markReceiverArmed(input: Parameters<OrderRepository['markReceiverArmed']>[0]) {
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now, ['receiver_arming']);
    if (result.kind !== 'ok') {
      return result;
    }

    result.paymentSession.status = 'receiver_armed';
    result.paymentSession.paymentInstructionsShownAt = result.paymentSession.paymentInstructionsShownAt ?? input.now;
    result.paymentSession.receiverArmedAt = result.paymentSession.receiverArmedAt ?? input.now;
    result.paymentSession.updatedAt = input.now;
    result.order.status = 'receiver_armed';
    result.order.updatedAt = input.now;
    this.auditEvents.push({ eventType: 'checkout.continue_to_bank', objectId: input.paymentSessionId });
    return { kind: 'updated' as const, order: result.order, paymentSession: result.paymentSession };
  }

  async markBuyerClaimedPaid(input: Parameters<OrderRepository['markBuyerClaimedPaid']>[0]) {
    const existingSession = this.paymentSessions.get(input.paymentSessionId);
    const existingOrder = existingSession ? this.orders.get(existingSession.orderId) : undefined;
    if (existingSession && existingOrder) {
      if (existingSession.status === 'manual_confirmed' || existingOrder.status === 'manual_confirmed' || existingOrder.status === 'fulfilled') {
        return { kind: 'already_final' as const, order: existingOrder, paymentSession: existingSession, claimResult: 'already_confirmed' as const };
      }
      if (existingSession.status === 'rejected' || existingOrder.status === 'rejected') {
        return { kind: 'already_final' as const, order: existingOrder, paymentSession: existingSession, claimResult: 'already_rejected' as const };
      }
      if (existingSession.status === 'expired' || existingOrder.status === 'expired') {
        return { kind: 'already_final' as const, order: existingOrder, paymentSession: existingSession, claimResult: 'already_expired' as const };
      }
      if (existingSession.status === 'buyer_claimed_paid') {
        return { kind: 'updated' as const, order: existingOrder, paymentSession: existingSession, claimResult: 'claim_recorded' as const };
      }
      if (
        ['signal_detected', 'matching', 'needs_review'].includes(existingSession.status) &&
        existingSession.buyerClaimedPaidAt
      ) {
        return { kind: 'updated' as const, order: existingOrder, paymentSession: existingSession, claimResult: 'pending_review' as const };
      }
    }
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now, ['receiver_armed']);
    if (result.kind !== 'ok') {
      return result;
    }

    result.paymentSession.buyerClaimedPaidAt = input.now;
    result.paymentSession.status = 'buyer_claimed_paid';
    result.paymentSession.updatedAt = input.now;
    result.order.status = 'buyer_claimed_paid';
    result.order.updatedAt = input.now;
    this.auditEvents.push({ eventType: 'checkout.buyer_claimed_paid', objectId: input.paymentSessionId });
    return { kind: 'updated' as const, order: result.order, paymentSession: result.paymentSession, claimResult: 'claim_recorded' as const };
  }

  async requestNoNotificationManualCheck(input: Parameters<OrderRepository['requestNoNotificationManualCheck']>[0]) {
    const existingSession = this.paymentSessions.get(input.paymentSessionId);
    if (existingSession?.noNotificationManualCheckRequestedAt) {
      return { kind: 'not_eligible' as const, reason: 'already_requested' as const };
    }
    const result = this.requireMutableSession(input.merchantId, input.paymentSessionId, input.now, [
      'receiver_armed',
      'buyer_claimed_paid',
      'awaiting_payment'
    ]);
    if (result.kind !== 'ok') {
      if (result.kind === 'invalid_transition') {
        return { kind: 'not_eligible' as const, reason: 'not_armed' as const };
      }
      return result;
    }
    if (!result.paymentSession.paymentMethod || !result.paymentSession.expectedPaymentFingerprint) {
      return { kind: 'not_eligible' as const, reason: 'expected_profile_missing' as const };
    }
    if (!result.paymentSession.receiverArmedAt) {
      return { kind: 'not_eligible' as const, reason: 'not_armed' as const };
    }
    if (this.fallbackReviews.has(input.paymentSessionId)) {
      return { kind: 'not_eligible' as const, reason: 'signal_or_review_exists' as const };
    }
    const elapsedSeconds = Math.floor(
      (new Date(input.now).getTime() - new Date(result.paymentSession.receiverArmedAt).getTime()) / 1000
    );
    if (elapsedSeconds < 120) {
      return { kind: 'not_due' as const, elapsedSeconds };
    }

    result.paymentSession.status = 'needs_review';
    result.paymentSession.noNotificationManualCheckRequestedAt = input.now;
    result.paymentSession.updatedAt = input.now;
    result.order.status = 'needs_review';
    result.order.updatedAt = input.now;
    this.fallbackReviews.set(input.paymentSessionId, {
      reviewId: input.reviewId,
      reasonLabel: 'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT',
      status: 'open'
    });
    this.auditEvents.push({
      eventType: 'no_notification_manual_check_requested',
      objectId: input.paymentSessionId,
      payloadRedacted: {
        review_id: input.reviewId,
        reason_label: 'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT',
        emits_webhook: false,
        official_bank_confirmation: false
      }
    });
    return {
      kind: 'created' as const,
      reviewId: input.reviewId,
      orderId: result.order.id,
      paymentSessionId: input.paymentSessionId,
      reasonLabel: 'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT' as const
    };
  }

  async requotePaymentSessionCurrency(input: Parameters<OrderRepository['requotePaymentSessionCurrency']>[0]): Promise<RequotePaymentSessionCurrencyResult> {
    const paymentSession = this.paymentSessions.get(input.paymentSessionId);
    if (!paymentSession || paymentSession.merchantId !== input.merchantId) {
      return { kind: 'not_found' };
    }
    if (new Date(paymentSession.validUntil).getTime() <= new Date(input.now).getTime()) {
      return { kind: 'not_requotable' };
    }
    if (paymentSession.selectedReceivingRouteId) {
      return { kind: 'route_already_locked' };
    }
    const finalStatuses = new Set(['manual_confirmed', 'rejected', 'expired']);
    if (finalStatuses.has(paymentSession.status)) {
      return { kind: 'not_requotable' };
    }

    // Freeze base currency/amount on first selection.
    if (!paymentSession.baseCurrency) {
      paymentSession.baseCurrency = paymentSession.currency;
      paymentSession.baseAmountMinor = paymentSession.expectedAmountMinor;
    }

    paymentSession.currency = input.currency;
    paymentSession.expectedAmountMinor = input.amountMinor;
    paymentSession.displayAmountMinor = input.amountMinor;
    paymentSession.buyerFxRate = input.fxRate;
    paymentSession.buyerFxSource = input.fxSource;
    paymentSession.buyerFxTimestamp = input.fxTimestamp;
    paymentSession.currencySelectedAt = input.now;
    paymentSession.updatedAt = input.now;

    this.auditEvents.push({
      eventType: 'payment_session.currency_selected',
      objectId: input.paymentSessionId,
      payloadRedacted: {
        currency: input.currency,
        amount_minor: input.amountMinor,
        fx_rate: input.fxRate,
        fx_source: input.fxSource
      }
    });

    const order = this.orders.get(paymentSession.orderId);
    if (!order) {
      return { kind: 'not_found' };
    }
    return { kind: 'requoted', paymentSession };
  }

  private requireMutableSession(
    merchantId: string,
    paymentSessionId: string,
    now: string,
    allowedStatuses?: readonly StoredPaymentSessionRecord['status'][]
  ) {
    const paymentSession = this.paymentSessions.get(paymentSessionId);
    if (!paymentSession || paymentSession.merchantId !== merchantId) {
      return { kind: 'not_found' as const };
    }
    if (new Date(paymentSession.validUntil).getTime() <= new Date(now).getTime()) {
      paymentSession.status = 'expired';
      paymentSession.routeLockExpiresAt = undefined;
      paymentSession.amountLeaseId = undefined;
      const expiredOrder = this.orders.get(paymentSession.orderId);
      if (expiredOrder) {
        expiredOrder.status = 'expired';
      }
      return { kind: 'expired' as const };
    }
    const order = this.orders.get(paymentSession.orderId);
    if (!order) {
      return { kind: 'not_found' as const };
    }
    if (allowedStatuses && !allowedStatuses.includes(paymentSession.status)) {
      return { kind: 'invalid_transition' as const, currentStatus: paymentSession.status };
    }
    return { kind: 'ok' as const, order, paymentSession };
  }
}

const copyDetailsAllowedStatuses = new Set([
  'receiver_arming',
  'receiver_armed',
  'awaiting_payment',
  'buyer_claimed_paid',
  'signal_detected',
  'matching',
  'needs_review'
]);

function buildServer(
  repository: InMemoryPaymentSessionRepository,
  now = '2026-05-02T10:00:00.000Z',
  merchantApiKeyVerifier?: InMemoryMerchantApiKeyVerifier,
  fxRateService?: Parameters<typeof buildApiServer>[0]['fxRateService'],
  extra?: Partial<Parameters<typeof buildApiServer>[0]>
) {
  const options: Parameters<typeof buildApiServer>[0] = {
    environment: 'test',
    orderRepository: repository,
    phoneHmacSecret: 'test_secret',
    checkoutBaseUrl: 'https://pay.test/checkout',
    idGenerator: {
      orderId: () => 'ord_session_01',
      paymentSessionId: () => 'ps_session_01',
      auditEventId: () => `aud_${repository.auditEvents.length + 1}`,
      referenceCode: () => 'SWP-SESSION'
    },
    receivingRouteIdGenerator: () => `route_${repository.receivingRoutes.size + 1}`,
    clock: () => new Date(now),
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    }
  };
  const opts = {
    ...(merchantApiKeyVerifier ? { merchantApiKeyVerifier } : {}),
    ...(fxRateService !== undefined ? { fxRateService } : {})
  };
  return buildApiServer({ ...options, ...opts, ...(extra ?? {}) });
}

async function createOrder(server: ReturnType<typeof buildApiServer>) {
  return server.inject({
    method: 'POST',
    url: '/v1/orders',
    headers: { authorization: 'Bearer test_mch_01' },
    payload: {
      external_id: 'order_session_01',
      amount: {
        value: '137.00',
        currency: 'RUB'
      },
      buyer: {
        bank_phone: '+79991234567'
      },
      expires_in_seconds: 900
    }
  });
}

async function createSdkOrder(server: ReturnType<typeof buildApiServer>, apiKey = 'sk_test_ready_gate') {
  return server.inject({
    method: 'POST',
    url: '/v1/orders',
    headers: { authorization: `Bearer ${apiKey}` },
    payload: {
      external_id: 'order_session_01',
      amount: {
        value: '137.00',
        currency: 'RUB'
      },
      expires_in_seconds: 900
    }
  });
}

async function createPhoneRoute(server: ReturnType<typeof buildApiServer>) {
  return server.inject({
    method: 'POST',
    url: '/v1/merchant/receiving-routes',
    headers: { authorization: 'Bearer test_mch_01' },
    payload: {
      bank_profile_id: 'sber_ru',
      rail_type: 'phone_transfer',
      receiver_identifier: '+7 (999) 123-45-67',
      route_code: 'SBER-PHONE',
      display_label: 'Sberbank telephone',
      recommended: true,
      fees_hint: 'Usually instant'
    }
  });
}

async function createCardRoute(server: ReturnType<typeof buildApiServer>) {
  return server.inject({
    method: 'POST',
    url: '/v1/merchant/receiving-routes',
    headers: { authorization: 'Bearer test_mch_01' },
    payload: {
      bank_profile_id: 'sber_ru',
      rail_type: 'card_transfer',
      receiver_identifier: '2202201234567890',
      route_code: 'SBER-CARD',
      display_label: 'Sberbank card',
      recommended: false
    }
  });
}

async function createPhoneExpectedProfile(server: ReturnType<typeof buildApiServer>) {
  return server.inject({
    method: 'POST',
    url: '/v1/checkout/ps_session_01/expected-payment-profile',
    headers: { authorization: 'Bearer test_mch_01' },
    payload: {
      buyer_first_name: 'Ivan',
      buyer_last_name: 'Petrov',
      payment_method: 'sbp',
      sender_bank_id: 'sber_ru',
      sender_phone: '+7 999 123-45-67'
    }
  });
}

describe('payment session api', () => {
  test('allocates unique payable amounts for active sessions on the same route', () => {
    const displayAmountMinor = 13_700;
    const unavailablePayableAmounts = new Set<number>();
    const allocated = [];

    for (let index = 0; index < 99; index += 1) {
      const candidate = selectAmountLeaseCandidate({
        displayAmountMinor,
        preferredDeltaMinor: 1,
        unavailablePayableAmounts
      });
      expect(candidate).not.toBeNull();
      unavailablePayableAmounts.add(candidate!.payableAmountMinor);
      allocated.push(candidate!.payableAmountMinor);
    }

    expect(new Set(allocated).size).toBe(99);
    expect(selectAmountLeaseCandidate({ displayAmountMinor, preferredDeltaMinor: 1, unavailablePayableAmounts })).toBeNull();
  });

  test('blocks payable order creation when the merchant has no active receiving route', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const merchantApiKeyVerifier = new InMemoryMerchantApiKeyVerifier();
    merchantApiKeyVerifier.seedRawKey('sk_test_ready_gate', {
      apiKeyId: 'key_ready_gate',
      merchantId: 'mch_01',
      scopes: ['orders.write']
    });
    const server = buildServer(repository, '2026-05-02T10:00:00.000Z', merchantApiKeyVerifier);

    const response = await createSdkOrder(server);

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: {
        code: 'merchant_payment_setup_required',
        message: 'Merchant must add an active receiving method before accepting payments.',
        details: {
          merchant_setup_status: 'receiving_method_required',
          payment_ready: false,
          unavailable_reason: 'merchant_no_active_receiving_method',
          setup_actions: ['add_receiving_method']
        }
      },
      merchant_setup_status: 'receiving_method_required',
      payment_ready: false,
      setup_actions: ['add_receiving_method'],
      official_bank_confirmation: false
    });
    expect(repository.orders.size).toBe(0);
    expect(repository.paymentSessions.size).toBe(0);
  });

  test('exposes stored return_url on checkout session and confirmed checkout status', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createCardRoute(server);

    const created = await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        external_id: 'order_session_01',
        return_url: 'https://merchant.example/orders/order_session_01',
        amount: {
          value: '137.00',
          currency: 'RUB'
        },
        expires_in_seconds: 900
      }
    });
    expect(created.statusCode).toBe(201);
    const session = repository.paymentSessions.get('ps_session_01');
    const order = repository.orders.get('ord_session_01');
    expect(session).toBeDefined();
    expect(order).toBeDefined();
    if (session) session.status = 'manual_confirmed';
    if (order) order.status = 'manual_confirmed';

    const read = await server.inject({
      method: 'GET',
      url: '/v1/payment-sessions/ps_session_01',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const status = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/status'
    });

    expect(read.statusCode).toBe(200);
    expect(read.json()).toMatchObject({
      buyer_safe_status: 'confirmed',
      external_id: 'order_session_01',
      return_url: 'https://merchant.example/orders/order_session_01'
    });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      buyer_safe_status: 'confirmed',
      external_id: 'order_session_01',
      return_url: 'https://merchant.example/orders/order_session_01'
    });
  });

  test('reports merchant readiness from active receiving routes and drops readiness after disabling the last route', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);

    const initial = await server.inject({
      method: 'GET',
      url: '/v1/merchant/readiness',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    expect(initial.statusCode).toBe(200);
    expect(initial.json()).toMatchObject({
      merchant_setup_status: 'receiving_method_required',
      payment_ready: false,
      setup_actions: ['add_receiving_method']
    });

    await createPhoneRoute(server);

    const ready = await server.inject({
      method: 'GET',
      url: '/v1/merchant/readiness',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toMatchObject({
      merchant_setup_status: 'ready_for_manual_payments',
      payment_ready: true,
      active_receiving_route_count: 1,
      available_payment_methods: { card: false, sbp: true }
    });

    const disable = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-methods/route_1/disable',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    expect(disable.statusCode).toBe(200);

    const afterDisable = await server.inject({
      method: 'GET',
      url: '/v1/merchant/readiness',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    expect(afterDisable.statusCode).toBe(200);
    expect(afterDisable.json()).toMatchObject({
      merchant_setup_status: 'receiving_method_required',
      payment_ready: false,
      setup_actions: ['add_receiving_method']
    });
  });

  test('returns checkout status for a payment session', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);

    await createOrder(server);

    const response = await server.inject({
      method: 'GET',
      url: '/v1/payment-sessions/ps_session_01',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      payment_session_id: 'ps_session_01',
      order_id: 'ord_session_01',
      external_id: 'order_session_01',
      status: 'created',
      checkout_state: 'buyer_identity',
      buyer_safe_status: 'not_validated',
      amount: {
        value: '137.00',
        currency: 'RUB'
      },
      reference: 'SWP-SESSION',
      receiver_status: 'arming',
      expires_at: '2026-05-02T10:15:00.000Z',
      available_payment_methods: {
        card: false,
        sbp: false
      },
      available_receiving_methods: [],
      available_sender_banks: [
        expect.objectContaining({ bank_id: 'sber_ru', logo_asset_key: 'ic_bank_sberbank', selectable: true }),
        expect.objectContaining({ bank_id: 'tbank_ru', logo_asset_key: 'ic_bank_tbank', selectable: true }),
        expect.objectContaining({ bank_id: 'vtb_ru', logo_asset_key: 'ic_bank_vtb', selectable: true }),
        expect.objectContaining({ bank_id: 'alfa_ru', logo_asset_key: 'ic_bank_alfa', selectable: true }),
        expect.objectContaining({ bank_id: 'gazprombank_ru', logo_asset_key: 'ic_bank_gazprombank', selectable: true }),
        expect.objectContaining({ bank_id: 'ozon_bank', logo_asset_key: 'ic_bank_ozon', selectable: true })
      ],
      available_routes: [],
      available_compatibility_pairs: [],
      unavailable_reason: 'merchant_no_active_receiving_method',
      fallback_actions: ['refresh_methods', 'return_to_merchant'],
      official_bank_confirmation: false
    });
  });

  test('reports expired checkout status after valid_until', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const createServer = buildServer(repository, '2026-05-02T10:00:00.000Z');
    await createOrder(createServer);

    const readServer = buildServer(repository, '2026-05-02T10:16:00.000Z');
    const response = await readServer.inject({
      method: 'GET',
      url: '/v1/payment-sessions/ps_session_01',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      payment_session_id: 'ps_session_01',
      status: 'expired',
      receiver_status: 'expired'
    });
  });

  test('records payment session audit events during order creation', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);

    await createOrder(server);

    expect(repository.auditEvents.map((event) => event.eventType)).toEqual([
      'order.created',
      'payment_session.created'
    ]);
  });

  test('does not allow direct created to manual confirmation transition', () => {
    expect(isPaymentSessionTransitionAllowed('created', 'manual_confirmed')).toBe(false);
    expect(isPaymentSessionTransitionAllowed('created', 'receiver_arming')).toBe(true);
  });

  test('resolves active session status as expired when valid_until has passed', () => {
    expect(
      resolvePaymentSessionStatusForRead(
        {
          status: 'receiver_arming',
          validUntil: '2026-05-02T10:15:00.000Z'
        },
        new Date('2026-05-02T10:16:00.000Z')
      )
    ).toBe('expired');
  });

  test('exposes receiver bank options with review-only buyer-safe labels', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);

    const response = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/receiver-banks',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.payment_session_id).toBe('ps_session_01');
    expect(payload.receiver_banks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          receiver_bank_id: 'sber_ru',
          bank_profile_id: 'sber_ru',
          status: 'review_required_beta',
          review_only: true,
          detection_supported: true,
          auto_confirm_enabled: false,
          official_bank_confirmation: false
        })
      ])
    );
    expect(JSON.stringify(payload.receiver_banks)).not.toContain('+7 (999)');
    expect(payload.receiver_banks.find((bank: { receiver_bank_id: string }) => bank.receiver_bank_id === 'sber_ru')).toMatchObject({
      available_route_count: 1,
      rail_types: ['phone_transfer'],
      recommended_rail_type: 'phone_transfer'
    });
  });

  test('does not expose checkout receiving routes while bank package validation is pending', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    repository.setBankCertification('sber_ru', 'package_validation_pending', []);
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await createPhoneExpectedProfile(server);
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      payload: { receiver_bank_id: 'sber_ru' }
    });

    const banks = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/receiver-banks'
    });
    const routes = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/receiver-banks/sber_ru/routes'
    });
    const selectedRoute = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      payload: { receiving_route_id: 'route_1' }
    });

    expect(banks.statusCode).toBe(200);
    expect(banks.json().receiver_banks.find((bank: { receiver_bank_id: string }) => bank.receiver_bank_id === 'sber_ru')).toMatchObject({
      available_route_count: 0,
      rail_types: []
    });
    expect(routes.statusCode).toBe(200);
    expect(routes.json().routes).toEqual([]);
    expect(selectedRoute.statusCode).toBe(404);
  });

  test('allows buyer checkout progression from the public payment session id without a dev bearer', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);

    const session = await server.inject({
      method: 'GET',
      url: '/v1/payment-sessions/ps_session_01'
    });
    const expectedProfile = await createPhoneExpectedProfile(server);
    const banks = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/receiver-banks'
    });
    const selectedBank = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      payload: { receiver_bank_id: 'sber_ru' }
    });
    const routes = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/receiver-banks/sber_ru/routes'
    });
    const selectedRoute = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      payload: { receiving_route_id: 'route_1' }
    });
    const selectedLauncher = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payer-bank-launcher',
      payload: { payer_bank_launcher_id: 'sber_ru' }
    });
    const instructions = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payment-instructions-shown'
    });
    const armed = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/continue-to-bank'
    });
    const armedAgain = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/continue-to-bank'
    });

    expect([
      session.statusCode,
      expectedProfile.statusCode,
      banks.statusCode,
      selectedBank.statusCode,
      routes.statusCode,
      selectedRoute.statusCode,
      selectedLauncher.statusCode,
      instructions.statusCode,
      armed.statusCode,
      armedAgain.statusCode
    ]).toEqual([200, 200, 200, 200, 200, 200, 200, 200, 200, 200]);
    expect(armed.json()).toMatchObject({
      status: 'receiver_armed',
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
    expect(armedAgain.json()).toMatchObject({
      status: 'receiver_armed',
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
    expect(repository.paymentSessions.get('ps_session_01')?.merchantId).toBe('mch_01');
    expect(repository.paymentSessions.get('ps_session_01')?.status).toBe('receiver_armed');
    expect(repository.orders.get('ord_session_01')?.status).not.toBe('manual_confirmed');
  });

  test('requests no-notification manual check only after receiver has been armed for 120 seconds', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository, '2026-05-02T10:00:00.000Z');
    await createOrder(server);
    await createPhoneRoute(server);
    await createPhoneExpectedProfile(server);
    await server.inject({ method: 'POST', url: '/v1/checkout/ps_session_01/receiving-route', payload: { receiving_route_id: 'route_1' } });
    await server.inject({ method: 'POST', url: '/v1/checkout/ps_session_01/payer-bank-launcher', payload: { payer_bank_launcher_id: 'sber_ru' } });
    await server.inject({ method: 'POST', url: '/v1/checkout/ps_session_01/payment-instructions-shown' });
    await server.inject({ method: 'POST', url: '/v1/checkout/ps_session_01/continue-to-bank' });

    const tooEarlyServer = buildServer(repository, '2026-05-02T10:01:59.000Z');
    const tooEarly = await tooEarlyServer.inject({
      method: 'POST',
      url: '/v1/payment-sessions/ps_session_01/no-notification-manual-check',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    const dueServer = buildServer(repository, '2026-05-02T10:02:00.000Z');
    const due = await dueServer.inject({
      method: 'POST',
      url: '/v1/payment-sessions/ps_session_01/no-notification-manual-check',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const duplicate = await dueServer.inject({
      method: 'POST',
      url: '/v1/payment-sessions/ps_session_01/no-notification-manual-check',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(tooEarly.statusCode).toBe(409);
    expect(tooEarly.json().error).toMatchObject({
      code: 'manual_check_not_due',
      details: { elapsed_seconds: 119, minimum_elapsed_seconds: 120 }
    });
    expect(due.statusCode).toBe(201);
    expect(due.json()).toMatchObject({
      status: 'manual_check_requested',
      payment_session_id: 'ps_session_01',
      reason_label: 'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT',
      confirmation_type: 'manual_bank_check',
      does_not_confirm_payment: true,
      emits_webhook: false,
      official_bank_confirmation: false
    });
    expect(due.body).not.toContain('payment.confirmed');
    expect(due.body).not.toContain('+79991234567');
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.details).toEqual({ reason: 'already_requested' });
    expect(repository.paymentSessions.get('ps_session_01')).toMatchObject({
      status: 'needs_review',
      noNotificationManualCheckRequestedAt: '2026-05-02T10:02:00.000Z'
    });
    expect(repository.orders.get('ord_session_01')?.status).toBe('needs_review');
    expect(repository.auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'no_notification_manual_check_requested',
          objectId: 'ps_session_01'
        })
      ])
    );
  });

  test('cancels no-notification fallback when a review already exists or the payment is final', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository, '2026-05-02T10:00:00.000Z');
    await createOrder(server);
    await createPhoneRoute(server);
    await createPhoneExpectedProfile(server);
    await server.inject({ method: 'POST', url: '/v1/checkout/ps_session_01/receiving-route', payload: { receiving_route_id: 'route_1' } });
    await server.inject({ method: 'POST', url: '/v1/checkout/ps_session_01/payer-bank-launcher', payload: { payer_bank_launcher_id: 'sber_ru' } });
    await server.inject({ method: 'POST', url: '/v1/checkout/ps_session_01/payment-instructions-shown' });
    await server.inject({ method: 'POST', url: '/v1/checkout/ps_session_01/continue-to-bank' });
    repository.fallbackReviews.set('ps_session_01', {
      reviewId: 'rev_existing',
      reasonLabel: 'MATCHING_SIGNAL_REVIEW_EXISTS',
      status: 'open'
    });

    const dueServer = buildServer(repository, '2026-05-02T10:02:00.000Z');
    const existingReview = await dueServer.inject({
      method: 'POST',
      url: '/v1/payment-sessions/ps_session_01/no-notification-manual-check',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    repository.fallbackReviews.clear();
    const session = repository.paymentSessions.get('ps_session_01');
    const order = repository.orders.get('ord_session_01');
    if (!session || !order) {
      throw new Error('test session missing');
    }
    session.status = 'manual_confirmed';
    order.status = 'manual_confirmed';
    const finalState = await dueServer.inject({
      method: 'POST',
      url: '/v1/payment-sessions/ps_session_01/no-notification-manual-check',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(existingReview.statusCode).toBe(409);
    expect(existingReview.json().error.details).toEqual({ reason: 'signal_or_review_exists' });
    expect(finalState.statusCode).toBe(409);
    expect(finalState.json().error.details).toEqual({ reason: 'not_armed' });
    expect(repository.auditEvents.filter((event) => event.eventType === 'no_notification_manual_check_requested')).toHaveLength(0);
    expect(existingReview.body).not.toContain('payment.confirmed');
    expect(finalState.body).not.toContain('payment.confirmed');
  });

  test('creates, lists and updates merchant receiving routes without exposing raw identifiers', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);

    const created = await createPhoneRoute(server);
    const listed = await server.inject({
      method: 'GET',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const updated = await server.inject({
      method: 'PATCH',
      url: '/v1/merchant/receiving-routes/route_1',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { enabled: false, recommended: false, display_label: 'Sberbank phone backup' }
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      route: {
        route_id: 'route_1',
        bank_profile_id: 'sber_ru',
        rail_type: 'phone_transfer',
        receiver_identifier_type: 'phone',
        receiver_identifier_masked: '+7 *** *** **67',
        route_code: 'SBER-PHONE',
        review_policy: 'eligible_low_risk_later',
        official_bank_confirmation: false
      }
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().routes).toHaveLength(1);
    expect(updated.statusCode).toBe(200);
    expect(updated.json().route).toMatchObject({ enabled: false, recommended: false });
    expect(JSON.stringify([created.json(), listed.json(), updated.json()])).not.toContain('+7 (999) 123-45-67');
    expect(JSON.stringify(repository.receivingRoutes)).not.toContain('+7 (999) 123-45-67');
    expect(repository.auditEvents.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(['merchant_receiving_route.created', 'merchant_receiving_route.updated'])
    );
  });

  test('creates product receiving methods through the merchant-facing alias with masked output and internal hmac', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);

    const created = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-methods',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        type: 'card',
        value: '2202 2012 3456 4821',
        bank_id: 'sber_ru',
        label: 'Carte principale',
        is_default: true
      }
    });
    const listed = await server.inject({
      method: 'GET',
      url: '/v1/merchant/receiving-methods',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      method: {
        id: 'route_1',
        type: 'card',
        bank_id: 'sber_ru',
        label: 'Carte principale',
        masked_value: '2202 **** **** 4821',
        last4: '4821',
        status: 'active',
        is_default: true,
        official_bank_confirmation: false
      },
      official_bank_confirmation: false
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().methods).toEqual([
      expect.objectContaining({
        id: 'route_1',
        type: 'card',
        bank_id: 'sber_ru',
        masked_value: '2202 **** **** 4821',
        last4: '4821',
        status: 'active',
        is_default: true
      })
    ]);
    expect(JSON.stringify([created.json(), listed.json()])).not.toContain('2202201234564821');
    expect(JSON.stringify(repository.receivingRoutes)).not.toContain('2202201234564821');
    expect((repository.receivingRoutes.get('route_1') as unknown as { receiver_identifier_hmac?: string }).receiver_identifier_hmac).toMatch(/^hmac_sha256:/u);
  });

  test('deletes merchant receiving methods without exposing raw values or breaking tenant boundaries', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);

    const created = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-methods',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        type: 'phone',
        value: '+7 999 123-45-67',
        bank_id: 'tbank_ru',
        label: 'Telephone caisse'
      }
    });
    const crossTenantDelete = await server.inject({
      method: 'DELETE',
      url: '/v1/merchant/receiving-methods/route_1',
      headers: { authorization: 'Bearer test_mch_02' }
    });
    const deleted = await server.inject({
      method: 'DELETE',
      url: '/v1/merchant/receiving-methods/route_1',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const listed = await server.inject({
      method: 'GET',
      url: '/v1/merchant/receiving-methods',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(created.statusCode).toBe(201);
    expect(crossTenantDelete.statusCode).toBe(404);
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json()).toMatchObject({
      method: {
        id: 'route_1',
        status: 'deleted',
        lifecycle_status: 'deleted',
        official_bank_confirmation: false
      },
      deleted: true,
      deleted_method_id: 'route_1',
      official_bank_confirmation: false
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().methods).toEqual([]);
    await expect(repository.listReceiverBanksForCheckout('mch_01', 'ps_after_delete')).resolves.toEqual([]);
    await expect(repository.listReceivingRoutesForCheckoutBank('mch_01', 'ps_after_delete', 'tbank_ru')).resolves.toEqual([]);
    expect(repository.receivingRoutes.get('route_1')).toMatchObject({ deleted_at: expect.any(String), enabled: false });
    expect(repository.auditEvents.map((event) => event.eventType)).toContain('merchant_receiving_route.deleted');
    expect(JSON.stringify([created.json(), deleted.json(), listed.json(), repository.auditEvents])).not.toContain('+7 999 123-45-67');
  });

  test('rejects receiving method card secrets and invalid merchant destinations without persisting raw values', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);

    const withCvv = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-methods',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        type: 'card',
        value: '2202 2012 3456 4821',
        bank_id: 'sber_ru',
        cvv: '123'
      }
    });
    const withExpiry = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-methods',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        type: 'card',
        value: '2202 2012 3456 4821',
        bank_id: 'sber_ru',
        expiry: '12/30'
      }
    });
    const invalidCard = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-methods',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        type: 'card',
        value: '4242',
        bank_id: 'sber_ru'
      }
    });
    const cardWithEmbeddedCvv = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-methods',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        type: 'card',
        value: '2202 2012 3456 4821 123',
        bank_id: 'sber_ru'
      }
    });
    const invalidPhone = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-methods',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        type: 'phone',
        value: '12345',
        bank_id: 'sber_ru'
      }
    });

    expect([withCvv.statusCode, withExpiry.statusCode, invalidCard.statusCode, cardWithEmbeddedCvv.statusCode, invalidPhone.statusCode]).toEqual([
      400,
      400,
      400,
      400,
      400
    ]);
    expect(withCvv.json().error.details).toMatchObject({ field: 'cvv' });
    expect(withExpiry.json().error.details).toMatchObject({ field: 'expiry' });
    expect(invalidCard.json().error.details).toMatchObject({ type: 'card' });
    expect(cardWithEmbeddedCvv.json().error.details).toMatchObject({ type: 'card' });
    expect(invalidPhone.json().error.details).toMatchObject({ type: 'phone' });
    expect(repository.receivingRoutes.size).toBe(0);
    expect(JSON.stringify([withCvv.json(), withExpiry.json(), invalidCard.json(), cardWithEmbeddedCvv.json(), invalidPhone.json()])).not.toContain(
      '2202201234564821'
    );
    expect(JSON.stringify(repository.auditEvents)).not.toContain('2202201234564821');
  });

  test('rejects receiving routes with multi-bank, SBP or rail/type mismatch contract inputs', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);

    const multiBank = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        bank_profile_id: 'sber_ru',
        bank_profile_ids: ['sber_ru', 'tbank_ru'],
        rail_type: 'phone_transfer',
        receiver_identifier: '+7 (999) 123-45-67',
        route_code: 'SBER-PHONE',
        display_label: 'Sberbank telephone'
      }
    });
    const sbpRail = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        bank_profile_id: 'sber_ru',
        rail_type: 'sbp',
        receiver_identifier: '+7 (999) 123-45-67',
        route_code: 'SBER-SBP',
        display_label: 'Sberbank SBP'
      }
    });
    const mismatchedType = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        bank_profile_id: 'sber_ru',
        rail_type: 'phone_transfer',
        receiver_identifier_type: 'card',
        receiver_identifier: '+7 (999) 123-45-67',
        route_code: 'SBER-MISMATCH',
        display_label: 'Sberbank mismatch'
      }
    });
    const cardWithEmbeddedCvv = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        bank_profile_id: 'sber_ru',
        rail_type: 'card_transfer',
        receiver_identifier: '2202 2012 3456 4821 123',
        route_code: 'SBER-CVV',
        display_label: 'Sberbank card'
      }
    });

    expect(multiBank.statusCode).toBe(400);
    expect(multiBank.json().error).toMatchObject({
      code: 'invalid_request',
      details: { field: 'bank_profile_ids' }
    });
    expect(sbpRail.statusCode).toBe(400);
    expect(sbpRail.json().error).toMatchObject({
      code: 'invalid_request',
      details: { rail_type: 'sbp' }
    });
    expect(sbpRail.body).not.toMatch(/SBP integration|official bank confirmation|auto-confirm/iu);
    expect(mismatchedType.statusCode).toBe(400);
    expect(mismatchedType.json().error).toMatchObject({
      code: 'invalid_request',
      details: {
        rail_type: 'phone_transfer',
        receiver_identifier_type: 'card',
        expected_receiver_identifier_type: 'phone'
      }
    });
    expect(cardWithEmbeddedCvv.statusCode).toBe(400);
    expect(cardWithEmbeddedCvv.json().error).toMatchObject({
      code: 'invalid_request',
      details: { type: 'card' }
    });
    expect(repository.receivingRoutes.size).toBe(0);
    expect(JSON.stringify(repository.auditEvents)).not.toContain('+7 (999) 123-45-67');
  });

  test('reveals buyer-safe receiving routes only after bank selection and selects the actual route', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await createCardRoute(server);
    await createPhoneExpectedProfile(server);

    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });
    const routesResponse = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/receiver-banks/sber_ru/routes',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const selectedRoute = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiving_route_id: 'route_1' }
    });
    const copyDetails = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/receiving-route/copy-details',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(routesResponse.statusCode).toBe(200);
    expect(routesResponse.json()).toMatchObject({
      payment_session_id: 'ps_session_01',
      bank_profile_id: 'sber_ru',
      routes: [
        expect.objectContaining({
          route_id: 'route_1',
          rail_type: 'phone_transfer',
          receiver_identifier_masked: '+7 *** *** **67',
          review_policy: 'eligible_low_risk_later'
        })
      ],
      official_bank_confirmation: false
    });
    expect(JSON.stringify(routesResponse.json())).not.toContain('2202201234567890');
    expect(selectedRoute.statusCode).toBe(200);
    expect(selectedRoute.json()).toMatchObject({
      selected_receiving_route: expect.objectContaining({
        route_id: 'route_1',
        rail_type: 'phone_transfer'
      }),
      checkout_state: 'payer_bank_launcher_selection',
      official_bank_confirmation: false
    });
    expect(repository.paymentSessions.get('ps_session_01')?.selectedReceivingRouteId).toBe('route_1');
    expect(repository.auditEvents.map((event) => event.eventType)).toContain('checkout.receiving_route_selected');
    expect(copyDetails.statusCode).toBe(200);
    expect(copyDetails.headers['cache-control']).toBe('no-store');
    expect(copyDetails.headers.pragma).toBe('no-cache');
    expect(copyDetails.json()).toMatchObject({
      payment_session_id: 'ps_session_01',
      receiving_route_id: 'route_1',
      rail_type: 'phone_transfer',
      masked_identifier: '+7 *** *** **67',
      receiver_identifier_masked: '+7 *** *** **67',
      destination_value: '+7 (999) 123-45-67',
      receiver_identifier_copy_value: '+7 (999) 123-45-67',
      copy_action: 'explicit_buyer_copy',
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
    expect(Date.parse(copyDetails.json().reveal_expires_at)).toBeGreaterThan(Date.parse('2026-05-02T10:00:00.000Z'));
    expect(JSON.stringify(repository.auditEvents)).not.toContain('+7 (999) 123-45-67');
  });

  test('writes redacted audit and rate limits repeated copy-detail reveals', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await createPhoneExpectedProfile(server);
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiving_route_id: 'route_1' }
    });

    const requests = [];
    for (let index = 0; index < 4; index += 1) {
      requests.push(
        await server.inject({
          method: 'GET',
          url: '/v1/checkout/ps_session_01/receiving-route/copy-details',
          headers: {
            authorization: 'Bearer test_mch_01',
            'user-agent': 'copy-test-browser',
            'x-forwarded-for': '203.0.113.9'
          }
        })
      );
    }

    expect(requests.slice(0, 3).map((response) => response.statusCode)).toEqual([200, 200, 200]);
    expect(requests[3]?.statusCode).toBe(429);
    expect(requests[3]?.headers['retry-after']).toBe('300');
    expect(requests[3]?.json()).toMatchObject({
      error: {
        code: 'copy_details_rate_limited'
      }
    });
    const copyAudits = repository.auditEvents.filter((event) => event.eventType === 'checkout.destination_copied');
    expect(copyAudits).toHaveLength(3);
    expect(copyAudits[0]?.payloadRedacted).toMatchObject({
      payment_session_id: 'ps_session_01',
      receiving_route_id: 'route_1',
      rail_type: 'phone_transfer',
      receiver_identifier_masked: '+7 *** *** **67',
      auto_confirm_enabled: false
    });
    expect(JSON.stringify(copyAudits)).not.toContain('+7 (999) 123-45-67');
    expect(JSON.stringify(copyAudits)).not.toContain('2202201234567890');
  });

  test('rejects copy details for inactive sessions without revealing destination', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await createPhoneExpectedProfile(server);
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiving_route_id: 'route_1' }
    });
    const session = repository.paymentSessions.get('ps_session_01');
    if (!session) {
      throw new Error('test session missing');
    }
    session.status = 'rejected';

    const response = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/receiving-route/copy-details',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: {
        code: 'checkout_session_inactive'
      }
    });
    expect(response.body).not.toContain('+7 (999) 123-45-67');
    expect(repository.auditEvents.some((event) => event.eventType === 'checkout.destination_copied')).toBe(false);
  });

  test('stores buyer sender phone hint as HMAC and masked value only', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/buyer-sender-phone',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { buyer_sender_phone: '+7 (999) 000-12-34' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      buyer_sender_phone_masked: '+7 *** *** **34',
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
    expect(repository.paymentSessions.get('ps_session_01')?.buyerSenderPhoneHmac).toMatch(/^hmac_sha256:/);
    expect(repository.paymentSessions.get('ps_session_01')?.buyerSenderPhoneMasked).toBe('+7 *** *** **34');
    expect(JSON.stringify(repository.paymentSessions)).not.toContain('+7 (999) 000-12-34');
    expect(JSON.stringify(response.json())).not.toContain('+7 (999) 000-12-34');
  });

  test('persists expected payment profile from checkout step 1 without retaining raw PAN and filters routes by method', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await createCardRoute(server);

    const profile = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/expected-payment-profile',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        buyer_first_name: 'Ivan',
        buyer_last_name: 'Petrov',
        payment_method: 'card',
        sender_bank_id: 'sber_ru',
        sender_card_number: '4242 4242 4242 4242'
      }
    });
    const routes = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/receiver-banks/sber_ru/routes',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const wrongRoute = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiving_route_id: 'route_1' }
    });
    const rightRoute = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiving_route_id: 'route_2' }
    });

    expect(profile.statusCode).toBe(200);
    expect(profile.json()).toMatchObject({
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      sender_card_masked: '4242 **** **** 4242',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiving_route_id: 'route_2',
      receiver_method_type: 'card',
      selected_payer_bank_launcher_id: 'sber_ru',
      selected_sender_bank_id: 'sber_ru',
      sender_bank_logo_asset_key: 'ic_bank_sberbank',
      receiver_bank_logo_asset_key: 'ic_bank_sberbank',
      available_sender_banks: [
        expect.objectContaining({
          bank_id: 'sber_ru',
          display_name: 'Sberbank',
          logo_asset_key: 'ic_bank_sberbank',
          selectable: true,
          payer_bank_launcher_id: 'sber_ru',
          official_bank_confirmation: false
        }),
        expect.objectContaining({ bank_id: 'tbank_ru', logo_asset_key: 'ic_bank_tbank', selectable: true }),
        expect.objectContaining({ bank_id: 'vtb_ru', logo_asset_key: 'ic_bank_vtb', selectable: true }),
        expect.objectContaining({ bank_id: 'alfa_ru', logo_asset_key: 'ic_bank_alfa', selectable: true }),
        expect.objectContaining({ bank_id: 'gazprombank_ru', logo_asset_key: 'ic_bank_gazprombank', selectable: true }),
        expect.objectContaining({
          bank_id: 'ozon_bank',
          display_name: 'Ozon Банк',
          logo_asset_key: 'ic_bank_ozon',
          selectable: true,
          runtime_capture_status: 'runtime_verified'
        })
      ],
      available_receiving_methods: [
        expect.objectContaining({
          method: 'sbp',
          label: 'SBP',
          available: true,
          route_id: 'route_1',
          receiver_bank_id: 'sber_ru',
          receiver_bank_logo_asset_key: 'ic_bank_sberbank'
        }),
        expect.objectContaining({
          method: 'card',
          label: 'Carte',
          available: true,
          route_id: 'route_2',
          receiver_bank_id: 'sber_ru',
          receiver_bank_logo_asset_key: 'ic_bank_sberbank'
        })
      ],
      checkout_state: 'payment_instructions',
      official_bank_confirmation: false
    });
    const stored = repository.paymentSessions.get('ps_session_01');
    expect(stored?.senderCardHmac).toMatch(/^hmac_sha256:/);
    expect(stored?.senderCardMasked).toBe('4242 **** **** 4242');
    expect(stored?.expectedAmountMinor).toBe(stored?.payableAmountMinor);
    expect(stored?.reconciliationDeltaMinor).toBeGreaterThanOrEqual(1);
    expect(routes.json().routes).toEqual([
      expect.objectContaining({
        route_id: 'route_2',
        rail_type: 'card_transfer'
      })
    ]);
    expect(wrongRoute.statusCode).toBe(404);
    expect(rightRoute.statusCode).toBe(200);
    expect(rightRoute.json()).toMatchObject({
      receiving_route_id: 'route_2',
      receiver_method_type: 'card'
    });
    expect(JSON.stringify([profile.json(), routes.json(), repository.paymentSessions, repository.auditEvents])).not.toContain('4242424242424242');
  });

  test('rejects expected payment profile when merchant lacks a compatible receiving route for the selected method', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createCardRoute(server);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/expected-payment-profile',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        buyer_first_name: 'Ivan',
        buyer_last_name: 'Petrov',
        payment_method: 'sbp',
        sender_bank_id: 'sber_ru',
        sender_phone: '+7 999 123-45-67'
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: {
        code: 'no_receiving_route_for_method',
        message: 'Merchant has no active receiving route for the selected payment method.',
        details: {
          payment_method: 'sbp',
          required_rail_type: 'phone_transfer',
          sender_bank_id: 'sber_ru',
          available_methods: ['card'],
          available_payment_methods: {
            card: true,
            sbp: false,
            mobile_money: false,
            wallet: false
          },
          fallback_actions: ['switch_to_card', 'refresh_methods', 'return_to_merchant'],
          unavailable_reason: 'method_not_supported_by_merchant'
        }
      },
      official_bank_confirmation: false
    });
    expect(repository.paymentSessions.get('ps_session_01')?.paymentMethod).toBeUndefined();
    expect(JSON.stringify([response.json(), repository.paymentSessions, repository.auditEvents])).not.toContain('+7 999 123-45-67');
  });

  test('returns structured amount lease unavailable error from expected payment profile checkout', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    (
      repository as unknown as {
        saveExpectedPaymentProfile: OrderRepository['saveExpectedPaymentProfile'];
      }
    ).saveExpectedPaymentProfile = async () => ({ kind: 'amount_lease_unavailable' });
    const server = buildServer(repository);
    await createOrder(server);
    await createCardRoute(server);

    const response = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/expected-payment-profile',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        buyer_first_name: 'Ivan',
        buyer_last_name: 'Petrov',
        payment_method: 'card',
        sender_bank_id: 'sber_ru',
        sender_card_number: '4242 4242 4242 4242'
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: {
        code: 'amount_lease_unavailable',
        message: 'No payable amount is available for this checkout route right now.',
        details: {
          unavailable_reason: 'amount_lease_unavailable',
          fallback_actions: ['refresh_methods', 'return_to_merchant']
        }
      },
      official_bank_confirmation: false
    });
    expect(response.body).not.toContain('4242424242424242');
  });

  test('keeps sender bank separate from merchant receiver route and payer launcher', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createCardRoute(server);

    const profile = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/expected-payment-profile',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        buyer_first_name: 'Ivan',
        buyer_last_name: 'Petrov',
        payment_method: 'card',
        sender_bank_id: 'tbank_ru',
        sender_card_number: '4242 4242 4242 4242'
      }
    });

    expect(profile.statusCode).toBe(200);
    expect(profile.json()).toMatchObject({
      payment_method: 'card',
      sender_bank_id: 'tbank_ru',
      selected_sender_bank_id: 'tbank_ru',
      sender_bank_logo_asset_key: 'ic_bank_tbank',
      receiver_bank_logo_asset_key: 'ic_bank_sberbank',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiving_route_id: 'route_1',
      receiver_method_type: 'card',
      selected_payer_bank_launcher_id: 'tbank_ru',
      available_compatibility_pairs: [
        expect.objectContaining({
          receiving_route_id: 'route_1',
          receiver_bank_id: 'sber_ru',
          receiver_method_type: 'card',
          payer_method_type: 'card',
          sender_bank_id: 'tbank_ru',
          payer_bank_launcher_id: 'tbank_ru',
          compatibility_status: 'compatible'
        })
      ],
      official_bank_confirmation: false
    });
    expect(repository.paymentSessions.get('ps_session_01')?.senderBankId).toBe('tbank_ru');
    expect(repository.paymentSessions.get('ps_session_01')?.selectedReceiverBankId).toBe('sber_ru');
    expect(repository.paymentSessions.get('ps_session_01')?.selectedPayerBankLauncherId).toBe('tbank_ru');
  });

  test('rejects payer launcher overrides that do not match the buyer sender bank', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createCardRoute(server);

    const profile = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/expected-payment-profile',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        buyer_first_name: 'Ivan',
        buyer_last_name: 'Petrov',
        payment_method: 'card',
        sender_bank_id: 'sber_ru',
        sender_card_number: '4242 4242 4242 4242'
      }
    });
    const launcherOverride = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payer-bank-launcher',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { payer_bank_launcher_id: 'tbank_ru' }
    });

    expect(profile.statusCode).toBe(200);
    expect(launcherOverride.statusCode).toBe(409);
    expect(launcherOverride.json()).toMatchObject({
      error: {
        code: 'payer_launcher_mismatch',
        details: {
          sender_bank_id: 'sber_ru',
          payer_bank_launcher_id: 'tbank_ru'
        }
      },
      official_bank_confirmation: false
    });
    expect(repository.paymentSessions.get('ps_session_01')?.senderBankId).toBe('sber_ru');
    expect(repository.paymentSessions.get('ps_session_01')?.selectedReceiverBankId).toBe('sber_ru');
    expect(repository.paymentSessions.get('ps_session_01')?.selectedPayerBankLauncherId).toBe('sber_ru');
  });

  test('exposes active checkout payment methods and routes as backend source of truth', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await createCardRoute(server);

    const both = await server.inject({
      method: 'GET',
      url: '/v1/payment-sessions/ps_session_01',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    repository.receivingRoutes.get('route_1')!.enabled = false;
    const cardOnly = await server.inject({
      method: 'GET',
      url: '/v1/payment-sessions/ps_session_01',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    repository.receivingRoutes.get('route_2')!.enabled = false;
    const none = await server.inject({
      method: 'GET',
      url: '/v1/payment-sessions/ps_session_01',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(both.statusCode).toBe(200);
    expect(both.json()).toMatchObject({
      available_payment_methods: { card: true, sbp: true },
      available_routes: [
        expect.objectContaining({ route_id: 'route_1', method_type: 'sbp', bank_id: 'sber_ru', masked_value: '+7 *** *** **67', status: 'active' }),
        expect.objectContaining({ route_id: 'route_2', method_type: 'card', bank_id: 'sber_ru', masked_value: '2202 **** **** 7890', status: 'active' })
      ],
      official_bank_confirmation: false
    });
    expect(cardOnly.json()).toMatchObject({
      available_payment_methods: { card: true, sbp: false },
      available_routes: [expect.objectContaining({ route_id: 'route_2', method_type: 'card' })]
    });
    expect(none.json()).toMatchObject({
      available_payment_methods: { card: false, sbp: false },
      available_routes: [],
      unavailable_reason: 'merchant_no_active_receiving_method'
    });
  });

  test('does not expose certification-blocked receiving routes as checkout methods', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    repository.setBankCertification('sber_ru', 'package_validation_pending', ['sbp', 'card']);
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await createCardRoute(server);

    const response = await server.inject({
      method: 'GET',
      url: '/v1/payment-sessions/ps_session_01',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      available_payment_methods: { card: false, sbp: false },
      available_routes: [],
      unavailable_reason: 'merchant_no_active_receiving_method'
    });
  });

  test('rejects expected payment profile wrong-method raw values and card secrets', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);

    const sbpWithCard = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/expected-payment-profile',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        buyer_first_name: 'Ivan',
        buyer_last_name: 'Petrov',
        payment_method: 'sbp',
        sender_bank_id: 'sber_ru',
        sender_phone: '+7 999 123-45-67',
        sender_card_number: '4242 4242 4242 4242'
      }
    });
    const cardWithPhone = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/expected-payment-profile',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        buyer_first_name: 'Ivan',
        buyer_last_name: 'Petrov',
        payment_method: 'card',
        sender_bank_id: 'sber_ru',
        sender_card_number: '4242 4242 4242 4242',
        sender_phone: '+7 999 123-45-67'
      }
    });
    const secretUppercase = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/expected-payment-profile',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        buyer_first_name: 'Ivan',
        buyer_last_name: 'Petrov',
        payment_method: 'card',
        sender_bank_id: 'sber_ru',
        sender_card_number: '4242 4242 4242 4242',
        CVV: '123'
      }
    });
    const invalidLuhn = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/expected-payment-profile',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        buyer_first_name: 'Ivan',
        buyer_last_name: 'Petrov',
        payment_method: 'card',
        sender_bank_id: 'sber_ru',
        sender_card_number: '4242 4242 4242 4241'
      }
    });

    expect([sbpWithCard.statusCode, cardWithPhone.statusCode, secretUppercase.statusCode, invalidLuhn.statusCode]).toEqual([400, 400, 400, 400]);
    expect(secretUppercase.json().error.details).toMatchObject({ field: 'CVV' });
    expect(JSON.stringify([sbpWithCard.json(), cardWithPhone.json(), secretUppercase.json(), invalidLuhn.json(), repository.paymentSessions, repository.auditEvents])).not.toContain('4242424242424242');
  });

  test('selects receiver bank and payer launcher without confirming payment', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);

    const receiverResponse = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });
    const routeResponse = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiving_route_id: 'route_1' }
    });
    const launcherResponse = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payer-bank-launcher',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { payer_bank_launcher_id: 'tbank_ru' }
    });
    const statusResponse = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/status',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(receiverResponse.statusCode).toBe(200);
    expect(receiverResponse.json()).toMatchObject({
      selected_receiver_bank: getReceiverBankOption('sber_ru'),
      checkout_state: 'receiving_route_selection',
      buyer_safe_status: 'not_validated',
      official_bank_confirmation: false
    });
    expect(routeResponse.json()).toMatchObject({
      selected_receiving_route: expect.objectContaining({ route_id: 'route_1' }),
      checkout_state: 'payer_bank_launcher_selection',
      receiving_route_id: 'route_1'
    });
    expect(launcherResponse.statusCode).toBe(200);
    expect(launcherResponse.json()).toMatchObject({
      selected_payer_bank_launcher: getPayerBankLauncherOption('tbank_ru'),
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment',
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
    expect(statusResponse.json()).toMatchObject({
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment',
      selected_receiver_bank_id: 'sber_ru',
      selected_payer_bank_launcher_id: 'tbank_ru',
      official_bank_confirmation: false
    });
    expect(repository.paymentSessions.get('ps_session_01')?.status).toBe('created');
    expect(repository.orders.get('ord_session_01')?.status).not.toBe('manual_confirmed');
    expect(repository.auditEvents.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(['checkout.receiver_bank_selected', 'checkout.payer_bank_launcher_selected'])
    );
  });

  test('marks instructions shown and buyer claimed paid without confirming payment', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await createPhoneExpectedProfile(server);
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiving_route_id: 'route_1' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payer-bank-launcher',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { payer_bank_launcher_id: 'sber_ru' }
    });

    const instructions = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payment-instructions-shown',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const continueToBank = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/continue-to-bank',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const claimed = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/claimed-paid',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(instructions.statusCode).toBe(200);
    expect(instructions.json()).toMatchObject({
      checkout_state: 'awaiting_payment',
      buyer_safe_status: 'awaiting_payment'
    });
    expect(continueToBank.statusCode).toBe(200);
    expect(continueToBank.json()).toMatchObject({
      status: 'receiver_armed',
      receiver_status: 'armed',
      buyer_safe_status: 'awaiting_payment',
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
    expect(claimed.statusCode).toBe(202);
    expect(claimed.json()).toMatchObject({
      checkout_state: 'buyer_claimed_paid',
      buyer_safe_status: 'searching_signal',
      buyer_claimed_paid: true,
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
    expect(repository.paymentSessions.get('ps_session_01')?.status).toBe('buyer_claimed_paid');
    expect(repository.orders.get('ord_session_01')?.status).toBe('buyer_claimed_paid');
    expect(repository.orders.get('ord_session_01')?.status).not.toBe('manual_confirmed');
    expect(repository.auditEvents.map((event) => event.eventType)).toContain('checkout.continue_to_bank');
  });

  test('buyer paid claim reconciles idempotently when merchant already confirmed', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    const session = repository.paymentSessions.get('ps_session_01');
    const order = repository.orders.get('ord_session_01');
    if (!session || !order) {
      throw new Error('test session missing');
    }
    session.status = 'manual_confirmed';
    order.status = 'manual_confirmed';

    const claimed = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/claimed-paid',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(claimed.statusCode).toBe(200);
    expect(claimed.json()).toMatchObject({
      status: 'manual_confirmed',
      checkout_state: 'confirmed',
      buyer_safe_status: 'confirmed',
      claim_result: 'already_confirmed',
      buyer_claimed_paid: false,
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
    expect(repository.paymentSessions.get('ps_session_01')?.status).toBe('manual_confirmed');
    expect(repository.orders.get('ord_session_01')?.status).toBe('manual_confirmed');
  });

  test('buyer paid claim reconciles rejected and expired final states without reopening review', async () => {
    for (const finalStatus of ['rejected', 'expired'] as const) {
      const repository = new InMemoryPaymentSessionRepository();
      const server = buildServer(repository);
      await createOrder(server);
      const session = repository.paymentSessions.get('ps_session_01');
      const order = repository.orders.get('ord_session_01');
      if (!session || !order) {
        throw new Error('test session missing');
      }
      session.status = finalStatus;
      order.status = finalStatus;

      const claimed = await server.inject({
        method: 'POST',
        url: '/v1/checkout/ps_session_01/claimed-paid',
        headers: { authorization: 'Bearer test_mch_01' }
      });

      expect(claimed.statusCode).toBe(200);
      expect(claimed.json()).toMatchObject({
        status: finalStatus,
        checkout_state: finalStatus,
        buyer_safe_status: finalStatus,
        claim_result: finalStatus === 'rejected' ? 'already_rejected' : 'already_expired',
        buyer_claimed_paid: false,
        does_not_confirm_payment: true,
        official_bank_confirmation: false
      });
      expect(repository.paymentSessions.get('ps_session_01')?.status).toBe(finalStatus);
      expect(repository.orders.get('ord_session_01')?.status).toBe(finalStatus);
    }
  });

  test('duplicate buyer paid claim is idempotent and does not emit a second state change', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    const session = repository.paymentSessions.get('ps_session_01');
    const order = repository.orders.get('ord_session_01');
    if (!session || !order) {
      throw new Error('test session missing');
    }
    session.status = 'buyer_claimed_paid';
    session.buyerClaimedPaidAt = '2026-05-02T10:02:00.000Z';
    order.status = 'buyer_claimed_paid';

    const claimed = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/claimed-paid',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(claimed.statusCode).toBe(202);
    expect(claimed.json()).toMatchObject({
      status: 'buyer_claimed_paid',
      checkout_state: 'buyer_claimed_paid',
      buyer_safe_status: 'searching_signal',
      claim_result: 'claim_recorded',
      buyer_claimed_paid: true,
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
    expect(repository.auditEvents.filter((event) => event.eventType === 'checkout.buyer_claimed_paid')).toHaveLength(0);
  });

  test('duplicate buyer paid claim during merchant review is idempotent and preserves review state', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    const session = repository.paymentSessions.get('ps_session_01');
    const order = repository.orders.get('ord_session_01');
    if (!session || !order) {
      throw new Error('test session missing');
    }
    session.status = 'needs_review';
    session.buyerClaimedPaidAt = '2026-05-02T10:02:00.000Z';
    order.status = 'needs_review';

    const claimed = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/claimed-paid',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(claimed.statusCode).toBe(202);
    expect(claimed.json()).toMatchObject({
      status: 'needs_review',
      checkout_state: 'needs_review',
      buyer_safe_status: 'needs_review',
      claim_result: 'pending_review',
      buyer_claimed_paid: true,
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
    expect(repository.auditEvents.filter((event) => event.eventType === 'checkout.buyer_claimed_paid')).toHaveLength(0);
  });

  test('checkout status endpoint exposes merchant manual confirmation as buyer-safe confirmed', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    const session = repository.paymentSessions.get('ps_session_01');
    const order = repository.orders.get('ord_session_01');
    if (!session || !order) {
      throw new Error('test session missing');
    }
    session.status = 'manual_confirmed';
    order.status = 'manual_confirmed';

    const response = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/status'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json()).toMatchObject({
      payment_session_id: 'ps_session_01',
      order_id: 'ord_session_01',
      status: 'manual_confirmed',
      checkout_state: 'confirmed',
      buyer_safe_status: 'confirmed',
      receiver_status: 'complete',
      official_bank_confirmation: false
    });
    expect(response.body).not.toContain('bank_confirmed');
  });

  test('checkout status endpoint exposes merchant rejection as buyer-safe rejected', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    const session = repository.paymentSessions.get('ps_session_01');
    const order = repository.orders.get('ord_session_01');
    if (!session || !order) {
      throw new Error('test session missing');
    }
    session.status = 'rejected';
    order.status = 'rejected';

    const response = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/status'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      payment_session_id: 'ps_session_01',
      order_id: 'ord_session_01',
      status: 'rejected',
      checkout_state: 'rejected',
      buyer_safe_status: 'rejected',
      official_bank_confirmation: false
    });
  });

  test('rejects buyer credentials on checkout actions outside Step 1', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await createPhoneExpectedProfile(server);
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiving_route_id: 'route_1' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payer-bank-launcher',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { payer_bank_launcher_id: 'sber_ru' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payment-instructions-shown',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    const continueWithPan = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/continue-to-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { sender_card_number: '4242 4242 4242 4242' }
    });
    const claimedWithPhone = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/claimed-paid',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { nested: { sender_phone: '+7 999 123-45-67' } }
    });

    expect(continueWithPan.statusCode).toBe(400);
    expect(continueWithPan.json().error.details).toMatchObject({ field: 'sender_card_number' });
    expect(claimedWithPhone.statusCode).toBe(400);
    expect(claimedWithPhone.json().error.details).toMatchObject({ field: 'sender_phone' });
    expect(JSON.stringify([continueWithPan.json(), claimedWithPhone.json(), repository.auditEvents])).not.toContain('4242424242424242');
    expect(JSON.stringify([continueWithPan.json(), claimedWithPhone.json(), repository.auditEvents])).not.toContain('+79991234567');
    expect(repository.orders.get('ord_session_01')?.status).not.toBe('manual_confirmed');
  });

  test('rejects receiver arming when the selected receiving route is no longer active', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await createPhoneExpectedProfile(server);
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiving_route_id: 'route_1' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payer-bank-launcher',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { payer_bank_launcher_id: 'sber_ru' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payment-instructions-shown',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const route = repository.receivingRoutes.get('route_1');
    if (!route) {
      throw new Error('test route missing');
    }
    route.enabled = false;

    const response = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/continue-to-bank',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: {
        code: 'receiving_route_unavailable',
        details: {
          payment_method: 'sbp',
          receiving_route_id: 'route_1'
        }
      }
    });
    expect(repository.paymentSessions.get('ps_session_01')?.status).toBe('receiver_arming');
    expect(repository.orders.get('ord_session_01')?.status).not.toBe('receiver_armed');
  });

  test('locks the selected route at instructions and allows a pending-disable route to continue for the locked session', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await createPhoneExpectedProfile(server);

    const instructions = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payment-instructions-shown',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const disabled = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-methods/route_1/disable',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const hiddenFromNewSessions = await repository.listReceiverBanksForCheckout('mch_01', 'ps_new_session');
    const copyDetails = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/receiving-route/copy-details',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const continueToBank = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/continue-to-bank',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(instructions.statusCode).toBe(200);
    expect(instructions.json()).toMatchObject({
      route_lock_expires_at: '2026-05-02T10:15:00.000Z',
      selected_receiving_route_id: 'route_1'
    });
    expect(disabled.statusCode).toBe(200);
    expect(disabled.json()).toMatchObject({
      method: {
        id: 'route_1',
        status: 'pending_disable',
        lifecycle_status: 'pending_disable'
      }
    });
    expect(hiddenFromNewSessions).toEqual([]);
    expect(copyDetails.statusCode).toBe(200);
    expect(continueToBank.statusCode).toBe(200);
    expect(continueToBank.json()).toMatchObject({
      status: 'receiver_armed',
      receiver_status: 'armed',
      does_not_confirm_payment: true,
      official_bank_confirmation: false
    });
  });

  test('disables a selected route immediately before Step 2 lock and returns actionable fallback', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await createPhoneExpectedProfile(server);

    const disabled = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-methods/route_1/disable',
      headers: { authorization: 'Bearer test_mch_01' }
    });
    const instructions = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payment-instructions-shown',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(disabled.statusCode).toBe(200);
    expect(disabled.json()).toMatchObject({
      method: {
        id: 'route_1',
        status: 'inactive',
        lifecycle_status: 'disabled'
      }
    });
    expect(instructions.statusCode).toBe(409);
    expect(instructions.json()).toMatchObject({
      error: {
        code: 'receiving_route_unavailable',
        details: {
          payment_method: 'sbp',
          receiving_route_id: 'route_1',
          unavailable_reason: 'route_disabled',
          fallback_actions: ['refresh_methods', 'return_to_merchant']
        }
      },
      official_bank_confirmation: false
    });
    expect(repository.paymentSessions.get('ps_session_01')?.status).toBe('receiver_arming');
    expect(repository.orders.get('ord_session_01')?.status).not.toBe('payment_instructions_shown');
  });

  test('revoked locked route blocks receiver arming with structured fallback', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await createPhoneExpectedProfile(server);
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payment-instructions-shown',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    const revoked = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-methods/route_1/revoke',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { reason: 'receiver destination compromised' }
    });
    const continueToBank = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/continue-to-bank',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(revoked.statusCode).toBe(200);
    expect(revoked.json()).toMatchObject({
      method: {
        id: 'route_1',
        status: 'revoked',
        lifecycle_status: 'revoked'
      }
    });
    expect(continueToBank.statusCode).toBe(409);
    expect(continueToBank.json()).toMatchObject({
      error: {
        code: 'receiving_route_unavailable',
        details: {
          unavailable_reason: 'route_revoked',
          receiving_route_id: 'route_1',
          fallback_actions: ['refresh_methods', 'return_to_merchant']
        }
      },
      official_bank_confirmation: false
    });
    expect(repository.paymentSessions.get('ps_session_01')?.status).toBe('receiver_arming');
    expect(repository.orders.get('ord_session_01')?.status).not.toBe('receiver_armed');
  });

  test('rejects buyer paid claim before the receiver is armed', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    await createOrder(server);
    await createPhoneRoute(server);
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiving-route',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiving_route_id: 'route_1' }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/payer-bank-launcher',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { payer_bank_launcher_id: 'tbank_ru' }
    });

    const claimed = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/claimed-paid',
      headers: { authorization: 'Bearer test_mch_01' }
    });

    expect(claimed.statusCode).toBe(409);
    expect(claimed.json()).toMatchObject({
      error: {
        code: 'checkout_step_out_of_order',
        details: { current_status: 'created' }
      }
    });
    expect(repository.orders.get('ord_session_01')?.status).not.toBe('manual_confirmed');
  });

  test('rejects checkout mutations after expiry', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const createServer = buildServer(repository, '2026-05-02T10:00:00.000Z');
    await createOrder(createServer);

    const readServer = buildServer(repository, '2026-05-02T10:16:00.000Z');
    const response = await readServer.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/receiver-bank',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { receiver_bank_id: 'sber_ru' }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: {
        code: 'checkout_session_expired'
      }
    });
  });
});

describe('West Africa mobile money receiving methods (end-to-end create paths)', () => {
  test('low-level receiving-routes endpoint creates a mobile_money WA route', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    const response = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        bank_profile_id: 'wave_ci',
        rail_type: 'mobile_money',
        receiver_identifier: '+225 07 12 34 56',
        route_code: 'WAVE-CI',
        display_label: 'Wave Côte d\'Ivoire'
      }
    });
    expect(response.statusCode).toBe(201);
    const route = response.json().route;
    expect(route.rail_type).toBe('mobile_money');
    expect(route.receiver_identifier_type).toBe('phone');
    expect(route.receiver_identifier_last4).toBe('3456');
    expect(route.receiver_identifier_masked).not.toContain('225');
    expect(JSON.stringify(response.json())).not.toContain('22507123456');
  });

  test('high-level receiving-methods endpoint accepts type mobile_money', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    const response = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-methods',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        type: 'mobile_money',
        bank_id: 'orange_money_ci',
        value: '+225 07 98 76 54'
      }
    });
    expect(response.statusCode).toBe(201);
  });

  test('rejects mobile_money on a Russian profile', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository);
    const response = await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        bank_profile_id: 'sber_ru',
        rail_type: 'mobile_money',
        receiver_identifier: '+221 77 123 45 67',
        route_code: 'BAD-MM',
        display_label: 'Bad'
      }
    });
    expect(response.statusCode).toBe(400);
  });
});

describe('payer bank launchers stay symmetric with the session currency', () => {
  function sessionWithCurrency(currency: string): StoredPaymentSessionRecord {
    return { id: 'ps_currency_probe', currency } as unknown as StoredPaymentSessionRecord;
  }

  test('XOF session exposes only West Africa payer launchers', () => {
    const ids = toPayerBankLaunchersResponse(sessionWithCurrency('XOF')).payer_bank_launchers.map(
      (launcher) => launcher.payer_bank_launcher_id
    );
    expect(ids).toContain('wave_ci');
    expect(ids).toContain('orange_money_ci');
    expect(ids).not.toContain('sber_ru');
  });

  test('RUB session exposes only Russian payer launchers', () => {
    const ids = toPayerBankLaunchersResponse(sessionWithCurrency('RUB')).payer_bank_launchers.map(
      (launcher) => launcher.payer_bank_launcher_id
    );
    expect(ids).toContain('sber_ru');
    expect(ids).not.toContain('wave_ci');
  });
});

// ---------------------------------------------------------------------------
// Currency-first checkout — payable-currencies + currency-selection endpoints
// ---------------------------------------------------------------------------

describe('payable-currencies endpoint', () => {
  /** FX stub that returns a fixed rate for any pair. */
  function makeFxStub(rate = 1.085): NonNullable<Parameters<typeof buildApiServer>[0]['fxRateService']> {
    return {
      quoteToUsd: async () => ({ kind: 'unavailable' as const, reason: 'fx_rate_unavailable' as const }),
      quote: async (_src: unknown, _tgt: unknown, amountMinor: unknown) => ({
        kind: 'ok' as const,
        quote: {
          rate: String(rate),
          rateTimestamp: '2026-06-06T10:00:00.000Z',
          amountMinorTarget: Math.round((amountMinor as number) * rate),
          source: 'ecb' as const
        }
      })
    };
  }

  async function setupMultiCurrencyMerchant() {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository, '2026-06-06T10:00:00.000Z', undefined, makeFxStub());

    // Add a RUB route (sber_ru → RUB)
    await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        bank_profile_id: 'sber_ru',
        rail_type: 'phone_transfer',
        receiver_identifier: '+7 (999) 111-11-11',
        route_code: 'SBER-PHONE',
        display_label: 'Sberbank',
        recommended: true
      }
    });

    // Add a USD route (wise_int → USD)
    await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        bank_profile_id: 'wise_int',
        rail_type: 'wallet_transfer',
        receiver_identifier: 'john@example.com',
        route_code: 'WISE-EMAIL',
        display_label: 'Wise',
        recommended: false
      }
    });

    // Create order in RUB
    await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        external_id: 'order_mc_01',
        amount: { value: '100.00', currency: 'RUB' },
        expires_in_seconds: 900
      }
    });

    return { server, repository };
  }

  test('GET /payable-currencies lists quoted candidates and flags current', async () => {
    const { server } = await setupMultiCurrencyMerchant();
    const response = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/payable-currencies'
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.currencies).toBeInstanceOf(Array);

    // Current currency (RUB) must be present with is_current: true
    const rubEntry = body.currencies.find((c: { currency: string }) => c.currency === 'RUB');
    expect(rubEntry).toBeDefined();
    expect(rubEntry.is_current).toBe(true);
    expect(rubEntry.amount_minor).toBeDefined();
    // No quote block on current currency
    expect(rubEntry.quote).toBeUndefined();

    // USD must be present with quote block
    const usdEntry = body.currencies.find((c: { currency: string }) => c.currency === 'USD');
    expect(usdEntry).toBeDefined();
    expect(usdEntry.is_current).toBe(false);
    expect(usdEntry.quote).toMatchObject({
      rate: expect.any(String),
      source: 'ecb',
      base_currency: 'RUB',
      base_amount_minor: expect.any(Number)
    });
    expect(usdEntry.formatted).toMatch(/^\d/u); // has digits
  });

  test('GET /payable-currencies omits unavailable FX candidates silently', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    // FX stub returns unavailable for all pairs
    const alwaysFailFx: NonNullable<Parameters<typeof buildApiServer>[0]['fxRateService']> = {
      quoteToUsd: async () => ({ kind: 'unavailable' as const, reason: 'fx_rate_unavailable' as const }),
      quote: async () => ({ kind: 'unavailable' as const, reason: 'fx_rate_unavailable' as const })
    };
    const server = buildServer(repository, '2026-06-06T10:00:00.000Z', undefined, alwaysFailFx);

    await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { bank_profile_id: 'sber_ru', rail_type: 'phone_transfer', receiver_identifier: '+7 (999) 111-11-11', route_code: 'SBER-PHONE', display_label: 'Sberbank', recommended: true }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { bank_profile_id: 'wise_int', rail_type: 'wallet_transfer', receiver_identifier: 'john@example.com', route_code: 'WISE-EMAIL', display_label: 'Wise', recommended: false }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { external_id: 'order_mc_02', amount: { value: '100.00', currency: 'RUB' }, expires_in_seconds: 900 }
    });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/payable-currencies'
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    // RUB (current) always included; USD omitted due to FX unavailable
    expect(body.currencies).toHaveLength(1);
    expect(body.currencies[0].currency).toBe('RUB');
    expect(body.currencies[0].is_current).toBe(true);
  });

  test('POST /v1/checkout/:id/currency happy path requotes session', async () => {
    const { server, repository } = await setupMultiCurrencyMerchant();

    const response = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/currency',
      payload: { currency: 'USD' }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.checkout_state).toBeDefined();
    expect(body.amount.currency).toBe('USD');

    // Repository reflects the new currency
    const session = repository.paymentSessions.get('ps_session_01');
    expect(session?.currency).toBe('USD');
    expect(session?.currencySelectedAt).toBeDefined();
    expect(session?.baseCurrency).toBe('RUB');

    // Audit event recorded
    expect(repository.auditEvents.some((e) => e.eventType === 'payment_session.currency_selected')).toBe(true);
  });

  test('POST /v1/checkout/:id/currency with currency_not_payable returns 400', async () => {
    const { server } = await setupMultiCurrencyMerchant();

    const response = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/currency',
      payload: { currency: 'EUR' }  // Not in merchant's receivable_currencies
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('currency_not_payable');
  });

  test('POST /v1/checkout/:id/currency after route lock returns 409 route_already_locked', async () => {
    const { server, repository } = await setupMultiCurrencyMerchant();

    // Lock a route on the session manually
    const session = repository.paymentSessions.get('ps_session_01');
    if (session) {
      session.selectedReceivingRouteId = 'route_1';
    }

    const response = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/currency',
      payload: { currency: 'USD' }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('route_already_locked');
  });

  test('POST /v1/checkout/:id/currency with FX unavailable returns 409 fx_rate_unavailable', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const alwaysFailFx: NonNullable<Parameters<typeof buildApiServer>[0]['fxRateService']> = {
      quoteToUsd: async () => ({ kind: 'unavailable' as const, reason: 'fx_rate_unavailable' as const }),
      quote: async () => ({ kind: 'unavailable' as const, reason: 'fx_rate_unavailable' as const })
    };
    const server = buildServer(repository, '2026-06-06T10:00:00.000Z', undefined, alwaysFailFx);

    await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { bank_profile_id: 'sber_ru', rail_type: 'phone_transfer', receiver_identifier: '+7 (999) 111-11-11', route_code: 'SBER-PHONE', display_label: 'Sberbank', recommended: true }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { bank_profile_id: 'wise_int', rail_type: 'wallet_transfer', receiver_identifier: 'john@example.com', route_code: 'WISE-EMAIL', display_label: 'Wise', recommended: false }
    });
    await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: { external_id: 'order_mc_03', amount: { value: '100.00', currency: 'RUB' }, expires_in_seconds: 900 }
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/currency',
      payload: { currency: 'USD' }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('fx_rate_unavailable');
  });

  test('POST /v1/checkout/:id/currency identity selection (same currency) marks currency_selected_at', async () => {
    const { server, repository } = await setupMultiCurrencyMerchant();

    const response = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/currency',
      payload: { currency: 'RUB' }  // Same as current
    });

    expect(response.statusCode).toBe(200);
    const session = repository.paymentSessions.get('ps_session_01');
    expect(session?.currencySelectedAt).toBeDefined();
    // Currency unchanged
    expect(session?.currency).toBe('RUB');
  });

  test('checkout_state is currency_selection when multi-currency and nothing selected', async () => {
    const { server } = await setupMultiCurrencyMerchant();

    const response = await server.inject({
      method: 'GET',
      url: '/v1/checkout/ps_session_01/status'
    });

    expect(response.statusCode).toBe(200);
    // With 2 receivable currencies (RUB + USD) and no selection, state should be currency_selection
    // (after buyer_identity — since no payment method has been set)
    // Actually without a payment method we stay at buyer_identity first. Let's verify the state.
    const body = response.json();
    expect(body.checkout_state).toBeDefined();
    // The state is buyer_identity (no payment method set yet), not currency_selection.
    // currency_selection only triggers once past buyer_identity.
    expect(body.checkout_state).toBe('buyer_identity');
  });

  // ---------------------------------------------------------------------------
  // Minor finding 10: GET /v1/payment-sessions/:id must surface currency_selection
  // ---------------------------------------------------------------------------

  test('GET /v1/payment-sessions/:id returns currency_selection after buyer_identity (RUB sber_ru + XOF orange_money_ci)', async () => {
    // Build a merchant with two routes spanning two receivable currencies:
    //   sber_ru    → phone_transfer → RUB
    //   orange_money_ci → mobile_money → XOF
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository, '2026-06-06T10:00:00.000Z', undefined, makeFxStub());

    // Register sber_ru phone route (RUB)
    await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        bank_profile_id: 'sber_ru',
        rail_type: 'phone_transfer',
        receiver_identifier: '+7 (999) 111-11-11',
        route_code: 'SBER-PHONE-MCF',
        display_label: 'Sberbank',
        recommended: true
      }
    });

    // Register orange_money_ci mobile_money route (XOF)
    await server.inject({
      method: 'POST',
      url: '/v1/merchant/receiving-routes',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        bank_profile_id: 'orange_money_ci',
        rail_type: 'mobile_money',
        receiver_identifier: '+225 07 123 45 67',
        route_code: 'OM-CI-MCF',
        display_label: 'Orange Money',
        recommended: false
      }
    });

    // Create an order in RUB
    await server.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: 'Bearer test_mch_01' },
      payload: {
        external_id: 'order_mc_10',
        amount: { value: '100.00', currency: 'RUB' },
        expires_in_seconds: 900
      }
    });

    // At this point the session is at buyer_identity (no paymentMethod, no bank selected).
    const beforeIdentity = await server.inject({ method: 'GET', url: '/v1/payment-sessions/ps_session_01' });
    expect(beforeIdentity.statusCode).toBe(200);
    expect(beforeIdentity.json().checkout_state).toBe('buyer_identity');

    // Advance past buyer_identity: set paymentMethod without selecting a receiver bank.
    // This mirrors what happens when a buyer chooses a payment method but the merchant
    // serves multiple currencies — the currency picker must be shown next.
    repository.paymentSessions.get('ps_session_01')!.paymentMethod = 'sbp';

    // Primary assertion: GET /v1/payment-sessions/:id now returns currency_selection.
    const afterIdentity = await server.inject({ method: 'GET', url: '/v1/payment-sessions/ps_session_01' });
    expect(afterIdentity.statusCode).toBe(200);
    expect(afterIdentity.json().checkout_state).toBe('currency_selection');

    // After POST /v1/checkout/:id/currency (identity selection — keep RUB),
    // currencySelectedAt is stamped and the state should advance to receiver_bank_selection.
    const currencySelect = await server.inject({
      method: 'POST',
      url: '/v1/checkout/ps_session_01/currency',
      payload: { currency: 'RUB' }
    });
    expect(currencySelect.statusCode).toBe(200);

    const afterCurrency = await server.inject({ method: 'GET', url: '/v1/payment-sessions/ps_session_01' });
    expect(afterCurrency.statusCode).toBe(200);
    expect(afterCurrency.json().checkout_state).toBe('receiver_bank_selection');
  });
});

// ---------------------------------------------------------------------------
// Merchant FX rates endpoint — live reference rates for the comparison screen
// ---------------------------------------------------------------------------

describe('fx rates endpoint', () => {
  /** FX stub: fixed rate for any pair, but XOF target unavailable (to prove honesty). */
  function makeFxStub(): NonNullable<Parameters<typeof buildApiServer>[0]['fxRateService']> {
    return {
      quoteToUsd: async () => ({ kind: 'unavailable' as const, reason: 'fx_rate_unavailable' as const }),
      quote: async (_src: unknown, tgt: unknown, amountMinor: unknown) => {
        if ((tgt as string).toUpperCase() === 'XOF') {
          return { kind: 'unavailable' as const, reason: 'fx_rate_unavailable' as const };
        }
        const rate = 88.4;
        return {
          kind: 'ok' as const,
          quote: {
            rate: String(rate),
            rateTimestamp: '2026-06-13T08:00:00.000Z',
            amountMinorTarget: Math.round((amountMinor as number) * rate),
            source: 'cbr' as const
          }
        };
      }
    };
  }

  test('GET /v1/fx/rates returns per-currency rates, excludes the base, never invents an unavailable pair', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository, '2026-06-13T10:00:00.000Z', undefined, makeFxStub());

    const response = await server.inject({ method: 'GET', url: '/v1/fx/rates?base=USD' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.base).toBe('USD');
    expect(body.rates).toBeInstanceOf(Array);

    // The base must NOT appear as one of the comparison rows.
    expect(body.rates.find((r: { currency: string }) => r.currency === 'USD')).toBeUndefined();

    // RUB available with a real rate + source + timestamp.
    const rub = body.rates.find((r: { currency: string }) => r.currency === 'RUB');
    expect(rub).toBeDefined();
    expect(rub.available).toBe(true);
    expect(rub.rate).toBe('88.4');
    expect(rub.source).toBe('cbr');
    expect(rub.rate_timestamp).toBe('2026-06-13T08:00:00.000Z');

    // XOF unavailable → reported honestly (available:false, null rate), never omitted.
    const xof = body.rates.find((r: { currency: string }) => r.currency === 'XOF');
    expect(xof).toBeDefined();
    expect(xof.available).toBe(false);
    expect(xof.rate).toBeNull();
  });

  test('GET /v1/fx/rates accepts a base override and falls back to USD on an unknown base', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository, '2026-06-13T10:00:00.000Z', undefined, makeFxStub());

    const eur = await server.inject({ method: 'GET', url: '/v1/fx/rates?base=EUR' });
    expect(eur.statusCode).toBe(200);
    expect(eur.json().base).toBe('EUR');
    // The chosen base is excluded from its own comparison rows.
    expect(eur.json().rates.find((r: { currency: string }) => r.currency === 'EUR')).toBeUndefined();

    const unknown = await server.inject({ method: 'GET', url: '/v1/fx/rates?base=ZZZ' });
    expect(unknown.statusCode).toBe(200);
    expect(unknown.json().base).toBe('USD');
  });

  test('GET /v1/fx/rates degrades gracefully (all unavailable) when no FX service is configured', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository, '2026-06-13T10:00:00.000Z', undefined, null);

    const response = await server.inject({ method: 'GET', url: '/v1/fx/rates?base=USD' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.rates.length).toBeGreaterThan(0);
    expect(body.rates.every((r: { available: boolean }) => r.available === false)).toBe(true);
  });
});

describe('cost oracle endpoint', () => {
  /** FX stub: USD/EUR → XOF at 600, with proper minor-digit scaling; other targets unavailable. */
  function makeCostFxStub(): NonNullable<Parameters<typeof buildApiServer>[0]['fxRateService']> {
    return {
      quoteToUsd: async () => ({ kind: 'unavailable' as const, reason: 'fx_rate_unavailable' as const }),
      quote: async (_src: unknown, tgt: unknown, amountMinor: unknown, srcDigits: unknown, tgtDigits: unknown) => {
        if ((tgt as string).toUpperCase() !== 'XOF') {
          return { kind: 'unavailable' as const, reason: 'fx_rate_unavailable' as const };
        }
        const rate = 600;
        const fd = (srcDigits as number) ?? 2;
        const td = (tgtDigits as number) ?? 0;
        const target = Math.round((amountMinor as number) * rate * (10 ** td / 10 ** fd));
        if (target <= 0) return { kind: 'unavailable' as const, reason: 'fx_rate_unavailable' as const };
        return {
          kind: 'ok' as const,
          quote: { rate: String(rate), rateTimestamp: '2026-06-16T08:00:00.000Z', amountMinorTarget: target, source: 'ecb+uemoa_peg' as const }
        };
      }
    };
  }

  test('GET /v1/cost/quote composes an honest end-to-end quote for an active corridor', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository, '2026-06-16T10:00:00.000Z', undefined, makeCostFxStub());

    const response = await server.inject({ method: 'GET', url: '/v1/cost/quote?from=USD&to=XOF&amount=100' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.available).toBe(true);
    expect(body.reference_amount_minor).toBe(60_000); // 100 USD @ 600
    expect(body.total_cost_minor).toBe(202);          // network 2 + 2% ramp (200)
    expect(body.amount_delivered_minor).toBe(58_788); // (10000-202) @ 600 / 100
    expect(body.legs.map((l: { kind: string }) => l.kind)).toEqual(['fx', 'network', 'ramp']);
    expect(body.legs.find((l: { kind: string }) => l.kind === 'fx').source).toBe('ecb+uemoa_peg');
    expect(Array.isArray(body.caveats)).toBe(true);
  });

  test('GET /v1/cost/quote rejects an inactive corridor honestly — RUB never resolves', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository, '2026-06-16T10:00:00.000Z', undefined, makeCostFxStub());

    const response = await server.inject({ method: 'GET', url: '/v1/cost/quote?from=RUB&to=XOF&amount=100' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.available).toBe(false);
    expect(body.reason).toBe('corridor_not_active');
    expect(body.active_corridors.some((c: { from: string; to: string }) => c.from === 'RUB' || c.to === 'RUB')).toBe(false);
  });

  test('GET /v1/cost/quote rejects an invalid amount with 400', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository, '2026-06-16T10:00:00.000Z', undefined, makeCostFxStub());

    const response = await server.inject({ method: 'GET', url: '/v1/cost/quote?from=USD&to=XOF' });
    expect(response.statusCode).toBe(400);
  });

  test('GET /v1/cost/quote degrades to partial (available:false) when no FX service is configured', async () => {
    const repository = new InMemoryPaymentSessionRepository();
    const server = buildServer(repository, '2026-06-16T10:00:00.000Z', undefined, null);

    const response = await server.inject({ method: 'GET', url: '/v1/cost/quote?from=USD&to=XOF&amount=100' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.available).toBe(false);
    expect(body.legs.find((l: { kind: string }) => l.kind === 'fx').available).toBe(false);
  });
});

describe('settlement orders endpoint (SDK payment flow)', () => {
  function makeBridgeFxStub(): NonNullable<Parameters<typeof buildApiServer>[0]['fxRateService']> {
    return {
      quoteToUsd: async () => ({ kind: 'unavailable' as const, reason: 'fx_rate_unavailable' as const }),
      quote: async (_src: unknown, tgt: unknown, amountMinor: unknown, srcDigits: unknown, tgtDigits: unknown) => {
        if ((tgt as string).toUpperCase() !== 'XOF') return { kind: 'unavailable' as const, reason: 'fx_rate_unavailable' as const };
        const rate = 600;
        const target = Math.round((amountMinor as number) * rate * (10 ** ((tgtDigits as number) ?? 0) / 10 ** ((srcDigits as number) ?? 2)));
        return { kind: 'ok' as const, quote: { rate: String(rate), rateTimestamp: '2026-06-16T08:00:00.000Z', amountMinorTarget: target, source: 'ecb+uemoa_peg' as const } };
      }
    };
  }

  const auth = (token = 'test_mch_01') => ({ authorization: `Bearer ${token}` });
  const directBody = (extra: Record<string, unknown> = {}) => ({
    amount_minor: 200,
    currency_in: 'USDT',
    currency_out: 'USDT',
    beneficiaries: [{ id: 'b1', method: 'mobile_money', share_bps: 10_000 }],
    ...extra
  });

  test('POST /v1/settlement/orders requires a merchant bearer token', async () => {
    const server = buildServer(new InMemoryPaymentSessionRepository(), '2026-06-16T10:00:00.000Z', undefined, null);
    const res = await server.inject({ method: 'POST', url: '/v1/settlement/orders', payload: directBody() });
    expect(res.statusCode).toBe(401);
  });

  test('POST /v1/settlement/orders rejects an invalid body', async () => {
    const server = buildServer(new InMemoryPaymentSessionRepository(), '2026-06-16T10:00:00.000Z', undefined, null);
    const res = await server.inject({ method: 'POST', url: '/v1/settlement/orders', headers: auth(), payload: { currency_in: 'USDT' } });
    expect(res.statusCode).toBe(400);
  });

  test('POST drives a direct order to RECONCILED, honestly labelled simulated', async () => {
    const server = buildServer(new InMemoryPaymentSessionRepository(), '2026-06-16T10:00:00.000Z', undefined, null);
    const res = await server.inject({ method: 'POST', url: '/v1/settlement/orders', headers: auth(), payload: directBody() });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.simulation).toBe(true);
    expect(body.rail_mode).toBe('simulated');
    expect(body.order.state).toBe('RECONCILED');
    expect(body.order.payer.id).toBe('mch_01');
    expect(body.settlement.reconciled).toBe(true);
    expect(body.settlement.conservation_ok).toBe(true);
    expect(body.settlement.pending_leg_ids).toEqual([]);
  });

  test('POST shards via the swarm and still reconciles', async () => {
    const server = buildServer(new InMemoryPaymentSessionRepository(), '2026-06-16T10:00:00.000Z', undefined, null);
    const res = await server.inject({ method: 'POST', url: '/v1/settlement/orders', headers: auth(), payload: directBody({ technical_cap_minor: 50 }) });
    expect(res.statusCode).toBe(201);
    expect(res.json().order.state).toBe('RECONCILED');
    expect(res.json().settlement.conservation_ok).toBe(true);
  });

  test('POST returns the order in REJECTED when a rule denies it', async () => {
    const server = buildServer(new InMemoryPaymentSessionRepository(), '2026-06-16T10:00:00.000Z', undefined, null);
    const res = await server.inject({ method: 'POST', url: '/v1/settlement/orders', headers: auth(), payload: directBody({ rules: { max_amount_minor: 50 } }) });
    expect(res.statusCode).toBe(201);
    expect(res.json().order.state).toBe('REJECTED');
  });

  test('GET returns the order to its owner and 404s for everyone else', async () => {
    const server = buildServer(new InMemoryPaymentSessionRepository(), '2026-06-16T10:00:00.000Z', undefined, null);
    const created = await server.inject({ method: 'POST', url: '/v1/settlement/orders', headers: auth(), payload: directBody() });
    const id = created.json().order.id;

    const owner = await server.inject({ method: 'GET', url: `/v1/settlement/orders/${id}`, headers: auth() });
    expect(owner.statusCode).toBe(200);
    expect(owner.json().order.id).toBe(id);

    const stranger = await server.inject({ method: 'GET', url: `/v1/settlement/orders/${id}`, headers: auth('test_other') });
    expect(stranger.statusCode).toBe(404);
  });

  test('POST bridges a cross-currency order via the FX converter (USD→XOF)', async () => {
    const server = buildServer(new InMemoryPaymentSessionRepository(), '2026-06-16T10:00:00.000Z', undefined, makeBridgeFxStub());
    const res = await server.inject({
      method: 'POST',
      url: '/v1/settlement/orders',
      headers: auth(),
      payload: { amount_minor: 10_000, currency_in: 'USD', currency_out: 'XOF', beneficiaries: [{ id: 'b1', method: 'mobile_money', share_bps: 10_000 }] }
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.order.channel).toBe('bridge');
    expect(body.order.state).toBe('RECONCILED');
    expect(body.settlement.conservation_ok).toBe(true);
  });
});

describe('crypto pilot intents endpoint (non-custodial, x402)', () => {
  const TOKEN: TokenConfig = { symbol: 'USDC', address: '0x2222222222222222222222222222222222222222', decimals: 6, chain: 'base-sepolia' };
  const MERCHANT_ADDR = '0x1111111111111111111111111111111111111111';
  const auth = { authorization: 'Bearer test_mch_01' };
  const usdBody = { price_currency: 'USD', price_amount_minor: 10_000, merchant_address: MERCHANT_ADDR, payer_type: 'agent_ai' };

  function build(reader: InMemoryChainReader) {
    return buildServer(new InMemoryPaymentSessionRepository(), '2026-06-16T10:00:00.000Z', undefined, null, {
      cryptoPilotChainReader: reader,
      cryptoPilotToken: TOKEN,
    });
  }

  test('POST /v1/intents requires a merchant bearer token', async () => {
    const server = build(new InMemoryChainReader({ block: 100 }));
    expect((await server.inject({ method: 'POST', url: '/v1/intents', payload: usdBody })).statusCode).toBe(401);
  });

  test('POST creates a non-custodial intent (USD price → USDC base units)', async () => {
    const server = build(new InMemoryChainReader({ block: 100 }));
    const res = await server.inject({ method: 'POST', url: '/v1/intents', headers: auth, payload: usdBody });
    expect(res.statusCode).toBe(201);
    const b = res.json();
    expect(b.custody).toBe('non_custodial');
    expect(b.amount_base_units).toBe(100_000_000); // $100 → 100 USDC (6 decimals)
    expect(b.to).toBe(MERCHANT_ADDR);
    expect(b.state).toBe('AWAITING_PAYMENT');
  });

  test('GET is real x402: 402 while awaiting, 200 once the payer transfer confirms', async () => {
    const reader = new InMemoryChainReader({ block: 100 });
    const server = build(reader);
    const id = (await server.inject({ method: 'POST', url: '/v1/intents', headers: auth, payload: usdBody })).json().intent_id;

    const awaiting = await server.inject({ method: 'GET', url: `/v1/intents/${id}` });
    expect(awaiting.statusCode).toBe(402); // Payment Required
    expect(awaiting.json().state).toBe('AWAITING_PAYMENT');

    // Payer pays the merchant DIRECTLY; block advances past the confirmation depth (2).
    reader.seedTransfer({ token: TOKEN.address, to: MERCHANT_ADDR, amountMinor: 100_000_000, blockNumber: 101, txHash: '0xpaid' });
    reader.setBlock(103);

    const confirmed = await server.inject({ method: 'GET', url: `/v1/intents/${id}` });
    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.json().state).toBe('CONFIRMED');
    expect(confirmed.json().confirmation.txHash).toBe('0xpaid');
  });

  test('POST rejects a malformed merchant_address', async () => {
    const server = build(new InMemoryChainReader({ block: 100 }));
    const res = await server.inject({ method: 'POST', url: '/v1/intents', headers: auth, payload: { ...usdBody, merchant_address: 'not-an-address' } });
    expect(res.statusCode).toBe(400);
  });

  test('GET an unknown intent is 404', async () => {
    const server = build(new InMemoryChainReader({ block: 100 }));
    expect((await server.inject({ method: 'GET', url: '/v1/intents/intent_nope' })).statusCode).toBe(404);
  });
});
