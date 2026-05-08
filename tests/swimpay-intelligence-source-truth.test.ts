import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('SwimPay Intelligence source of truth guardrails', () => {
  it('keeps the central Intelligence source-of-truth document present and enforceable', () => {
    const sourceTruthPath = '.swimpay-agent/SWIMPAY_INTELLIGENCE_SOURCE_OF_TRUTH.md';
    const toolsPath = '.swimpay-agent/SWIMPAY_INTELLIGENCE_TOOLS_BOUNDARIES.md';
    const reportPath = '.swimpay-agent/SWIMPAY_INTELLIGENCE_SOURCE_TRUTH_REPORT.md';

    expect(existsSync(join(root, sourceTruthPath)), sourceTruthPath).toBe(true);
    expect(existsSync(join(root, toolsPath)), toolsPath).toBe(true);
    expect(existsSync(join(root, reportPath)), reportPath).toBe(true);

    const sourceTruth = read(sourceTruthPath);

    for (const required of [
      'Payment Signal Engine',
      'payment-intent-bound',
      'manual-confirmation-only',
      'official_bank_confirmation=false',
      'payment.confirmed',
      'payment.rejected',
      'payment.expired',
      'payment.signal_detected',
      'payment.needs_review',
      'Android Receiver does not confirm orders',
      'Android Receiver does not send developer webhooks',
      'No raw notification title/body/text',
      'Feedback does not mutate runtime rules',
      'Unknown-shapes do not mutate runtime rules',
      'No SMS',
      'No Accessibility',
      'No QUERY_ALL_PACKAGES',
      'No LLM in payment decisions'
    ]) {
      expect(sourceTruth).toContain(required);
    }
  });

  it('keeps Android Receiver code within the approved Intelligence capture boundary', () => {
    const manifest = read('apps/android-receiver/android/app/src/main/AndroidManifest.xml');
    const androidMain = readTree('apps/android-receiver/android/app/src/main/java/com/swimpay/receiver');

    expect(`${manifest}\n${androidMain}`).toContain('NotificationListenerService');
    expect(`${manifest}\n${androidMain}`).not.toMatch(/READ_SMS|RECEIVE_SMS|SEND_SMS/u);
    expect(`${manifest}\n${androidMain}`).not.toMatch(/BIND_ACCESSIBILITY_SERVICE|AccessibilityService|getRootInActiveWindow/u);
    expect(`${manifest}\n${androidMain}`).not.toMatch(/QUERY_ALL_PACKAGES|getInstalledPackages|getInstalledApplications/u);
    expect(androidMain).not.toMatch(/confirmOrderFromAndroid|sendDeveloperWebhook|developerWebhook/u);
  });

  it('keeps active public webhook delivery restricted to final V1 fulfillment events', () => {
    const worker = read('apps/job-worker/src/webhooks.ts');
    const sdk = read('packages/swimpay-node/src/webhooks.ts');

    expect(worker).toContain("'payment.confirmed'");
    expect(worker).toContain("'payment.rejected'");
    expect(worker).toContain("'payment.expired'");
    expect(`${worker}\n${sdk}`).toContain('official_bank_confirmation');
    expect(`${worker}\n${sdk}`).not.toMatch(/payment\.signal_detected['"`]?\s*,|payment\.needs_review['"`]?\s*,/u);
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
