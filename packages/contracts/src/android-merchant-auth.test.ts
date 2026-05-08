import { describe, expect, it } from 'vitest';
import {
  AndroidMerchantAccountAuthPaths,
  AndroidMerchantAccountErrorCodes,
  AndroidMerchantDeviceLookupIntents,
  AndroidMerchantDeviceLookupStatuses,
  AndroidMerchantDeviceProofTypes,
  AndroidMerchantMobileSessionTokenTypes,
  AndroidMerchantPermissionProfiles,
  AndroidMerchantProfileTypes,
  buildAndroidMerchantAccountCreateResponse,
  buildAndroidMerchantDeviceLookupResponse,
  validateAndroidMerchantCreateAccountRequest,
  validateAndroidMerchantDeviceLookupRequest
} from './index.js';

describe('android merchant account auth contracts', () => {
  it('declares stable Android account auth endpoint paths', () => {
    expect(AndroidMerchantAccountAuthPaths.DEVICE_LOOKUP).toBe('/v1/android-merchant/auth/device-lookup');
    expect(AndroidMerchantAccountAuthPaths.CREATE_ACCOUNT).toBe('/v1/android-merchant/auth/create-account');
    expect(AndroidMerchantAccountAuthPaths.GOOGLE_EXCHANGE).toBe('/v1/android-merchant/auth/google/exchange');
    expect(AndroidMerchantAccountAuthPaths.GOOGLE_LINK).toBe('/v1/android-merchant/auth/google/link');
  });

  it('validates device lookup without raw device identifiers', () => {
    const valid = validateAndroidMerchantDeviceLookupRequest({
      lookup_intent: AndroidMerchantDeviceLookupIntents.RECOVER_ACCOUNT,
      device_proof: safeDeviceProof('install_public_key')
    });

    expect(valid).toEqual({
      valid: true,
      value: {
        lookup_intent: AndroidMerchantDeviceLookupIntents.RECOVER_ACCOUNT,
        device_proof: safeDeviceProof('install_public_key')
      }
    });

    expect(
      validateAndroidMerchantDeviceLookupRequest({
        lookup_intent: AndroidMerchantDeviceLookupIntents.CREATE_ACCOUNT,
        device_proof: safeDeviceProof('install_public_key'),
        android_id: 'raw-android-id'
      })
    ).toEqual({
      valid: false,
      code: AndroidMerchantAccountErrorCodes.RAW_DEVICE_IDENTIFIER_REJECTED,
      field: 'android_id'
    });
  });

  it('validates account creation without personal names or raw device identifiers', () => {
    expect(
      validateAndroidMerchantCreateAccountRequest({
        profile_type: AndroidMerchantProfileTypes.BUSINESS,
        business_label: 'Demo shop',
        device_proof: safeDeviceProof('business_device')
      })
    ).toEqual({
      valid: true,
      value: {
        profile_type: AndroidMerchantProfileTypes.BUSINESS,
        business_label: 'Demo shop',
        device_proof: safeDeviceProof('business_device')
      }
    });

    expect(
      validateAndroidMerchantCreateAccountRequest({
        profile_type: AndroidMerchantProfileTypes.PERSONAL,
        first_name: 'Ada',
        device_proof: safeDeviceProof('named_device')
      })
    ).toEqual({
      valid: false,
      code: AndroidMerchantAccountErrorCodes.MERCHANT_IDENTITY_NAME_REJECTED,
      field: 'first_name'
    });
  });

  it('builds Android account responses with recovery-only Google and non-confirming onboarding flags', () => {
    expect(
      buildAndroidMerchantDeviceLookupResponse({
        device_status: AndroidMerchantDeviceLookupStatuses.RECOVERY_REQUIRED,
        device_id: null,
        merchant_id: null
      })
    ).toEqual({
      device_status: AndroidMerchantDeviceLookupStatuses.RECOVERY_REQUIRED,
      device_id: null,
      merchant_id: null,
      recovery_required: true,
      recovery_options: ['google'],
      google_required: false,
      raw_device_identifiers_allowed: false,
      device_proof_type: AndroidMerchantDeviceProofTypes.INSTALL_KEYPAIR_SIGNED_CHALLENGE
    });

    const response = buildAndroidMerchantAccountCreateResponse({
      user_id: 'usr_01',
      merchant_id: 'mch_01',
      device_id: 'dev_01',
      profile_type: AndroidMerchantProfileTypes.PERSONAL,
      display_handle: 'merchant-12345678',
      permissions: ['payments.review.read', 'payments.review.reject'],
      mobile_session_token: 'spm_session',
      mobile_session_expires_at: '2026-05-08T12:00:00.000Z'
    });

    expect(response).toMatchObject({
      account: {
        permission_profile: AndroidMerchantPermissionProfiles.MERCHANT,
        collected_identity_fields: [],
        google_required: false
      },
      mobile_session: {
        token_type: AndroidMerchantMobileSessionTokenTypes.SWIMPAY_MOBILE_SESSION
      },
      onboarding: {
        starts_after_account_creation: true,
        android_confirms_payments: false
      }
    });
    expect(JSON.stringify(response)).not.toMatch(/first_name|last_name|admin|payment\.confirmed/iu);
  });
});

function safeDeviceProof(installPublicKey: string) {
  return {
    install_public_key: installPublicKey,
    challenge_id: 'challenge_01',
    challenge_signature: 'signature_01'
  };
}
