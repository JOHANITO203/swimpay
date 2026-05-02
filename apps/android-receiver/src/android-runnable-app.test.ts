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

  it('lists Sprint 4B task files in the approved order', () => {
    const queue = readFileSync(join(root, '.swimpay-agent/TASK_QUEUE.md'), 'utf8');
    const tasks = [
      '062_gradle_toolchain_bootstrap',
      '063_generate_trusted_gradle_wrapper',
      '064_android_assemble_debug_run',
      '065_android_jvm_unit_tests_execution',
      '066_android_build_failure_triage',
      '067_sprint_4b_closeout_review'
    ];

    let previousIndex = -1;
    for (const task of tasks) {
      expect(existsSync(join(root, 'tasks', `${task}.md`)), task).toBe(true);
      const index = queue.search(new RegExp(`\\\`${task}\\\` - status: (pending|completed|blocked) - source: \\\`tasks/${task}\\.md\\\``));
      expect(index, task).toBeGreaterThan(previousIndex);
      previousIndex = index;
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
