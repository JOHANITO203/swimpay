import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('receiver intelligence production guardrails', () => {
  it('keeps Android Receiver on the narrow NotificationListener path without SMS, Accessibility or broad package enumeration', () => {
    const manifest = read('apps/android-receiver/android/app/src/main/AndroidManifest.xml');
    const androidMain = readTree('apps/android-receiver/android/app/src/main/java/com/swimpay/receiver');

    expect(manifest).toContain('android.service.notification.NotificationListenerService');
    expect(`${manifest}\n${androidMain}`).not.toMatch(/READ_SMS|RECEIVE_SMS|SEND_SMS|BIND_ACCESSIBILITY_SERVICE/u);
    expect(`${manifest}\n${androidMain}`).not.toMatch(/AccessibilityService|getRootInActiveWindow|performGlobalAction/u);
    expect(`${manifest}\n${androidMain}`).not.toMatch(/QUERY_ALL_PACKAGES|getInstalledPackages|getInstalledApplications/u);
  });

  it('keeps receiver and intelligence source free of raw notification storage and final-payment claims', () => {
    const receiverApi = [
      read('apps/api/src/receiver-devices.ts'),
      read('apps/api/src/signals.ts'),
      read('apps/api/src/intelligence.ts'),
      read('apps/signal-worker/src/runtime.ts'),
      read('apps/android-receiver/src/index.ts')
    ].join('\n');

    expect(receiverApi).not.toMatch(/official_bank_confirmation\s*[:=]\s*true|bank_confirmed|psp_confirmed|guaranteed_payment/iu);
    expect(receiverApi).not.toMatch(/raw_text_present\s*:\s*true|rawNotificationStorage\s*:\s*true/u);
    expect(receiverApi).not.toMatch(/INSERT\s+INTO\s+notification_signals[\s\S]*(raw_title|raw_body|raw_notification_text)/iu);
    expect(receiverApi).not.toMatch(/mutates_runtime_rules\s*[:=]\s*true|promotes_profile\s*[:=]\s*true/iu);
    expect(receiverApi).not.toMatch(/sendDeveloperWebhook|developerWebhook\.send|confirmOrderFromAndroid|paymentConfirmedFromAndroid/u);
  });

  it('documents non-destructive redacted retention hooks before cleanup jobs exist', () => {
    const policy = read('docs/INTELLIGENCE_RETENTION_POLICY.md');

    expect(policy).toContain('redacted-only');
    expect(policy).toContain('non-destructive');
    expect(policy).toContain('No raw notification title/body/text');
    expect(policy).toContain('Feedback must not mutate runtime rules');
    expect(policy).toContain('Unknown-shape records must not promote profiles');
  });
});

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8');
}

function readTree(relativePath: string): string {
  const directory = join(root, relativePath);
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = join(directory, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) {
        return [readTree(join(relativePath, entry))];
      }
      return path.endsWith('.kt') || path.endsWith('.java') ? [readFileSync(path, 'utf8')] : [];
    })
    .join('\n');
}
