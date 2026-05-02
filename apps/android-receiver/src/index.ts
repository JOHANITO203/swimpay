import { createCipheriv, createHmac, createHash, randomBytes } from 'node:crypto';

export enum NotificationAccessStatus {
  Enabled = 'enabled',
  Disabled = 'disabled'
}

export const BankPackageVerificationStatuses = {
  ToVerify: 'TO_VERIFY',
  PendingVerification: 'pending_verification',
  Verified: 'verified',
  Rejected: 'rejected',
  Revoked: 'revoked'
} as const;

export type BankPackageVerificationStatus =
  (typeof BankPackageVerificationStatuses)[keyof typeof BankPackageVerificationStatuses];

export type ReceiverHealthStatus = 'healthy' | 'degraded' | 'offline';
export type OutboxState = 'captured' | 'pending_upload' | 'uploading' | 'acked' | 'failed_retrying' | 'expired';
export type IgnoredReason = 'package_not_allowlisted' | 'package_cert_mismatch' | 'package_untrusted';
export type LocalDirectionHint =
  | 'incoming_customer_transfer'
  | 'incoming_cashback'
  | 'incoming_refund'
  | 'outgoing_payment'
  | 'promo'
  | 'failed_transfer'
  | 'unknown';

export interface AllowedBankProfile {
  bankProfileId: string;
  packageName: string;
  packageCertSha256: string;
  verificationStatus: BankPackageVerificationStatus;
  strictVerification: boolean;
}

export interface AndroidNotificationExtras {
  title?: string;
  titleBig?: string;
  text?: string;
  bigText?: string;
  subText?: string;
  summaryText?: string;
  textLines?: string[];
}

export interface AndroidNotificationInput {
  packageName: string;
  packageCertSha256?: string | undefined;
  notificationId: number;
  tag?: string | undefined;
  key: string;
  postTime: string;
  channelId?: string | undefined;
  groupKey?: string | undefined;
  sortKey?: string | undefined;
  extras: AndroidNotificationExtras;
  tickerText?: string | undefined;
}

export interface NotificationSnapshot {
  packageName: string;
  packageCertSha256?: string | undefined;
  notificationId: number;
  tag?: string | undefined;
  key: string;
  postTime: string;
  channelId?: string | undefined;
  groupKey?: string | undefined;
  sortKey?: string | undefined;
  title?: string | undefined;
  titleBig?: string | undefined;
  text?: string | undefined;
  body?: string | undefined;
  bigText?: string | undefined;
  subText?: string | undefined;
  summaryText?: string | undefined;
  textLines: string[];
  tickerText?: string | undefined;
}

export interface LocalParserResult {
  amountCandidateMinor?: number | undefined;
  currencyCandidate?: string | undefined;
  phoneCandidateMasked?: string | undefined;
  referenceCodeMasked?: string | undefined;
  directionCandidate: LocalDirectionHint;
  negativeKeywords: string[];
}

export interface PrivacyFirewallResult {
  redactedTitle?: string | undefined;
  redactedBody: string;
  rawTextPresent: false;
  localParser: LocalParserResult;
}

export interface CoalescedSignal {
  snapshotCount: number;
  firstSnapshotAt: string;
  lastSnapshotAt: string;
  coalescingWindowMs: number;
  notificationHash: string;
  semanticHash: string;
  coalescedHash: string;
  snapshot: NotificationSnapshot;
}

export interface UploadPayload {
  redacted_text: string;
  redacted_title?: string | undefined;
  redacted_body: string;
  chosen_title?: string | undefined;
  chosen_body?: string | undefined;
  snapshot_count: number;
  raw_text_present: false;
  coalescing?: {
    coalescing_window_ms: number;
    first_snapshot_at: string;
    last_snapshot_at: string;
    coalesced_hash: string;
    semantic_hash: string;
  } | undefined;
  local_parser: LocalParserResult;
}

export interface SignalUploadEnvelope {
  event_id: string;
  device_id: string;
  merchant_id: string;
  bank_profile_id: string;
  package_name: string;
  package_cert_sha256?: string | undefined;
  notification_hash: string;
  local_counter: number;
  observed_at: string;
  payload: UploadPayload;
  signature: string;
}

export interface EncryptedOutboxRecord {
  eventId: string;
  notificationHash: string;
  observedAt: string;
  encryptedPayload: string;
  attemptCount: number;
  lastAttemptAt?: string | undefined;
  state: OutboxState;
}

export interface PayloadEncryptor {
  encrypt(payload: UploadPayload): string;
}

export interface SignalSigner {
  sign(envelopeWithoutSignature: Omit<SignalUploadEnvelope, 'signature'>): string;
}

export interface EncryptedOutbox {
  readonly records: EncryptedOutboxRecord[];
  nextLocalCounter(): number;
  persist(record: EncryptedOutboxRecord): Promise<void>;
}

export interface ProcessAndroidNotificationInput {
  notification: AndroidNotificationInput;
  allowedBanks: AllowedBankProfile[];
  deviceId: string;
  merchantId: string;
  encryptor?: PayloadEncryptor | undefined;
  outbox?: EncryptedOutbox | undefined;
  signer?: SignalSigner | undefined;
  coalescer?: NotificationCoalescer | undefined;
  now: () => Date;
}

export type ProcessAndroidNotificationResult =
  | {
      kind: 'ignored';
      reason: IgnoredReason;
    }
  | {
      kind: 'queued';
      snapshot: NotificationSnapshot;
      upload: SignalUploadEnvelope;
    };

export interface HeartbeatInput {
  deviceId: string;
  notificationAccessStatus: NotificationAccessStatus;
  listenerConnected: boolean;
  selectedBankProfileIds: string[];
  queueLength: number;
  lastSignalAt?: string | undefined;
  appVersion: string;
  androidVersion: string;
  healthStatus: ReceiverHealthStatus;
}

export interface ReceiverHeartbeatPayload {
  device_id: string;
  notification_access_status: NotificationAccessStatus;
  listener_status: 'connected' | 'disconnected';
  selected_bank_profile_ids: string[];
  queue_length: number;
  last_signal_at?: string | undefined;
  app_version: string;
  android_version: string;
  health_status: ReceiverHealthStatus;
}

export interface AndroidReceiverNotificationListenerOptions {
  allowedBanks: AllowedBankProfile[];
  deviceId?: string | undefined;
  merchantId?: string | undefined;
  encryptor?: PayloadEncryptor | undefined;
  outbox?: EncryptedOutbox | undefined;
  signer?: SignalSigner | undefined;
  now?: (() => Date) | undefined;
  onIgnored?: ((result: Extract<ProcessAndroidNotificationResult, { kind: 'ignored' }>) => void) | undefined;
  onQueued?: ((result: Extract<ProcessAndroidNotificationResult, { kind: 'queued' }>) => void) | undefined;
}

interface AndroidReceiverNotificationListenerRuntimeOptions {
  allowedBanks: AllowedBankProfile[];
  deviceId: string;
  merchantId: string;
  encryptor: PayloadEncryptor;
  outbox: EncryptedOutbox;
  signer: SignalSigner;
  now: () => Date;
  onIgnored?: ((result: Extract<ProcessAndroidNotificationResult, { kind: 'ignored' }>) => void) | undefined;
  onQueued?: ((result: Extract<ProcessAndroidNotificationResult, { kind: 'queued' }>) => void) | undefined;
}

export class AesGcmPayloadEncryptor {
  private readonly key: Buffer;

  public constructor(key: string) {
    this.key = key.length === 32 ? Buffer.from(key, 'utf8') : createHash('sha256').update(key).digest();
  }

  public encrypt(payload: UploadPayload): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return ['v1', iv.toString('base64url'), authTag.toString('base64url'), ciphertext.toString('base64url')].join('.');
  }
}

export class InMemoryEncryptedOutbox {
  public readonly records: EncryptedOutboxRecord[] = [];
  private localCounter = 0;

  public nextLocalCounter(): number {
    this.localCounter += 1;
    return this.localCounter;
  }

  public async persist(record: EncryptedOutboxRecord): Promise<void> {
    this.records.push(record);
  }
}

export class NotificationCoalescer {
  public readonly coalescingWindowMs: number;

  public constructor(options: { coalescingWindowMs: number }) {
    this.coalescingWindowMs = options.coalescingWindowMs;
  }

  public coalesce(snapshots: NotificationSnapshot[]): CoalescedSignal {
    if (snapshots.length === 0) {
      throw new Error('At least one notification snapshot is required.');
    }

    const ordered = [...snapshots].sort((left, right) => new Date(left.postTime).getTime() - new Date(right.postTime).getTime());
    const deduped = new Map<string, NotificationSnapshot>();

    for (const snapshot of ordered) {
      deduped.set(snapshotFingerprint(snapshot), snapshot);
    }

    const uniqueSnapshots = [...deduped.values()];
    const first = uniqueSnapshots[0]!;
    const last = uniqueSnapshots[uniqueSnapshots.length - 1]!;
    const semanticBody = joinSnapshotText(last);

    return {
      snapshotCount: uniqueSnapshots.length,
      firstSnapshotAt: first.postTime,
      lastSnapshotAt: last.postTime,
      coalescingWindowMs: this.coalescingWindowMs,
      notificationHash: sha256Hex([last.packageName, last.packageCertSha256 ?? '', last.key, redactNotificationText(semanticBody)].join('|')),
      semanticHash: sha256Hex(redactNotificationText(semanticBody)),
      coalescedHash: sha256Hex(uniqueSnapshots.map((snapshot) => snapshotFingerprint(snapshot)).join('|')),
      snapshot: last
    };
  }
}

export class AndroidReceiverNotificationListener {
  public readonly capabilities = {
    capturesNotifications: true,
    filtersAllowlist: true,
    signsUploads: true,
    makesPaymentDecision: false
  } as const;

  private readonly options: AndroidReceiverNotificationListenerRuntimeOptions;

  public constructor(options: AndroidReceiverNotificationListenerOptions) {
    this.options = {
      allowedBanks: options.allowedBanks,
      deviceId: options.deviceId ?? 'dev_local_mvp',
      merchantId: options.merchantId ?? 'mch_local_mvp',
      encryptor: options.encryptor ?? new AesGcmPayloadEncryptor('local_android_receiver_mvp_key'),
      outbox: options.outbox ?? new InMemoryEncryptedOutbox(),
      signer: options.signer ?? createHmacSignalSigner('local_android_receiver_mvp_signer'),
      now: options.now ?? (() => new Date()),
      onIgnored: options.onIgnored,
      onQueued: options.onQueued
    };
  }

  public async onNotificationPosted(notification: AndroidNotificationInput): Promise<ProcessAndroidNotificationResult> {
    const result = await processAndroidNotification({
      notification,
      allowedBanks: this.options.allowedBanks,
      deviceId: this.options.deviceId,
      merchantId: this.options.merchantId,
      encryptor: this.options.encryptor,
      outbox: this.options.outbox,
      signer: this.options.signer,
      now: this.options.now
    });

    if (result.kind === 'ignored') {
      this.options.onIgnored?.(result);
    } else {
      this.options.onQueued?.(result);
    }

    return result;
  }
}

export function createHmacSignalSigner(secret: string): SignalSigner {
  return {
    sign(envelopeWithoutSignature: Omit<SignalUploadEnvelope, 'signature'>): string {
      return createHmac('sha256', secret).update(stableStringify(envelopeWithoutSignature)).digest('hex');
    }
  };
}

export async function processAndroidNotification(
  input: ProcessAndroidNotificationInput
): Promise<ProcessAndroidNotificationResult> {
  const evaluation = evaluateAllowedBankPackage(input.notification, input.allowedBanks);
  if (evaluation.kind === 'ignored') {
    return evaluation;
  }

  const snapshot = buildNotificationSnapshot(input.notification);
  const coalescer = input.coalescer ?? new NotificationCoalescer({ coalescingWindowMs: 1_500 });
  const coalesced = coalescer.coalesce([snapshot]);
  const firewall = runPrivacyFirewall(joinSnapshotText(coalesced.snapshot), coalesced.snapshot.titleBig ?? coalesced.snapshot.title);
  const observedAt = input.now().toISOString();
  const localCounter = (input.outbox ?? defaultOutbox).nextLocalCounter();
  const eventId = `evt_${sha256Hex(`${input.deviceId}|${coalesced.notificationHash}|${localCounter}`).slice(0, 32)}`;
  const payload: UploadPayload = {
    redacted_text: firewall.redactedBody,
    redacted_title: firewall.redactedTitle,
    redacted_body: firewall.redactedBody,
    chosen_title: firewall.redactedTitle,
    chosen_body: firewall.redactedBody,
    snapshot_count: coalesced.snapshotCount,
    raw_text_present: false,
    coalescing: {
      coalescing_window_ms: coalesced.coalescingWindowMs,
      first_snapshot_at: coalesced.firstSnapshotAt,
      last_snapshot_at: coalesced.lastSnapshotAt,
      coalesced_hash: coalesced.coalescedHash,
      semantic_hash: coalesced.semanticHash
    },
    local_parser: firewall.localParser
  };
  const outbox = input.outbox ?? defaultOutbox;
  const encryptor = input.encryptor ?? new AesGcmPayloadEncryptor('local_android_receiver_mvp_key');
  const signer = input.signer ?? createHmacSignalSigner('local_android_receiver_mvp_signer');

  await outbox.persist({
    eventId,
    notificationHash: coalesced.notificationHash,
    observedAt,
    encryptedPayload: encryptor.encrypt(payload),
    attemptCount: 0,
    state: 'pending_upload'
  });

  const envelopeWithoutSignature: Omit<SignalUploadEnvelope, 'signature'> = {
    event_id: eventId,
    device_id: input.deviceId,
    merchant_id: input.merchantId,
    bank_profile_id: evaluation.bankProfile.bankProfileId,
    package_name: snapshot.packageName,
    package_cert_sha256: snapshot.packageCertSha256,
    notification_hash: coalesced.notificationHash,
    local_counter: localCounter,
    observed_at: observedAt,
    payload
  };

  return {
    kind: 'queued',
    snapshot,
    upload: {
      ...envelopeWithoutSignature,
      signature: signer.sign(envelopeWithoutSignature)
    }
  };
}

export function buildHeartbeatPayload(input: HeartbeatInput): ReceiverHeartbeatPayload {
  return {
    device_id: input.deviceId,
    notification_access_status: input.notificationAccessStatus,
    listener_status: input.listenerConnected ? 'connected' : 'disconnected',
    selected_bank_profile_ids: input.selectedBankProfileIds,
    queue_length: input.queueLength,
    last_signal_at: input.lastSignalAt,
    app_version: input.appVersion,
    android_version: input.androidVersion,
    health_status: input.healthStatus
  };
}

export function evaluateAllowedBankPackage(
  notification: AndroidNotificationInput,
  allowedBanks: AllowedBankProfile[]
): { kind: 'allowed'; bankProfile: AllowedBankProfile } | { kind: 'ignored'; reason: IgnoredReason } {
  const bankProfile = allowedBanks.find((bank) => bank.packageName === notification.packageName);
  if (!bankProfile) {
    return { kind: 'ignored', reason: 'package_not_allowlisted' };
  }

  if (
    bankProfile.verificationStatus !== BankPackageVerificationStatuses.Verified ||
    bankProfile.packageName === 'TO_VERIFY' ||
    bankProfile.packageCertSha256 === 'TO_VERIFY'
  ) {
    return { kind: 'ignored', reason: 'package_untrusted' };
  }

  if (bankProfile.strictVerification && notification.packageCertSha256 !== bankProfile.packageCertSha256) {
    return { kind: 'ignored', reason: 'package_cert_mismatch' };
  }

  return { kind: 'allowed', bankProfile };
}

export function buildNotificationSnapshot(notification: AndroidNotificationInput): NotificationSnapshot {
  return {
    packageName: notification.packageName,
    packageCertSha256: notification.packageCertSha256,
    notificationId: notification.notificationId,
    tag: notification.tag,
    key: notification.key,
    postTime: notification.postTime,
    channelId: notification.channelId,
    groupKey: notification.groupKey,
    sortKey: notification.sortKey,
    title: notification.extras.title,
    titleBig: notification.extras.titleBig,
    text: notification.extras.text,
    body: notification.extras.text,
    bigText: notification.extras.bigText,
    subText: notification.extras.subText,
    summaryText: notification.extras.summaryText,
    textLines: notification.extras.textLines ?? [],
    tickerText: notification.tickerText
  };
}

export function runPrivacyFirewall(rawBody: string, rawTitle?: string | undefined): PrivacyFirewallResult {
  const localParser = parseLocalSignal(rawBody);

  return {
    redactedTitle: rawTitle ? redactNotificationText(rawTitle) : undefined,
    redactedBody: redactNotificationText(rawBody),
    rawTextPresent: false,
    localParser
  };
}

function parseLocalSignal(rawText: string): LocalParserResult {
  const lowerText = rawText.toLowerCase();
  const negativeKeywords = ['cashback', 'refund', 'promo', 'failed', 'declined', 'outgoing'].filter((keyword) =>
    lowerText.includes(keyword)
  );
  const amount = rawText.match(/\b(\d+(?:[.,]\d{1,2})?)\s?(RUB|RUR|rub|rur)\b/u);
  const phone = rawText.match(/(?:\+7|8)[\s().-]*(\d{3})[\s().-]*(\d{3})[\s().-]*(\d{2})[\s().-]*(\d{2})/u);
  const reference = rawText.match(/\b(SWP[-\s]?[A-Z0-9-]{2,})\b/iu);

  return {
    amountCandidateMinor: amount ? Math.round(Number(amount[1]!.replace(',', '.')) * 100) : undefined,
    currencyCandidate: amount ? 'RUB' : undefined,
    phoneCandidateMasked: phone ? `+7 *** *** **${phone[4]}` : undefined,
    referenceCodeMasked: reference ? maskReference(reference[1]!) : undefined,
    directionCandidate: classifyDirection(lowerText),
    negativeKeywords
  };
}

function classifyDirection(lowerText: string): LocalDirectionHint {
  if (lowerText.includes('cashback')) {
    return 'incoming_cashback';
  }
  if (lowerText.includes('refund')) {
    return 'incoming_refund';
  }
  if (lowerText.includes('promo')) {
    return 'promo';
  }
  if (lowerText.includes('failed') || lowerText.includes('declined')) {
    return 'failed_transfer';
  }
  if (lowerText.includes('outgoing') || lowerText.includes('payment to')) {
    return 'outgoing_payment';
  }
  if (lowerText.includes('incoming') || lowerText.includes('transfer')) {
    return 'incoming_customer_transfer';
  }
  return 'unknown';
}

function redactNotificationText(value: string): string {
  return value
    .replace(/(?:\+7|8)[\s().-]*\d{3}[\s().-]*\d{3}[\s().-]*\d{2}[\s().-]*\d{2}/g, '<PHONE>')
    .replace(/\b\d+(?:[.,]\d{1,2})?\s?(RUB|RUR|rub|rur)\b/gu, '<AMOUNT> <CURRENCY>')
    .replace(/\*\d{4}\b/g, '<CARD_MASK>')
    .replace(/\bSWP[-\s]?[A-Z0-9-]{2,}\b/giu, '<REFERENCE>');
}

function joinSnapshotText(snapshot: NotificationSnapshot): string {
  return [
    snapshot.title,
    snapshot.titleBig,
    snapshot.text,
    snapshot.bigText,
    snapshot.subText,
    snapshot.summaryText,
    ...snapshot.textLines,
    snapshot.tickerText
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join('\n');
}

function snapshotFingerprint(snapshot: NotificationSnapshot): string {
  return sha256Hex(
    stableStringify({
      packageName: snapshot.packageName,
      notificationId: snapshot.notificationId,
      tag: snapshot.tag,
      key: snapshot.key,
      postTime: snapshot.postTime,
      text: joinSnapshotText(snapshot)
    })
  );
}

function maskReference(reference: string): string {
  const normalized = reference.replace(/\s+/g, '-').toUpperCase();
  if (normalized.length <= 6) {
    return '<REFERENCE>';
  }
  return `${normalized.slice(0, 4)}***${normalized.slice(-2)}`;
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

const defaultOutbox = new InMemoryEncryptedOutbox();
