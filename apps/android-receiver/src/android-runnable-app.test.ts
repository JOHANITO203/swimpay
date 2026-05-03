import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const androidRoot = join(root, 'apps/android-receiver/android');

function readAndroid(path: string): string {
  return readFileSync(join(androidRoot, path), 'utf8');
}

describe('android runnable app setup', () => {
  it('defines Gradle Android project files and only allows an official generated wrapper', () => {
    expect(existsSync(join(androidRoot, 'settings.gradle.kts'))).toBe(true);
    expect(existsSync(join(androidRoot, 'build.gradle.kts'))).toBe(true);
    expect(existsSync(join(androidRoot, 'app/build.gradle.kts'))).toBe(true);

    const settings = readAndroid('settings.gradle.kts');
    const appBuild = readAndroid('app/build.gradle.kts');

    expect(settings).toContain('swimpay-android-receiver');
    expect(settings).toContain(':app');
    expect(appBuild).toContain('com.android.application');
    expect(appBuild).toContain('org.jetbrains.kotlin.android');
    expect(appBuild).toContain('namespace = "com.swimpay.receiver"');
    expect(appBuild).toContain('compileSdk = 36');
    expect(appBuild).toContain('sourceCompatibility = JavaVersion.VERSION_17');
    expect(appBuild).toContain('targetCompatibility = JavaVersion.VERSION_17');

    const wrapperProperties = join(androidRoot, 'gradle/wrapper/gradle-wrapper.properties');
    if (existsSync(join(androidRoot, 'gradle/wrapper/gradle-wrapper.jar'))) {
      expect(readFileSync(wrapperProperties, 'utf8')).toContain('services.gradle.org/distributions');
    }
  });

  it('declares NotificationListenerService permission and no SMS or scraping permissions', () => {
    const manifest = readAndroid('app/src/main/AndroidManifest.xml');

    expect(manifest).toContain('android.permission.BIND_NOTIFICATION_LISTENER_SERVICE');
    expect(manifest).toContain('android.service.notification.NotificationListenerService');
    expect(manifest).toContain('.SwimPayNotificationListenerService');
    expect(manifest).not.toMatch(/READ_SMS|RECEIVE_SMS|BIND_ACCESSIBILITY_SERVICE/u);
  });

  it('contains safe status, signer, outbox and WorkManager platform boundaries', () => {
    const status = readAndroid('app/src/main/java/com/swimpay/receiver/ReceiverStatusViewModel.kt');
    const signer = readAndroid('app/src/main/java/com/swimpay/receiver/security/AndroidKeystorePayloadSigner.kt');
    const outbox = readAndroid('app/src/main/java/com/swimpay/receiver/outbox/EncryptedOutboxStore.kt');
    const worker = readAndroid('app/src/main/java/com/swimpay/receiver/work/SignalUploadWorker.kt');

    expect(status).toContain('notificationAccessEnabled');
    expect(status).toContain('listenerConnected');
    expect(status).toContain('backendReachable');
    expect(status).not.toMatch(/rawPhone|rawNotification|paymentConfirmed|autoConfirm/iu);

    expect(signer).toContain('AndroidKeyStore');
    expect(signer).toContain('SIGNATURE_ALGORITHM');
    expect(signer).toContain('event_id');
    expect(signer).toContain('payload_hash');
    expect(signer).not.toContain('allowUnsignedProduction');

    expect(outbox).toContain('EncryptedOutboxStore');
    expect(outbox).toContain('pending_upload');
    expect(outbox).toContain('failed_retrying');
    expect(outbox).not.toMatch(/rawPhone|rawNotification|notificationText/iu);

    expect(worker).toContain('WorkManager');
    expect(worker).toContain('NetworkType.CONNECTED');
    expect(worker).toContain('MAX_RETRY_ATTEMPTS');
  });

  it('keeps Android receiver source free of local confirmation, SMS and scraping APIs', () => {
    const source = [
      readAndroid('app/src/main/java/com/swimpay/receiver/ReceiverBoundaries.kt'),
      readAndroid('app/src/main/java/com/swimpay/receiver/SwimPayNotificationListenerService.kt'),
      readAndroid('app/src/main/java/com/swimpay/receiver/ReceiverStatusViewModel.kt'),
      readAndroid('app/src/main/java/com/swimpay/receiver/work/SignalUploadWorker.kt')
    ].join('\n');

    expect(source).not.toMatch(/READ_SMS|SmsMessage|android\.provider\.Telephony/u);
    expect(source).not.toMatch(/AccessibilityService|getRootInActiveWindow|performGlobalAction/u);
    expect(source).not.toMatch(/bank_confirmed|official_bank_confirmation|paymentConfirmed|autoConfirm/iu);
    expect(source).toContain('isRuntimeNotificationAllowed');
    expect(source).toContain('packageName == appPackageName');
  });
});

describe('android build toolchain activation', () => {
  it('documents Sprint 4A Gradle wrapper policy and build closeout artifacts', () => {
    const policy = readFileSync(join(root, 'docs/GRADLE_WRAPPER_POLICY.md'), 'utf8');
    const report = readFileSync(join(root, '.swimpay-agent/ANDROID_BUILD_TOOLCHAIN_REPORT.md'), 'utf8');

    expect(policy).toContain('Do not manually invent or paste a Gradle wrapper JAR');
    expect(policy).toContain('gradle wrapper');
    expect(policy).toContain('trusted');

    expect(report).toContain('Java status');
    expect(report).toContain('Android SDK status');
    expect(report).toContain('Gradle status');
    expect(report).toContain('assembleDebug status');
  });

  it('keeps Sprint 4A task files available for history', () => {
    const tasks = [
      '057_android_toolchain_activation',
      '058_gradle_wrapper_generation_policy',
      '059_android_assemble_debug_validation',
      '060_android_jvm_unit_tests',
      '061_android_build_closeout_review'
    ];

    for (const task of tasks) {
      const taskFile = join(root, 'tasks', `${task}.md`);
      expect(existsSync(taskFile), task).toBe(true);
    }
  });

  it('keeps Android doctor explicit about wrapper and assemble readiness', () => {
    const doctor = readFileSync(join(root, 'scripts/android-toolchain-check.mjs'), 'utf8');

    expect(doctor).toContain('Gradle wrapper available');
    expect(doctor).toContain('Android module path');
    expect(doctor).toContain('assembleDebug command readiness');
    expect(doctor).toContain('gradle-wrapper.jar');
  });
});

describe('android Gradle wrapper and build validation', () => {
  it('documents Sprint 4B wrapper/build execution artifacts', () => {
    const sprintReport = readFileSync(join(root, '.swimpay-agent/SPRINT_4B_REPORT.md'), 'utf8');
    const triage = readFileSync(join(root, '.swimpay-agent/ANDROID_BUILD_FAILURE_TRIAGE.md'), 'utf8');

    expect(sprintReport).toContain('Gradle availability');
    expect(sprintReport).toContain('wrapper generation status');
    expect(sprintReport).toContain('assembleDebug status');
    expect(sprintReport).toContain('Android unit test status');

    expect(triage).toContain('command run');
    expect(triage).toContain('error summary');
    expect(triage).toContain('suspected cause');
    expect(triage).toContain('critical or non-critical');
  });

  it('keeps Sprint 4B task files and report available for build history', () => {
    const report = readFileSync(join(root, '.swimpay-agent/SPRINT_4B_REPORT.md'), 'utf8');
    const tasks = [
      '062_gradle_toolchain_bootstrap',
      '063_generate_trusted_gradle_wrapper',
      '064_android_assemble_debug_run',
      '065_android_jvm_unit_tests_execution',
      '066_android_build_failure_triage',
      '067_sprint_4b_closeout_review'
    ];

    for (const task of tasks) {
      expect(existsSync(join(root, 'tasks', `${task}.md`)), task).toBe(true);
      expect(report, task).toContain(task);
    }
  });

  it('verifies any checked-in Gradle wrapper points to an official Gradle distribution', () => {
    const wrapperJar = join(androidRoot, 'gradle/wrapper/gradle-wrapper.jar');
    const wrapperProperties = join(androidRoot, 'gradle/wrapper/gradle-wrapper.properties');

    if (!existsSync(wrapperJar)) {
      expect(existsSync(wrapperProperties)).toBe(false);
      return;
    }

    expect(existsSync(wrapperProperties)).toBe(true);
    const properties = readFileSync(wrapperProperties, 'utf8');
    expect(properties).toMatch(/distributionUrl=.*services\.gradle\.org\/distributions\/gradle-[\d.]+-bin\.zip/u);
  });

  it('enables AndroidX when AndroidX dependencies are declared', () => {
    const appBuild = readAndroid('app/build.gradle.kts');
    const gradlePropertiesPath = join(androidRoot, 'gradle.properties');

    expect(appBuild).toMatch(/androidx\.(core|work):/u);
    expect(existsSync(gradlePropertiesPath)).toBe(true);

    const properties = readFileSync(gradlePropertiesPath, 'utf8');
    expect(properties).toContain('android.useAndroidX=true');
  });
});

describe('android emulator smoke validation', () => {
  it('provides a Sprint 4C emulator doctor script and reports', () => {
    const doctor = readFileSync(join(root, 'scripts/android-emulator-doctor.mjs'), 'utf8');
    const sprintReport = readFileSync(join(root, '.swimpay-agent/SPRINT_4C_REPORT.md'), 'utf8');
    const smokeReport = readFileSync(join(root, '.swimpay-agent/EMULATOR_SMOKE_REPORT.md'), 'utf8');

    expect(doctor).toContain('adb available');
    expect(doctor).toContain('emulator command available');
    expect(doctor).toContain('available AVDs');
    expect(doctor).toContain('running devices');
    expect(doctor).toContain('app APK path');
    expect(doctor).toContain('backend local URL guidance');

    expect(sprintReport).toContain('Emulator availability');
    expect(sprintReport).toContain('APK install status');
    expect(sprintReport).toContain('Synthetic signal upload result');
    expect(smokeReport).toContain('Notification Access flow status');
    expect(smokeReport).toContain('Outbox offline/online result');
  });

  it('lists Sprint 4G task files in the approved order', () => {
    const report = readFileSync(join(root, '.swimpay-agent/SPRINT_4G_REPORT.md'), 'utf8');
    const tasks = [
      '097_android_persistent_device_state',
      '098_android_persistent_protected_outbox',
      '099_android_workmanager_retry_live_wiring',
      '100_android_live_backend_status_refresh',
      '101_android_debug_panel_persistence_polish',
      '102_real_device_offline_online_persistent_outbox_smoke',
      '103_sprint_4g_closeout_review'
    ];

    for (const task of tasks) {
      expect(existsSync(join(root, 'tasks', `${task}.md`)), task).toBe(true);
      expect(report, task).toContain(task);
    }
  });

  it('lists Sprint 4H task files in the approved order', () => {
    const sprintReport = readFileSync(join(root, '.swimpay-agent/SPRINT_4H_REPORT.md'), 'utf8');
    const tasks = [
      '104_android_keystore_device_identity_hardening',
      '105_android_encrypted_storage_platform_impl',
      '106_android_persistent_outbox_migration_and_cleanup',
      '107_android_workmanager_background_retry_validation',
      '108_android_debug_release_separation',
      '109_android_storage_security_tests',
      '110_real_device_background_retry_smoke',
      '111_sprint_4h_closeout_review'
    ];

    let previousIndex = -1;
    for (const task of tasks) {
      expect(existsSync(join(root, 'tasks', `${task}.md`)), task).toBe(true);
      const index = sprintReport.indexOf(task);
      expect(index, task).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });

  it('keeps emulator smoke docs explicit about no SMS, no scraping and no confirmation', () => {
    const smokeDocs = readFileSync(join(root, 'docs/ANDROID_EMULATOR_SMOKE_TEST.md'), 'utf8');

    expect(smokeDocs).toContain('No SMS permissions');
    expect(smokeDocs).toContain('No accessibility scraping service');
    expect(smokeDocs).toContain('No local payment confirmation');
    expect(smokeDocs).toContain('backend_decision_pending');
  });
});

describe('android device-side network smoke wiring', () => {
  it('defines debug-only backend config, cleartext localhost and HTTP client boundaries', () => {
    const config = readAndroid('app/src/main/java/com/swimpay/receiver/DebugBackendConfig.kt');
    const client = readAndroid('app/src/main/java/com/swimpay/receiver/DebugReceiverHttpClient.kt');
    const debugManifest = readAndroid('app/src/debug/AndroidManifest.xml');
    const debugNetwork = readAndroid('app/src/debug/res/xml/debug_network_security_config.xml');

    expect(config).toContain('http://127.0.0.1:8080');
    expect(config).toContain('adb reverse localhost');
    expect(config).toContain('/api-health');
    expect(client).toContain('/v1/receiver-devices/register');
    expect(client).toContain('/v1/receiver-devices/heartbeat');
    expect(client).toContain('/v1/receiver/signals');
    expect(client).toContain('backend decision pending');
    expect(client).not.toMatch(/paymentConfirmed|autoConfirm|official_bank_confirmation = true/iu);
    expect(debugManifest).toContain('debug_network_security_config');
    expect(debugNetwork).toContain('127.0.0.1');
  });

  it('keeps debug smoke controller wired to real actions without raw PII', () => {
    const controller = readAndroid('app/src/main/java/com/swimpay/receiver/DebugReceiverSmokeController.kt');
    const activity = readAndroid('app/src/main/java/com/swimpay/receiver/MainActivity.kt');

    expect(controller).toContain('performAction');
    expect(controller).toContain('registerReceiver');
    expect(controller).toContain('sendHeartbeat');
    expect(controller).toContain('uploadSyntheticSignal');
    expect(controller).toContain('enqueueSyntheticOutboxSignal');
    expect(controller).toContain('flushOutbox');
    expect(controller).toContain('TO_VERIFY');
    expect(controller).toContain('not official bank confirmation');
    expect(controller).not.toMatch(/\+7|raw_notification|bank_confirmed|auto_confirm/iu);
    expect(activity).toContain('Thread');
    expect(activity).toContain('performAction');
  });

  it('wires Sprint 4G persistent state, outbox and live backend status boundaries', () => {
    const deviceState = readAndroid('app/src/main/java/com/swimpay/receiver/PersistentDeviceStateStore.kt');
    const outboxStore = readAndroid('app/src/main/java/com/swimpay/receiver/outbox/AndroidEncryptedOutboxStore.kt');
    const retryPolicy = readAndroid('app/src/main/java/com/swimpay/receiver/work/ReceiverRetryPolicy.kt');
    const backendStatus = readAndroid('app/src/main/java/com/swimpay/receiver/BackendStatusRefresher.kt');
    const activity = readAndroid('app/src/main/java/com/swimpay/receiver/MainActivity.kt');

    expect(deviceState).toContain('SharedPreferencesDeviceStateStorage');
    expect(deviceState).toContain('raw phone must not be stored');
    expect(deviceState).toContain('debug backend URL must use adb reverse localhost');
    expect(outboxStore).toContain('SharedPreferencesOutboxStorageAdapter');
    expect(outboxStore).toContain('notificationHash == record.notificationHash');
    expect(outboxStore).toContain('ackReceivedAt');
    expect(retryPolicy).toContain('30_000L');
    expect(retryPolicy).toContain('900_000L');
    expect(backendStatus).toContain('BackendStatusSnapshot');
    expect(activity).toContain('refreshBackendStatus');
    expect(activity).toContain('AndroidOutboxStorageFactory');
  });

  it('keeps real-device smoke automation debug-only through a safe broadcast receiver', () => {
    const debugManifest = readAndroid('app/src/debug/AndroidManifest.xml');
    const receiver = readAndroid('app/src/debug/java/com/swimpay/receiver/DebugSmokeBroadcastReceiver.kt');

    expect(debugManifest).toContain('com.swimpay.receiver.DEBUG_SMOKE');
    expect(debugManifest).toContain('DebugSmokeBroadcastReceiver');
    expect(receiver).toContain('goAsync');
    expect(receiver).toContain('performAction');
    expect(receiver).toContain('schedule_background_retry');
    expect(receiver).toContain('SignalUploadWorker.enqueue');
    expect(receiver).toContain('SwimPayDebugSmoke');
    expect(receiver).not.toMatch(/READ_SMS|AccessibilityService|paymentConfirmed|autoConfirm|bank_confirmed/iu);
  });

  it('hardens Sprint 4H production storage and worker boundaries', () => {
    const outboxStore = readAndroid('app/src/main/java/com/swimpay/receiver/outbox/AndroidEncryptedOutboxStore.kt');
    const worker = readAndroid('app/src/main/java/com/swimpay/receiver/work/SignalUploadWorker.kt');
    const signer = readAndroid('app/src/main/java/com/swimpay/receiver/security/AndroidKeystorePayloadSigner.kt');
    const mainManifest = readAndroid('app/src/main/AndroidManifest.xml');
    const debugManifest = readAndroid('app/src/debug/AndroidManifest.xml');

    expect(outboxStore).toContain('AndroidKeystore');
    expect(outboxStore).toContain('ProtectedOutboxStorageAdapter');
    expect(outboxStore).toContain('OutboxMigration');
    expect(outboxStore).toContain('cleanup');
    expect(worker).toContain('SignalUploadWorkPlan');
    expect(worker).toContain('NetworkType.CONNECTED');
    expect(signer).toContain('ReceiverSigningPolicy');
    expect(signer).toContain('PRODUCTION');
    expect(mainManifest).not.toContain('DebugSmokeBroadcastReceiver');
    expect(debugManifest).toContain('DebugSmokeBroadcastReceiver');
    expect(`${outboxStore}\n${worker}\n${signer}`).not.toMatch(/paymentConfirmed|autoConfirm|official_bank_confirmation = true/iu);
  });

  it('wires Sprint 4I synthetic listener pipeline and diagnostics safely', () => {
    const pipeline = readAndroid('app/src/main/java/com/swimpay/receiver/ReceiverNotificationPipeline.kt');
    const listener = readAndroid('app/src/main/java/com/swimpay/receiver/SwimPayNotificationListenerService.kt');
    const source = readAndroid('app/src/main/java/com/swimpay/receiver/DebugSyntheticNotificationSource.kt');
    const diagnostics = readAndroid('app/src/main/java/com/swimpay/receiver/ReceiverDiagnostics.kt');
    const debugManifest = readAndroid('app/src/debug/AndroidManifest.xml');

    expect(pipeline).toContain('synthetic_debug_only');
    expect(pipeline).toContain('SyntheticPackageGate');
    expect(pipeline).toContain('NotificationCoalescer');
    expect(pipeline).toContain('raw_text_present');
    expect(listener).toContain('SwimPayReceiverListener');
    expect(listener).toContain('fields_detected');
    expect(listener).toContain('enqueueProcessedNotificationSignal');
    expect(source).toContain('DebugSyntheticNotificationSource');
    expect(source).toContain('SyntheticNotificationConstants.CHANNEL_ID');
    expect(diagnostics).toContain('outboxPendingCount');
    expect(diagnostics).toContain('outboxFailedRetryingCount');
    expect(debugManifest).toContain('android.permission.POST_NOTIFICATIONS');
    expect(`${pipeline}\n${listener}\n${source}\n${diagnostics}`).not.toMatch(/READ_SMS|AccessibilityService|bank_confirmed|paymentConfirmed|autoConfirm/iu);
    expect(existsSync(join(root, 'tasks/112_synthetic_notification_source_strategy.md'))).toBe(true);
    expect(existsSync(join(root, 'tasks/120_sprint_4i_closeout_review.md'))).toBe(true);
  });

  it('wires Phase 4J onboarding readiness gate and separates Android notification permissions', () => {
    const onboarding = readAndroid('app/src/main/java/com/swimpay/receiver/ReceiverOnboardingReadiness.kt');
    const appPermission = readAndroid('app/src/main/java/com/swimpay/receiver/AppNotificationPermissionReader.kt');
    const activity = readAndroid('app/src/main/java/com/swimpay/receiver/MainActivity.kt');
    const report = readFileSync(join(root, '.swimpay-agent/RECEIVER_ONBOARDING_GATE_REPORT.md'), 'utf8');

    expect(onboarding).toContain('NOTIFICATION_ACCESS_REQUIRED');
    expect(onboarding).toContain('READY_REVIEW_ONLY');
    expect(onboarding).toContain('appNotificationsPermissionEnabled');
    expect(onboarding).toContain('notificationListenerAccessEnabled');
    expect(onboarding).toContain('val captureEnabled = receiverReady');
    expect(onboarding).toContain('Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS');
    expect(onboarding).toContain('regrant_required_after_reinstall');
    expect(appPermission).toContain('POST_NOTIFICATIONS');
    expect(activity).toContain("Ouvrir les paramètres d'accès aux notifications");
    expect(activity).toContain('Android donne une permission large');
    expect(report).toContain('app notifications ON + listener OFF');
    expect(report).toContain('ready_review_only');
    expect(`${onboarding}\n${activity}`).not.toContain('ready_auto_confirm');
    const forbiddenClaim = ['SwimPay peut uniquement lire', 'les notifications bancaires'].join(' ');
    expect(`${onboarding}\n${activity}`).not.toContain(forbiddenClaim);
    expect(report).toContain('129_receiver_onboarding_readiness_gate');
    expect(report).toContain('135_receiver_onboarding_closeout_review');
    expect(existsSync(join(root, 'tasks/141_bank_profile_selection_model.md'))).toBe(true);
    expect(existsSync(join(root, 'tasks/147_sprint_4k_closeout_review.md'))).toBe(true);
  });

  it('wires Sprint 4K bank selection readiness and safe operator diagnostics', () => {
    const bankSelection = readAndroid('app/src/main/java/com/swimpay/receiver/BankProfileSelection.kt');
    const onboarding = readAndroid('app/src/main/java/com/swimpay/receiver/ReceiverOnboardingReadiness.kt');
    const diagnostics = readAndroid('app/src/main/java/com/swimpay/receiver/ReceiverDiagnostics.kt');
    const activity = readAndroid('app/src/main/java/com/swimpay/receiver/MainActivity.kt');
    const report = readFileSync(join(root, '.swimpay-agent/SPRINT_4K_REPORT.md'), 'utf8');

    expect(bankSelection).toContain('ReceiverBankProfileSelection');
    expect(bankSelection).toContain('syntheticDebugOnly');
    expect(bankSelection).toContain('TO_VERIFY');
    expect(bankSelection).toContain('review_only');
    expect(bankSelection).toContain('Cette banque peut être utilisée pour détecter des signaux');
    expect(onboarding).toContain('READY_REVIEW_ONLY');
    expect(onboarding).toContain('syntheticDebugOnly');
    expect(diagnostics).toContain('ReceiverOperatorDiagnosticsExport');
    expect(diagnostics).toContain('selectedBankVerificationStatuses');
    expect(activity).toContain('Selected banks:');
    expect(activity).toContain('trustedBanksCount = selectedBankProfiles.count');
    expect(`${bankSelection}\n${onboarding}\n${diagnostics}\n${activity}`).not.toMatch(/bank_confirmed|official_bank_confirmation = true|ready_auto_confirm/iu);

    const tasks = [
      '141_bank_profile_selection_model',
      '142_receiver_ready_review_only_state',
      '143_bank_selection_onboarding_ui_debug',
      '144_listener_resilience_after_app_restart',
      '145_workmanager_process_death_retry_real_device',
      '146_operator_diagnostics_export_no_pii',
      '147_sprint_4k_closeout_review'
    ];
    let previousIndex = -1;
    for (const task of tasks) {
      expect(existsSync(join(root, 'tasks', `${task}.md`)), task).toBe(true);
      const index = report.indexOf(task);
      expect(index, task).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });

  it('wires Sprint 4L bank package evidence dry-run boundaries safely', () => {
    const evidence = readAndroid('app/src/main/java/com/swimpay/receiver/BankPackageEvidence.kt');
    const collector = readAndroid('app/src/main/java/com/swimpay/receiver/PackageManagerBankPackageEvidenceCollector.kt');
    const docs = readFileSync(join(root, 'docs/BANK_PACKAGE_EVIDENCE_DRY_RUN.md'), 'utf8');
    const report = readFileSync(join(root, '.swimpay-agent/SPRINT_4L_REPORT.md'), 'utf8');

    expect(evidence).toContain('BankPackageEvidenceObservation');
    expect(evidence).toContain('OPERATOR_REVIEW_REQUIRED');
    expect(evidence).toContain('PENDING_VERIFICATION');
    expect(evidence).toContain('synthetic_debug_only');
    expect(evidence).toContain('isTrustedForProductionReady');
    expect(collector).toContain('PackageManager');
    expect(collector).toContain('collectExplicitPackageEvidence');
    expect(collector).toContain('MessageDigest.getInstance("SHA-256")');
    expect(docs).toContain('PackageManager evidence is observation only');
    expect(docs).toContain('Do not auto-trust');
    expect(`${evidence}\n${collector}\n${docs}`).not.toMatch(/READ_SMS|AccessibilityService|bank_confirmed|official_bank_confirmation = true|ready_auto_confirm/iu);

    const tasks = [
      '148_bank_package_evidence_contract',
      '149_android_package_manager_evidence_collector',
      '150_evidence_review_only_guard',
      '151_operator_evidence_diagnostics_no_pii',
      '152_real_device_evidence_dry_run_plan',
      '153_bank_evidence_docs_and_local_flow',
      '154_sprint_4l_closeout_review'
    ];
    let previousIndex = -1;
    for (const task of tasks) {
      expect(existsSync(join(root, 'tasks', `${task}.md`)), task).toBe(true);
      const index = report.indexOf(task);
      expect(index, task).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });

  it('wires Sprint 4M operator-reviewed bank evidence workflow safely', () => {
    const apiEvidence = readFileSync(join(root, 'apps/api/src/bank-evidence.ts'), 'utf8');
    const server = readFileSync(join(root, 'apps/api/src/server.ts'), 'utf8');
    const client = readAndroid('app/src/main/java/com/swimpay/receiver/DebugReceiverHttpClient.kt');
    const controller = readAndroid('app/src/main/java/com/swimpay/receiver/DebugReceiverSmokeController.kt');
    const docs = readFileSync(join(root, 'docs/BANK_PACKAGE_EVIDENCE_DRY_RUN.md'), 'utf8');
    const sprint4mReport = readFileSync(join(root, '.swimpay-agent/SPRINT_4M_REPORT.md'), 'utf8');

    expect(apiEvidence).toContain('pending_operator_review');
    expect(apiEvidence).toContain('approved_for_review_only');
    expect(apiEvidence).toContain('BankEvidenceAuditEventTypes');
    expect(apiEvidence).toContain('bank_evidence.approved_review_only');
    expect(server).toContain('/v1/bank-evidence');
    expect(server).toContain('/v1/admin/bank-evidence');
    expect(client).toContain('/v1/bank-evidence');
    expect(controller).toContain('submit_synthetic_bank_evidence');
    expect(docs).toContain('operator review');
    expect(`${apiEvidence}\n${server}\n${client}\n${controller}\n${docs}`).not.toMatch(/READ_SMS|AccessibilityService|bank_confirmed|official_bank_confirmation = true|ready_auto_confirm/iu);

    const tasks = [
      '155_bank_evidence_backend_schema',
      '156_bank_evidence_intake_endpoint',
      '157_bank_evidence_admin_review_api',
      '158_bank_evidence_audit_events',
      '159_bank_evidence_receiver_submit_flow',
      '160_bank_evidence_operator_review_tests',
      '161_sprint_4m_closeout_review'
    ];
    let previousIndex = -1;
    for (const task of tasks) {
      expect(existsSync(join(root, 'tasks', `${task}.md`)), task).toBe(true);
      const index = sprint4mReport.indexOf(task);
      expect(index, task).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });

  it('documents Sprint 4N synthetic evidence operator dry-run without trust escalation', () => {
    const runbook = readFileSync(join(root, 'docs/BANK_EVIDENCE_OPERATOR_RUNBOOK.md'), 'utf8');
    const report = readFileSync(join(root, '.swimpay-agent/SPRINT_4N_REPORT.md'), 'utf8');
    const smokeReport = readFileSync(join(root, '.swimpay-agent/REAL_DEVICE_SMOKE_REPORT.md'), 'utf8');

    expect(runbook).toContain('Synthetic dry-run flow');
    expect(runbook).toContain('approve-review-only');
    expect(runbook).toContain('no auto trust');
    expect(runbook).toContain('no auto-confirm');
    expect(runbook).toContain('human/operator verification required');
    expect(report).toContain('status: PASS');
    expect(report).toContain('synthetic_debug_only');
    expect(report).toContain('approved_for_review_only');
    expect(report).toContain('bank_evidence.approved_review_only');
    expect(report).toContain('bank_evidence.rejected');
    expect(smokeReport).toContain('Sprint 4N Synthetic Evidence Operator Rehearsal');
    expect(`${runbook}\n${report}\n${smokeReport}`).not.toMatch(/READ_SMS|AccessibilityService|bank_confirmed|official_bank_confirmation = true|ready_auto_confirm/iu);

    const tasks = [
      '162_synthetic_evidence_real_device_submission',
      '163_admin_evidence_review_local_flow',
      '164_evidence_review_only_assertions',
      '165_evidence_audit_trace_validation',
      '166_evidence_rejection_rehearsal',
      '167_evidence_workflow_operator_runbook',
      '168_sprint_4n_closeout_review'
    ];
    let previousIndex = -1;
    for (const task of tasks) {
      expect(existsSync(join(root, 'tasks', `${task}.md`)), task).toBe(true);
      const index = report.indexOf(task);
      expect(index, task).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });

  it('documents Sprint 4O production trust policy without auto-confirm enablement', () => {
    const policy = readFileSync(join(root, 'docs/BANK_EVIDENCE_PRODUCTION_TRUST_POLICY.md'), 'utf8');
    const runbook = readFileSync(join(root, 'docs/BANK_EVIDENCE_OPERATOR_RUNBOOK.md'), 'utf8');
    const apiEvidence = readFileSync(join(root, 'apps/api/src/bank-evidence.ts'), 'utf8');
    const security = readFileSync(join(root, 'packages/security/src/index.ts'), 'utf8');
    const report = readFileSync(join(root, '.swimpay-agent/SPRINT_4O_REPORT.md'), 'utf8');

    expect(policy).toContain('production_trust_requested');
    expect(policy).toContain('production_trust_approved');
    expect(policy).toContain('production_trust_revoked');
    expect(policy).toContain('Dual control is enforced');
    expect(policy).toContain('It does not mean a payment was confirmed');
    expect(runbook).toContain('request-production-trust');
    expect(runbook).toContain('approve-production-trust');
    expect(runbook).toContain('revoke-production-trust');
    expect(apiEvidence).toContain('PRODUCTION_TRUST_REQUESTED');
    expect(apiEvidence).toContain('PRODUCTION_TRUST_APPROVED');
    expect(apiEvidence).toContain('PRODUCTION_TRUST_REVOKED');
    expect(security).toContain('request_bank_evidence_production_trust');
    expect(security).toContain('approve_bank_evidence_production_trust');
    expect(`${policy}\n${runbook}`).not.toMatch(/bank_confirmed|official_bank_confirmation = true|ready_auto_confirm|auto_confirm_enabled:\s*true/iu);

    const tasks = [
      '169_bank_evidence_production_trust_policy',
      '170_bank_evidence_trust_state_machine',
      '171_admin_production_trust_permission_model',
      '172_trust_transition_audit_and_dual_control',
      '173_trust_policy_tests',
      '174_bank_trust_policy_docs',
      '175_sprint_4o_closeout_review'
    ];
    let previousIndex = -1;
    for (const task of tasks) {
      expect(existsSync(join(root, 'tasks', `${task}.md`)), task).toBe(true);
      const index = report.indexOf(task);
      expect(index, task).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });

  it('wires Sprint 4P explicit real package evidence dry-run without installed-app enumeration', () => {
    const evidence = readAndroid('app/src/main/java/com/swimpay/receiver/BankPackageEvidence.kt');
    const collector = readAndroid('app/src/main/java/com/swimpay/receiver/PackageManagerBankPackageEvidenceCollector.kt');
    const controller = readAndroid('app/src/main/java/com/swimpay/receiver/DebugReceiverSmokeController.kt');
    const receiver = readAndroid('app/src/debug/java/com/swimpay/receiver/DebugSmokeBroadcastReceiver.kt');
    const runbook = readFileSync(join(root, 'docs/REAL_BANK_EVIDENCE_DRY_RUN_RUNBOOK.md'), 'utf8');
    const queue = readFileSync(join(root, '.swimpay-agent/TASK_QUEUE.md'), 'utf8');

    expect(evidence).toContain('RealBankPackageInputPolicy');
    expect(evidence).toContain('ExplicitPackageEvidenceLookup');
    expect(evidence).toContain('PACKAGE_NOT_FOUND');
    expect(collector).toContain('lookupExplicitPackageEvidence');
    expect(controller).toContain('submitExplicitPackageEvidence');
    expect(receiver).toContain('submit_explicit_package_evidence');
    expect(runbook).toContain('operator or user must provide exactly one package name');
    expect(runbook).toContain('must not guess or invent package names');
    expect(runbook).toContain('no real bank notifications');
    expect(`${collector}\n${controller}\n${receiver}`).toContain('package_name');
    expect(`${collector}\n${controller}\n${receiver}`).not.toMatch(/getInstalledPackages|getInstalledApplications|queryIntentActivities|READ_SMS|AccessibilityService/iu);
    expect(`${collector}\n${controller}\n${receiver}\n${runbook}`).not.toMatch(/bank_confirmed|official_bank_confirmation = true|ready_auto_confirm|auto_confirm_enabled:\s*true/iu);

    const tasks = [
      '176_real_bank_package_input_policy',
      '177_android_explicit_package_evidence_lookup',
      '178_real_bank_evidence_submit_dry_run',
      '179_admin_real_evidence_review_only_dry_run',
      '180_evidence_collection_privacy_and_safety_checks',
      '181_real_bank_evidence_dry_run_runbook',
      '182_sprint_4p_closeout_review'
    ];
    let previousIndex = -1;
    for (const task of tasks) {
      expect(existsSync(join(root, 'tasks', `${task}.md`)), task).toBe(true);
      const index = queue.indexOf(task);
      expect(index, task).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });

  it('hardens Sprint 4R package visibility with exact debug queries and safe operator messages', () => {
    const mainManifest = readAndroid('app/src/main/AndroidManifest.xml');
    const debugManifest = readAndroid('app/src/debug/AndroidManifest.xml');
    const evidence = readAndroid('app/src/main/java/com/swimpay/receiver/BankPackageEvidence.kt');
    const collector = readAndroid('app/src/main/java/com/swimpay/receiver/PackageManagerBankPackageEvidenceCollector.kt');
    const controller = readAndroid('app/src/main/java/com/swimpay/receiver/DebugReceiverSmokeController.kt');
    const policy = readFileSync(join(root, 'docs/ANDROID_PACKAGE_VISIBILITY_POLICY.md'), 'utf8');
    const report = readFileSync(join(root, '.swimpay-agent/SPRINT_4R_REPORT.md'), 'utf8');

    expect(debugManifest).toContain('<queries>');
    expect(debugManifest).toContain('<package android:name="ru.sberbankmobile" />');
    expect(mainManifest).not.toContain('ru.sberbankmobile');
    expect(`${mainManifest}\n${debugManifest}`).not.toContain('QUERY_ALL_PACKAGES');

    expect(evidence).toContain('PACKAGE_NOT_VISIBLE_OR_NOT_DECLARED');
    expect(evidence).toContain('Package not visible to the app. Add explicit package visibility or use operator ADB dry-run.');
    expect(evidence).toContain('Evidence remains pending operator review.');
    expect(evidence).toContain('Not trusted yet.');
    expect(evidence).toContain('Auto-confirm remains disabled.');
    expect(collector).toContain('package_not_visible_or_not_declared');
    expect(`${collector}\n${controller}`).not.toMatch(/getInstalledPackages|getInstalledApplications|queryIntentActivities/iu);
    expect(policy).toContain('QUERY_ALL_PACKAGES');
    expect(policy).toContain('collected evidence starts as `pending_operator_review`');
    expect(report).toContain('status: PASS');
    expect(report).toContain('PACKAGE_NOT_VISIBLE_OR_NOT_DECLARED');
    expect(report).toContain('878ddd87-2e69-40b1-9cc7-da15d95a6b0b');
    expect(`${debugManifest}\n${evidence}\n${collector}\n${controller}\n${policy}\n${report}`).not.toMatch(/READ_SMS|AccessibilityService|bank_confirmed|official_bank_confirmation = true|auto_confirm_enabled:\s*true/iu);

    const tasks = [
      '189_android_package_visibility_policy',
      '190_manifest_queries_for_operator_selected_packages',
      '191_package_not_visible_vs_not_found',
      '192_operator_evidence_ux_status_messages',
      '193_package_visibility_real_device_retest',
      '194_evidence_visibility_safety_tests',
      '195_sprint_4r_closeout_review'
    ];
    let previousIndex = -1;
    for (const task of tasks) {
      expect(existsSync(join(root, 'tasks', `${task}.md`)), task).toBe(true);
      const index = report.indexOf(task);
      expect(index, task).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });
});
