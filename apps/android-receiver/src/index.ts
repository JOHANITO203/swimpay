import { createCipheriv, createHmac, createHash, randomBytes } from 'node:crypto';

export enum NotificationAccessStatus {
  Enabled = 'enabled',
  Disabled = 'disabled'
}

export type ReceiverHealthStatus = 'healthy' | 'degraded' | 'offline';
export type OutboxState = 'captured' | 'pending_upload' | 'uploading' | 'acked' | 'failed_retrying' | 'expired';
export type IgnoredReason = 'package_not_allowlisted' | 'package_cert_mismatch';

export interface AllowedBankProfile {
  bankProfileId: string;
  packageName: string;
  packageCertSha256: string;
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
  directionCandidate: 'incoming_customer_transfer' | 'unknown';
  negativeKeywords: string[];
}

export interface UploadPayload {
  redacted_text: string;
  chosen_title?: string | undefined;
  chosen_body?: string | undefined;
  snapshot_count: number;
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
  encryptor: PayloadEncryptor;
  outbox: EncryptedOutbox;
  signer: SignalSigner;
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

export class AesGcmPayloadEncryptor {
  private readonly key: Buffer;

  public constructor(key: string) {
    this.key = key.length === 32 ? Buffer.from(key, 'utf8') : createHash('sha256').update(key).digest();
  }

  public encrypt(payload: UploadPayload): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    return [
      'v1',
      iv.toString('base64url'),
      authTag.toString('base64url'),
      ciphertext.toString('base64url')
    ].join('.');
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

export function createHmacSignalSigner(secret: string): SignalSigner {
  return {
    sign(envelopeWithoutSignature: Omit<SignalUploadEnvelope, 'signature'>): string {
      return createHmac('sha256', secret)
        .update(stableStringify(envelopeWithoutSignature))
        .digest('hex');
    }
  };
}

export async function processAndroidNotification(
  input: ProcessAndroidNotificationInput
): Promise<ProcessAndroidNotificationResult> {
  const bankProfile = findAllowedBank(input.notification, input.allowedBanks);
  if (!bankProfile) {
    return { kind: 'ignored', reason: 'package_not_allowlisted' };
  }

  if (
    bankProfile.strictVerification &&
    input.notification.packageCertSha256 !== bankProfile.packageCertSha256
  ) {
    return { kind: 'ignored', reason: 'package_cert_mismatch' };
  }

  const snapshot = extractSnapshot(input.notification);
  const observedAt = input.now().toISOString();
  const redactedText = redactSensitiveText(joinSnapshotText(snapshot));
  const parserResult = parseLocalSignal(redactedText);
  const notificationHash = sha256Hex([
    snapshot.packageName,
    snapshot.packageCertSha256 ?? '',
    snapshot.key,
    redactedText
  ].join('|'));
  const localCounter = input.outbox.nextLocalCounter();
  const eventId = `evt_${sha256Hex(`${input.deviceId}|${notificationHash}|${localCounter}`).slice(0, 32)}`;
  const payload: UploadPayload = {
    redacted_text: redactedText,
    chosen_title: snapshot.titleBig ?? snapshot.title,
    chosen_body: snapshot.bigText ?? snapshot.body,
    snapshot_count: 1,
    local_parser: parserResult
  };

  await input.outbox.persist({
    eventId,
    notificationHash,
    observedAt,
    encryptedPayload: input.encryptor.encrypt(payload),
    attemptCount: 0,
    state: 'pending_upload'
  });

  const envelopeWithoutSignature: Omit<SignalUploadEnvelope, 'signature'> = {
    event_id: eventId,
    device_id: input.deviceId,
    merchant_id: input.merchantId,
    bank_profile_id: bankProfile.bankProfileId,
    package_name: snapshot.packageName,
    package_cert_sha256: snapshot.packageCertSha256,
    notification_hash: notificationHash,
    local_counter: localCounter,
    observed_at: observedAt,
    payload
  };

  return {
    kind: 'queued',
    snapshot,
    upload: {
      ...envelopeWithoutSignature,
      signature: input.signer.sign(envelopeWithoutSignature)
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

function findAllowedBank(
  notification: AndroidNotificationInput,
  allowedBanks: AllowedBankProfile[]
): AllowedBankProfile | undefined {
  return allowedBanks.find((bank) => bank.packageName === notification.packageName);
}

function extractSnapshot(notification: AndroidNotificationInput): NotificationSnapshot {
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
    body: notification.extras.text,
    bigText: notification.extras.bigText,
    subText: notification.extras.subText,
    summaryText: notification.extras.summaryText,
    textLines: notification.extras.textLines ?? [],
    tickerText: notification.tickerText
  };
}

function joinSnapshotText(snapshot: NotificationSnapshot): string {
  return [
    snapshot.title,
    snapshot.titleBig,
    snapshot.body,
    snapshot.bigText,
    snapshot.subText,
    snapshot.summaryText,
    ...snapshot.textLines,
    snapshot.tickerText
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join('\n');
}

function redactSensitiveText(value: string): string {
  return value
    .replace(/\+?\d[\d\s().-]{8,}\d/g, '<PHONE>')
    .replace(/\b\d+(?:[.,]\d{1,2})?\s?(RUB|RUR|₽|руб\.?)\b/giu, '<AMOUNT> <CURRENCY>')
    .replace(/\*\d{4}\b/g, '<CARD_MASK>');
}

function parseLocalSignal(redactedText: string): LocalParserResult {
  const lowerText = redactedText.toLowerCase();
  const negativeKeywords = ['cashback', 'refund', 'promo', 'failed', 'declined'].filter((keyword) =>
    lowerText.includes(keyword)
  );

  return {
    currencyCandidate: redactedText.includes('<CURRENCY>') ? 'RUB' : undefined,
    phoneCandidateMasked: redactedText.includes('<PHONE>') ? '<PHONE>' : undefined,
    directionCandidate:
      lowerText.includes('incoming') || lowerText.includes('transfer') ? 'incoming_customer_transfer' : 'unknown',
    negativeKeywords
  };
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
