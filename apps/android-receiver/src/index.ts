import { createCipheriv, createHmac, createHash, randomBytes } from 'node:crypto';

export enum NotificationAccessStatus {
  Enabled = 'enabled',
  Disabled = 'disabled'
}

export const ReceiverOutboxStatuses = {
  Captured: 'captured',
  PendingUpload: 'pending_upload',
  Uploading: 'uploading',
  Acked: 'acked',
  FailedRetrying: 'failed_retrying',
  Expired: 'expired'
} as const;

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
export type OutboxState = (typeof ReceiverOutboxStatuses)[keyof typeof ReceiverOutboxStatuses];
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
  firstSeenAt?: string | undefined;
  lastAttemptAt?: string | undefined;
  nextRetryAt?: string | undefined;
  ackReceivedAt?: string | undefined;
  expiresAt?: string | undefined;
  lastError?: string | undefined;
  state: OutboxState;
}

export interface PayloadEncryptor {
  encrypt(payload: UploadPayload): string;
}

export interface SignalSigner {
  sign(payloadWithoutSignature: unknown): string;
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

export interface ReceiverRegistrationClientRequest {
  deviceName?: string | undefined;
  appVersion: string;
  androidVersion: string;
  publicKey: string;
  installId?: string | undefined;
  deviceInstallId?: string | undefined;
  supportedCapabilities: string[];
}

export interface ReceiverRegistrationClientResponse {
  deviceId: string;
  merchantId: string;
  status: string;
  serverTime: string;
  requiredCapabilities: string[];
  warnings: string[];
}

export interface ReceiverSignedHeartbeatInput {
  deviceId: string;
  appVersion: string;
  androidVersion: string;
  notificationAccessEnabled: boolean;
  listenerConnected: boolean;
  allowedBankProfileIds: string[];
  queueLength: number;
  lastSignalObservedAt?: string | undefined;
  batteryOptimizationIgnored?: boolean | undefined;
  timestamp: string;
}

export interface ReceiverSignedHeartbeatPayload {
  device_id: string;
  app_version: string;
  android_version: string;
  notification_access_enabled: boolean;
  listener_connected: boolean;
  allowed_bank_profile_ids: string[];
  queue_length: number;
  last_signal_observed_at?: string | undefined;
  battery_optimization_ignored?: boolean | undefined;
  timestamp: string;
  signature: string;
}

export interface ReceiverHeartbeatClientResponse {
  deviceStatus: string;
  serverTime: string;
  receiverMode: string;
  activePaymentSessionsCount: number;
  warnings: string[];
  requiredActions: string[];
}

export interface ReceiverSignalUploadBuilderInput {
  eventId: string;
  merchantId: string;
  deviceId: string;
  bankProfile: AllowedBankProfile;
  observedAt: string;
  receivedAt?: string | undefined;
  notificationHash: string;
  semanticHash?: string | undefined;
  localCounter: number;
  snapshotCount: number;
  coalesced: boolean;
  amountMinor?: number | undefined;
  currency?: string | undefined;
  senderPhoneHmac?: string | undefined;
  senderPhoneMasked?: string | undefined;
  referenceHmac?: string | undefined;
  referenceCodeMasked?: string | undefined;
  directionHint?: LocalDirectionHint | undefined;
  parserHint?: string | undefined;
  signalQualityHint?: number | undefined;
  redactedTitle?: string | undefined;
  redactedBody?: string | undefined;
  rawTextPresent: boolean;
  rawPhone?: string | undefined;
  rawNotificationText?: string | undefined;
}

export interface ReceiverSignedSignalUploadPayload {
  event_id: string;
  merchant_id: string;
  device_id: string;
  bank_profile_id: string;
  package_name: string;
  package_cert_sha256: string;
  observed_at: string;
  received_at?: string | undefined;
  notification_hash: string;
  semantic_hash?: string | undefined;
  local_counter: number;
  snapshot_count: number;
  coalesced: boolean;
  amount_minor?: number | undefined;
  currency?: string | undefined;
  sender_phone_hmac?: string | undefined;
  sender_phone_masked?: string | undefined;
  reference_hmac?: string | undefined;
  reference_code_masked?: string | undefined;
  direction_hint?: LocalDirectionHint | undefined;
  parser_hint?: string | undefined;
  signal_quality_hint?: number | undefined;
  redacted_title?: string | undefined;
  redacted_body?: string | undefined;
  raw_text_present: false;
  signature: string;
  package_verification_trust: 'trusted' | 'untrusted';
}

export interface ReceiverSignalUploadClientResponse {
  signalId: string;
  status: string;
  accepted: boolean;
  reasonCodes: string[];
  serverTime: string;
  nextAction: string;
}

export interface ReceiverHttpTransport {
  request(input: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
  }): Promise<{ status: number; body: unknown }>;
}

export interface ReceiverApiClientOptions {
  baseUrl: string;
  merchantAuthToken?: string | undefined;
  transport?: ReceiverHttpTransport | undefined;
}

export interface ReceiverApiClient {
  registerDevice(input: ReceiverRegistrationClientRequest): Promise<ReceiverRegistrationClientResponse>;
  sendHeartbeat(payload: ReceiverSignedHeartbeatPayload): Promise<ReceiverHeartbeatClientResponse>;
  uploadSignal(payload: ReceiverSignedSignalUploadPayload): Promise<ReceiverSignalUploadClientResponse>;
}

export type ReceiverHealthWarning =
  | 'notification_access_disabled'
  | 'listener_disconnected'
  | 'no_banks_allowed'
  | 'all_banks_untrusted'
  | 'queue_backlog_high'
  | 'backend_unreachable'
  | 'battery_optimization_risk';

export interface ReceiverHealthStatusInput {
  notificationAccessEnabled: boolean;
  listenerConnected: boolean;
  allowedBanks: AllowedBankProfile[];
  queueLength: number;
  lastSignalObservedAt?: string | undefined;
  lastUploadAt?: string | undefined;
  appVersion: string;
  deviceStatus: string;
  backendReachable: boolean;
  batteryOptimizationIgnored: boolean;
}

export interface ReceiverHealthStatusSnapshot {
  notification_access_enabled: boolean;
  listener_connected: boolean;
  allowed_banks_count: number;
  trusted_banks_count: number;
  queue_length: number;
  last_signal_observed_at?: string | undefined;
  last_upload_at?: string | undefined;
  app_version: string;
  device_status: string;
  warnings: ReceiverHealthWarning[];
}

export interface ReceiverLocalSmokePlan {
  backendBaseUrl: string;
  requiresRealAndroidDevice: false;
  steps: { name: string; method: string; path: string; expected: string }[];
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

export class RetryingEncryptedOutbox {
  public readonly records: EncryptedOutboxRecord[] = [];

  private readonly now: () => Date;
  private readonly ttlMs: number;
  private readonly encryptor: { encrypt(payload: ReceiverSignedSignalUploadPayload): string };

  public constructor(options: {
    now: () => Date;
    ttlMs: number;
    encryptor: { encrypt(payload: ReceiverSignedSignalUploadPayload): string };
  }) {
    this.now = options.now;
    this.ttlMs = options.ttlMs;
    this.encryptor = options.encryptor;
  }

  public enqueue(payload: ReceiverSignedSignalUploadPayload): EncryptedOutboxRecord {
    assertNoReceiverRawPii(payload);

    const existing = this.records.find((record) => record.eventId === payload.event_id);
    if (existing) {
      return existing;
    }

    const firstSeenAt = this.now().toISOString();
    const record: EncryptedOutboxRecord = {
      eventId: payload.event_id,
      notificationHash: payload.notification_hash,
      observedAt: payload.observed_at,
      encryptedPayload: this.encryptor.encrypt(payload),
      attemptCount: 0,
      firstSeenAt,
      nextRetryAt: firstSeenAt,
      expiresAt: new Date(new Date(firstSeenAt).getTime() + this.ttlMs).toISOString(),
      state: ReceiverOutboxStatuses.PendingUpload
    };

    this.records.push(record);
    return record;
  }

  public markUploading(eventId: string, at: Date): void {
    const record = this.getRecord(eventId);
    if (record.state === ReceiverOutboxStatuses.Acked || record.state === ReceiverOutboxStatuses.Expired) {
      return;
    }
    record.state = ReceiverOutboxStatuses.Uploading;
    record.lastAttemptAt = at.toISOString();
  }

  public markFailedRetrying(eventId: string, at: Date, error: string): void {
    const record = this.getRecord(eventId);
    if (record.state === ReceiverOutboxStatuses.Acked || record.state === ReceiverOutboxStatuses.Expired) {
      return;
    }

    record.attemptCount += 1;
    record.state = ReceiverOutboxStatuses.FailedRetrying;
    record.lastAttemptAt = at.toISOString();
    record.lastError = sanitizeOutboxError(error);
    record.nextRetryAt = new Date(at.getTime() + retryDelayMs(record.attemptCount)).toISOString();
  }

  public markAcked(eventId: string, at: Date): void {
    const record = this.getRecord(eventId);
    record.state = ReceiverOutboxStatuses.Acked;
    record.ackReceivedAt = at.toISOString();
    record.nextRetryAt = undefined;
  }

  public expireDue(at: Date): void {
    for (const record of this.records) {
      if (
        record.state !== ReceiverOutboxStatuses.Acked &&
        record.expiresAt &&
        new Date(record.expiresAt).getTime() <= at.getTime()
      ) {
        record.state = ReceiverOutboxStatuses.Expired;
      }
    }
  }

  public dueUploads(at: Date): EncryptedOutboxRecord[] {
    return this.records.filter((record) => {
      if (record.state !== ReceiverOutboxStatuses.PendingUpload && record.state !== ReceiverOutboxStatuses.FailedRetrying) {
        return false;
      }
      return !record.nextRetryAt || new Date(record.nextRetryAt).getTime() <= at.getTime();
    });
  }

  private getRecord(eventId: string): EncryptedOutboxRecord {
    const record = this.records.find((candidate) => candidate.eventId === eventId);
    if (!record) {
      throw new Error(`Outbox record not found: ${eventId}`);
    }
    return record;
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
    sign(payloadWithoutSignature: unknown): string {
      return createHmac('sha256', secret).update(stableStringify(payloadWithoutSignature)).digest('hex');
    }
  };
}

export function createRetryingEncryptedOutbox(options: {
  now: () => Date;
  ttlMs: number;
  encryptor: { encrypt(payload: ReceiverSignedSignalUploadPayload): string };
}): RetryingEncryptedOutbox {
  return new RetryingEncryptedOutbox(options);
}

export function createReceiverApiClient(options: ReceiverApiClientOptions): ReceiverApiClient {
  const baseUrl = options.baseUrl.replace(/\/+$/u, '');
  if (!baseUrl) {
    throw new Error('Receiver API baseUrl is required.');
  }

  const transport = options.transport ?? new FetchReceiverHttpTransport();

  async function post(path: string, body: unknown): Promise<unknown> {
    const headers: Record<string, string> = {
      'content-type': 'application/json'
    };
    if (options.merchantAuthToken) {
      headers.authorization = `Bearer ${options.merchantAuthToken}`;
    }

    const response = await transport.request({
      method: 'POST',
      url: `${baseUrl}${path}`,
      headers,
      body
    });

    if (response.status < 200 || response.status >= 300) {
      const error = isRecord(response.body) && typeof response.body.error === 'string' ? response.body.error : 'request_failed';
      throw new Error(`Receiver API request failed: ${response.status} ${error}`);
    }

    return response.body;
  }

  return {
    async registerDevice(input: ReceiverRegistrationClientRequest): Promise<ReceiverRegistrationClientResponse> {
      const body = {
        device_name: input.deviceName,
        app_version: input.appVersion,
        android_version: input.androidVersion,
        public_key: input.publicKey,
        install_id: input.installId,
        device_install_id: input.deviceInstallId,
        supported_capabilities: input.supportedCapabilities
      };
      const response = await post('/v1/receiver-devices/register', compactRecord(body));
      return parseRegistrationResponse(response);
    },

    async sendHeartbeat(payload: ReceiverSignedHeartbeatPayload): Promise<ReceiverHeartbeatClientResponse> {
      const response = await post('/v1/receiver-devices/heartbeat', payload);
      return parseHeartbeatResponse(response);
    },

    async uploadSignal(payload: ReceiverSignedSignalUploadPayload): Promise<ReceiverSignalUploadClientResponse> {
      const uploadPayload = stripLocalSignalTrustMetadata(payload);
      const response = await post('/v1/receiver/signals', uploadPayload);
      return parseSignalUploadResponse(response);
    }
  };
}

export function buildSignedHeartbeatPayload(
  input: ReceiverSignedHeartbeatInput,
  signer: SignalSigner
): ReceiverSignedHeartbeatPayload {
  const payloadWithoutSignature = compactRecord({
    device_id: input.deviceId,
    app_version: input.appVersion,
    android_version: input.androidVersion,
    notification_access_enabled: input.notificationAccessEnabled,
    listener_connected: input.listenerConnected,
    allowed_bank_profile_ids: input.allowedBankProfileIds,
    queue_length: input.queueLength,
    last_signal_observed_at: input.lastSignalObservedAt,
    battery_optimization_ignored: input.batteryOptimizationIgnored,
    timestamp: input.timestamp
  }) as Omit<ReceiverSignedHeartbeatPayload, 'signature'>;

  return {
    ...payloadWithoutSignature,
    signature: signer.sign(payloadWithoutSignature)
  };
}

export function buildSignedSignalUploadPayload(
  input: ReceiverSignalUploadBuilderInput,
  signer: SignalSigner
): ReceiverSignedSignalUploadPayload {
  if (input.rawPhone) {
    throw new Error('raw phone fields are not allowed in receiver signal uploads');
  }
  if (input.rawNotificationText || input.rawTextPresent) {
    throw new Error('raw notification text is not allowed in receiver signal uploads');
  }

  const payloadWithoutSignature = compactRecord({
    event_id: input.eventId,
    merchant_id: input.merchantId,
    device_id: input.deviceId,
    bank_profile_id: input.bankProfile.bankProfileId,
    package_name: input.bankProfile.packageName,
    package_cert_sha256: input.bankProfile.packageCertSha256,
    observed_at: input.observedAt,
    received_at: input.receivedAt,
    notification_hash: input.notificationHash,
    semantic_hash: input.semanticHash,
    local_counter: input.localCounter,
    snapshot_count: input.snapshotCount,
    coalesced: input.coalesced,
    amount_minor: input.amountMinor,
    currency: input.currency,
    sender_phone_hmac: input.senderPhoneHmac,
    sender_phone_masked: input.senderPhoneMasked,
    reference_hmac: input.referenceHmac,
    reference_code_masked: input.referenceCodeMasked,
    direction_hint: input.directionHint,
    parser_hint: input.parserHint,
    signal_quality_hint: input.signalQualityHint,
    redacted_title: input.redactedTitle,
    redacted_body: input.redactedBody,
    raw_text_present: false
  }) as Omit<ReceiverSignedSignalUploadPayload, 'signature' | 'package_verification_trust'>;

  assertNoReceiverRawPii(payloadWithoutSignature);

  return {
    ...payloadWithoutSignature,
    signature: signer.sign(payloadWithoutSignature),
    package_verification_trust: isTrustedBankProfile(input.bankProfile) ? 'trusted' : 'untrusted'
  };
}

export function buildReceiverHealthStatus(input: ReceiverHealthStatusInput): ReceiverHealthStatusSnapshot {
  const trustedBanksCount = input.allowedBanks.filter(isTrustedBankProfile).length;
  const warnings: ReceiverHealthWarning[] = [];

  if (!input.notificationAccessEnabled) {
    warnings.push('notification_access_disabled');
  }
  if (!input.listenerConnected) {
    warnings.push('listener_disconnected');
  }
  if (input.allowedBanks.length === 0) {
    warnings.push('no_banks_allowed');
  } else if (trustedBanksCount === 0) {
    warnings.push('all_banks_untrusted');
  }
  if (input.queueLength >= 50) {
    warnings.push('queue_backlog_high');
  }
  if (!input.backendReachable) {
    warnings.push('backend_unreachable');
  }
  if (!input.batteryOptimizationIgnored) {
    warnings.push('battery_optimization_risk');
  }

  const snapshot: ReceiverHealthStatusSnapshot = {
    notification_access_enabled: input.notificationAccessEnabled,
    listener_connected: input.listenerConnected,
    allowed_banks_count: input.allowedBanks.length,
    trusted_banks_count: trustedBanksCount,
    queue_length: input.queueLength,
    app_version: input.appVersion,
    device_status: input.deviceStatus,
    warnings
  };
  if (input.lastSignalObservedAt !== undefined) {
    snapshot.last_signal_observed_at = input.lastSignalObservedAt;
  }
  if (input.lastUploadAt !== undefined) {
    snapshot.last_upload_at = input.lastUploadAt;
  }
  return snapshot;
}

export function createReceiverLocalSmokePlan(backendBaseUrl: string): ReceiverLocalSmokePlan {
  return {
    backendBaseUrl: backendBaseUrl.replace(/\/+$/u, ''),
    requiresRealAndroidDevice: false,
    steps: [
      {
        name: 'register_receiver_device',
        method: 'POST',
        path: '/v1/receiver-devices/register',
        expected: 'device registration returns pending or active receiver device'
      },
      {
        name: 'send_signed_heartbeat',
        method: 'POST',
        path: '/v1/receiver-devices/heartbeat',
        expected: 'heartbeat response returns safe warnings and server time'
      },
      {
        name: 'upload_synthetic_redacted_signal',
        method: 'POST',
        path: '/v1/receiver/signals',
        expected: 'redacted signed signal is accepted for backend processing'
      },
      {
        name: 'verify_backend_decision_pending',
        method: 'ASSERT',
        path: '/v1/receiver/signals',
        expected: 'accepted upload returns backend_decision_pending only'
      },
      {
        name: 'verify_to_verify_routes_to_review',
        method: 'ASSERT',
        path: '/v1/reviews',
        expected: 'TO_VERIFY bank metadata routes to review and never auto-confirms'
      }
    ]
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

class FetchReceiverHttpTransport implements ReceiverHttpTransport {
  public async request(input: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
  }): Promise<{ status: number; body: unknown }> {
    const init: RequestInit = {
      method: input.method,
      headers: input.headers
    };
    if (input.body !== undefined) {
      init.body = JSON.stringify(input.body);
    }
    const response = await fetch(input.url, init);

    const text = await response.text();
    return {
      status: response.status,
      body: text.length > 0 ? (JSON.parse(text) as unknown) : {}
    };
  }
}

function parseRegistrationResponse(value: unknown): ReceiverRegistrationClientResponse {
  if (!isRecord(value)) {
    throw new Error('Receiver API registration response was invalid.');
  }

  return {
    deviceId: requiredString(value, 'device_id'),
    merchantId: requiredString(value, 'merchant_id'),
    status: requiredString(value, 'status'),
    serverTime: requiredString(value, 'server_time'),
    requiredCapabilities: stringArray(value.required_capabilities),
    warnings: stringArray(value.warnings)
  };
}

function parseHeartbeatResponse(value: unknown): ReceiverHeartbeatClientResponse {
  if (!isRecord(value)) {
    throw new Error('Receiver API heartbeat response was invalid.');
  }

  return {
    deviceStatus: requiredString(value, 'device_status'),
    serverTime: requiredString(value, 'server_time'),
    receiverMode: requiredString(value, 'receiver_mode'),
    activePaymentSessionsCount:
      typeof value.active_payment_sessions_count === 'number' ? value.active_payment_sessions_count : 0,
    warnings: stringArray(value.warnings),
    requiredActions: stringArray(value.required_actions)
  };
}

function parseSignalUploadResponse(value: unknown): ReceiverSignalUploadClientResponse {
  if (!isRecord(value)) {
    throw new Error('Receiver API signal upload response was invalid.');
  }

  return {
    signalId: requiredString(value, 'signal_id'),
    status: requiredString(value, 'status'),
    accepted: value.accepted === true,
    reasonCodes: stringArray(value.reason_codes),
    serverTime: requiredString(value, 'server_time'),
    nextAction: requiredString(value, 'next_action')
  };
}

function requiredString(value: Record<string, unknown>, field: string): string {
  const raw = value[field];
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error(`Receiver API response missing ${field}.`);
  }
  return raw;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function compactRecord<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (nested !== undefined) {
      output[key] = nested;
    }
  }
  return output;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isTrustedBankProfile(bankProfile: AllowedBankProfile): boolean {
  return (
    bankProfile.verificationStatus === BankPackageVerificationStatuses.Verified &&
    bankProfile.packageName !== 'TO_VERIFY' &&
    bankProfile.packageCertSha256 !== 'TO_VERIFY'
  );
}

function stripLocalSignalTrustMetadata(
  payload: ReceiverSignedSignalUploadPayload
): Omit<ReceiverSignedSignalUploadPayload, 'package_verification_trust'> {
  const uploadPayload: Partial<ReceiverSignedSignalUploadPayload> = { ...payload };
  delete uploadPayload.package_verification_trust;
  return uploadPayload as Omit<ReceiverSignedSignalUploadPayload, 'package_verification_trust'>;
}

function assertNoReceiverRawPii(value: unknown): void {
  const serialized = JSON.stringify(value);
  if (/(?:\+7|8)[\s().-]*\d{3}[\s().-]*\d{3}[\s().-]*\d{2}[\s().-]*\d{2}/u.test(serialized)) {
    throw new Error('raw phone fields are not allowed in receiver signal uploads');
  }
  if (serialized.includes('raw_notification') || serialized.includes('raw_text_present":true')) {
    throw new Error('raw notification text is not allowed in receiver signal uploads');
  }
}

function sanitizeOutboxError(error: string): string {
  return redactNotificationText(error).slice(0, 160);
}

function retryDelayMs(attemptCount: number): number {
  const delays = [0, 30_000, 120_000, 300_000, 900_000];
  return delays[Math.min(attemptCount, delays.length - 1)]!;
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
