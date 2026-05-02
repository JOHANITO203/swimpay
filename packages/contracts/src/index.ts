import type { EventType } from '@swimpay/events';

export const OrderStatuses = [
  'created',
  'awaiting_buyer_identity',
  'payment_session_created',
  'receiver_arming',
  'receiver_armed',
  'payment_instructions_shown',
  'awaiting_payment',
  'buyer_claimed_paid',
  'signal_detected',
  'matching',
  'needs_review',
  'auto_confirmed',
  'manual_confirmed',
  'rejected',
  'expired',
  'fulfilled'
] as const;

export type OrderStatus = (typeof OrderStatuses)[number];

export const PaymentSessionStatuses = [
  'created',
  'receiver_arming',
  'receiver_armed',
  'awaiting_payment',
  'buyer_claimed_paid',
  'signal_detected',
  'matching',
  'needs_review',
  'auto_confirmed',
  'manual_confirmed',
  'rejected',
  'expired'
] as const;

export type PaymentSessionStatus = (typeof PaymentSessionStatuses)[number];

export const BankProfileStatuses = [
  'learning',
  'shadow_testing',
  'trusted_low_amount',
  'trusted',
  'degraded',
  'review_only',
  'disabled'
] as const;

export type BankProfileStatus = (typeof BankProfileStatuses)[number];

export const DirectionLabels = [
  'incoming_customer_transfer',
  'incoming_cashback',
  'incoming_refund',
  'outgoing_payment',
  'failed_transfer',
  'promo',
  'balance_update',
  'unknown',
  'unknown_ambiguous_direction'
] as const;

export type DirectionLabel = (typeof DirectionLabels)[number];

export const Decisions = ['auto_confirmed', 'needs_review', 'rejected', 'wait'] as const;
export type Decision = (typeof Decisions)[number];

export const ReviewStatuses = ['open', 'confirmed', 'rejected', 'cancelled'] as const;
export type ReviewStatus = (typeof ReviewStatuses)[number];

export const WebhookDeliveryStatuses = ['pending', 'delivering', 'delivered', 'failed', 'dead', 'cancelled'] as const;
export type WebhookDeliveryStatus = (typeof WebhookDeliveryStatuses)[number];

export interface Order {
  id: string;
  merchantId: string;
  externalId: string;
  productId?: string;
  productName?: string;
  productRiskLevel: string;
  amountMinor: number;
  currency: string;
  status: OrderStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSession {
  id: string;
  orderId: string;
  merchantId: string;
  expectedAmountMinor: number;
  currency: string;
  buyerPhoneHmac?: string;
  buyerPhoneMasked?: string;
  buyerNameHmac?: string;
  referenceCode?: string;
  referenceHmac?: string;
  status: PaymentSessionStatus;
  receiverGroupId?: string;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiverDevice {
  id: string;
  merchantId: string;
  deviceName?: string;
  publicKey: string;
  appVersion?: string;
  androidVersion?: string;
  status: 'pending' | 'active' | 'suspended' | 'revoked';
  trustScore: number;
  notificationAccessStatus: boolean;
  lastLocalCounter: number;
  lastHeartbeatAt?: string;
}

export interface NotificationSignal {
  id: string;
  merchantId: string;
  deviceId: string;
  bankProfileId?: string;
  eventId: string;
  notificationHash: string;
  semanticHash?: string;
  localCounter: number;
  observedAt: string;
  receivedAt: string;
  amountMinor?: number;
  currency?: string;
  senderPhoneHmac?: string;
  senderPhoneMasked?: string;
  referenceHmac?: string;
  referenceCodeMasked?: string;
  directionLabel: DirectionLabel;
  signalQuality: number;
  parserVersion: string;
  templateId?: string;
  signatureValid: boolean;
  status: 'received' | 'verified' | 'parsed' | 'matched' | 'rejected';
}

export interface SignalMatch {
  id: string;
  signalId: string;
  orderId: string;
  paymentSessionId: string;
  score: number;
  decision: Decision;
  collisionDetected: boolean;
  reasonCodes: string[];
  createdAt: string;
}

export interface ReviewItem {
  id: string;
  merchantId: string;
  orderId?: string;
  paymentSessionId?: string;
  signalId?: string;
  reasonCode: string;
  status: ReviewStatus;
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface WebhookEvent<TData extends Record<string, unknown> = Record<string, unknown>> {
  eventId: string;
  eventType: EventType;
  confirmationType: 'notification_signal';
  officialBankConfirmation: false;
  occurredAt: string;
  merchantId: string;
  data: TData;
}

export interface AuditEvent {
  id: string;
  merchantId?: string;
  eventType: string;
  objectType: string;
  objectId: string;
  actorType?: string;
  actorId?: string;
  payloadRedacted: Record<string, unknown>;
  createdAt: string;
}

export const AndroidReceiverCapabilities = {
  NOTIFICATION_ACCESS: 'notification_access',
  SIGNED_SIGNAL_UPLOAD: 'signed_signal_upload',
  LOCAL_REDACTION: 'local_redaction',
  SIGNAL_COALESCING: 'signal_coalescing'
} as const;

export type AndroidReceiverCapability =
  (typeof AndroidReceiverCapabilities)[keyof typeof AndroidReceiverCapabilities];

export const RequiredAndroidReceiverCapabilities = [
  AndroidReceiverCapabilities.NOTIFICATION_ACCESS,
  AndroidReceiverCapabilities.SIGNED_SIGNAL_UPLOAD,
  AndroidReceiverCapabilities.LOCAL_REDACTION
] as const;

export const AndroidReceiverErrorCodes = {
  DEVICE_NOT_REGISTERED: 'device_not_registered',
  DEVICE_DISABLED: 'device_disabled',
  SIGNATURE_MISSING: 'signature_missing',
  SIGNATURE_INVALID: 'signature_invalid',
  EVENT_ID_DUPLICATE: 'event_id_duplicate',
  NOTIFICATION_HASH_DUPLICATE: 'notification_hash_duplicate',
  PACKAGE_NOT_ALLOWED: 'package_not_allowed',
  PACKAGE_CERT_UNVERIFIED: 'package_cert_unverified',
  BANK_PROFILE_UNTRUSTED: 'bank_profile_untrusted',
  PAYLOAD_INVALID: 'payload_invalid',
  RAW_PHONE_REJECTED: 'raw_phone_rejected',
  RAW_NOTIFICATION_REJECTED: 'raw_notification_rejected',
  LOCAL_COUNTER_REPLAY: 'local_counter_replay',
  TIMESTAMP_OUT_OF_RANGE: 'timestamp_out_of_range',
  NOTIFICATION_ACCESS_REQUIRED: 'notification_access_required',
  RECEIVER_OUTDATED: 'receiver_outdated'
} as const;

export type AndroidReceiverErrorCode =
  (typeof AndroidReceiverErrorCodes)[keyof typeof AndroidReceiverErrorCodes];

export const ReceiverSignatureAlgorithms = {
  HMAC_SHA256_CANONICAL_V1: 'hmac_sha256_canonical_v1'
} as const;

export type ReceiverSignatureAlgorithm =
  (typeof ReceiverSignatureAlgorithms)[keyof typeof ReceiverSignatureAlgorithms];

export const AndroidReceiverWarnings = {
  NOTIFICATION_ACCESS_DISABLED: 'notification_access_disabled',
  LISTENER_DISCONNECTED: 'listener_disconnected',
  DEVICE_VERSION_OUTDATED: 'device_version_outdated',
  BANK_PROFILE_UNVERIFIED: 'bank_profile_unverified',
  QUEUE_BACKLOG_HIGH: 'queue_backlog_high',
  BATTERY_OPTIMIZATION_RISK: 'battery_optimization_risk'
} as const;

export type AndroidReceiverWarning =
  (typeof AndroidReceiverWarnings)[keyof typeof AndroidReceiverWarnings];

export interface AndroidReceiverRegistrationRequest {
  device_name?: string;
  app_version?: string;
  android_version?: string;
  public_key: string;
  install_id?: string;
  device_install_id?: string;
  supported_capabilities?: string[];
}

export interface AndroidReceiverRegistrationResponse {
  device_id: string;
  merchant_id: string;
  status: ReceiverDevice['status'];
  server_time: string;
  required_capabilities: readonly AndroidReceiverCapability[];
  bank_profiles?: readonly { id: string; display_name: string; status: BankProfileStatus }[];
}

export interface AndroidReceiverHeartbeatRequest {
  device_id: string;
  app_version?: string;
  android_version?: string;
  notification_access_enabled: boolean;
  listener_connected: boolean;
  allowed_bank_profile_ids?: string[];
  queue_length?: number;
  last_signal_observed_at?: string | null;
  battery_optimization_ignored?: boolean;
  timestamp?: string;
  signature?: string;
}

export interface AndroidReceiverHeartbeatResponse {
  device_status: ReceiverDevice['status'] | 'degraded';
  server_time: string;
  receiver_mode: 'active' | 'attention_required' | 'disabled';
  active_payment_sessions_count: number;
  warnings: AndroidReceiverWarning[];
  required_actions: string[];
}

export interface AndroidNotificationSnapshot {
  title?: string;
  text?: string;
  big_text?: string;
  sub_text?: string;
  summary_text?: string;
  text_lines?: string[];
  ticker_text?: string;
  channel_id?: string;
  category?: string;
  group_key?: string;
  sort_key?: string;
  notification_id: number;
  tag?: string;
  post_time: string;
  package_name: string;
}

export interface AndroidSignalCoalescingFields {
  coalescing_window_ms?: number;
  snapshot_count: number;
  first_snapshot_at?: string;
  last_snapshot_at?: string;
  coalesced_hash?: string;
  notification_hash: string;
  semantic_hash?: string;
}

export interface AndroidReceiverSignalUploadRequest extends AndroidSignalCoalescingFields {
  event_id: string;
  merchant_id: string;
  device_id: string;
  bank_profile_id: string;
  package_name: string;
  package_cert_sha256: string;
  observed_at: string;
  received_at?: string;
  coalesced: boolean;
  local_counter: number;
  amount_minor?: number;
  currency?: string;
  sender_phone_hmac?: string;
  sender_phone_masked?: string;
  reference_hmac?: string;
  reference_code_masked?: string;
  direction_hint?: DirectionLabel;
  parser_hint?: string;
  signal_quality_hint?: number;
  redacted_title?: string;
  redacted_body?: string;
  raw_text_present: false;
  signature: string;
}

export interface AndroidReceiverSignalUploadResponse {
  signal_id: string;
  status: 'received' | 'rejected';
  accepted: boolean;
  reason_codes: AndroidReceiverErrorCode[];
  server_time: string;
  next_action: 'backend_decision_pending' | 'fix_receiver_configuration' | 'drop_signal';
}

export type AndroidReceiverValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; code: AndroidReceiverErrorCode; field?: string };

export type AndroidReceiverHeartbeatValidationResult =
  | { valid: true; value: AndroidReceiverHeartbeatRequest; warnings: AndroidReceiverWarning[] }
  | { valid: false; code: AndroidReceiverErrorCode; field?: string };

export type AndroidReceiverSignalValidationResult =
  | {
      valid: true;
      value: AndroidReceiverSignalUploadRequest;
      package_verification_trust: 'trusted' | 'untrusted';
    }
  | { valid: false; code: AndroidReceiverErrorCode; field?: string };

export function validateAndroidReceiverRegistrationRequest(
  body: unknown
): AndroidReceiverValidationResult<AndroidReceiverRegistrationRequest> {
  if (!isPlainRecord(body)) {
    return invalidAndroidReceiverPayload();
  }

  if (!isNonEmptyString(body.public_key)) {
    return invalidAndroidReceiverPayload('public_key');
  }

  const value: AndroidReceiverRegistrationRequest = {
    public_key: body.public_key.trim()
  };
  assignIfDefined(value, 'device_name', optionalString(body.device_name));
  assignIfDefined(value, 'app_version', optionalString(body.app_version));
  assignIfDefined(value, 'android_version', optionalString(body.android_version));
  assignIfDefined(value, 'install_id', optionalString(body.install_id));
  assignIfDefined(value, 'device_install_id', optionalString(body.device_install_id));
  assignIfDefined(value, 'supported_capabilities', optionalStringArray(body.supported_capabilities));

  return { valid: true, value };
}

export function validateAndroidReceiverHeartbeatRequest(
  body: unknown
): AndroidReceiverHeartbeatValidationResult {
  if (!isPlainRecord(body)) {
    return invalidAndroidReceiverPayload();
  }

  if (!isNonEmptyString(body.device_id)) {
    return invalidAndroidReceiverPayload('device_id');
  }

  if (typeof body.notification_access_enabled !== 'boolean') {
    return invalidAndroidReceiverPayload('notification_access_enabled');
  }

  if (typeof body.listener_connected !== 'boolean') {
    return invalidAndroidReceiverPayload('listener_connected');
  }

  if (
    body.queue_length !== undefined &&
    (typeof body.queue_length !== 'number' || !Number.isInteger(body.queue_length) || body.queue_length < 0)
  ) {
    return invalidAndroidReceiverPayload('queue_length');
  }

  if (body.timestamp !== undefined && !isIsoDateString(body.timestamp)) {
    return { valid: false, code: AndroidReceiverErrorCodes.TIMESTAMP_OUT_OF_RANGE, field: 'timestamp' };
  }

  if (body.last_signal_observed_at !== undefined && body.last_signal_observed_at !== null && !isIsoDateString(body.last_signal_observed_at)) {
    return { valid: false, code: AndroidReceiverErrorCodes.TIMESTAMP_OUT_OF_RANGE, field: 'last_signal_observed_at' };
  }

  const warnings: AndroidReceiverWarning[] = [];
  if (!body.notification_access_enabled) {
    warnings.push(AndroidReceiverWarnings.NOTIFICATION_ACCESS_DISABLED);
  }
  if (!body.listener_connected) {
    warnings.push(AndroidReceiverWarnings.LISTENER_DISCONNECTED);
  }
  if (typeof body.queue_length === 'number' && body.queue_length >= 50) {
    warnings.push(AndroidReceiverWarnings.QUEUE_BACKLOG_HIGH);
  }
  if (body.battery_optimization_ignored === false) {
    warnings.push(AndroidReceiverWarnings.BATTERY_OPTIMIZATION_RISK);
  }

  const value: AndroidReceiverHeartbeatRequest = {
    device_id: body.device_id.trim(),
    notification_access_enabled: body.notification_access_enabled,
    listener_connected: body.listener_connected
  };
  assignIfDefined(value, 'app_version', optionalString(body.app_version));
  assignIfDefined(value, 'android_version', optionalString(body.android_version));
  assignIfDefined(value, 'allowed_bank_profile_ids', optionalStringArray(body.allowed_bank_profile_ids));
  if (typeof body.queue_length === 'number') {
    value.queue_length = body.queue_length;
  }
  if (typeof body.last_signal_observed_at === 'string') {
    value.last_signal_observed_at = new Date(body.last_signal_observed_at).toISOString();
  } else if (body.last_signal_observed_at === null) {
    value.last_signal_observed_at = null;
  }
  if (typeof body.battery_optimization_ignored === 'boolean') {
    value.battery_optimization_ignored = body.battery_optimization_ignored;
  }
  if (typeof body.timestamp === 'string') {
    value.timestamp = new Date(body.timestamp).toISOString();
  }
  assignIfDefined(value, 'signature', optionalString(body.signature));

  return { valid: true, value, warnings };
}

export function validateAndroidReceiverSignalUploadRequest(
  body: unknown
): AndroidReceiverSignalValidationResult {
  if (!isPlainRecord(body)) {
    return invalidAndroidReceiverPayload();
  }

  const rawField = findForbiddenReceiverRawField(body);
  if (rawField?.kind === 'phone') {
    return { valid: false, code: AndroidReceiverErrorCodes.RAW_PHONE_REJECTED, field: rawField.field };
  }
  if (rawField?.kind === 'notification') {
    return { valid: false, code: AndroidReceiverErrorCodes.RAW_NOTIFICATION_REJECTED, field: rawField.field };
  }

  if (body.raw_text_present !== false) {
    return { valid: false, code: AndroidReceiverErrorCodes.RAW_NOTIFICATION_REJECTED, field: 'raw_text_present' };
  }

  if (!isNonEmptyString(body.signature)) {
    return { valid: false, code: AndroidReceiverErrorCodes.SIGNATURE_MISSING, field: 'signature' };
  }

  for (const field of [
    'event_id',
    'merchant_id',
    'device_id',
    'bank_profile_id',
    'package_name',
    'package_cert_sha256',
    'notification_hash',
    'observed_at'
  ]) {
    if (!isNonEmptyString(body[field])) {
      return invalidAndroidReceiverPayload(field);
    }
  }

  if (!isIsoDateString(body.observed_at)) {
    return { valid: false, code: AndroidReceiverErrorCodes.TIMESTAMP_OUT_OF_RANGE, field: 'observed_at' };
  }

  for (const field of ['received_at', 'first_snapshot_at', 'last_snapshot_at']) {
    if (body[field] !== undefined && !isIsoDateString(body[field])) {
      return { valid: false, code: AndroidReceiverErrorCodes.TIMESTAMP_OUT_OF_RANGE, field };
    }
  }

  if (!Number.isInteger(body.local_counter) || Number(body.local_counter) <= 0) {
    return { valid: false, code: AndroidReceiverErrorCodes.LOCAL_COUNTER_REPLAY, field: 'local_counter' };
  }

  if (!Number.isInteger(body.snapshot_count) || Number(body.snapshot_count) <= 0) {
    return invalidAndroidReceiverPayload('snapshot_count');
  }

  if (body.coalesced !== true && body.coalesced !== false) {
    return invalidAndroidReceiverPayload('coalesced');
  }

  if (body.amount_minor !== undefined && (!Number.isInteger(body.amount_minor) || Number(body.amount_minor) < 0)) {
    return invalidAndroidReceiverPayload('amount_minor');
  }

  if (body.currency !== undefined && body.currency !== 'RUB') {
    return invalidAndroidReceiverPayload('currency');
  }

  if (body.direction_hint !== undefined && !DirectionLabels.includes(body.direction_hint as DirectionLabel)) {
    return invalidAndroidReceiverPayload('direction_hint');
  }

  const value: AndroidReceiverSignalUploadRequest = {
    event_id: String(body.event_id).trim(),
    merchant_id: String(body.merchant_id).trim(),
    device_id: String(body.device_id).trim(),
    bank_profile_id: String(body.bank_profile_id).trim(),
    package_name: String(body.package_name).trim(),
    package_cert_sha256: String(body.package_cert_sha256).trim(),
    observed_at: new Date(String(body.observed_at)).toISOString(),
    notification_hash: String(body.notification_hash).trim(),
    local_counter: Number(body.local_counter),
    snapshot_count: Number(body.snapshot_count),
    coalesced: Boolean(body.coalesced),
    raw_text_present: false,
    signature: String(body.signature).trim()
  };
  if (typeof body.received_at === 'string') {
    value.received_at = new Date(body.received_at).toISOString();
  }
  assignIfDefined(value, 'semantic_hash', optionalString(body.semantic_hash));
  if (Number.isInteger(body.coalescing_window_ms) && Number(body.coalescing_window_ms) >= 0) {
    value.coalescing_window_ms = Number(body.coalescing_window_ms);
  }
  if (typeof body.first_snapshot_at === 'string') {
    value.first_snapshot_at = new Date(body.first_snapshot_at).toISOString();
  }
  if (typeof body.last_snapshot_at === 'string') {
    value.last_snapshot_at = new Date(body.last_snapshot_at).toISOString();
  }
  assignIfDefined(value, 'coalesced_hash', optionalString(body.coalesced_hash));
  if (typeof body.amount_minor === 'number') {
    value.amount_minor = body.amount_minor;
  }
  assignIfDefined(value, 'currency', optionalString(body.currency));
  assignIfDefined(value, 'sender_phone_hmac', optionalString(body.sender_phone_hmac));
  assignIfDefined(value, 'sender_phone_masked', optionalString(body.sender_phone_masked));
  assignIfDefined(value, 'reference_hmac', optionalString(body.reference_hmac));
  assignIfDefined(value, 'reference_code_masked', optionalString(body.reference_code_masked));
  if (typeof body.direction_hint === 'string') {
    value.direction_hint = body.direction_hint as DirectionLabel;
  }
  assignIfDefined(value, 'parser_hint', optionalString(body.parser_hint));
  if (typeof body.signal_quality_hint === 'number') {
    value.signal_quality_hint = body.signal_quality_hint;
  }
  assignIfDefined(value, 'redacted_title', optionalString(body.redacted_title));
  assignIfDefined(value, 'redacted_body', optionalString(body.redacted_body));

  return {
    valid: true,
    value,
    package_verification_trust:
      body.package_name === 'TO_VERIFY' || body.package_cert_sha256 === 'TO_VERIFY' ? 'untrusted' : 'trusted'
  };
}

export function validateAndroidNotificationSnapshot(
  body: unknown
): AndroidReceiverValidationResult<AndroidNotificationSnapshot> {
  if (!isPlainRecord(body)) {
    return invalidAndroidReceiverPayload();
  }

  if (!isNonEmptyString(body.package_name)) {
    return invalidAndroidReceiverPayload('package_name');
  }

  if (body.package_name !== 'TO_VERIFY') {
    return { valid: false, code: AndroidReceiverErrorCodes.PACKAGE_NOT_ALLOWED, field: 'package_name' };
  }

  if (!Number.isInteger(body.notification_id)) {
    return invalidAndroidReceiverPayload('notification_id');
  }

  if (!isIsoDateString(body.post_time)) {
    return { valid: false, code: AndroidReceiverErrorCodes.TIMESTAMP_OUT_OF_RANGE, field: 'post_time' };
  }

  const value: AndroidNotificationSnapshot = {
    notification_id: Number(body.notification_id),
    post_time: new Date(String(body.post_time)).toISOString(),
    package_name: String(body.package_name).trim()
  };
  assignIfDefined(value, 'title', optionalString(body.title));
  assignIfDefined(value, 'text', optionalString(body.text));
  assignIfDefined(value, 'big_text', optionalString(body.big_text));
  assignIfDefined(value, 'sub_text', optionalString(body.sub_text));
  assignIfDefined(value, 'summary_text', optionalString(body.summary_text));
  assignIfDefined(value, 'text_lines', optionalStringArray(body.text_lines));
  assignIfDefined(value, 'ticker_text', optionalString(body.ticker_text));
  assignIfDefined(value, 'channel_id', optionalString(body.channel_id));
  assignIfDefined(value, 'category', optionalString(body.category));
  assignIfDefined(value, 'group_key', optionalString(body.group_key));
  assignIfDefined(value, 'sort_key', optionalString(body.sort_key));
  assignIfDefined(value, 'tag', optionalString(body.tag));

  return { valid: true, value };
}

export function buildCanonicalReceiverSignalPayload(
  request: AndroidReceiverSignalUploadRequest | Record<string, unknown>
): string {
  const payload = { ...request };
  delete payload.signature;
  return stableStringify(payload);
}

function invalidAndroidReceiverPayload(field?: string) {
  return { valid: false, code: AndroidReceiverErrorCodes.PAYLOAD_INVALID, ...(field ? { field } : {}) } as const;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());

  return strings.length > 0 ? strings : undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assignIfDefined<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function findForbiddenReceiverRawField(
  value: unknown
): { kind: 'phone' | 'notification'; field: string } | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findForbiddenReceiverRawField(item);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  if (!isPlainRecord(value)) {
    return null;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (isForbiddenRawPhoneField(key)) {
      return { kind: 'phone', field: key };
    }
    if (isForbiddenRawNotificationField(key)) {
      return { kind: 'notification', field: key };
    }
    const nestedResult = findForbiddenReceiverRawField(nested);
    if (nestedResult) {
      return nestedResult;
    }
  }

  return null;
}

function isForbiddenRawPhoneField(key: string): boolean {
  return /^(phone|raw_phone|buyer_phone|sender_phone|normalized_phone)$/iu.test(key);
}

function isForbiddenRawNotificationField(key: string): boolean {
  return /^(notification_text|raw_notification|raw_notification_text|raw_text|raw_body|raw_title)$/iu.test(key);
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
