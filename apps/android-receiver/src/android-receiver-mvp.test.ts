import { describe, expect, it } from 'vitest';

import {
  AndroidReceiverNotificationListener,
  BankPackageVerificationStatuses,
  NotificationCoalescer,
  buildNotificationSnapshot,
  evaluateAllowedBankPackage,
  processAndroidNotification,
  runPrivacyFirewall,
  type AndroidNotificationInput,
  type AllowedBankProfile
} from './index.js';

const verifiedSyntheticBank: AllowedBankProfile = {
  bankProfileId: 'bank_synthetic_v1',
  packageName: 'test.bank.synthetic',
  packageCertSha256: 'synthetic_cert_sha256_v1',
  verificationStatus: BankPackageVerificationStatuses.Verified,
  strictVerification: true
};

const toVerifySyntheticBank: AllowedBankProfile = {
  bankProfileId: 'bank_synthetic_v1',
  packageName: 'test.bank.synthetic',
  packageCertSha256: 'TO_VERIFY',
  verificationStatus: BankPackageVerificationStatuses.ToVerify,
  strictVerification: true
};

const notification: AndroidNotificationInput = {
  packageName: 'test.bank.synthetic',
  packageCertSha256: 'synthetic_cert_sha256_v1',
  notificationId: 77,
  tag: 'transfer',
  key: '0|test.bank.synthetic|77|transfer|1000',
  postTime: '2026-05-02T08:00:00.000Z',
  channelId: 'payments',
  groupKey: 'bank',
  sortKey: '001',
  extras: {
    title: 'Synthetic Bank',
    text: 'Incoming transfer +7 999 111-22-33 137.00 RUB ref SWP-1234',
    bigText: 'Incoming transfer from +7 999 111-22-33 for 137.00 RUB reference SWP-1234',
    subText: 'Card *1234',
    summaryText: 'Transfer received',
    textLines: ['Incoming transfer', '+7 999 111-22-33', '137.00 RUB', 'SWP-1234']
  },
  tickerText: 'Incoming transfer'
};

describe('android receiver MVP foundation', () => {
  it('keeps the notification listener boundary non-confirming and ignores non-allowlisted packages', async () => {
    const ignored: string[] = [];
    const queued: string[] = [];
    const listener = new AndroidReceiverNotificationListener({
      allowedBanks: [verifiedSyntheticBank],
      onIgnored: (result) => ignored.push(result.reason),
      onQueued: (result) => queued.push(result.upload.event_id)
    });

    const result = await listener.onNotificationPosted({
      ...notification,
      packageName: 'com.chat.synthetic'
    });

    expect(result.kind).toBe('ignored');
    expect(ignored).toEqual(['package_not_allowlisted']);
    expect(queued).toEqual([]);
    expect(JSON.stringify(listener.capabilities)).not.toContain('confirm');
  });

  it('treats TO_VERIFY and mismatched package certificates as untrusted locally', () => {
    expect(evaluateAllowedBankPackage(notification, [verifiedSyntheticBank])).toMatchObject({
      kind: 'allowed',
      bankProfile: verifiedSyntheticBank
    });

    expect(evaluateAllowedBankPackage(notification, [toVerifySyntheticBank])).toEqual({
      kind: 'ignored',
      reason: 'package_untrusted'
    });

    expect(
      evaluateAllowedBankPackage(
        {
          ...notification,
          packageCertSha256: 'wrong_synthetic_cert'
        },
        [verifiedSyntheticBank]
      )
    ).toEqual({
      kind: 'ignored',
      reason: 'package_cert_mismatch'
    });
  });

  it('extracts canonical snapshot fields and coalesces duplicate notification updates', () => {
    const coalescer = new NotificationCoalescer({ coalescingWindowMs: 1_500 });
    const first = buildNotificationSnapshot(notification);
    const duplicate = buildNotificationSnapshot({
      ...notification,
      extras: {
        ...notification.extras,
        textLines: [...(notification.extras.textLines ?? [])]
      }
    });
    const updated = buildNotificationSnapshot({
      ...notification,
      postTime: '2026-05-02T08:00:01.000Z',
      extras: {
        ...notification.extras,
        summaryText: 'Transfer received updated'
      }
    });

    const result = coalescer.coalesce([first, duplicate, updated]);

    expect(first).toMatchObject({
      packageName: 'test.bank.synthetic',
      title: 'Synthetic Bank',
      text: notification.extras.text,
      bigText: notification.extras.bigText,
      subText: 'Card *1234',
      summaryText: 'Transfer received',
      channelId: 'payments',
      groupKey: 'bank',
      postTime: '2026-05-02T08:00:00.000Z'
    });
    expect(result.snapshotCount).toBe(2);
    expect(result.coalescingWindowMs).toBe(1_500);
    expect(result.firstSnapshotAt).toBe('2026-05-02T08:00:00.000Z');
    expect(result.lastSnapshotAt).toBe('2026-05-02T08:00:01.000Z');
    expect(result.notificationHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.coalescedHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('redacts raw notification text and emits local parser hints only', async () => {
    const result = await processAndroidNotification({
      notification,
      allowedBanks: [verifiedSyntheticBank],
      deviceId: 'dev_01',
      merchantId: 'mch_01',
      now: () => new Date('2026-05-02T08:00:01.000Z')
    });

    expect(result.kind).toBe('queued');
    if (result.kind !== 'queued') {
      throw new Error('expected queued result');
    }

    const payload = result.upload.payload;
    expect(payload.redacted_title).toBe('Synthetic Bank');
    expect(payload.redacted_body).toContain('<PHONE>');
    expect(payload.redacted_body).toContain('<AMOUNT> <CURRENCY>');
    expect(payload.raw_text_present).toBe(false);
    expect(payload.local_parser).toMatchObject({
      amountCandidateMinor: 13700,
      currencyCandidate: 'RUB',
      phoneCandidateMasked: '+7 *** *** **33',
      referenceCodeMasked: 'SWP-***34',
      directionCandidate: 'incoming_customer_transfer'
    });
    expect(JSON.stringify(result.upload)).not.toContain('+7 999 111-22-33');
    expect(JSON.stringify(result.upload)).not.toContain('137.00 RUB');
    expect(JSON.stringify(result.upload)).not.toContain('confirmed');
  });

  it('blocks unsafe local parser hints without making final backend decisions', () => {
    const firewall = runPrivacyFirewall('Cashback +7 999 111-22-33 137.00 RUB promo ref SWP-1234');

    expect(firewall.redactedBody).toContain('<PHONE>');
    expect(firewall.redactedBody).toContain('<AMOUNT> <CURRENCY>');
    expect(firewall.localParser.directionCandidate).toBe('incoming_cashback');
    expect(firewall.localParser.negativeKeywords).toEqual(expect.arrayContaining(['cashback', 'promo']));
    expect(JSON.stringify(firewall)).not.toContain('+7 999 111-22-33');
    expect(JSON.stringify(firewall)).not.toContain('137.00 RUB');
  });
});
