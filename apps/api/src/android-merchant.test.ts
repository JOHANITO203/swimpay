import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventTypes, PUBLIC_EVENT_SIGNAL_DISCLOSURE, type EventEnvelope } from '@swimpay/events';
import {
  AndroidMerchantAccountAuthPaths,
  AndroidMerchantDeviceLookupStatuses,
  AndroidMerchantDeviceProofTypes,
  AndroidMerchantProfileTypes
} from '@swimpay/contracts';
import { InMemoryAuthBffRepository } from './auth-bff.js';
import {
  buildApiServer,
  type CreateOrderWithSessionInput,
  type CreateOrderWithSessionResult,
  type GoogleIdTokenVerifier,
  type OrderRepository,
  type StoredOrderRecord,
  type StoredPaymentSessionRecord
} from './server.js';
import type {
  CreateReceivingRouteInput,
  CreateReceivingRouteResult,
  PaymentSessionCheckoutMutationResult,
  ReceivingRouteCopyDetailsResult,
  ReceivingRouteMutationResult,
  SaveBuyerSenderPhoneHintInput,
  SelectPayerBankLauncherInput,
  SelectReceiverBankInput,
  SelectReceivingRouteInput,
  StoredMerchantReceivingRouteRecord,
  UpdateReceivingRouteInput
} from './orders.js';
import type {
  ReviewActionInput,
  ReviewActionResult,
  ReviewCreateInput,
  ReviewListItem,
  ReviewRepository
} from './reviews.js';

describe('android merchant mobile backend endpoints', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects raw device identifiers and classifies new, known and recovery-required devices', async () => {
    const { server } = buildAndroidMerchantServer();

    for (const field of ['imei', 'android_id', 'advertising_id', 'raw_fingerprint', 'phone_number']) {
      const payload: Record<string, unknown> = {
        device_proof: safeDeviceProof(`raw-device-${field}`),
        [field]: `raw-${field}`
      };
      const rawDeviceLookup = await server.inject({
        method: 'POST',
        url: AndroidMerchantAccountAuthPaths.DEVICE_LOOKUP,
        payload
      });
      expect(rawDeviceLookup.statusCode).toBe(400);
      expect(rawDeviceLookup.json().error).toMatchObject({
        code: 'raw_device_identifier_rejected',
        details: { field }
      });
    }

    const newDeviceLookup = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.DEVICE_LOOKUP,
      payload: {
        lookup_intent: 'create_account',
        device_proof: safeDeviceProof('primary-device')
      }
    });
    expect(newDeviceLookup.statusCode).toBe(200);
    expect(newDeviceLookup.json()).toEqual({
      device_status: AndroidMerchantDeviceLookupStatuses.NEW_DEVICE,
      device_id: null,
      merchant_id: null,
      recovery_required: false,
      recovery_options: [],
      google_required: false,
      raw_device_identifiers_allowed: false,
      device_proof_type: AndroidMerchantDeviceProofTypes.INSTALL_KEYPAIR_SIGNED_CHALLENGE
    });

    const createAccount = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.CREATE_ACCOUNT,
      payload: {
        profile_type: AndroidMerchantProfileTypes.PERSONAL,
        device_proof: safeDeviceProof('primary-device')
      }
    });
    expect(createAccount.statusCode).toBe(201);

    const knownDeviceLookup = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.DEVICE_LOOKUP,
      payload: {
        lookup_intent: 'create_account',
        device_proof: safeDeviceProof('primary-device')
      }
    });
    expect(knownDeviceLookup.statusCode).toBe(200);
    expect(knownDeviceLookup.json()).toMatchObject({
      device_status: 'known_device',
      recovery_required: false
    });

    const recoveryRequiredLookup = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.DEVICE_LOOKUP,
      payload: {
        lookup_intent: 'recover_account',
        device_proof: safeDeviceProof('new-login-device')
      }
    });
    expect(recoveryRequiredLookup.statusCode).toBe(200);
    expect(recoveryRequiredLookup.json()).toEqual({
      device_status: AndroidMerchantDeviceLookupStatuses.RECOVERY_REQUIRED,
      device_id: null,
      merchant_id: null,
      recovery_required: true,
      recovery_options: ['google'],
      google_required: false,
      raw_device_identifiers_allowed: false,
      device_proof_type: AndroidMerchantDeviceProofTypes.INSTALL_KEYPAIR_SIGNED_CHALLENGE
    });
  });

  it('creates personal and business accounts with generated handles and equal mobile permissions', async () => {
    const { server } = buildAndroidMerchantServer();

    const rejectedNames = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.CREATE_ACCOUNT,
      payload: {
        profile_type: 'personal',
        first_name: 'Ada',
        last_name: 'Lovelace',
        device_proof: safeDeviceProof('named-device')
      }
    });
    expect(rejectedNames.statusCode).toBe(400);
    expect(rejectedNames.json().error.code).toBe('merchant_identity_name_rejected');

    const invalidProfile = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.CREATE_ACCOUNT,
      payload: {
        profile_type: 'admin',
        device_proof: safeDeviceProof('invalid-profile-device')
      }
    });
    expect(invalidProfile.statusCode).toBe(400);
    expect(invalidProfile.json().error).toMatchObject({
      code: 'payload_invalid',
      details: { field: 'profile_type' }
    });

    const personal = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.CREATE_ACCOUNT,
      payload: {
        profile_type: 'personal',
        device_proof: safeDeviceProof('personal-device')
      }
    });
    const business = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.CREATE_ACCOUNT,
      payload: {
        profile_type: 'business',
        business_label: 'Commerce demo',
        device_proof: safeDeviceProof('business-device')
      }
    });

    expect(personal.statusCode).toBe(201);
    expect(business.statusCode).toBe(201);
    expect(personal.json().account).toMatchObject({
      profile_type: 'personal',
      permission_profile: 'merchant',
      collected_identity_fields: [],
      google_required: false
    });
    expect(business.json().account).toMatchObject({
      profile_type: 'business',
      permission_profile: 'merchant',
      collected_identity_fields: [],
      google_required: false
    });
    expect(personal.json().account.display_handle).toMatch(/^merchant-[a-f0-9]{8}$/u);
    expect(business.json().account.display_handle).toMatch(/^merchant-[a-f0-9]{8}$/u);
    expect(personal.json().account.permissions).toEqual(business.json().account.permissions);
    expect(personal.json().mobile_session.token).toMatch(/^spm_[A-Za-z0-9_-]+$/u);
    expect(business.json().mobile_session.token).toMatch(/^spm_[A-Za-z0-9_-]+$/u);
    expect(personal.body).not.toMatch(/first_name|last_name|admin/iu);
    expect(business.body).not.toMatch(/first_name|last_name|admin/iu);

    const duplicateDevice = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.CREATE_ACCOUNT,
      payload: {
        profile_type: 'personal',
        device_proof: safeDeviceProof('personal-device')
      }
    });
    expect(duplicateDevice.statusCode).toBe(409);
    expect(duplicateDevice.json().error).toMatchObject({
      details: {
        device_status: AndroidMerchantDeviceLookupStatuses.KNOWN_DEVICE
      }
    });
  });

  it('accepts Android mobile session bearer tokens for merchant Android surfaces only', async () => {
    const eventPublisher = new FakeEventPublisher();
    const { server } = buildAndroidMerchantServer({ eventPublisher });

    const created = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.CREATE_ACCOUNT,
      payload: {
        profile_type: 'personal',
        device_proof: safeDeviceProof('mobile-session-auth-device')
      }
    });
    expect(created.statusCode).toBe(201);
    const token = String(created.json().mobile_session.token);
    const mobileHeaders = { authorization: `Bearer ${token}` };

    const receivingRoutes = await server.inject({
      method: 'GET',
      url: '/v1/merchant/receiving-routes',
      headers: mobileHeaders
    });
    expect(receivingRoutes.statusCode).toBe(200);
    expect(receivingRoutes.json()).toMatchObject({
      official_bank_confirmation: false
    });

    const dashboard = await server.inject({
      method: 'GET',
      url: '/v1/android-merchant/dashboard-summary',
      headers: mobileHeaders
    });
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.json()).toMatchObject({
      payments_to_review_count: 0,
      official_bank_confirmation: false
    });

    const configuration = await server.inject({
      method: 'POST',
      url: '/v1/android-merchant/configuration-test',
      headers: mobileHeaders,
      payload: {
        receiver_connected: true,
        notification_access_active: true,
        connected_site_configured: true
      }
    });
    expect(configuration.statusCode).toBe(200);
    expect(configuration.json()).toMatchObject({
      confirms_real_payment: false,
      emits_payment_confirmed_webhook: false,
      official_bank_confirmation: false
    });

    const connectedSiteTest = await server.inject({
      method: 'POST',
      url: '/v1/android-merchant/connected-site/test',
      headers: mobileHeaders
    });
    expect(connectedSiteTest.statusCode).toBe(202);
    expect(connectedSiteTest.json()).toMatchObject({
      android_sent_webhook_directly: false,
      official_bank_confirmation: false
    });
    expect(eventPublisher.events[0]).toMatchObject({
      eventType: EventTypes.WEBHOOK_DELIVERY_REQUESTED,
      merchantId: created.json().account.merchant_id,
      data: {
        test_only: true,
        ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
      }
    });

    expectSafeAndroidMerchantBody(receivingRoutes.body);
    expectSafeAndroidMerchantBody(dashboard.body);
    expectSafeAndroidMerchantBody(configuration.body);
    expectSafeAndroidMerchantBody(connectedSiteTest.body);
  });

  it('rejects Android mobile session confirmation attempts and keeps manual confirmation outside Android', async () => {
    const eventPublisher = new FakeEventPublisher();
    const { server, reviewRepository } = buildAndroidMerchantServer({ eventPublisher });

    const created = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.CREATE_ACCOUNT,
      payload: {
        profile_type: 'personal',
        device_proof: safeDeviceProof('mobile-confirm-block-device')
      }
    });
    expect(created.statusCode).toBe(201);
    const mobileHeaders = { authorization: `Bearer ${String(created.json().mobile_session.token)}` };

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_01/confirm',
      headers: mobileHeaders,
      payload: {
        actor_id: 'android_merchant'
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.message).toMatch(/merchant permission|bearer|session/i);
    expect(reviewRepository.items.get('rev_01')?.status).toBe('open');
    expect(eventPublisher.events).toEqual([]);
  });

  it('keeps Google recovery and linking optional and fails closed when unconfigured', async () => {
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_ID', '');
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_SECRET', '');
    vi.stubEnv('GOOGLE_OAUTH_REDIRECT_URI', '');
    const { server } = buildAndroidMerchantServer();

    const recovery = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.GOOGLE_EXCHANGE,
      payload: { id_token: 'google-id-token-sample', device_proof: safeDeviceProof('google-recovery-device') }
    });
    expect(recovery.statusCode).toBe(503);
    expect(recovery.json().error).toMatchObject({
      code: 'google_recovery_unconfigured',
      details: { purpose: 'account_recovery' }
    });
    expect(recovery.body).not.toContain('google-id-token-sample');

    const created = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.CREATE_ACCOUNT,
      payload: {
        profile_type: 'personal',
        device_proof: safeDeviceProof('google-link-device')
      }
    });
    expect(created.statusCode).toBe(201);
    const mobileHeaders = { authorization: `Bearer ${String(created.json().mobile_session.token)}` };

    const link = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.GOOGLE_LINK,
      headers: mobileHeaders,
      payload: { id_token: 'google-link-token-sample' }
    });
    expect(link.statusCode).toBe(503);
    expect(link.json().error).toMatchObject({
      code: 'google_recovery_unconfigured',
      details: { purpose: 'account_recovery_linking' }
    });
    expect(link.body).not.toContain('google-link-token-sample');
  });

  it('requires an Android mobile session before Google profile linking', async () => {
    const { server } = buildAndroidMerchantServer();

    const unauthenticatedLink = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.GOOGLE_LINK,
      payload: { id_token: 'google-link-token-sample' }
    });

    expect(unauthenticatedLink.statusCode).toBe(401);
    expect(unauthenticatedLink.body).not.toContain('google-link-token-sample');
  });

  it('links Google recovery to an Android mobile account and restores it with a real verified ID token', async () => {
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_ID', 'google-web-client.apps.googleusercontent.com');
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_SECRET', 'configured-secret');
    vi.stubEnv('GOOGLE_OAUTH_REDIRECT_URI', 'https://staging.swimpay.pro/auth/google/callback');
    const googleVerifier = new FakeGoogleIdTokenVerifier({
      'link-token': 'google-sub-android-01',
      'recover-token': 'google-sub-android-01'
    });
    const { server, authBffRepository } = buildAndroidMerchantServer({ googleVerifier });

    const created = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.CREATE_ACCOUNT,
      payload: {
        profile_type: 'personal',
        device_proof: safeDeviceProof('google-real-device')
      }
    });
    expect(created.statusCode).toBe(201);
    const createdBody = created.json();
    const mobileHeaders = { authorization: `Bearer ${String(createdBody.mobile_session.token)}` };

    const link = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.GOOGLE_LINK,
      headers: mobileHeaders,
      payload: { id_token: 'link-token' }
    });
    expect(link.statusCode).toBe(200);
    expect(link.body).not.toContain('link-token');
    expect(authBffRepository.users.get(String(createdBody.account.user_id))?.googleSub).toBe('google-sub-android-01');

    const recovered = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.GOOGLE_EXCHANGE,
      payload: {
        id_token: 'recover-token',
        device_proof: safeDeviceProof('google-recovery-device')
      }
    });

    expect(recovered.statusCode).toBe(200);
    expect(recovered.body).not.toContain('recover-token');
    expect(recovered.json()).toMatchObject({
      account: {
        user_id: createdBody.account.user_id,
        merchant_id: createdBody.account.merchant_id,
        display_handle: createdBody.account.display_handle,
        collected_identity_fields: [],
        google_required: false
      },
      mobile_session: {
        token_type: 'swimpay_mobile_session'
      },
      onboarding: {
        android_confirms_payments: false
      }
    });
    expect(String(recovered.json().mobile_session.token)).toMatch(/^spm_/u);
  });

  it('returns a merchant-safe dashboard summary from reviews and receiving routes', async () => {
    const { server } = buildAndroidMerchantServer();

    const response = await server.inject({
      method: 'GET',
      url: '/v1/android-merchant/dashboard-summary',
      headers: merchantHeaders()
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      payments_to_review_count: 1,
      confirmed_today_count: 0,
      notifications_sent_count: 0,
      receiver_status: {
        status: 'action_required',
        label: 'Téléphone',
        display: 'Action requise'
      },
      recent_detected_payments: [
        {
          review_id: 'rev_01',
          order_id: 'ord_01',
          payment_session_id: 'ps_01',
          amount: { value: '58.41', currency: 'RUB' },
          bank_display_name: 'Sberbank',
          status: 'to_review',
          status_label: 'À vérifier',
          created_at: '2026-05-03T10:00:00.000Z'
        }
      ],
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });
    expectSafeAndroidMerchantBody(response.body);
  });

  it('returns safe payment detail with masked receiving method and merchant action set', async () => {
    const { server } = buildAndroidMerchantServer();

    const response = await server.inject({
      method: 'GET',
      url: '/v1/android-merchant/payments/rev_01',
      headers: merchantHeaders()
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      payment: {
        id: 'rev_01',
        review_id: 'rev_01',
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        status: 'to_review',
        status_label: 'À vérifier',
        amount_expected: { value: '58.41', currency: 'RUB' },
        amount_detected: { value: '58.41', currency: 'RUB' },
        bank_display_name: 'Sberbank',
        receiving_method_masked: 'Carte bancaire · •••• 4821',
        payment_reference: 'TANGO ALFA',
        signal_received_at: '2026-05-03T10:00:00.000Z',
        reason_labels: ['Validation manuelle en bêta', 'Référence non visible'],
        allowed_actions: ['reject_signal', 'reject_order']
      },
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });
    expectSafeAndroidMerchantBody(response.body);
  });

  it('returns safe payment detail for legacy review rows without linked sessions', async () => {
    const { server, reviewRepository } = buildAndroidMerchantServer();
    reviewRepository.items.set('rev_unlinked', {
      ...openReviewItem(),
      id: 'rev_unlinked',
      orderId: 'null',
      paymentSessionId: 'null'
    });

    const response = await server.inject({
      method: 'GET',
      url: '/v1/android-merchant/payments/rev_unlinked',
      headers: merchantHeaders()
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      payment: {
        id: 'rev_unlinked',
        receiving_method_masked: 'Moyen de réception masqué',
        allowed_actions: ['reject_signal', 'reject_order']
      },
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });
    expectSafeAndroidMerchantBody(response.body);
  });

  it('returns connected-site status without exposing webhook secrets and gates developer details explicitly', async () => {
    const { server } = buildAndroidMerchantServer({
      connectedSite: { url: 'https://merchant.example/swimpay/webhook', status: 'active' }
    });

    const merchantResponse = await server.inject({
      method: 'GET',
      url: '/v1/android-merchant/connected-site',
      headers: merchantHeaders()
    });
    const developerResponse = await server.inject({
      method: 'GET',
      url: '/v1/android-merchant/connected-site?developer_mode=true',
      headers: merchantHeaders()
    });

    expect(merchantResponse.statusCode).toBe(200);
    expect(merchantResponse.json()).toEqual({
      webhook_url_display: 'https://merchant.example/swimpay/webhook',
      status: 'active',
      status_label: 'Connexion active',
      last_delivery_status: 'none',
      last_delivery_at: null,
      latest_deliveries: [],
      developer_details: null,
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });
    expect(merchantResponse.body).not.toContain('payment.confirmed');
    expect(developerResponse.json().developer_details).toEqual({
      event_types_visible: true,
      signature_status_visible: true
    });
    expectSafeAndroidMerchantBody(merchantResponse.body);
    expectSafeAndroidMerchantBody(developerResponse.body);
  });

  it('queues a backend-owned connected-site test event without Android sending webhooks', async () => {
    const eventPublisher = new FakeEventPublisher();
    const { server } = buildAndroidMerchantServer({ eventPublisher });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/android-merchant/connected-site/test',
      headers: merchantHeaders()
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      status: 'test_queued',
      delivery_id: 'delivery_test_01',
      safe_status: 'Notification envoyée',
      android_sent_webhook_directly: false,
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });
    expect(eventPublisher.events).toHaveLength(1);
    expect(eventPublisher.events[0]).toMatchObject({
      eventType: EventTypes.WEBHOOK_DELIVERY_REQUESTED,
      merchantId: 'mch_01',
      data: {
        delivery_id: 'delivery_test_01',
        test_only: true,
        ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
      }
    });
    expectSafeAndroidMerchantBody(response.body);
  });

  it('runs a non-confirming configuration test with merchant checklist labels', async () => {
    const eventPublisher = new FakeEventPublisher();
    const { server } = buildAndroidMerchantServer({ eventPublisher });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/android-merchant/configuration-test',
      headers: merchantHeaders(),
      payload: {
        receiver_connected: true,
        notification_access_active: true,
        connected_site_configured: true
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      outcome: 'ready',
      confirms_real_payment: false,
      emits_payment_confirmed_webhook: false,
      checklist: [
        { label: 'Téléphone connecté', status: 'passed' },
        { label: 'Banque choisie', status: 'passed' },
        { label: 'Moyen de réception ajouté', status: 'passed' },
        { label: 'Site ou application connecté', status: 'passed' }
      ],
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });
    expect(eventPublisher.events).toEqual([]);
    expect(response.body).not.toContain('payment.confirmed');
    expectSafeAndroidMerchantBody(response.body);
  });

  it('requires merchant auth for android merchant endpoints', async () => {
    const { server } = buildAndroidMerchantServer();

    const response = await server.inject({
      method: 'GET',
      url: '/v1/android-merchant/dashboard-summary'
    });

    expect(response.statusCode).toBe(401);
  });
});

function buildAndroidMerchantServer(params: {
  eventPublisher?: FakeEventPublisher;
  connectedSite?: { url: string; status: 'active' | 'problem' };
  googleVerifier?: GoogleIdTokenVerifier;
} = {}) {
  const orderRepository = new FakeOrderRepository();
  const reviewRepository = new FakeReviewRepository();
  const authBffRepository = new InMemoryAuthBffRepository();
  reviewRepository.items.set('rev_01', openReviewItem());

  const eventPublisher = params.eventPublisher ?? new FakeEventPublisher();
  const server = buildApiServer({
    environment: 'test',
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    },
    orderRepository,
    reviewRepository,
    authBffRepository,
    eventPublisher,
    idGenerator: {
      orderId: () => 'ord_new',
      paymentSessionId: () => 'ps_new',
      auditEventId: () => 'aud_01',
      referenceCode: () => 'TANGO ALFA'
    },
    reviewIdGenerator: {
      reviewActionId: () => 'act_01',
      auditEventId: () => 'aud_review_01',
      eventId: () => 'evt_review_01'
    },
    androidMerchantDeliveryIdGenerator: () => 'delivery_test_01',
    clock: () => new Date('2026-05-03T10:05:00.000Z'),
    ...(params.googleVerifier ? { googleIdTokenVerifier: params.googleVerifier } : {}),
    ...(params.connectedSite ? { androidMerchantConnectedSite: params.connectedSite } : {})
  });

  return { server, orderRepository, reviewRepository, authBffRepository, eventPublisher };
}

class FakeGoogleIdTokenVerifier implements GoogleIdTokenVerifier {
  public constructor(private readonly subjectsByToken: Record<string, string>) {}

  public async verifyIdToken(idToken: string): Promise<{ googleSub: string } | null> {
    const googleSub = this.subjectsByToken[idToken];
    return googleSub ? { googleSub } : null;
  }
}

function safeDeviceProof(suffix: string): Record<string, string> {
  return {
    install_public_key: `test-install-public-key-${suffix}`,
    challenge_id: `challenge-${suffix}`,
    challenge_signature: `signature-${suffix}`
  };
}

function openReviewItem(): ReviewListItem {
  return {
    id: 'rev_01',
    merchantId: 'mch_01',
    orderId: 'ord_01',
    paymentSessionId: 'ps_01',
    signalId: 'sig_01',
    reasonCode: 'receiver_route_review_only',
    status: 'open',
    amountMinor: 5841,
    currency: 'RUB',
    bankProfileId: 'sber_ru',
    directionLabel: 'incoming_customer_transfer',
    signalQuality: 72,
    score: 68,
    positiveReasonCodes: ['amount_exact'],
    negativeReasonCodes: ['reference_not_observed'],
    senderPhoneMasked: '+7 *** *** **67',
    referenceCodeMasked: 'TANGO ALFA',
    createdAt: '2026-05-03T10:00:00.000Z'
  };
}

class FakeReviewRepository implements ReviewRepository {
  public readonly items = new Map<string, ReviewListItem>();

  public async createReview(input: ReviewCreateInput): Promise<{ kind: 'created'; reviewId: string }> {
    this.items.set(input.review.id, input.review);
    return { kind: 'created', reviewId: input.review.id };
  }

  public async listOpenReviews(merchantId: string): Promise<ReviewListItem[]> {
    return [...this.items.values()].filter((item) => item.merchantId === merchantId && item.status === 'open');
  }

  public async confirmReview(input: ReviewActionInput): Promise<ReviewActionResult> {
    return {
      kind: 'updated',
      reviewId: input.reviewId,
      status: 'confirmed',
      orderId: 'ord_01',
      paymentSessionId: 'ps_01',
      orderStatus: 'manual_confirmed',
      paymentSessionStatus: 'manual_confirmed'
    };
  }

  public async rejectReview(input: ReviewActionInput): Promise<ReviewActionResult> {
    return {
      kind: 'updated',
      reviewId: input.reviewId,
      status: 'rejected',
      orderId: 'ord_01',
      paymentSessionId: 'ps_01',
      orderStatus: input.scope === 'order' ? 'rejected' : 'needs_review',
      paymentSessionStatus: input.scope === 'order' ? 'rejected' : 'needs_review',
      rejectionScope: input.scope ?? 'signal',
      reason: input.reason as never
    };
  }
}

class FakeOrderRepository implements OrderRepository {
  public readonly order: StoredOrderRecord = {
    id: 'ord_01',
    merchantId: 'mch_01',
    externalId: 'ext_01',
    productId: 'prod_01',
    productName: 'Synthetic product',
    productRiskLevel: 'standard',
    amountMinor: 5841,
    currency: 'RUB',
    status: 'needs_review',
    expiresAt: '2026-05-03T11:00:00.000Z',
    createdAt: '2026-05-03T09:55:00.000Z',
    updatedAt: '2026-05-03T10:00:00.000Z'
  };
  public readonly paymentSession: StoredPaymentSessionRecord = {
    id: 'ps_01',
    orderId: 'ord_01',
    merchantId: 'mch_01',
    expectedAmountMinor: 5841,
    currency: 'RUB',
    buyerPhoneHmac: 'hmac_phone',
    buyerPhoneMasked: '+7 *** *** **67',
    referenceCode: 'TANGO ALFA',
    referenceHmac: 'hmac_ref',
    status: 'needs_review',
    selectedReceiverBankId: 'sber_ru',
    selectedReceiverBankProfileId: 'sber_ru',
    selectedReceivingRouteId: 'route_01',
    selectedPayerBankLauncherId: 'sber_launcher',
    validFrom: '2026-05-03T09:55:00.000Z',
    validUntil: '2026-05-03T11:00:00.000Z',
    createdAt: '2026-05-03T09:55:00.000Z',
    updatedAt: '2026-05-03T10:00:00.000Z'
  };
  public readonly route: StoredMerchantReceivingRouteRecord = {
    route_id: 'route_01',
    merchant_id: 'mch_01',
    bank_profile_id: 'sber_ru',
    rail_type: 'card_transfer',
    receiver_identifier_type: 'card',
    receiver_identifier_encrypted: 'encrypted',
    receiver_identifier_hmac: 'hmac_sha256:route',
    receiver_identifier_masked: '•••• 4821',
    receiver_identifier_last4: '4821',
    route_code: 'SBER-CARD',
    display_label: 'Sberbank',
    enabled: true,
    recommended: true,
    review_policy: 'review_first',
    fees_hint: undefined,
    created_at: '2026-05-03T09:50:00.000Z',
    updated_at: '2026-05-03T09:50:00.000Z'
  };

  public async createOrderWithSession(_input: CreateOrderWithSessionInput): Promise<CreateOrderWithSessionResult> {
    void _input;
    return { kind: 'created', order: this.order, paymentSession: this.paymentSession };
  }

  public async getOrderById(merchantId: string, orderId: string): Promise<{ order: StoredOrderRecord; paymentSession: StoredPaymentSessionRecord | null } | null> {
    return merchantId === this.order.merchantId && orderId === this.order.id
      ? { order: this.order, paymentSession: this.paymentSession }
      : null;
  }

  public async getPaymentSessionById(merchantId: string, paymentSessionId: string): Promise<{ order: StoredOrderRecord; paymentSession: StoredPaymentSessionRecord } | null> {
    return merchantId === this.paymentSession.merchantId && paymentSessionId === this.paymentSession.id
      ? { order: this.order, paymentSession: this.paymentSession }
      : null;
  }

  public async createReceivingRoute(_input: CreateReceivingRouteInput): Promise<CreateReceivingRouteResult> {
    void _input;
    return { kind: 'created', route: this.route };
  }

  public async listReceivingRoutes(merchantId: string): Promise<StoredMerchantReceivingRouteRecord[]> {
    return merchantId === this.route.merchant_id ? [this.route] : [];
  }

  public async updateReceivingRoute(_input: UpdateReceivingRouteInput): Promise<ReceivingRouteMutationResult> {
    void _input;
    return { kind: 'updated', route: this.route };
  }

  public async listReceiverBanksForCheckout(merchantId: string, _paymentSessionId: string): Promise<StoredMerchantReceivingRouteRecord[]> {
    void _paymentSessionId;
    return this.listReceivingRoutes(merchantId);
  }

  public async listReceivingRoutesForCheckoutBank(
    merchantId: string,
    _paymentSessionId: string,
    bankProfileId: string
  ): Promise<StoredMerchantReceivingRouteRecord[]> {
    void _paymentSessionId;
    return merchantId === this.route.merchant_id && bankProfileId === this.route.bank_profile_id ? [this.route] : [];
  }

  public async getSelectedReceivingRouteCopyDetails(): Promise<ReceivingRouteCopyDetailsResult> {
    return { kind: 'not_found' };
  }

  public async recordCheckoutDestinationCopied(): Promise<void> {}

  public async selectReceiverBank(_input: SelectReceiverBankInput): Promise<PaymentSessionCheckoutMutationResult> {
    void _input;
    return { kind: 'updated', order: this.order, paymentSession: this.paymentSession };
  }

  public async selectReceivingRoute(_input: SelectReceivingRouteInput): Promise<PaymentSessionCheckoutMutationResult> {
    void _input;
    return { kind: 'updated', order: this.order, paymentSession: this.paymentSession };
  }

  public async selectPayerBankLauncher(_input: SelectPayerBankLauncherInput): Promise<PaymentSessionCheckoutMutationResult> {
    void _input;
    return { kind: 'updated', order: this.order, paymentSession: this.paymentSession };
  }

  public async saveBuyerSenderPhoneHint(_input: SaveBuyerSenderPhoneHintInput): Promise<PaymentSessionCheckoutMutationResult> {
    void _input;
    return { kind: 'updated', order: this.order, paymentSession: this.paymentSession };
  }

  public async markPaymentInstructionsShown(): Promise<PaymentSessionCheckoutMutationResult> {
    return { kind: 'updated', order: this.order, paymentSession: this.paymentSession };
  }

  public async markReceiverArmed(): Promise<PaymentSessionCheckoutMutationResult> {
    return { kind: 'updated', order: this.order, paymentSession: this.paymentSession };
  }

  public async markBuyerClaimedPaid(): Promise<PaymentSessionCheckoutMutationResult> {
    return { kind: 'updated', order: this.order, paymentSession: this.paymentSession };
  }
}

class FakeEventPublisher {
  public readonly events: EventEnvelope[] = [];

  public async publish(event: EventEnvelope): Promise<void> {
    this.events.push(event);
  }
}

function merchantHeaders() {
  return { authorization: 'Bearer test_mch_01' };
}

function expectSafeAndroidMerchantBody(body: string): void {
  expect(body).not.toContain('2200123412344821');
  expect(body).not.toContain('+79991234567');
  expect(body).not.toContain('raw notification');
  expect(body).not.toContain('webhook_secret');
  expect(body).not.toContain('cert_sha256');
  expect(body).not.toContain('package_name');
  expect(body).not.toContain('HMAC');
  expect(body).not.toContain('official_bank_confirmation":true');
}
