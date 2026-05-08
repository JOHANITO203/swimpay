import { createHash, createPublicKey, createSign, createVerify, randomUUID, timingSafeEqual } from 'node:crypto';
import { connect, StringCodec } from 'nats';
import pg from 'pg';
import {
  ReceiverSignatureAlgorithms,
  validateAndroidReceiverSignalUploadRequest,
  type AndroidReceiverErrorCode,
  type ReceiverSignatureAlgorithm
} from '@swimpay/contracts';
import { EventTypes, type EventEnvelope, type InternalEventEnvelope } from '@swimpay/events';

const { Pool } = pg;

export { ReceiverSignatureAlgorithms } from '@swimpay/contracts';

export interface ReceiverSignalDevice {
  id: string;
  merchantId: string;
  publicKey: string;
  lastLocalCounter: number;
  status: string;
}

export type ReceiverSignalDeviceStatus =
  | 'pending'
  | 'active'
  | 'inactive'
  | 'degraded'
  | 'suspended'
  | 'revoked'
  | 'disabled'
  | 'needs_reconnect'
  | 'notification_access_missing'
  | 'bank_targets_missing'
  | 'force_review_local';

export interface ReceiverSignalPayload {
  title_redacted?: string | undefined;
  body_redacted?: string | undefined;
  amount_minor?: number | undefined;
  currency?: string | undefined;
  sender_phone_hmac?: string | undefined;
  sender_phone_masked?: string | undefined;
  reference_hmac?: string | undefined;
  reference_code_masked?: string | undefined;
  direction_label?: string | undefined;
  snapshot_count?: number | undefined;
  coalesced?: boolean | undefined;
  raw_text_present?: false | undefined;
}

export interface ReceiverSignalRequestBody {
  event_id: string;
  device_id: string;
  merchant_id: string;
  bank_profile_id: string;
  package_name: string;
  package_cert_sha256: string;
  notification_hash: string;
  semantic_hash?: string | undefined;
  local_counter: number;
  observed_at: string;
  received_at?: string | undefined;
  snapshot_count?: number | undefined;
  coalesced?: boolean | undefined;
  payload: ReceiverSignalPayload;
  signature: string;
  signature_payload?: Record<string, unknown> | undefined;
}

export interface StoredReceiverSignal {
  id: string;
  merchantId: string;
  deviceId: string;
  bankProfileId: string;
  packageName: string;
  packageCertSha256: string;
  eventId: string;
  notificationHash: string;
  semanticHash?: string | undefined;
  localCounter: number;
  observedAt: string;
  receivedAt: string;
  amountMinor?: number | undefined;
  currency?: string | undefined;
  senderPhoneHmac?: string | undefined;
  senderPhoneMasked?: string | undefined;
  referenceHmac?: string | undefined;
  referenceCodeMasked?: string | undefined;
  directionLabel: string;
  parserVersion: string;
  signatureValid: true;
  status: 'received';
}

export interface SignalIngestionInput {
  signal: StoredReceiverSignal;
  payloadRedacted: Record<string, unknown>;
  auditEventId: string;
}

export type SignalIngestionResult =
  | { kind: 'stored'; signalId: string }
  | { kind: 'device_not_found' }
  | { kind: 'bank_profile_not_found' }
  | { kind: 'package_signature_rejected' }
  | { kind: 'duplicate_event_id' }
  | { kind: 'duplicate_notification_hash' }
  | { kind: 'local_counter_regression' };

export interface ReceiverSignalRepository {
  getReceiverDevice(params: { merchantId: string; deviceId: string }): Promise<ReceiverSignalDevice | null>;
  ingestSignal(input: SignalIngestionInput): Promise<SignalIngestionResult>;
}

export interface InternalEventPublisher {
  publish(event: EventEnvelope): Promise<void>;
}

export type ReceiverSignalValidationResult =
  | { valid: true; value: ReceiverSignalRequestBody }
  | { valid: false; code: AndroidReceiverErrorCode; field?: string | undefined };

export type ReceiverSignatureVerificationResult =
  | { valid: true; algorithm: ReceiverSignatureAlgorithm }
  | {
      valid: false;
      algorithm: ReceiverSignatureAlgorithm;
      reason: 'missing_signature' | 'invalid_signature' | 'invalid_public_key' | 'invalid_payload_hash';
    };

const LegacyRawPhoneFields = new Set(['phone', 'raw_phone', 'buyer_phone', 'sender_phone', 'normalized_phone']);
const LegacyRawCardFields = new Set([
  'raw_card',
  'card_number',
  'buyer_source_card_number',
  'source_card',
  'source_card_number',
  'pan',
  'card_pan'
]);
const LegacyCredentialFields = new Set([
  'cvv',
  'cvc',
  'security_code',
  'expiration',
  'expiry',
  'exp_month',
  'exp_year',
  'pin',
  'sms_code',
  'bank_password',
  'password'
]);
const LegacyRawNotificationFields = new Set([
  'notification_text',
  'raw_notification',
  'raw_notification_text',
  'raw_text',
  'raw_body',
  'raw_title'
]);

export class NoopEventPublisher implements InternalEventPublisher {
  public async publish(): Promise<void> {}
}

export class NatsEventPublisher implements InternalEventPublisher {
  public constructor(private readonly natsUrl: string) {}

  public async publish(event: EventEnvelope): Promise<void> {
    const connection = await connect({ servers: this.natsUrl, timeout: 750 });
    const codec = StringCodec();
    const envelope: InternalEventEnvelope = {
      id: event.eventId,
      type: event.eventType,
      created_at: event.occurredAt,
      source: 'swimpay-api',
      data: event.data,
      metadata: {
        correlation_id: event.idempotencyKey
      }
    };

    try {
      await connection.jetstream().publish(event.eventType, codec.encode(JSON.stringify(envelope)));
    } finally {
      await connection.close();
    }
  }
}

export class PgSignalRepository implements ReceiverSignalRepository {
  private readonly pool: pg.Pool;

  public constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 5 });
  }

  public async getReceiverDevice(params: {
    merchantId: string;
    deviceId: string;
  }): Promise<ReceiverSignalDevice | null> {
    const result = await this.pool.query(
      `SELECT id, merchant_id, public_key, last_local_counter, status
       FROM receiver_devices
       WHERE merchant_id = $1 AND id = $2`,
      [params.merchantId, params.deviceId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return toReceiverSignalDevice(result.rows[0] as Record<string, string | number>);
  }

  public async ingestSignal(input: SignalIngestionInput): Promise<SignalIngestionResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const deviceResult = await client.query(
        `SELECT id, merchant_id, public_key, last_local_counter, status
         FROM receiver_devices
         WHERE merchant_id = $1 AND id = $2
         FOR UPDATE`,
        [input.signal.merchantId, input.signal.deviceId]
      );

      if (deviceResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return { kind: 'device_not_found' };
      }

      const device = toReceiverSignalDevice(deviceResult.rows[0] as Record<string, string | number>);
      if (input.signal.localCounter <= device.lastLocalCounter) {
        await client.query('ROLLBACK');
        return { kind: 'local_counter_regression' };
      }

      const existingEvent = await client.query('SELECT id FROM notification_signals WHERE event_id = $1', [
        input.signal.eventId
      ]);
      if (existingEvent.rowCount && existingEvent.rowCount > 0) {
        await client.query('ROLLBACK');
        return { kind: 'duplicate_event_id' };
      }

      const existingHash = await client.query('SELECT id FROM notification_signals WHERE notification_hash = $1', [
        input.signal.notificationHash
      ]);
      if (existingHash.rowCount && existingHash.rowCount > 0) {
        await client.query('ROLLBACK');
        return { kind: 'duplicate_notification_hash' };
      }

      const bankProfile = await client.query('SELECT id FROM bank_profiles WHERE id = $1', [
        input.signal.bankProfileId
      ]);
      if (bankProfile.rowCount === 0) {
        await client.query('ROLLBACK');
        return { kind: 'bank_profile_not_found' };
      }

      const signatureStatus = await ensurePendingBankAppSignature(client, input.signal);
      if (signatureStatus === 'rejected') {
        await client.query('ROLLBACK');
        return { kind: 'package_signature_rejected' };
      }

      await client.query(
        `INSERT INTO notification_signals (
          id, merchant_id, device_id, bank_profile_id, event_id, notification_hash, semantic_hash,
          local_counter, observed_at, received_at, amount_minor, currency,
          sender_phone_hmac, sender_phone_masked, reference_hmac, reference_code_masked,
          direction_label, parser_version, signature_valid, status, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, $16,
          $17, $18, $19, $20, $21
        )`,
        [
          input.signal.id,
          input.signal.merchantId,
          input.signal.deviceId,
          input.signal.bankProfileId,
          input.signal.eventId,
          input.signal.notificationHash,
          input.signal.semanticHash ?? null,
          input.signal.localCounter,
          input.signal.observedAt,
          input.signal.receivedAt,
          input.signal.amountMinor ?? null,
          input.signal.currency ?? null,
          input.signal.senderPhoneHmac ?? null,
          input.signal.senderPhoneMasked ?? null,
          input.signal.referenceHmac ?? null,
          input.signal.referenceCodeMasked ?? null,
          input.signal.directionLabel,
          input.signal.parserVersion,
          input.signal.signatureValid,
          input.signal.status,
          input.signal.receivedAt
        ]
      );

      await client.query(
        `UPDATE receiver_devices
         SET last_local_counter = $1, updated_at = $2
         WHERE merchant_id = $3 AND id = $4`,
        [
          input.signal.localCounter,
          input.signal.receivedAt,
          input.signal.merchantId,
          input.signal.deviceId
        ]
      );

      await client.query(
        `INSERT INTO audit_events (
          id, merchant_id, event_type, object_type, object_id, actor_type, payload_redacted
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          input.auditEventId,
          input.signal.merchantId,
          EventTypes.SIGNAL_RECEIVED,
          'notification_signal',
          input.signal.id,
          'receiver_device',
          JSON.stringify(input.payloadRedacted)
        ]
      );

      await client.query('COMMIT');
      return { kind: 'stored', signalId: input.signal.id };
    } catch (error) {
      await client.query('ROLLBACK');
      const duplicate = mapUniqueViolation(error);
      if (duplicate) {
        return duplicate;
      }

      throw error;
    } finally {
      client.release();
    }
  }
}

export function validateReceiverSignalBody(body: unknown): ReceiverSignalValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, code: 'payload_invalid' };
  }

  const contractValidation = validateAndroidReceiverSignalUploadRequest(body);
  if (contractValidation.valid) {
    const value = contractValidation.value;
    return {
      valid: true,
      value: {
        event_id: value.event_id,
        device_id: value.device_id,
        merchant_id: value.merchant_id,
        bank_profile_id: value.bank_profile_id,
        package_name: value.package_name,
        package_cert_sha256: value.package_cert_sha256,
        notification_hash: value.notification_hash,
        semantic_hash: value.semantic_hash,
        local_counter: value.local_counter,
        observed_at: value.observed_at,
        received_at: value.received_at,
        snapshot_count: value.snapshot_count,
        coalesced: value.coalesced,
        payload: {
          title_redacted: value.redacted_title,
          body_redacted: value.redacted_body,
          amount_minor: value.amount_minor,
          currency: value.currency,
          sender_phone_hmac: value.sender_phone_hmac,
          sender_phone_masked: value.sender_phone_masked,
          reference_hmac: value.reference_hmac,
          reference_code_masked: value.reference_code_masked,
          direction_label: value.direction_hint,
          snapshot_count: value.snapshot_count,
          coalesced: value.coalesced,
          raw_text_present: false
        },
        signature: value.signature,
        signature_payload: canonicalSignalPayloadRecord(body)
      }
    };
  }

  const recordBody = body as Record<string, unknown>;
  if (isLegacyReceiverSignalShape(recordBody)) {
    return validateLegacyReceiverSignalBody(recordBody);
  }

  return contractValidation;
}

function validateLegacyReceiverSignalBody(body: Record<string, unknown>): ReceiverSignalValidationResult {
  const rawField = findForbiddenLegacyReceiverRawField(body);
  if (rawField?.kind === 'phone' || rawField?.kind === 'card') {
    return { valid: false, code: 'raw_phone_rejected', field: rawField.field };
  }
  if (rawField?.kind === 'credential') {
    return { valid: false, code: 'payload_invalid', field: rawField.field };
  }
  if (rawField?.kind === 'notification') {
    return { valid: false, code: 'raw_notification_rejected', field: rawField.field };
  }

  const candidate = body as Partial<ReceiverSignalRequestBody>;
  const localCounter = candidate.local_counter;
  if (
    !isNonEmptyString(candidate.event_id) ||
    !isNonEmptyString(candidate.device_id) ||
    !isNonEmptyString(candidate.merchant_id) ||
    !isNonEmptyString(candidate.bank_profile_id) ||
    !isNonEmptyString(candidate.package_name) ||
    !isNonEmptyString(candidate.package_cert_sha256) ||
    !isNonEmptyString(candidate.notification_hash) ||
    typeof localCounter !== 'number' ||
    !Number.isInteger(localCounter) ||
    Number(localCounter) <= 0 ||
    !isNonEmptyString(candidate.observed_at) ||
    Number.isNaN(Date.parse(candidate.observed_at)) ||
    !candidate.payload ||
    typeof candidate.payload !== 'object' ||
    !isNonEmptyString(candidate.signature)
  ) {
    return { valid: false, code: 'payload_invalid' };
  }

  return {
    valid: true,
    value: {
      event_id: candidate.event_id,
      device_id: candidate.device_id,
      merchant_id: candidate.merchant_id,
      bank_profile_id: candidate.bank_profile_id,
      package_name: candidate.package_name,
      package_cert_sha256: candidate.package_cert_sha256,
      notification_hash: candidate.notification_hash,
      local_counter: localCounter,
      observed_at: new Date(candidate.observed_at).toISOString(),
      payload: normalizeSignalPayload(candidate.payload as ReceiverSignalPayload),
      signature: candidate.signature
    }
  };
}

export function createReceiverSignalSignature(
  signalWithoutSignature: Record<string, unknown>,
  privateKeyPem: string
): string {
  const signer = createSign('SHA256');
  signer.update(stableStringify(signalWithoutSignature));
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

export function verifyReceiverSignalSignature(
  body: ReceiverSignalRequestBody | Record<string, unknown>,
  verificationKey: string
): ReceiverSignatureVerificationResult {
  const algorithm = ReceiverSignatureAlgorithms.ECDSA_P256_SHA256_DER_V1;
  const signature = typeof body.signature === 'string' ? body.signature : '';
  if (!signature) {
    return {
      valid: false,
      algorithm,
      reason: 'missing_signature'
    };
  }

  if (!isReceiverPublicKeyPem(verificationKey)) {
    return {
      valid: false,
      algorithm,
      reason: 'invalid_public_key'
    };
  }

  const signaturePayload =
    'signature_payload' in body && body.signature_payload && typeof body.signature_payload === 'object' && !Array.isArray(body.signature_payload)
      ? (body.signature_payload as Record<string, unknown>)
      : undefined;
  const signalWithoutSignature = { ...(body as Record<string, unknown>) };
  delete signalWithoutSignature.signature;
  delete signalWithoutSignature.signature_payload;
  const payload = signaturePayload ?? signalWithoutSignature;

  if (!isReceiverPayloadHashValid(payload)) {
    return {
      valid: false,
      algorithm,
      reason: 'invalid_payload_hash'
    };
  }

  const valid = verifyAsymmetricReceiverSignature(payload, signature, verificationKey);
  return valid ? { valid: true, algorithm } : { valid: false, algorithm, reason: 'invalid_signature' };
}

function verifyAsymmetricReceiverSignature(
  payload: Record<string, unknown>,
  signature: string,
  publicKeyPem: string
): boolean {
  try {
    const publicKey = createPublicKey(publicKeyPem);
    if (publicKey.asymmetricKeyType !== 'ec') {
      return false;
    }
    const verifier = createVerify('SHA256');
    verifier.update(stableStringify(payload));
    verifier.end();
    return verifier.verify(publicKey, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
}

function isReceiverPublicKeyPem(value: string): boolean {
  const trimmed = value.trim();
  if (
    !trimmed.startsWith('-----BEGIN PUBLIC KEY-----') ||
    !trimmed.endsWith('-----END PUBLIC KEY-----') ||
    /^spk_/u.test(trimmed) ||
    trimmed.includes('PRIVATE KEY')
  ) {
    return false;
  }

  try {
    const key = createPublicKey(trimmed);
    return key.asymmetricKeyType === 'ec';
  } catch {
    return false;
  }
}

function isReceiverPayloadHashValid(payload: Record<string, unknown>): boolean {
  const payloadHash = typeof payload.payload_hash === 'string' ? payload.payload_hash.trim() : '';
  if (!/^[0-9a-f]{64}$/iu.test(payloadHash)) {
    return false;
  }

  const withoutPayloadHash = { ...payload };
  delete withoutPayloadHash.payload_hash;
  const expected = createHash('sha256').update(stableStringify(withoutPayloadHash)).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(payloadHash, 'hex');
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function isReceiverDeviceEligibleForSignalUpload(device: ReceiverSignalDevice): boolean {
  return ['pending', 'active', 'degraded', 'force_review_local'].includes(device.status);
}

export function isReceiverSignalObservedAtWithinTolerance(params: {
  observedAt: string;
  receivedAt: Date;
  toleranceMs?: number | undefined;
}): boolean {
  const toleranceMs = params.toleranceMs ?? 15 * 60 * 1000;
  const observedAtMs = Date.parse(params.observedAt);
  if (Number.isNaN(observedAtMs)) {
    return false;
  }

  const deltaMs = Math.abs(params.receivedAt.getTime() - observedAtMs);
  return deltaMs <= toleranceMs;
}

export function buildSignalIngestionInput(params: {
  body: ReceiverSignalRequestBody;
  signalId: string;
  auditEventId: string;
  receivedAt: string;
}): SignalIngestionInput {
  return {
    signal: {
      id: params.signalId,
      merchantId: params.body.merchant_id,
      deviceId: params.body.device_id,
      bankProfileId: params.body.bank_profile_id,
      packageName: params.body.package_name,
      packageCertSha256: params.body.package_cert_sha256,
      eventId: params.body.event_id,
      notificationHash: params.body.notification_hash,
      semanticHash: params.body.semantic_hash,
      localCounter: params.body.local_counter,
      observedAt: params.body.observed_at,
      receivedAt: params.body.received_at ?? params.receivedAt,
      amountMinor: params.body.payload.amount_minor,
      currency: params.body.payload.currency,
      senderPhoneHmac: params.body.payload.sender_phone_hmac,
      senderPhoneMasked: params.body.payload.sender_phone_masked,
      referenceHmac: params.body.payload.reference_hmac,
      referenceCodeMasked: params.body.payload.reference_code_masked,
      directionLabel: params.body.payload.direction_label ?? 'unknown',
      parserVersion: 'android-local-v1',
      signatureValid: true,
      status: 'received'
    },
    payloadRedacted: {
      title_redacted: params.body.payload.title_redacted,
      body_redacted: params.body.payload.body_redacted,
      snapshot_count: params.body.payload.snapshot_count,
      coalesced: params.body.payload.coalesced,
      raw_text_present: false
    },
    auditEventId: params.auditEventId
  };
}

export function buildSignalReceivedEvent(params: {
  eventId: string;
  signalId: string;
  merchantId: string;
  deviceId: string;
  bankProfileId: string;
  notificationHash: string;
  occurredAt: string;
}): EventEnvelope {
  return {
    eventId: params.eventId,
    eventType: EventTypes.SIGNAL_RECEIVED,
    version: 1,
    occurredAt: params.occurredAt,
    merchantId: params.merchantId,
    idempotencyKey: `${EventTypes.SIGNAL_RECEIVED}:${params.signalId}`,
    data: {
      signal_id: params.signalId,
      device_id: params.deviceId,
      bank_profile_id: params.bankProfileId,
      event_id: params.eventId,
      notification_hash: params.notificationHash
    }
  };
}

export function createDefaultSignalIdGenerator(): () => string {
  return () => randomUUID();
}

async function ensurePendingBankAppSignature(
  client: pg.PoolClient,
  signal: StoredReceiverSignal
): Promise<'accepted' | 'rejected'> {
  const existing = await client.query(
    `SELECT status FROM bank_app_signatures
     WHERE bank_profile_id = $1 AND package_name = $2 AND cert_sha256 = $3`,
    [signal.bankProfileId, signal.packageName, signal.packageCertSha256]
  );

  if (existing.rowCount && existing.rowCount > 0) {
    const status = String((existing.rows[0] as { status: string }).status);
    return status === 'revoked' ? 'rejected' : 'accepted';
  }

  await client.query(
    `INSERT INTO bank_app_signatures (
      bank_profile_id, package_name, cert_sha256, status, first_seen_at, last_seen_at
    ) VALUES ($1, $2, $3, $4, $5, $5)
    ON CONFLICT (package_name, cert_sha256) DO UPDATE
      SET last_seen_at = EXCLUDED.last_seen_at`,
    [
      signal.bankProfileId,
      signal.packageName,
      signal.packageCertSha256,
      'pending_verification',
      signal.receivedAt
    ]
  );

  return 'accepted';
}

function normalizeSignalPayload(payload: ReceiverSignalPayload): ReceiverSignalPayload {
  return {
    title_redacted: payload.title_redacted,
    body_redacted: payload.body_redacted,
    amount_minor: Number.isInteger(payload.amount_minor) ? payload.amount_minor : undefined,
    currency: payload.currency,
    sender_phone_hmac: payload.sender_phone_hmac,
    sender_phone_masked: payload.sender_phone_masked,
    reference_hmac: payload.reference_hmac,
    reference_code_masked: payload.reference_code_masked,
    direction_label: payload.direction_label,
    snapshot_count: payload.snapshot_count,
    coalesced: payload.coalesced,
    raw_text_present: payload.raw_text_present
  };
}

function isLegacyReceiverSignalShape(body: Record<string, unknown>): boolean {
  return Boolean(body.payload) && typeof body.payload === 'object';
}

function findForbiddenLegacyReceiverRawField(
  value: unknown
): { kind: 'phone' | 'notification' | 'card' | 'credential'; field: string } | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findForbiddenLegacyReceiverRawField(item);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase();
    if (LegacyRawPhoneFields.has(normalizedKey)) {
      return { kind: 'phone', field: key };
    }
    if (LegacyRawCardFields.has(normalizedKey)) {
      return { kind: 'card', field: key };
    }
    if (LegacyCredentialFields.has(normalizedKey)) {
      return { kind: 'credential', field: key };
    }
    if (LegacyRawNotificationFields.has(normalizedKey)) {
      return { kind: 'notification', field: key };
    }

    const nestedResult = findForbiddenLegacyReceiverRawField(nested);
    if (nestedResult) {
      return nestedResult;
    }
  }

  return null;
}

function canonicalSignalPayloadRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {};
  }

  const payload = { ...(body as Record<string, unknown>) };
  delete payload.signature;
  return payload;
}

function toReceiverSignalDevice(row: Record<string, string | number>): ReceiverSignalDevice {
  return {
    id: String(row.id),
    merchantId: String(row.merchant_id),
    publicKey: String(row.public_key),
    lastLocalCounter: Number(row.last_local_counter),
    status: String(row.status)
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function mapUniqueViolation(error: unknown): SignalIngestionResult | null {
  if (!error || typeof error !== 'object' || !('code' in error) || error.code !== '23505') {
    return null;
  }

  const constraint = 'constraint' in error ? String(error.constraint) : '';
  if (constraint.includes('event_id')) {
    return { kind: 'duplicate_event_id' };
  }

  if (constraint.includes('notification_hash')) {
    return { kind: 'duplicate_notification_hash' };
  }

  return null;
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
