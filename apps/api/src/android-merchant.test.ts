import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventTypes, PUBLIC_EVENT_SIGNAL_DISCLOSURE, type EventEnvelope } from '@swimpay/events';
import {
  AndroidMerchantAccountAuthPaths,
  AndroidMerchantDeviceLookupStatuses,
  AndroidMerchantDeviceProofTypes,
  AndroidMerchantProfileTypes
} from '@swimpay/contracts';
import { InMemoryAuthBffRepository } from './auth-bff.js';
import { InMemoryMerchantIntegrationRepository } from './developer-integration.js';
import {
  buildApiServer,
  type ApiServerOptions,
  type CreateOrderWithSessionInput,
  type CreateOrderWithSessionResult,
  type GoogleIdTokenVerifier,
  type OrderRepository,
  resolveGoogleIdTokenAudiences,
  extractGoogleIdTokenAudienceForDiagnostics,
  verifyGoogleIdTokenWithTokenInfo,
  type StoredOrderRecord,
  type StoredPaymentSessionRecord
} from './server.js';
import type {
  CreateReceivingRouteInput,
  CreateReceivingRouteResult,
  NoNotificationManualCheckResult,
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
import type {
  MerchantMetricsBucket,
  MerchantMetricsRange,
  MerchantMetricsRepository,
  MerchantMetricsSummary,
  MerchantMetricsTimeseries
} from './merchant-metrics.js';

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

  it('accepts Android mobile manual confirmation through the backend only', async () => {
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
    reviewRepository.items.set('rev_01', {
      ...openReviewItem(),
      merchantId: String(created.json().account.merchant_id)
    });
    const mobileHeaders = { authorization: `Bearer ${String(created.json().mobile_session.token)}` };

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_01/confirm',
      headers: mobileHeaders,
      payload: {
        actor_id: 'android_merchant',
        actor_type: 'android_merchant',
        reason: 'merchant verified receipt in bank app',
        feedback_label: 'true_payment'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      review_id: 'rev_01',
      status: 'confirmed',
      order_status: 'manual_confirmed',
      payment_session_status: 'manual_confirmed'
    });
    expect(reviewRepository.items.get('rev_01')?.status).toBe('confirmed');
    expect(reviewRepository.actions[0]).toMatchObject({
      actorType: 'android_merchant',
      actorId: String(created.json().account.user_id),
      actorSource: 'android_mobile_session',
      actorDisplay: 'Android Merchant'
    });
    expect(eventPublisher.events[0]).toMatchObject({
      eventType: EventTypes.REVIEW_CONFIRMED,
      data: {
        review_id: 'rev_01',
        confirmation_type: 'notification_signal',
        official_bank_confirmation: false
      }
    });
    expect(JSON.stringify(eventPublisher.events)).not.toContain('official_bank_confirmation":true');
  });

  it('preserves dashboard merchant user UUID separately from actor type on review confirmation', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const merchantId = '22222222-2222-4222-8222-222222222222';
    const eventPublisher = new FakeEventPublisher();
    const { server, reviewRepository } = buildAndroidMerchantServer({ eventPublisher });

    const bootstrap = await server.inject({
      method: 'POST',
      url: '/auth/dev/bootstrap-session',
      payload: {
        user_id: userId,
        merchant_id: merchantId,
        role: 'owner'
      }
    });
    expect(bootstrap.statusCode).toBe(201);
    const cookie = bootstrap.headers['set-cookie'];
    const csrfToken = String(bootstrap.json().csrf_token);
    reviewRepository.items.set('rev_dashboard', {
      ...openReviewItem(),
      id: 'rev_dashboard',
      merchantId
    });

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_dashboard/confirm',
      headers: {
        cookie: Array.isArray(cookie) ? cookie[0] : String(cookie),
        'x-csrf-token': csrfToken
      },
      payload: {
        actor_id: 'android_merchant',
        reason: 'merchant verified receipt in dashboard',
        feedback_label: 'true_payment'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(reviewRepository.actions[0]).toMatchObject({
      actorType: 'dashboard_merchant',
      actorId: userId,
      actorSource: 'bff_session',
      actorDisplay: 'Dashboard Merchant'
    });
    expect(JSON.stringify(eventPublisher.events)).not.toContain('android_merchant');
  });

  it('accepts Android mobile manual bank check confirmation without treating it as bank confirmation', async () => {
    const eventPublisher = new FakeEventPublisher();
    const { server, reviewRepository } = buildAndroidMerchantServer({ eventPublisher });

    const created = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.CREATE_ACCOUNT,
      payload: {
        profile_type: 'personal',
        device_proof: safeDeviceProof('mobile-manual-bank-check-device')
      }
    });
    expect(created.statusCode).toBe(201);
    reviewRepository.items.set('rev_manual_check', {
      ...openReviewItem(),
      id: 'rev_manual_check',
      merchantId: String(created.json().account.merchant_id),
      signalId: undefined,
      reasonCode: 'NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT',
      negativeReasonCodes: ['NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT']
    });
    const mobileHeaders = { authorization: `Bearer ${String(created.json().mobile_session.token)}` };

    const response = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_manual_check/confirm',
      headers: mobileHeaders,
      payload: {
        actor_id: 'android_merchant',
        reason: 'merchant verified manually in bank app',
        feedback_label: 'true_payment'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(reviewRepository.actions[0]).toMatchObject({
      actorType: 'android_merchant',
      actorId: String(created.json().account.user_id),
      actorSource: 'android_mobile_session'
    });
    expect(response.json()).toMatchObject({
      review_id: 'rev_manual_check',
      status: 'confirmed',
      order_status: 'manual_confirmed',
      payment_session_status: 'manual_confirmed'
    });
    expect(eventPublisher.events[0]).toMatchObject({
      eventType: EventTypes.REVIEW_CONFIRMED,
      data: {
        review_id: 'rev_manual_check',
        confirmation_type: 'manual_bank_check',
        official_bank_confirmation: false,
        reason_label: undefined
      }
    });
    expect(JSON.stringify(eventPublisher.events)).not.toContain('bank_confirmed');
  });

  it('accepts Android mobile signal and order rejection actions with explicit scopes', async () => {
    const eventPublisher = new FakeEventPublisher();
    const { server, reviewRepository } = buildAndroidMerchantServer({ eventPublisher });

    const created = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.CREATE_ACCOUNT,
      payload: {
        profile_type: 'personal',
        device_proof: safeDeviceProof('mobile-reject-actions-device')
      }
    });
    expect(created.statusCode).toBe(201);
    const merchantId = String(created.json().account.merchant_id);
    reviewRepository.items.set('rev_signal_reject', {
      ...openReviewItem(),
      id: 'rev_signal_reject',
      merchantId
    });
    reviewRepository.items.set('rev_order_reject', {
      ...openReviewItem(),
      id: 'rev_order_reject',
      merchantId
    });
    const mobileHeaders = { authorization: `Bearer ${String(created.json().mobile_session.token)}` };

    const signalReject = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_signal_reject/reject',
      headers: mobileHeaders,
      payload: {
        actor_id: 'android_merchant',
        scope: 'signal',
        reason: 'wrong_signal'
      }
    });
    const orderReject = await server.inject({
      method: 'POST',
      url: '/v1/reviews/rev_order_reject/reject',
      headers: mobileHeaders,
      payload: {
        actor_id: 'android_merchant',
        scope: 'order',
        reason: 'buyer_not_recognized'
      }
    });

    expect(signalReject.statusCode).toBe(200);
    expect(reviewRepository.actions[0]).toMatchObject({
      actorType: 'android_merchant',
      actorId: String(created.json().account.user_id),
      actorSource: 'android_mobile_session',
      scope: 'signal'
    });
    expect(reviewRepository.actions[1]).toMatchObject({
      actorType: 'android_merchant',
      actorId: String(created.json().account.user_id),
      actorSource: 'android_mobile_session',
      scope: 'order'
    });
    expect(signalReject.json()).toMatchObject({
      review_id: 'rev_signal_reject',
      status: 'rejected',
      rejection_scope: 'signal'
    });
    expect(orderReject.statusCode).toBe(200);
    expect(orderReject.json()).toMatchObject({
      review_id: 'rev_order_reject',
      status: 'rejected',
      rejection_scope: 'order',
      order_status: 'rejected',
      payment_session_status: 'rejected'
    });
    expect(JSON.stringify(eventPublisher.events)).not.toContain('payment.confirmed');
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

  it('accepts explicit Android and web Google ID token audiences for account recovery', () => {
    expect(
      resolveGoogleIdTokenAudiences({
        GOOGLE_OAUTH_CLIENT_ID: '"web-client.apps.googleusercontent.com"',
        SWIMPAY_ANDROID_GOOGLE_SERVER_CLIENT_ID: 'android-server-client.apps.googleusercontent.com, web-client.apps.googleusercontent.com',
        SWIMPAY_ANDROID_STAGING_GOOGLE_SERVER_CLIENT_ID: 'web-client.apps.googleusercontent.com'
      } as NodeJS.ProcessEnv)
    ).toEqual(['web-client.apps.googleusercontent.com', 'android-server-client.apps.googleusercontent.com']);
  });

  it('returns safe Google token audience diagnostics without exposing the ID token', async () => {
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_ID', '"web-client.apps.googleusercontent.com"');
    vi.stubEnv('SWIMPAY_ANDROID_GOOGLE_SERVER_CLIENT_ID', 'android-client.apps.googleusercontent.com');
    const { server } = buildAndroidMerchantServer({ googleVerifier: new FakeGoogleIdTokenVerifier({}) });
    const token = fakeGoogleIdToken('web-client.apps.googleusercontent.com');

    expect(extractGoogleIdTokenAudienceForDiagnostics(token)).toBe('web-client.apps.googleusercontent.com');

    const response = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.GOOGLE_EXCHANGE,
      payload: {
        id_token: token,
        device_proof: safeDeviceProof('google-diagnostics-device')
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toMatchObject({
      code: 'google_id_token_rejected',
      details: {
        provider: 'google',
        purpose: 'account_recovery',
        token_audience_configured: true,
        configured_audience_count: 2
      }
    });
    expect(response.body).not.toContain(token);
    expect(response.body).not.toContain('eyJ');
    expect(response.body).not.toContain('web-client.apps.googleusercontent.com');
  });

  it('accepts Google tokeninfo verification fallback for valid Android recovery ID tokens', async () => {
    const result = await verifyGoogleIdTokenWithTokenInfo(
      'google-id-token-not-logged',
      ['web-client.apps.googleusercontent.com'],
      async () => ({
        ok: true,
        json: async () => ({
          aud: 'web-client.apps.googleusercontent.com',
          sub: 'google-sub-android-01',
          iss: 'https://accounts.google.com',
          exp: String(Math.floor(Date.now() / 1000) + 600)
        })
      }),
      () => Date.now()
    );

    expect(result).toEqual({ googleSub: 'google-sub-android-01' });
  });

  it('rejects Google tokeninfo fallback when the Android token audience is not configured', async () => {
    const result = await verifyGoogleIdTokenWithTokenInfo(
      'google-id-token-not-logged',
      ['web-client.apps.googleusercontent.com'],
      async () => ({
        ok: true,
        json: async () => ({
          aud: 'other-client.apps.googleusercontent.com',
          sub: 'google-sub-android-01',
          iss: 'https://accounts.google.com',
          exp: String(Math.floor(Date.now() / 1000) + 600)
        })
      }),
      () => Date.now()
    );

    expect(result).toBeNull();
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
      metrics_summary: null,
      metrics_timeseries: null,
      merchant_setup_status: 'ready_for_manual_payments',
      payment_ready: true,
      setup_actions: [],
      readiness_message: 'Paiements disponibles en validation manuelle.',
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
          amount: { value: '58.80', currency: 'RUB' },
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
        amount_displayed: { value: '58.41', currency: 'RUB' },
        amount_expected: { value: '58.80', currency: 'RUB' },
        amount_detected: { value: '58.80', currency: 'RUB' },
        amount_delta_minor: 0,
        amount_delta: { value: '0.00', currency: 'RUB' },
        risk_label: 'Montant exact attendu reconnu',
        bank_display_name: 'Sberbank',
        receiving_method_masked: 'Carte bancaire · •••• 4821',
        payment_reference: 'TANGO ALFA',
        signal_received_at: '2026-05-03T10:00:00.000Z',
        score: 68,
        reason_labels: [
          'Validation manuelle en bêta',
          'Montant exact attendu reconnu',
          'Micro-ajustement attendu',
          'Référence non visible'
        ],
        timeline: [
          { label: 'Signal reçu', occurred_at: '2026-05-03T10:00:00.000Z' },
          { label: 'Review créée', occurred_at: '2026-05-03T10:00:00.000Z' }
        ],
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

  it('lets an Android merchant mobile session use backend-owned developer integration credentials without web CSRF', async () => {
    const { server } = buildAndroidMerchantServer();
    const createAccount = await server.inject({
      method: 'POST',
      url: AndroidMerchantAccountAuthPaths.CREATE_ACCOUNT,
      payload: {
        profile_type: AndroidMerchantProfileTypes.BUSINESS,
        business_label: 'Staging merchant',
        device_proof: safeDeviceProof('developer-integration-device')
      }
    });
    expect(createAccount.statusCode).toBe(201);
    const token = createAccount.json().mobile_session.token as string;
    const headers = { authorization: `Bearer ${token}` };

    const read = await server.inject({ method: 'GET', url: '/v1/merchant/integration', headers });
    expect(read.statusCode).toBe(200);
    expect(read.json()).toMatchObject({
      public_webhook_events: ['payment.confirmed', 'payment.rejected', 'payment.expired'],
      official_bank_confirmation: false
    });
    expect(read.json().secret_key_once).toBeUndefined();

    const createdKey = await server.inject({ method: 'POST', url: '/v1/merchant/integration/keys', headers });
    expect(createdKey.statusCode).toBe(201);
    expect(createdKey.json().secret_key_once).toMatch(/^sk_/u);
    expect(createdKey.json().secret_key_show_once).toBe(true);

    const webhookUrl = await server.inject({
      method: 'PUT',
      url: '/v1/merchant/integration/webhook-url',
      headers,
      payload: { webhook_url: 'https://merchant.example/swimpay/webhook' }
    });
    expect(webhookUrl.statusCode).toBe(200);
    expect(webhookUrl.json().webhook_url).toBe('https://merchant.example/swimpay/webhook');
    expect(webhookUrl.json().webhook_secret_once).toMatch(/^whsec_/u);

    const testWebhook = await server.inject({ method: 'POST', url: '/v1/merchant/integration/test-webhook', headers });
    expect(testWebhook.statusCode).toBe(202);
    expect(testWebhook.json()).toMatchObject({
      status: 'test_queued',
      testOnly: true,
      triggersFulfillment: false,
      officialBankConfirmation: false
    });

    const deliveries = await server.inject({ method: 'GET', url: '/v1/merchant/integration/webhook-deliveries', headers });
    expect(deliveries.statusCode).toBe(200);
    expect(deliveries.json().public_webhook_events).toEqual(['payment.confirmed', 'payment.rejected', 'payment.expired']);

    const normalRead = await server.inject({ method: 'GET', url: '/v1/merchant/integration', headers });
    expect(normalRead.statusCode).toBe(200);
    expect(normalRead.json().secret_key_once).toBeUndefined();
    expect(normalRead.json().webhook_secret_once).toBeUndefined();
    expect(normalRead.body).not.toContain(createdKey.json().secret_key_once);
    expect(normalRead.body).not.toContain(webhookUrl.json().webhook_secret_once);
    expect(normalRead.body).not.toContain('official_bank_confirmation":true');
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

  it('returns merchant metrics summary and timeseries without side effects or raw data', async () => {
    const eventPublisher = new FakeEventPublisher();
    const merchantMetricsRepository = new FakeMerchantMetricsRepository();
    const { server } = buildAndroidMerchantServer({ eventPublisher, merchantMetricsRepository });

    const summary = await server.inject({
      method: 'GET',
      url: '/v1/merchant/metrics/summary?range=30d',
      headers: merchantHeaders()
    });

    expect(summary.statusCode).toBe(200);
    expect(summary.json()).toMatchObject({
      range: '30d',
      currency: 'RUB',
      confirmed_payment_count: 18,
      confirmed_amount_minor: 4250000,
      pending_review_count: 7,
      rejected_payment_count: 3,
      expired_payment_count: 2,
      failed_count: 1,
      confirmation_rate: 75,
      average_manual_confirmation_delay_seconds: 90,
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });

    const timeseries = await server.inject({
      method: 'GET',
      url: '/v1/merchant/metrics/timeseries?range=30d&bucket=day',
      headers: merchantHeaders()
    });

    expect(timeseries.statusCode).toBe(200);
    expect(timeseries.json()).toMatchObject({
      range: '30d',
      bucket: 'day',
      points: [
        {
          date: '2026-05-01',
          confirmed_payment_count: 4,
          confirmed_amount_minor: 900000,
          pending_review_count: 1,
          rejected_payment_count: 0,
          expired_payment_count: 0,
          confirmation_rate: 100
        },
        {
          date: '2026-05-02',
          confirmed_payment_count: 0,
          confirmed_amount_minor: 0,
          pending_review_count: 2,
          rejected_payment_count: 0,
          expired_payment_count: 0,
          confirmation_rate: 0
        }
      ],
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false
    });

    expect(merchantMetricsRepository.summaryRequests).toEqual([{ merchantId: 'mch_01', range: '30d' }]);
    expect(merchantMetricsRepository.timeseriesRequests).toEqual([{ merchantId: 'mch_01', range: '30d', bucket: 'day' }]);
    expect(eventPublisher.events).toEqual([]);
    expectSafeAndroidMerchantBody(summary.body);
    expectSafeAndroidMerchantBody(timeseries.body);
  });
});

function buildAndroidMerchantServer(params: {
  eventPublisher?: FakeEventPublisher;
  connectedSite?: { url: string; status: 'active' | 'problem' };
  googleVerifier?: GoogleIdTokenVerifier;
  merchantMetricsRepository?: MerchantMetricsRepository;
} = {}) {
  const orderRepository = new FakeOrderRepository();
  const reviewRepository = new FakeReviewRepository();
  const authBffRepository = new InMemoryAuthBffRepository();
  const merchantIntegrationRepository = new InMemoryMerchantIntegrationRepository();
  reviewRepository.items.set('rev_01', openReviewItem());

  const eventPublisher = params.eventPublisher ?? new FakeEventPublisher();
  const serverOptions: ApiServerOptions = {
    environment: 'test',
    healthChecks: {
      database: async () => 'skipped',
      nats: async () => 'skipped',
      valkey: async () => 'skipped'
    },
    orderRepository,
    reviewRepository,
    authBffRepository,
    merchantIntegrationRepository,
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
    ...(params.connectedSite ? { androidMerchantConnectedSite: params.connectedSite } : {}),
    ...(params.merchantMetricsRepository ? { merchantMetricsRepository: params.merchantMetricsRepository } : {})
  };
  const server = buildApiServer(serverOptions);

  return { server, orderRepository, reviewRepository, authBffRepository, eventPublisher };
}

class FakeGoogleIdTokenVerifier implements GoogleIdTokenVerifier {
  public constructor(private readonly subjectsByToken: Record<string, string>) {}

  public async verifyIdToken(idToken: string): Promise<{ googleSub: string } | null> {
    const googleSub = this.subjectsByToken[idToken];
    return googleSub ? { googleSub } : null;
  }
}

function fakeGoogleIdToken(audience: string): string {
  const encode = (value: Record<string, unknown>) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ aud: audience, iss: 'https://accounts.google.com', sub: 'google-sub-diagnostics' }),
    'unsigned'
  ].join('.');
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
    amountMinor: 5880,
    displayAmountMinor: 5841,
    payableAmountMinor: 5880,
    detectedAmountMinor: 5880,
    amountDeltaMinor: 0,
    amountRiskLabel: 'Montant exact attendu reconnu',
    currency: 'RUB',
    bankProfileId: 'sber_ru',
    directionLabel: 'incoming_customer_transfer',
    signalQuality: 72,
    score: 68,
    positiveReasonCodes: ['amount_exact', 'PAYABLE_AMOUNT_EXACT_MATCH', 'RECONCILIATION_AMOUNT_EXPECTED'],
    negativeReasonCodes: ['reference_not_observed'],
    senderPhoneMasked: '+7 *** *** **67',
    referenceCodeMasked: 'TANGO ALFA',
    createdAt: '2026-05-03T10:00:00.000Z'
  };
}

class FakeReviewRepository implements ReviewRepository {
  public readonly items = new Map<string, ReviewListItem>();
  public readonly actions: ReviewActionInput[] = [];

  public async createReview(input: ReviewCreateInput): Promise<{ kind: 'created'; reviewId: string }> {
    this.items.set(input.review.id, input.review);
    return { kind: 'created', reviewId: input.review.id };
  }

  public async listOpenReviews(merchantId: string): Promise<ReviewListItem[]> {
    return [...this.items.values()].filter((item) => item.merchantId === merchantId && item.status === 'open');
  }

  public async confirmReview(input: ReviewActionInput): Promise<ReviewActionResult> {
    this.actions.push(input);
    const review = this.items.get(input.reviewId);
    if (!review || review.merchantId !== input.merchantId) {
      return { kind: 'not_found' };
    }
    if (review.status !== 'open') {
      return { kind: 'not_open' };
    }
    review.status = 'confirmed';
    review.resolvedAt = '2026-05-03T10:01:00.000Z';
    return {
      kind: 'updated',
      reviewId: input.reviewId,
      status: 'confirmed',
      orderId: review.orderId,
      paymentSessionId: review.paymentSessionId,
      orderStatus: 'manual_confirmed',
      paymentSessionStatus: 'manual_confirmed',
      confirmationType: review.signalId ? 'notification_signal' : 'manual_bank_check'
    };
  }

  public async rejectReview(input: ReviewActionInput): Promise<ReviewActionResult> {
    this.actions.push(input);
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
    lifecycle_status: 'active',
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

  public async getCheckoutSessionById(paymentSessionId: string): Promise<{ order: StoredOrderRecord; paymentSession: StoredPaymentSessionRecord } | null> {
    return paymentSessionId === this.paymentSession.id
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

  public async deleteReceivingRoute(): Promise<ReceivingRouteMutationResult> {
    return { kind: 'updated', route: { ...this.route, enabled: false, recommended: false } };
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

  public async saveExpectedPaymentProfile(
    _input: Parameters<OrderRepository['saveExpectedPaymentProfile']>[0]
  ): Promise<PaymentSessionCheckoutMutationResult> {
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

  public async requestNoNotificationManualCheck(): Promise<NoNotificationManualCheckResult> {
    return { kind: 'not_found' };
  }
}

class FakeEventPublisher {
  public readonly events: EventEnvelope[] = [];

  public async publish(event: EventEnvelope): Promise<void> {
    this.events.push(event);
  }
}

class FakeMerchantMetricsRepository implements MerchantMetricsRepository {
  public readonly summaryRequests: Array<{ merchantId: string; range: MerchantMetricsRange }> = [];
  public readonly timeseriesRequests: Array<{ merchantId: string; range: MerchantMetricsRange; bucket: MerchantMetricsBucket }> = [];

  public async getSummary(input: { merchantId: string; range: MerchantMetricsRange; now: Date }): Promise<MerchantMetricsSummary> {
    void input.now;
    this.summaryRequests.push({ merchantId: input.merchantId, range: input.range });
    return {
      range: input.range,
      currency: 'RUB',
      confirmedPaymentCount: 18,
      confirmedAmountMinor: 4_250_000,
      pendingReviewCount: 7,
      rejectedPaymentCount: 3,
      expiredPaymentCount: 2,
      failedCount: 1,
      confirmationRate: 75,
      averageManualConfirmationDelaySeconds: 90
    };
  }

  public async getTimeseries(input: {
    merchantId: string;
    range: MerchantMetricsRange;
    bucket: MerchantMetricsBucket;
    now: Date;
  }): Promise<MerchantMetricsTimeseries> {
    void input.now;
    this.timeseriesRequests.push({ merchantId: input.merchantId, range: input.range, bucket: input.bucket });
    return {
      range: input.range,
      bucket: input.bucket,
      points: [
        {
          date: '2026-05-01',
          confirmedPaymentCount: 4,
          confirmedAmountMinor: 900_000,
          pendingReviewCount: 1,
          rejectedPaymentCount: 0,
          expiredPaymentCount: 0,
          confirmationRate: 100
        },
        {
          date: '2026-05-02',
          confirmedPaymentCount: 0,
          confirmedAmountMinor: 0,
          pendingReviewCount: 2,
          rejectedPaymentCount: 0,
          expiredPaymentCount: 0,
          confirmationRate: 0
        }
      ]
    };
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
