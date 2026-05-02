import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const androidRoot = join(root, 'apps/android-receiver/android');

function readAndroid(path: string): string {
  return readFileSync(join(androidRoot, path), 'utf8');
}

describe('android runnable app setup', () => {
  it('defines Gradle Android project files without a checked-in wrapper jar', () => {
    expect(existsSync(join(androidRoot, 'settings.gradle.kts'))).toBe(true);
    expect(existsSync(join(androidRoot, 'build.gradle.kts'))).toBe(true);
    expect(existsSync(join(androidRoot, 'app/build.gradle.kts'))).toBe(true);
    expect(existsSync(join(androidRoot, 'gradle/wrapper/gradle-wrapper.jar'))).toBe(false);

    const settings = readAndroid('settings.gradle.kts');
    const appBuild = readAndroid('app/build.gradle.kts');

    expect(settings).toContain('swimpay-android-receiver');
    expect(settings).toContain(':app');
    expect(appBuild).toContain('com.android.application');
    expect(appBuild).toContain('org.jetbrains.kotlin.android');
    expect(appBuild).toContain('namespace = "com.swimpay.receiver"');
    expect(appBuild).toContain('compileSdk = 36');
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
