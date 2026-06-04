package com.swimpay.receiver

import java.util.Base64
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidMerchantApiWiringTest {
    @Test
    fun merchantAuthSessionKeepsTokensOutOfVisibleState() {
        val missing = AuthenticatedMerchantSession.missing()

        assertFalse(missing.isAuthenticated)
        assertEquals("Action requise", missing.merchantStatusLabel)
        assertFalse(missing.visibleTexts().joinToString(" ").contains("Bearer", ignoreCase = true))
        assertFalse(missing.visibleTexts().joinToString(" ").contains("test_", ignoreCase = true))

        val dev = AuthenticatedMerchantSession.localDev(merchantId = "mch_demo")

        assertTrue(dev.isAuthenticated)
        assertEquals("Bearer test_mch_demo", dev.authorizationHeader())
        assertTrue(dev.safeModeLabel.contains("local/dev"))
        assertFalse(dev.visibleTexts().joinToString(" ").contains("test_mch_demo"))

        val mobile = AuthenticatedMerchantSession.mobile(
            merchantId = "mch_mobile",
            mobileSessionToken = "spm_mobile_session_secret"
        )

        assertTrue(mobile.isAuthenticated)
        assertEquals("Bearer spm_mobile_session_secret", mobile.authorizationHeader())
        assertTrue(mobile.safeModeLabel.contains("mobile", ignoreCase = true))
        assertFalse(mobile.visibleTexts().joinToString(" ").contains("spm_mobile_session_secret"))
        assertFalse(mobile.toString().contains("spm_mobile_session_secret"))
    }

    @Test
    fun androidAuthRepositoryCreatesAccountsWithPrivacySafeDeviceProofOnly() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "device_status": "new_device",
                  "device_id": null,
                  "merchant_id": null,
                  "recovery_required": false,
                  "recovery_options": [],
                  "google_required": false,
                  "raw_device_identifiers_allowed": false,
                  "device_proof_type": "install_keypair_signed_challenge"
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                201,
                """
                {
                  "account": {
                    "user_id": "usr_mobile",
                    "merchant_id": "mch_mobile",
                    "profile_type": "business",
                    "display_handle": "merchant-12345678",
                    "permission_profile": "merchant",
                    "permissions": ["payments.review.read", "payments.review.reject"],
                    "collected_identity_fields": [],
                    "google_required": false
                  },
                  "device": {
                    "device_id": "dev_mobile",
                    "device_status": "known_device",
                    "raw_device_identifiers_allowed": false
                  },
                  "mobile_session": {
                    "token": "spm_created_secret",
                    "token_type": "swimpay_mobile_session",
                    "expires_at": "2026-06-07T00:00:00.000Z"
                  },
                  "onboarding": {
                    "starts_after_account_creation": true,
                    "android_confirms_payments": false
                  }
                }
                """.trimIndent()
            )
        )
        val repository = AndroidMerchantAuthApiRepository(
            transport = transport,
            deviceProofProvider = StaticAndroidMerchantDeviceProofProvider(
                AndroidMerchantDeviceProof(
                    installPublicKey = "install_public_key_demo",
                    challengeId = "challenge_01",
                    challengeSignature = "signature_01"
                )
            )
        )

        val lookup = repository.lookupDevice(AndroidMerchantDeviceLookupIntent.CREATE_ACCOUNT)
        assertEquals(AndroidMerchantDeviceLookupStatus.NEW_DEVICE, lookup.deviceStatus)
        assertFalse(lookup.recoveryRequired)
        assertEquals("/v1/android-merchant/auth/device-lookup", transport.requests[0].path)
        assertTrue(transport.requests[0].body.contains("\"lookup_intent\":\"create_account\""))
        assertTrue(transport.requests[0].body.contains("\"install_public_key\":\"install_public_key_demo\""))
        assertTrue(transport.requests[0].body.contains("\"challenge_id\":\"challenge_01\""))
        assertTrue(transport.requests[0].body.contains("\"challenge_signature\":\"signature_01\""))
        assertTrue(transport.requests[0].body.contains("\"device_proof_type\":\"install_keypair_signed_challenge\""))
        assertTrue(transport.requests[0].body.contains("\"signature_algorithm\":\"ecdsa_p256_sha256_der_v1\""))
        assertFalse(transport.requests[0].body.contains("private", ignoreCase = true))
        assertFalse(transport.requests[0].body.contains("secret", ignoreCase = true))

        val created = repository.createAccount(AndroidMerchantAccountProfileType.BUSINESS, businessLabel = "Commerce demo")
        assertEquals(AndroidMerchantAuthResultStatus.SUCCESS, created.status)
        val session = created.mobileSession
        requireNotNull(session)
        assertEquals("mch_mobile", session.merchantId)
        assertEquals("usr_mobile", session.userId)
        assertEquals("merchant-12345678", session.displayHandle)
        assertEquals("Bearer spm_created_secret", AuthenticatedMerchantSession.mobile(session).authorizationHeader())
        assertTrue(transport.requests[1].body.contains("\"profile_type\":\"business\""))
        assertTrue(transport.requests[1].body.contains("\"device_proof_type\":\"install_keypair_signed_challenge\""))
        assertTrue(transport.requests[1].body.contains("\"signature_algorithm\":\"ecdsa_p256_sha256_der_v1\""))
        assertFalse(transport.requests[1].body.contains("first_name", ignoreCase = true))
        assertFalse(transport.requests[1].body.contains("last_name", ignoreCase = true))
        assertFalse(transport.requests[1].body.contains("private", ignoreCase = true))
        assertFalse(created.visibleTexts().joinToString(" ").contains("spm_created_secret"))
        assertFalse(session.toString().contains("spm_created_secret"))
    }

    @Test
    fun androidAuthRepositoryTreatsGoogleAsRecoveryOnlyAndFailsClosedSafely() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                503,
                """
                {
                  "error": {
                    "code": "google_recovery_unconfigured",
                    "message": "Google recovery is not configured.",
                    "details": { "purpose": "account_recovery" }
                  }
                }
                """.trimIndent()
            )
        )
        val repository = AndroidMerchantAuthApiRepository(
            transport = transport,
            deviceProofProvider = StaticAndroidMerchantDeviceProofProvider(
                AndroidMerchantDeviceProof(
                    installPublicKey = "install_public_key_google",
                    challengeId = "challenge_google",
                    challengeSignature = "signature_google"
                )
            )
        )

        val recovery = repository.googleExchange("google_id_token_secret")

        assertEquals(AndroidMerchantAuthResultStatus.ACTION_REQUIRED, recovery.status)
        assertTrue(recovery.safeMessage.contains("Google"))
        assertEquals("/v1/android-merchant/auth/google/exchange", transport.requests.single().path)
        assertTrue(transport.requests.single().body.contains("\"id_token\":\"google_id_token_secret\""))
        assertFalse(recovery.visibleTexts().joinToString(" ").contains("google_id_token_secret"))
    }

    @Test
    fun androidAuthRepositoryRestoresKnownDeviceSessionWithoutGoogle() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "account": {
                    "user_id": "usr_known",
                    "merchant_id": "mch_known",
                    "profile_type": "personal",
                    "display_handle": "merchant-known",
                    "permission_profile": "merchant",
                    "permissions": ["payments.review.read"],
                    "collected_identity_fields": [],
                    "google_required": false
                  },
                  "device": {
                    "device_id": "dev_known",
                    "device_status": "known_device",
                    "raw_device_identifiers_allowed": false
                  },
                  "mobile_session": {
                    "token": "spm_known_secret",
                    "token_type": "swimpay_mobile_session",
                    "expires_at": "2026-06-07T00:00:00.000Z"
                  },
                  "onboarding": {
                    "starts_after_account_creation": true,
                    "android_confirms_payments": false
                  }
                }
                """.trimIndent()
            )
        )
        val repository = AndroidMerchantAuthApiRepository(
            transport = transport,
            deviceProofProvider = StaticAndroidMerchantDeviceProofProvider(
                AndroidMerchantDeviceProof(
                    installPublicKey = "install_public_key_known",
                    challengeId = "challenge_known",
                    challengeSignature = "signature_known"
                )
            )
        )

        val recovery = repository.recoverKnownDevice()

        assertEquals(AndroidMerchantAuthResultStatus.SUCCESS, recovery.status)
        val session = recovery.mobileSession
        requireNotNull(session)
        assertEquals("mch_known", session.merchantId)
        assertEquals("usr_known", session.userId)
        assertEquals("Bearer spm_known_secret", AuthenticatedMerchantSession.mobile(session).authorizationHeader())
        assertEquals("/v1/android-merchant/auth/device-recover", transport.requests.single().path)
        assertTrue(transport.requests.single().body.contains("\"device_proof_type\":\"install_keypair_signed_challenge\""))
        assertFalse(recovery.visibleTexts().joinToString(" ").contains("spm_known_secret"))
        assertFalse(session.toString().contains("spm_known_secret"))
    }

    @Test
    fun androidAuthRepositoryReportsSafeGoogleBackendFailureReason() {
        val tokenRejected = googleRepositoryWithResponse(
            MerchantApiResponse(
                401,
                """
                {
                  "error": {
                    "code": "invalid_request",
                    "message": "Google ID token could not be verified.",
                    "details": { "provider": "google", "purpose": "account_recovery_linking" }
                  }
                }
                """.trimIndent()
            )
        ).googleLink(AuthenticatedMerchantSession.mobile("mch_google", "spm_google_session_secret"), "google_id_token_secret")

        assertEquals(AndroidMerchantAuthResultStatus.ACTION_REQUIRED, tokenRejected.status)
        assertEquals("ID Google rejeté par le backend.", tokenRejected.safeMessage)
        assertFalse(tokenRejected.visibleTexts().joinToString(" ").contains("google_id_token_secret"))

        val audienceMissing = googleRepositoryWithResponse(
            MerchantApiResponse(
                401,
                """
                {
                  "error": {
                    "code": "google_id_token_rejected",
                    "message": "Google ID token could not be verified.",
                    "details": {
                      "provider": "google",
                      "purpose": "account_recovery_linking",
                      "token_audience_configured": false,
                      "token_audience_hint": "98304953...usercontent.com"
                    }
                  }
                }
                """.trimIndent()
            )
        ).googleLink(AuthenticatedMerchantSession.mobile("mch_google", "spm_google_session_secret"), "google_id_token_secret")

        assertEquals(AndroidMerchantAuthResultStatus.ACTION_REQUIRED, audienceMissing.status)
        assertEquals("Client Google non configuré côté backend.", audienceMissing.safeMessage)
        assertFalse(audienceMissing.visibleTexts().joinToString(" ").contains("google_id_token_secret"))
        assertFalse(audienceMissing.visibleTexts().joinToString(" ").contains("98304953"))

        val audienceConfigured = googleRepositoryWithResponse(
            MerchantApiResponse(
                401,
                """
                {
                  "error": {
                    "code": "google_id_token_rejected",
                    "message": "Google ID token could not be verified.",
                    "details": {
                      "provider": "google",
                      "purpose": "account_recovery_linking",
                      "token_audience_configured": true
                    }
                  }
                }
                """.trimIndent()
            )
        ).googleLink(AuthenticatedMerchantSession.mobile("mch_google", "spm_google_session_secret"), "google_id_token_secret")

        assertEquals(AndroidMerchantAuthResultStatus.ACTION_REQUIRED, audienceConfigured.status)
        assertEquals("ID Google reconnu, vérification serveur échouée.", audienceConfigured.safeMessage)
        assertFalse(audienceConfigured.visibleTexts().joinToString(" ").contains("google_id_token_secret"))

        val conflict = googleRepositoryWithResponse(
            MerchantApiResponse(
                409,
                """
                {
                  "error": {
                    "code": "invalid_request",
                    "message": "Google account is already linked to another SwimPay profile.",
                    "details": { "provider": "google", "purpose": "account_recovery_linking" }
                  }
                }
                """.trimIndent()
            )
        ).googleLink(AuthenticatedMerchantSession.mobile("mch_google", "spm_google_session_secret"), "google_id_token_secret")

        assertEquals(AndroidMerchantAuthResultStatus.ACTION_REQUIRED, conflict.status)
        assertEquals("Ce compte Google est déjà lié à un autre profil SwimPay.", conflict.safeMessage)
        assertFalse(conflict.visibleTexts().joinToString(" ").contains("google_id_token_secret"))

        val backendTimeout = googleRepositoryWithResponse(
            MerchantApiResponse(
                503,
                """
                {
                  "error": {
                    "code": "backend_unreachable"
                  }
                }
                """.trimIndent()
            )
        ).googleLink(AuthenticatedMerchantSession.mobile("mch_google", "spm_google_session_secret"), "google_id_token_secret")

        assertEquals(AndroidMerchantAuthResultStatus.ACTION_REQUIRED, backendTimeout.status)
        assertEquals("Backend staging injoignable depuis l'app.", backendTimeout.safeMessage)
        assertFalse(backendTimeout.visibleTexts().joinToString(" ").contains("google_id_token_secret"))
    }

    @Test
    fun merchantHttpTransportAllowsGoogleVerificationLatency() {
        assertTrue(HttpUrlConnectionMerchantApiTransport.DEFAULT_TIMEOUT_MS >= 20_000)
    }

    @Test
    fun googleIdTokenAudienceDiagnosticExtractsAudienceOnly() {
        val payload = Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString("""{"aud":"web-client.apps.googleusercontent.com","sub":"do-not-log"}""".toByteArray())

        assertEquals(
            "web-client.apps.googleusercontent.com",
            extractGoogleIdTokenAudienceForDiagnostics("header.$payload.signature")
        )
    }

    @Test
    fun androidAuthRepositoryRestoresMobileSessionFromGoogleExchangeWhenBackendReturnsOne() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "account": {
                    "user_id": "usr_recovered",
                    "merchant_id": "mch_recovered",
                    "profile_type": "personal",
                    "display_handle": "merchant-recover",
                    "permission_profile": "merchant",
                    "permissions": ["payments.review.read"],
                    "collected_identity_fields": [],
                    "google_required": false
                  },
                  "device": {
                    "device_id": "dev_recovered",
                    "device_status": "known_device",
                    "raw_device_identifiers_allowed": false
                  },
                  "mobile_session": {
                    "token": "spm_recovered_secret",
                    "token_type": "swimpay_mobile_session",
                    "expires_at": "2026-06-07T00:00:00.000Z"
                  },
                  "onboarding": {
                    "starts_after_account_creation": true,
                    "android_confirms_payments": false
                  }
                }
                """.trimIndent()
            )
        )
        val repository = AndroidMerchantAuthApiRepository(
            transport = transport,
            deviceProofProvider = StaticAndroidMerchantDeviceProofProvider(
                AndroidMerchantDeviceProof(
                    installPublicKey = "install_public_key_recovery",
                    challengeId = "challenge_recovery",
                    challengeSignature = "signature_recovery"
                )
            )
        )

        val recovery = repository.googleExchange("google_id_token_secret")

        assertEquals(AndroidMerchantAuthResultStatus.SUCCESS, recovery.status)
        val session = recovery.mobileSession
        requireNotNull(session)
        assertEquals("mch_recovered", session.merchantId)
        assertEquals("usr_recovered", session.userId)
        assertEquals("merchant-recover", session.displayHandle)
        assertEquals("Bearer spm_recovered_secret", AuthenticatedMerchantSession.mobile(session).authorizationHeader())
        assertFalse(recovery.visibleTexts().joinToString(" ").contains("spm_recovered_secret"))
        assertFalse(recovery.visibleTexts().joinToString(" ").contains("google_id_token_secret"))
        assertFalse(session.toString().contains("spm_recovered_secret"))
    }

    @Test
    fun androidAccountEntryContractRequiresDeviceLookupForCreateAndRecoveryEntry() {
        val contract = AndroidMerchantAccountEntryContract.current()

        assertEquals(AndroidMerchantAuthApiContract.DEVICE_LOOKUP_PATH, contract.deviceLookupPath)
        assertEquals(AndroidMerchantAuthApiContract.DEVICE_RECOVER_PATH, contract.deviceRecoverPath)
        assertTrue(contract.lookupIntents.contains(AndroidMerchantDeviceLookupIntent.CREATE_ACCOUNT))
        assertTrue(contract.lookupIntents.contains(AndroidMerchantDeviceLookupIntent.RECOVER_ACCOUNT))
        assertTrue(contract.deviceLookupRequiredBeforeCreateAccount)
        assertTrue(contract.deviceLookupRequiredBeforeGoogleRecovery)
        assertFalse(contract.googleRequiredForCreateAccount)
        assertFalse(contract.rawDeviceIdentifiersAllowed)
    }

    private fun googleRepositoryWithResponse(response: MerchantApiResponse): AndroidMerchantAuthApiRepository {
        return AndroidMerchantAuthApiRepository(
            transport = RecordingMerchantApiTransport(response),
            deviceProofProvider = StaticAndroidMerchantDeviceProofProvider(
                AndroidMerchantDeviceProof(
                    installPublicKey = "install_public_key_google",
                    challengeId = "challenge_google",
                    challengeSignature = "signature_google"
                )
            )
        )
    }

    @Test
    fun receiverDeviceRepositoryRegistersAndHeartbeatsWithMobileSession() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                201,
                """
                {
                  "device_id": "dev_receiver_mobile",
                  "merchant_id": "mch_mobile",
                  "status": "pending",
                  "server_time": "2026-05-08T12:00:00.000Z",
                  "required_capabilities": ["notification_access", "signed_signal_upload", "local_redaction"]
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "device_id": "dev_receiver_mobile",
                  "device_status": "active",
                  "status": "active",
                  "server_time": "2026-05-08T12:00:01.000Z",
                  "receiver_mode": "active",
                  "warnings": [],
                  "required_actions": []
                }
                """.trimIndent()
            )
        )
        val repository = AndroidReceiverDeviceApiRepository(
            transport = transport,
            backendBaseUrl = "https://staging.swimpay.pro/"
        )
        val session = AuthenticatedMerchantSession.mobile(
            merchantId = "mch_mobile",
            mobileSessionToken = "spm_mobile_session_secret"
        )

        val result = repository.registerAndHeartbeat(
            session = session,
            enabledBankProfileIds = setOf("sber_ru", "unsupported_bank"),
            publicKeyPem = receiverPublicKeyPem(),
            notificationAccessEnabled = true,
            appVersion = "0.1.0",
            androidVersion = "15"
        )

        assertEquals(AndroidMerchantAuthResultStatus.SUCCESS, result.status)
        assertEquals("dev_receiver_mobile", result.deviceState?.deviceId)
        assertEquals("active", result.deviceState?.deviceStatus)
        assertEquals("https://staging.swimpay.pro", result.deviceState?.backendBaseUrl)
        assertEquals("Bearer spm_mobile_session_secret", transport.requests[0].headers["Authorization"])
        assertEquals("/v1/receiver-devices/register", transport.requests[0].path)
        assertEquals("/v1/receiver-devices/heartbeat", transport.requests[1].path)
        assertTrue(transport.requests[0].body.contains("\"selected_banks\":[\"sber_ru\"]"))
        assertTrue(transport.requests[0].body.contains("-----BEGIN PUBLIC KEY-----"))
        assertFalse(transport.requests[0].body.contains("spk_runtime_signing_key"))
        assertTrue(transport.requests[1].body.contains("\"allowed_bank_profile_ids\":[\"sber_ru\"]"))
        assertFalse(result.safeMessage.contains("spk_runtime_signing_key"))
    }

    @Test
    fun androidAuthRepositoryLinksGoogleThroughBackendWithoutExposingTokenInResult() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "linked": true,
                  "provider": "google",
                  "purpose": "account_recovery",
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            )
        )
        val repository = AndroidMerchantAuthApiRepository(
            transport = transport,
            deviceProofProvider = StaticAndroidMerchantDeviceProofProvider(
                AndroidMerchantDeviceProof(
                    installPublicKey = "install_public_key_link",
                    challengeId = "challenge_link",
                    challengeSignature = "signature_link"
                )
            )
        )
        val session = AuthenticatedMerchantSession.mobile(
            merchantId = "mch_mobile",
            mobileSessionToken = "spm_mobile_session_secret"
        )

        val linked = repository.googleLink(session, "google_id_token_secret")

        assertEquals(AndroidMerchantAuthResultStatus.SUCCESS, linked.status)
        assertEquals(AndroidMerchantAuthApiContract.GOOGLE_LINK_PATH, transport.requests.single().path)
        assertEquals("Bearer spm_mobile_session_secret", transport.requests.single().headers["Authorization"])
        assertTrue(transport.requests.single().body.contains("\"id_token\":\"google_id_token_secret\""))
        assertFalse(linked.visibleTexts().joinToString(" ").contains("google_id_token_secret"))
        assertFalse(linked.visibleTexts().joinToString(" ").contains("spm_mobile_session_secret"))
    }

    @Test
    fun androidMerchantBackendConfigAcceptsStagingHttpsAndLocalAdbReverseOnly() {
        assertEquals(
            "https://staging.swimpay.pro",
            AndroidMerchantBackendConfig.normalizeBaseUrl(" https://staging.swimpay.pro/ ")
        )
        assertEquals(
            "http://127.0.0.1:8080",
            AndroidMerchantBackendConfig.normalizeBaseUrl("http://127.0.0.1:8080/")
        )

        var rejected = false
        try {
            AndroidMerchantBackendConfig.normalizeBaseUrl("http://staging.swimpay.pro")
        } catch (_: IllegalArgumentException) {
            rejected = true
        }
        assertTrue("external Android backend URLs must use HTTPS", rejected)
    }

    @Test
    fun receivingMethodsRepositoryMapsBackendRoutesAndClearsRawSubmissionValues() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "routes": [
                    {
                      "route_id": "route_card_1",
                      "bank_profile_id": "sber_ru",
                      "rail_type": "card_transfer",
                      "receiver_identifier_masked": "•••• 4821",
                      "route_code": "SBER-CARD",
                      "enabled": true,
                      "recommended": true,
                      "review_policy": "review_first"
                    }
                  ],
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                201,
                """
                {
                  "route": {
                    "route_id": "route_card_2",
                    "bank_profile_id": "sber_ru",
                    "rail_type": "card_transfer",
                    "receiver_identifier_masked": "•••• 9911",
                    "route_code": "SBER-CARD-2",
                    "enabled": true,
                    "recommended": false,
                    "review_policy": "review_first"
                  },
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "route": {
                    "route_id": "route_card_2",
                    "bank_profile_id": "sber_ru",
                    "rail_type": "card_transfer",
                    "receiver_identifier_masked": "•••• 9911",
                    "route_code": "SBER-CARD-2",
                    "enabled": false,
                    "recommended": false,
                    "review_policy": "review_first"
                  },
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "method": {
                    "id": "route_card_2",
                    "type": "card",
                    "bank_id": "sber_ru",
                    "label": "Carte magasin",
                    "masked_value": "•••• 9911",
                    "last4": "9911",
                    "status": "active",
                    "is_default": false
                  },
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "method": {
                    "id": "route_card_2",
                    "type": "card",
                    "bank_id": "sber_ru",
                    "label": "Carte magasin",
                    "masked_value": "•••• 9911",
                    "last4": "9911",
                    "status": "active",
                    "is_default": true
                  },
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "method": {
                    "id": "route_card_2",
                    "type": "card",
                    "bank_id": "sber_ru",
                    "label": "Carte magasin",
                    "masked_value": "•••• 9911",
                    "last4": "9911",
                    "status": "deleted",
                    "lifecycle_status": "deleted",
                    "is_default": false
                  },
                  "deleted": true,
                  "deleted_method_id": "route_card_2",
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            )
        )
        val repository = MerchantReceivingMethodsApiRepository(transport)
        val session = AuthenticatedMerchantSession.localDev("mch_demo")

        val list = repository.list(session)
        assertEquals(MerchantRepositoryState.SUCCESS, list.state)
        assertEquals("Carte bancaire", list.items.single().title)
        assertEquals("Sberbank · •••• 4821", list.items.single().subtitle)
        assertFalse(list.visibleTexts().joinToString(" ").contains("2200123412344821"))
        assertEquals("GET", transport.requests[0].method)
        assertEquals("/v1/merchant/receiving-methods", transport.requests[0].path)
        assertEquals("Bearer test_mch_demo", transport.requests[0].headers["Authorization"])

        val draft = MerchantReceivingMethodSubmission(
            bankProfileId = "sber_ru",
            type = ReceivingMethodType.CARD_TRANSFER,
            rawIdentifier = "2200123412349911",
            routeCode = "SBER-CARD-2",
            displayLabel = "Sberbank"
        )
        val created = repository.create(session, draft)
        assertEquals(MerchantRepositoryState.SUCCESS, created.state)
        assertEquals("", created.clearedSubmission.rawIdentifier)
        assertFalse(created.visibleTexts().joinToString(" ").contains("2200123412349911"))
        assertEquals("/v1/merchant/receiving-methods", transport.requests[1].path)
        assertTrue(transport.requests[1].body.contains("\"type\":\"card\""))
        assertTrue(transport.requests[1].body.contains("\"value\":\"2200123412349911\""))
        assertTrue(transport.requests[1].body.contains("\"bank_id\":\"sber_ru\""))
        assertFalse(transport.requests[1].body.contains("route_code"))
        assertFalse(transport.requests[1].body.contains("receiver_identifier"))

        val disabled = repository.disable(session, "route_card_2")
        assertEquals(MerchantRepositoryState.SUCCESS, disabled.state)
        assertEquals("/v1/merchant/receiving-methods/route_card_2/disable", transport.requests[2].path)

        val updated = repository.updateLabel(session, "route_card_2", "Carte magasin")
        assertEquals(MerchantRepositoryState.SUCCESS, updated.state)
        assertEquals("PATCH", transport.requests[3].method)
        assertEquals("/v1/merchant/receiving-methods/route_card_2", transport.requests[3].path)
        assertTrue(transport.requests[3].body.contains("\"label\":\"Carte magasin\""))

        val recommended = repository.markRecommended(session, "route_card_2")
        assertEquals(MerchantRepositoryState.SUCCESS, recommended.state)
        assertEquals("POST", transport.requests[4].method)
        assertEquals("/v1/merchant/receiving-methods/route_card_2/set-default", transport.requests[4].path)

        val deleted = repository.delete(session, "route_card_2")
        assertEquals(MerchantRepositoryState.SUCCESS, deleted.state)
        assertEquals("Désactivée", deleted.display?.status)
        assertEquals("DELETE", transport.requests[5].method)
        assertEquals("/v1/merchant/receiving-methods/route_card_2", transport.requests[5].path)
    }

    @Test
    fun receivingMethodDeleteRequiresBackendDeletedContract() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "method": {
                    "id": "route_card_2",
                    "type": "card",
                    "bank_id": "sber_ru",
                    "label": "Carte magasin",
                    "masked_value": "â€¢â€¢â€¢â€¢ 9911",
                    "last4": "9911",
                    "status": "inactive",
                    "is_default": false
                  },
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            )
        )
        val repository = MerchantReceivingMethodsApiRepository(transport)
        val result = repository.delete(AuthenticatedMerchantSession.localDev("mch_demo"), "route_card_2")

        assertEquals(MerchantRepositoryState.ERROR, result.state)
        assertEquals("Suppression non confirmee", result.safeMessage)
        assertEquals("DELETE", transport.requests.single().method)
        assertEquals("/v1/merchant/receiving-methods/route_card_2", transport.requests.single().path)
    }

    @Test
    fun receivingMethodDraftGeneratesCreatePayloadAndVisibleStateWithoutRawIdentifier() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                201,
                """
                {
                  "route": {
                    "route_id": "route_phone_1",
                    "bank_profile_id": "tbank_ru",
                    "rail_type": "phone_transfer",
                    "receiver_identifier_masked": "+7 *** *** 45-67",
                    "route_code": "TBANK-PHONE",
                    "display_label": "T-Bank - Numéro de téléphone",
                    "enabled": true,
                    "recommended": false,
                    "review_policy": "eligible_low_risk_later"
                  },
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            )
        )
        val repository = MerchantReceivingMethodsApiRepository(transport)
        val session = AuthenticatedMerchantSession.localDev("mch_demo")
        val draft = MerchantReceivingMethodDraft(
            bankProfileId = "tbank_ru",
            type = ReceivingMethodType.PHONE_TRANSFER,
            rawIdentifierInput = "+7 999 123-45-67"
        )

        val submission = draft.toSubmission()
        val created = repository.create(session, submission)

        assertEquals("tbank_ru", submission.bankProfileId)
        assertEquals(ReceivingMethodType.PHONE_TRANSFER, submission.type)
        assertEquals("+7 999 123-45-67", submission.rawIdentifier)
        assertEquals("TBANK-PHONE", submission.routeCode)
        assertEquals("T-Bank - Numéro de téléphone", submission.displayLabel)
        assertEquals(MerchantRepositoryState.SUCCESS, created.state)
        assertEquals("", created.clearedSubmission.rawIdentifier)
        assertEquals("", created.clearedSubmission.rawIdentifierInput)
        assertFalse(created.visibleTexts().joinToString(" ").contains("+7 999 123-45-67"))
        assertFalse(created.visibleTexts().joinToString(" ").contains("9991234567"))
        assertFalse(created.visibleTexts().joinToString(" ").contains("sbp_transfer", ignoreCase = true))

        val body = transport.requests.single().body
        assertTrue(body.contains("\"bank_id\":\"tbank_ru\""))
        assertTrue(body.contains("\"type\":\"phone\""))
        assertTrue(body.contains("\"value\":\"+7 999 123-45-67\""))
        assertTrue(body.contains("\"label\":\"T-Bank - Numéro de téléphone\""))
        assertFalse(body.contains("route_code"))
        assertFalse(body.contains("receiver_identifier"))
        assertFalse(body.contains("sbp_transfer"))
    }

    @Test
    fun ozonBankReceivingMethodDraftUsesSupportedLabelAndCode() {
        val draft = MerchantReceivingMethodDraft(
            bankProfileId = "ozon_bank",
            type = ReceivingMethodType.CARD_TRANSFER,
            rawIdentifierInput = "2200123412349911"
        )

        val submission = draft.toSubmission()

        assertEquals("ozon_bank", submission.bankProfileId)
        assertEquals("OZON-CARD", submission.routeCode)
        assertEquals("Ozon Банк - Carte bancaire", submission.displayLabel)
    }

    @Test
    fun receivingMethodRepositoryRejectsInvalidLocalDraftBeforeNetworkSubmit() {
        val transport = RecordingMerchantApiTransport()
        val repository = MerchantReceivingMethodsApiRepository(transport)
        val session = AuthenticatedMerchantSession.localDev("mch_demo")

        val invalidCard = repository.create(
            session,
            MerchantReceivingMethodSubmission(
                bankProfileId = "sber_ru",
                type = ReceivingMethodType.CARD_TRANSFER,
                rawIdentifier = "4242",
                routeCode = "SBER-CARD",
                displayLabel = "Sberbank"
            )
        )
        val invalidPhone = repository.create(
            session,
            MerchantReceivingMethodSubmission(
                bankProfileId = "sber_ru",
                type = ReceivingMethodType.PHONE_TRANSFER,
                rawIdentifier = "12345",
                routeCode = "SBER-PHONE",
                displayLabel = "Sberbank"
            )
        )

        assertEquals(MerchantRepositoryState.ERROR, invalidCard.state)
        assertEquals(MerchantRepositoryState.ERROR, invalidPhone.state)
        assertTrue(transport.requests.isEmpty())
        assertFalse(invalidCard.visibleTexts().joinToString(" ").contains("4242"))
        assertFalse(invalidPhone.visibleTexts().joinToString(" ").contains("12345"))
    }

    @Test
    fun reviewQueueAndActionsUseBackendEndpointsWithoutOrderRejectByDefaultOrWebhooks() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "reviews": [
                    {
                      "review_id": "rev_01",
                      "status": "open",
                      "reason_code": "receiver_route_review_only",
                      "order_id": "ord_01",
                      "payment_session_id": "ps_01",
                      "signal_id": "sig_01",
                      "amount": { "value": "58.41", "currency": "RUB" },
                      "bank_profile_id": "sber_ru",
                      "negative_reasons": ["reference_not_observed"],
                      "positive_reasons": []
                    }
                  ]
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "review_id": "rev_02",
                  "status": "rejected",
                  "order_id": "ord_02",
                  "payment_session_id": "ps_02",
                  "order_status": "needs_review",
                  "payment_session_status": "needs_review",
                  "rejection_scope": "signal"
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "review_id": "rev_03",
                  "status": "rejected",
                  "order_id": "ord_03",
                  "payment_session_id": "ps_03",
                  "order_status": "rejected",
                  "payment_session_status": "rejected",
                  "rejection_scope": "order"
                }
                """.trimIndent()
            )
        )
        val session = AuthenticatedMerchantSession.localDev("mch_demo")
        val queueRepository = MerchantReviewQueueApiRepository(transport)
        val actionsRepository = MerchantReviewActionsApiRepository(transport)

        val queue = queueRepository.list(session)
        assertEquals(MerchantRepositoryState.SUCCESS, queue.state)
        assertEquals("58,41 ₽", queue.items.single().amountLabel)
        assertEquals("Sberbank", queue.items.single().bankDisplayName)
        assertTrue(queue.items.single().reasonLabels.contains("Validation manuelle en bêta"))
        assertTrue(queue.items.single().reasonLabels.contains("Référence non visible"))
        assertFalse(queue.visibleTexts().joinToString(" ").contains("receiver_route_review_only"))

        val signalRejected = actionsRepository.rejectSignal(session, "rev_02")
        assertFalse(signalRejected.rejectsOrder)
        assertEquals("POST", transport.requests[1].method)
        assertEquals("/v1/reviews/rev_02/reject", transport.requests[1].path)
        assertTrue(transport.requests[1].body.contains("\"scope\":\"signal\""))
        assertFalse(transport.requests[1].body.contains("\"actor_id\""))

        val orderRejected = actionsRepository.rejectOrder(session, "rev_03")
        assertTrue(orderRejected.rejectsOrder)
        assertTrue(transport.requests[2].body.contains("\"scope\":\"order\""))
        assertFalse(transport.requests[2].body.contains("\"actor_id\""))
        assertFalse(actionsRepository.sendsDeveloperWebhookDirectly)
    }

    @Test
    fun reviewQueueLabelsNoNotificationFallbackAsManualBankCheck() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "reviews": [
                    {
                      "review_id": "rev_manual_check",
                      "status": "open",
                      "reason_code": "NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT",
                      "order_id": "ord_01",
                      "payment_session_id": "ps_01",
                      "signal_id": null,
                      "amount": { "value": "299.80", "currency": "RUB" },
                      "bank_profile_id": "sber_ru",
                      "negative_reasons": ["NO_NOTIFICATION_AFTER_ARMED_PAYMENT_INTENT"],
                      "positive_reasons": []
                    }
                  ]
                }
                """.trimIndent()
            )
        )

        val queue = MerchantReviewQueueApiRepository(transport)
            .list(AuthenticatedMerchantSession.localDev("mch_demo"))

        assertEquals(MerchantRepositoryState.SUCCESS, queue.state)
        assertEquals("Vérification banque requise", queue.items.single().helper)
        assertTrue(queue.items.single().reasonLabels.contains("Aucun signal bancaire détecté"))
        assertFalse(queue.visibleTexts().joinToString(" ").contains("payment.confirmed"))
        assertFalse(queue.visibleTexts().joinToString(" ").contains("official_bank_confirmation", ignoreCase = true))
    }

    @Test
    fun mockOnlyRepositoriesAreExplicitAndSafeUntilBackendEndpointsExist() {
        val session = AuthenticatedMerchantSession.localDev("mch_demo")

        val dashboard = MerchantDashboardRepository.mockOnly().load(session)
        assertEquals(MerchantRepositoryState.SUCCESS, dashboard.state)
        assertTrue(dashboard.visibleTexts().contains("À vérifier"))
        assertFalse(dashboard.visibleTexts().joinToString(" ").contains("payment signal engine", ignoreCase = true))

        val connectedSite = MerchantConnectedSiteRepository.mockOnly().load(session, developerDetailsEnabled = false)
        assertEquals(MerchantRepositoryState.SUCCESS, connectedSite.state)
        assertTrue(connectedSite.visibleTexts().contains("Tester la connexion"))
        assertFalse(connectedSite.visibleTexts().joinToString(" ").contains("webhook_secret", ignoreCase = true))
        assertFalse(connectedSite.visibleTexts().joinToString(" ").contains("payment.confirmed"))

        val configTest = MerchantConfigurationTestRepository.mockOnly().run(
            session,
            MerchantConfigurationChecklist.allReady()
        )
        assertEquals(MerchantConfigurationTestOutcome.READY, configTest.outcome)
        assertFalse(configTest.confirmsRealPayment)
        assertTrue(configTest.visibleTexts().contains("SwimPay est prêt"))

        val contracts = AndroidMerchantFrontendContracts.sprint7EContracts()
        assertFalse(contracts.receivingMethods.usesMockRepository)
        assertFalse(contracts.reviewQueue.usesMockRepository)
        assertFalse(contracts.reviewActions.usesMockRepository)
        assertTrue(contracts.dashboardSummary.usesMockRepository)
        assertTrue(contracts.connectedSite.usesMockRepository)
        assertTrue(contracts.configurationTest.usesMockRepository)
    }

    @Test
    fun sprint7FRepositoriesCallMobileBackendGapEndpointsAndKeepUiSafe() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "payments_to_review_count": 1,
                  "confirmed_today_count": 24,
                  "notifications_sent_count": 31,
                  "receiver_status": { "status": "connected", "display": "Connect\u00e9" },
                  "recent_detected_payments": [
                    {
                      "review_id": "rev_01",
                      "amount": { "value": "58.41", "currency": "RUB" },
                      "bank_display_name": "Sberbank",
                      "status_label": "\u00c0 v\u00e9rifier",
                      "created_at": "2026-05-03T10:00:00.000Z"
                    }
                  ],
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "payment": {
                    "review_id": "rev_01",
                    "amount_displayed": { "value": "58.41", "currency": "RUB" },
                    "amount_expected": { "value": "58.80", "currency": "RUB" },
                    "amount_detected": { "value": "58.80", "currency": "RUB" },
                    "amount_delta": { "value": "0.00", "currency": "RUB" },
                    "amount_delta_minor": 0,
                    "risk_label": "Montant exact attendu reconnu",
                    "bank_display_name": "Sberbank",
                    "receiving_method_masked": "Carte bancaire \u00b7 \u2022\u2022\u2022\u2022 4821",
                    "payment_reference": "TANGO ALFA",
                    "signal_received_at": "2026-05-03T10:00:00.000Z",
                    "reason_labels": ["Montant exact attendu reconnu", "Micro-ajustement attendu", "Validation manuelle en b\u00eata", "R\u00e9f\u00e9rence non visible"],
                    "allowed_actions": ["reject_signal", "reject_order"]
                  },
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "webhook_url_display": "https://merchant.example/swimpay/webhook",
                  "status": "active",
                  "status_label": "Connexion active",
                  "latest_deliveries": [],
                  "developer_details": null,
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                202,
                """
                {
                  "status": "test_queued",
                  "delivery_id": "delivery_test_01",
                  "safe_status": "Notification envoy\u00e9e",
                  "android_sent_webhook_directly": false,
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "outcome": "ready",
                  "confirms_real_payment": false,
                  "emits_payment_confirmed_webhook": false,
                  "checklist": [
                    { "label": "T\u00e9l\u00e9phone connect\u00e9", "status": "passed" },
                    { "label": "Banque choisie", "status": "passed" },
                    { "label": "Moyen de r\u00e9ception ajout\u00e9", "status": "passed" },
                    { "label": "Webhook configur\u00e9", "status": "passed" }
                  ],
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            )
        )
        val session = AuthenticatedMerchantSession.localDev("mch_demo")

        val dashboard = MerchantDashboardApiRepository(transport).load(session)
        assertEquals(MerchantRepositoryState.SUCCESS, dashboard.state)
        assertFalse(dashboard.usesMockRepository)
        assertTrue(dashboard.visibleTexts().contains("Tableau de bord"))
        assertTrue(dashboard.visibleTexts().contains("58,41 \u20bd"))

        val detail = MerchantPaymentDetailApiRepository(transport).load(session, "rev_01")
        assertEquals(MerchantRepositoryState.SUCCESS, detail.state)
        assertTrue(detail.visibleTexts().contains("Montant affiché"))
        assertTrue(detail.visibleTexts().contains("58,41 \u20bd"))
        assertTrue(detail.visibleTexts().contains("Montant exact attendu"))
        assertTrue(detail.visibleTexts().contains("58,80 \u20bd"))
        assertTrue(detail.visibleTexts().contains("Écart"))
        assertTrue(detail.visibleTexts().contains("0,00 \u20bd"))
        assertTrue(detail.visibleTexts().contains("Risque"))
        assertTrue(detail.visibleTexts().contains("Montant exact attendu reconnu"))
        assertFalse(detail.visibleTexts().joinToString(" ").contains("receiver_route_review_only"))
        assertFalse(detail.visibleTexts().contains("Confirmer le paiement"))

        val connectedSite = MerchantConnectedSiteApiRepository(transport).load(session, developerDetailsEnabled = false)
        assertEquals(MerchantRepositoryState.SUCCESS, connectedSite.state)
        assertFalse(connectedSite.usesMockRepository)
        assertFalse(connectedSite.visibleTexts().joinToString(" ").contains("payment.confirmed"))

        val testResult = MerchantConnectedSiteApiRepository(transport).testConnection(session)
        assertEquals(MerchantRepositoryState.SUCCESS, testResult.state)
        assertFalse(testResult.sendsWebhookDirectlyFromAndroid)
        assertTrue(testResult.visibleTexts().contains("Notification envoy\u00e9e"))

        val config = MerchantConfigurationTestApiRepository(transport).run(
            session,
            MerchantConfigurationChecklist.allReady()
        )
        assertEquals(MerchantConfigurationTestOutcome.READY, config.outcome)
        assertFalse(config.usesMockRepository)
        assertFalse(config.confirmsRealPayment)

        assertEquals("/v1/android-merchant/dashboard-summary", transport.requests[0].path)
        assertEquals("/v1/android-merchant/payments/rev_01", transport.requests[1].path)
        assertEquals("/v1/android-merchant/connected-site", transport.requests[2].path)
        assertEquals("/v1/android-merchant/connected-site/test", transport.requests[3].path)
        assertEquals("/v1/android-merchant/configuration-test", transport.requests[4].path)

        val visible = listOf(
            dashboard.visibleTexts(),
            detail.visibleTexts(),
            connectedSite.visibleTexts(),
            testResult.visibleTexts(),
            config.visibleTexts()
        ).flatten().joinToString(" ")
        assertFalse(visible.contains("2200123412344821"))
        assertFalse(visible.contains("+79991234567"))
        assertFalse(visible.contains("webhook_secret", ignoreCase = true))
        assertFalse(visible.contains("official_bank_confirmation", ignoreCase = true))
    }

    @Test
    fun sprint7FContractsDowngradeClosedGapsFromMockToLive() {
        val contracts = AndroidMerchantFrontendContracts.sprint7FContracts()

        assertFalse(contracts.dashboardSummary.usesMockRepository)
        assertFalse(contracts.paymentDetail.usesMockRepository)
        assertFalse(contracts.connectedSite.usesMockRepository)
        assertFalse(contracts.configurationTest.usesMockRepository)
        assertTrue(contracts.missingBackendEndpoints.isEmpty())
    }

    @Test
    fun developerIntegrationRepositoryUsesBackendWizardContractsAndShowOnceSecretsOnlyOnActions() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "merchant_id": "mch_mobile",
                  "public_key": "pk_test_mobile",
                  "secret_key_masked": "sk_\u2022\u2022\u20221234",
                  "webhook_secret_masked": "whsec_\u2022\u2022\u20229876",
                  "webhook_url": "https://merchant.example/swimpay/webhook",
                  "webhook_status": "active",
                  "public_webhook_events": ["payment.confirmed", "payment.rejected", "payment.expired"],
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                201,
                """
                {
                  "merchant_id": "mch_mobile",
                  "public_key": "pk_test_mobile",
                  "secret_key_masked": "sk_\u2022\u2022\u20225678",
                  "secret_key_once": "sk_test_show_once_android",
                  "secret_key_show_once": true,
                  "webhook_secret_masked": "whsec_\u2022\u20229876",
                  "webhook_url": "https://merchant.example/swimpay/webhook",
                  "webhook_status": "active",
                  "public_webhook_events": ["payment.confirmed", "payment.rejected", "payment.expired"],
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "merchant_id": "mch_mobile",
                  "public_key": "pk_test_mobile",
                  "secret_key_masked": "sk_\u2022\u2022\u20225678",
                  "webhook_secret_masked": "whsec_\u2022\u20224321",
                  "webhook_secret_once": "whsec_show_once_android",
                  "webhook_secret_show_once": true,
                  "webhook_url": "https://merchant.example/swimpay/webhook",
                  "webhook_status": "active",
                  "public_webhook_events": ["payment.confirmed", "payment.rejected", "payment.expired"],
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                202,
                """
                {
                  "status": "test_queued",
                  "safe_status": "Safe test webhook queued.",
                  "test_only": true,
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            )
        )
        val session = AuthenticatedMerchantSession.mobile("mch_mobile", "spm_mobile_session_secret")
        val repository = MerchantDeveloperIntegrationApiRepository(transport)

        val loaded = repository.load(session)
        assertEquals(MerchantRepositoryState.SUCCESS, loaded.state)
        assertEquals("pk_test_mobile", loaded.integration?.publicKey)
        assertEquals(null, loaded.integration?.secretKeyOnce)
        assertTrue(loaded.integration?.exportLines()?.contains("SWIMPAY_SECRET_KEY=sk_\u2022\u2022\u20221234") == true)

        val created = repository.createApiKey(session)
        assertEquals(MerchantRepositoryState.SUCCESS, created.state)
        assertEquals("sk_test_show_once_android", created.integration?.secretKeyOnce)
        assertTrue(created.integration?.showOnceSecrets()?.joinToString(" ").orEmpty().contains("sk_test_show_once_android"))
        assertFalse(created.integration?.exportLines()?.joinToString(" ").orEmpty().contains("sk_test_show_once_android"))
        assertTrue(created.integration?.copyExportLines()?.joinToString(" ").orEmpty().contains("SWIMPAY_SECRET_KEY=sk_test_show_once_android"))
        assertTrue(created.integration?.copyExportLines()?.joinToString("\n").orEmpty().contains("SWIMPAY_MERCHANT_ID=mch_mobile"))
        assertTrue(created.integration?.copyExportLines()?.joinToString("\n").orEmpty().contains("SWIMPAY_PUBLIC_KEY=pk_test_mobile"))
        assertTrue(created.integration?.copyExportLines()?.joinToString("\n").orEmpty().contains("SWIMPAY_SECRET_KEY_VISIBLE=sk_\u2022\u2022\u20225678"))
        assertTrue(created.integration?.copyExportLines()?.joinToString("\n").orEmpty().contains("SWIMPAY_WEBHOOK_SECRET_VISIBLE=whsec_"))
        assertTrue(created.integration?.copyExportLines()?.joinToString("\n").orEmpty().contains("SWIMPAY_WEBHOOK_STATUS=active"))
        assertTrue(created.integration?.copyExportLines()?.joinToString("\n").orEmpty().contains("SWIMPAY_INTEGRATION_TYPE=both"))
        assertTrue(created.integration?.exportLines()?.contains("SWIMPAY_SECRET_KEY=sk_\u2022\u2022\u20225678") == true)
        assertFalse(created.integration?.copyExportLines(
            merchantAuthorizationHeaderForCopy = "Bearer spm_mobile_session_secret"
        )?.joinToString(" ").orEmpty().contains("SWIMPAY_MERCHANT_AUTHORIZATION=Bearer spm_mobile_session_secret"))
        assertFalse(created.integration?.copyExportLines(
            merchantAuthorizationHeaderForCopy = "Bearer spm_mobile_session_secret"
        )?.joinToString(" ").orEmpty().contains("Bearer spm_mobile_session_secret"))

        val webhookSecret = repository.rotateWebhookSecret(session)
        assertEquals(MerchantRepositoryState.SUCCESS, webhookSecret.state)
        assertEquals("whsec_show_once_android", webhookSecret.integration?.webhookSecretOnce)
        assertTrue(webhookSecret.integration?.showOnceSecrets()?.joinToString(" ").orEmpty().contains("whsec_show_once_android"))
        assertFalse(webhookSecret.integration?.exportLines()?.joinToString(" ").orEmpty().contains("whsec_show_once_android"))
        assertTrue(webhookSecret.integration?.copyExportLines()?.joinToString(" ").orEmpty().contains("SWIMPAY_WEBHOOK_SECRET=whsec_show_once_android"))

        val testWebhook = repository.testWebhook(session)
        assertEquals(MerchantRepositoryState.SUCCESS, testWebhook.state)
        assertFalse(testWebhook.androidSentWebhookDirectly)

        assertEquals("/v1/merchant/integration", transport.requests[0].path)
        assertEquals("/v1/merchant/integration/keys", transport.requests[1].path)
        assertEquals("/v1/merchant/integration/webhook-secret/rotate", transport.requests[2].path)
        assertEquals("/v1/merchant/integration/test-webhook", transport.requests[3].path)
        assertEquals("{}", transport.requests[1].body)
        assertEquals("{}", transport.requests[2].body)
        assertEquals("{}", transport.requests[3].body)
        assertTrue(transport.requests.all { it.headers["Authorization"] == "Bearer spm_mobile_session_secret" })

        val normalVisible = loaded.visibleTexts().joinToString(" ")
        assertFalse(normalVisible.contains("sk_test_show_once_android"))
        assertFalse(normalVisible.contains("whsec_show_once_android"))
        assertFalse(normalVisible.contains("official_bank_confirmation", ignoreCase = true))
        assertFalse(normalVisible.contains("NotificationListener"))
    }

    @Test
    fun developerIntegrationRepositoryProvisionsAtomicallyAndRevealsSecretsWithRotationFlags() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                201,
                """
                {
                  "merchant_id": "mch_mobile",
                  "public_key": "pk_test_mobile",
                  "secret_key_masked": "sk_•••8888",
                  "secret_key_once": "sk_test_provisioned_once",
                  "webhook_secret_masked": "whsec_•••7777",
                  "webhook_secret_once": "whsec_provisioned_once",
                  "webhook_url": "https://merchant.example/swimpay/webhook",
                  "webhook_status": "active",
                  "integration_ready": true,
                  "public_webhook_events": ["payment.confirmed", "payment.rejected", "payment.expired"]
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "merchant_id": "mch_mobile",
                  "secret_key": "sk_test_revealed_clear",
                  "webhook_secret": "whsec_revealed_clear",
                  "webhook_url": "https://merchant.example/swimpay/webhook",
                  "secret_key_requires_rotation": false,
                  "webhook_secret_requires_rotation": true,
                  "reveal_audited": true
                }
                """.trimIndent()
            ),
            MerchantApiResponse(429, """{"error":{"code":"secret_reveal_rate_limited"}}""")
        )
        val session = AuthenticatedMerchantSession.mobile("mch_mobile", "spm_mobile_session_secret")
        val repository = MerchantDeveloperIntegrationApiRepository(transport)

        val provisioned = repository.provisionIntegration(session, " https://merchant.example/swimpay/webhook ")
        assertEquals(MerchantRepositoryState.SUCCESS, provisioned.state)
        assertEquals("sk_test_provisioned_once", provisioned.integration?.secretKeyOnce)
        assertEquals("whsec_provisioned_once", provisioned.integration?.webhookSecretOnce)
        assertTrue(provisioned.integration?.integrationReady == true)

        val revealed = repository.revealSecrets(session)
        assertEquals(MerchantRepositoryState.SUCCESS, revealed.state)
        assertEquals("sk_test_revealed_clear", revealed.secretKey)
        assertEquals("whsec_revealed_clear", revealed.webhookSecret)
        assertFalse(revealed.secretKeyRequiresRotation)
        assertTrue(revealed.webhookSecretRequiresRotation)

        val rateLimited = repository.revealSecrets(session)
        assertEquals(MerchantRepositoryState.ERROR, rateLimited.state)
        assertEquals(null, rateLimited.secretKey)
        assertTrue(rateLimited.safeMessage.contains("Reessayez"))

        assertEquals("/v1/merchant/integration/provision", transport.requests[0].path)
        assertTrue(transport.requests[0].body.contains("\"webhook_url\":\"https://merchant.example/swimpay/webhook\""))
        assertEquals("/v1/merchant/integration/secrets/reveal", transport.requests[1].path)
        assertEquals("{}", transport.requests[1].body)
        assertTrue(transport.requests.all { it.headers["Authorization"] == "Bearer spm_mobile_session_secret" })
    }

    @Test
    fun androidAuthRepositoryRecoversExistingMerchantWhenDeviceAlreadyRegistered() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                409,
                """
                {
                  "error": {
                    "code": "invalid_request",
                    "message": "This Android merchant device proof is already linked to an account.",
                    "details": { "device_status": "known_device" }
                  }
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "account": {
                    "user_id": "usr_existing",
                    "merchant_id": "mch_existing",
                    "display_handle": "merchant-existing"
                  },
                  "mobile_session": {
                    "token": "spm_recovered_secret",
                    "expires_at": "2026-07-03T10:05:00.000Z"
                  }
                }
                """.trimIndent()
            )
        )
        val repository = AndroidMerchantAuthApiRepository(
            transport = transport,
            deviceProofProvider = StaticAndroidMerchantDeviceProofProvider(
                AndroidMerchantDeviceProof(
                    installPublicKey = "install_public_key_recover",
                    challengeId = "challenge_recover",
                    challengeSignature = "signature_recover"
                )
            )
        )

        val result = repository.createAccount(AndroidMerchantAccountProfileType.PERSONAL)

        assertEquals(AndroidMerchantAuthResultStatus.SUCCESS, result.status)
        assertEquals("mch_existing", result.mobileSession?.merchantId)
        assertEquals("usr_existing", result.mobileSession?.userId)
        assertEquals("/v1/android-merchant/auth/create-account", transport.requests[0].path)
        assertEquals("/v1/android-merchant/auth/device-recover", transport.requests[1].path)
    }

    @Test
    fun androidAuthRepositoryRefreshesMobileSessionWithSlidingRenewal() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "mobile_session": {
                    "expires_at": "2026-08-01T00:00:00.000Z",
                    "sliding_renewal": true
                  }
                }
                """.trimIndent()
            ),
            MerchantApiResponse(401, """{"error":{"code":"invalid_request"}}""")
        )
        val repository = AndroidMerchantAuthApiRepository(
            transport = transport,
            deviceProofProvider = StaticAndroidMerchantDeviceProofProvider(
                AndroidMerchantDeviceProof(
                    installPublicKey = "install_public_key_refresh",
                    challengeId = "challenge_refresh",
                    challengeSignature = "signature_refresh"
                )
            )
        )
        val session = AndroidMerchantMobileSession(
            merchantId = "mch_mobile",
            userId = "usr_mobile",
            displayHandle = "merchant-12345678",
            mobileSessionToken = "spm_mobile_session_secret",
            expiresAtEpochMs = 1_000L
        )

        val refreshed = repository.refreshMobileSession(session)

        requireNotNull(refreshed)
        assertEquals("mch_mobile", refreshed.merchantId)
        assertTrue(refreshed.expiresAtEpochMs > session.expiresAtEpochMs)
        assertEquals("Bearer spm_mobile_session_secret", AuthenticatedMerchantSession.mobile(refreshed).authorizationHeader())
        assertEquals("/v1/android-merchant/auth/session-refresh", transport.requests[0].path)
        assertEquals("Bearer spm_mobile_session_secret", transport.requests[0].headers["Authorization"])

        val expired = repository.refreshMobileSession(session)
        assertEquals(null, expired)
    }

    @Test
    fun dashboardRepositoryShowsReceivingMethodReadinessAction() {
        val session = AuthenticatedMerchantSession.localDev("mch_demo")
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "payments_to_review_count": 0,
                  "confirmed_today_count": 0,
                  "notifications_sent_count": 0,
                  "merchant_setup_status": "receiving_method_required",
                  "payment_ready": false,
                  "setup_actions": ["add_receiving_method"],
                  "readiness_message": "Ajoutez un moyen de r\u00e9ception pour activer les paiements.",
                  "receiver_status": { "display": "Action requise" },
                  "recent_detected_payments": [],
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            )
        )

        val dashboard = MerchantDashboardApiRepository(transport).load(session)

        assertEquals(MerchantRepositoryState.SUCCESS, dashboard.state)
        assertTrue(dashboard.visibleTexts().contains("Action requise"))
        assertTrue(dashboard.visibleTexts().contains("Ajoutez un moyen de réception pour activer les paiements."))
        assertFalse(dashboard.visibleTexts().contains("SwimPay est prêt"))
    }

    @Test
    fun dashboardRepositoryParsesBackendOwnedReceiverRuntimeConfig() {
        val session = AuthenticatedMerchantSession.localDev("mch_demo")
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "payments_to_review_count": 0,
                  "confirmed_today_count": 0,
                  "notifications_sent_count": 0,
                  "merchant_setup_status": "ready_for_manual_payments",
                  "payment_ready": true,
                  "setup_actions": [],
                  "readiness_message": "Paiements disponibles en validation manuelle.",
                  "receiver_runtime_config": {
                    "merchant_id": "mch_demo",
                    "enabled_bank_profile_ids": ["sber_ru"],
                    "payment_intent_active": true,
                    "receiver_armed": true,
                    "expected_payment_profile_present": true,
                    "receiving_route_locked": true,
                    "active_payment_sessions_count": 1,
                    "active_until": "2026-05-03T10:30:00.000Z"
                  },
                  "receiver_status": { "display": "Pret" },
                  "recent_detected_payments": [],
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            )
        )

        val dashboard = MerchantDashboardApiRepository(transport).load(session)

        assertEquals(MerchantRepositoryState.SUCCESS, dashboard.state)
        assertEquals(
            ReceiverRuntimeConfig(
                enabledBankProfileIds = setOf("sber_ru"),
                merchantId = "mch_demo",
                paymentIntentActive = true,
                receiverArmed = true,
                expectedPaymentProfilePresent = true,
                receivingRouteLocked = true
            ),
            dashboard.receiverRuntimeConfig
        )
    }
}

private fun receiverPublicKeyPem(): String = listOf(
    "-----BEGIN PUBLIC KEY-----",
    "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEiY7GDh0qtB+VSl73IXZdMEaM",
    "C6/8oH3Iv0uJ9+QWm2YyPTrTjBznXLa3HoRrP6+uG81Svu0OJEhS1m3jIw==",
    "-----END PUBLIC KEY-----"
).joinToString("\n")

private class RecordingMerchantApiTransport(
    private vararg val responses: MerchantApiResponse
) : MerchantApiTransport {
    val requests: MutableList<MerchantApiRequest> = mutableListOf()

    override fun execute(request: MerchantApiRequest): MerchantApiResponse {
        requests.add(request)
        return responses.getOrElse(requests.lastIndex) {
            MerchantApiResponse(500, """{"error":{"code":"missing_test_response"}}""")
        }
    }
}
