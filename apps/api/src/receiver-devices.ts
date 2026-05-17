import pg from 'pg';
import {
  AndroidReceiverWarnings,
  RequiredAndroidReceiverCapabilities,
  validateAndroidReceiverHeartbeatRequest,
  validateAndroidReceiverRegistrationRequest,
  type AndroidReceiverErrorCode,
  type AndroidReceiverWarning
} from '@swimpay/contracts';

const { Pool } = pg;

export type ReceiverDeviceStatus =
  | 'pending'
  | 'active'
  | 'inactive'
  | 'degraded'
  | 'suspended'
  | 'revoked'
  | 'needs_reconnect'
  | 'notification_access_missing'
  | 'bank_targets_missing'
  | 'force_review_local';

export type ReceiverHealthStatus = 'healthy' | 'degraded' | 'offline';

export interface ReceiverHealth {
  status: ReceiverHealthStatus;
  notification_access: boolean;
  listener_connected_recently: boolean;
  last_heartbeat_at: string | null;
  encrypted_outbox_depth: number;
  supported_bank_routes_online: number;
  device_key_attested: boolean;
  app_integrity_recent: boolean;
  clock_skew_ms: number;
}

export interface ReceiverRuntimeConfigResponse {
  merchant_id: string;
  enabled_bank_profile_ids: string[];
  payment_intent_active: boolean;
  receiver_armed: boolean;
  expected_payment_profile_present: boolean;
  receiving_route_locked: boolean;
  active_payment_sessions_count: number;
  active_until: string | null;
}

export const ReceiverHeartbeatFreshness = {
  degradedAfterMs: 2 * 60 * 1000,
  offlineAfterMs: 10 * 60 * 1000
} as const;

export interface StoredReceiverDeviceRecord {
  id: string;
  merchantId: string;
  deviceName?: string | undefined;
  publicKey: string;
  appVersion?: string | undefined;
  androidVersion?: string | undefined;
  status: ReceiverDeviceStatus;
  trustScore: number;
  notificationAccessStatus: boolean;
  lastLocalCounter: number;
  lastHeartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiverDeviceAuditEvent {
  id: string;
  merchantId: string;
  eventType: 'receiver_device.registered';
  objectType: 'receiver_device';
  objectId: string;
  payloadRedacted: Record<string, unknown>;
}

export interface CreateReceiverDeviceInput {
  device: StoredReceiverDeviceRecord;
  auditEvent: ReceiverDeviceAuditEvent;
}

export interface UpdateReceiverHeartbeatInput {
  merchantId: string;
  deviceId: string;
  notificationAccessStatus: boolean;
  listenerConnected: boolean;
  allowedBankProfileIds?: string[] | undefined;
  reportedStatus?: string | undefined;
  appVersion?: string | undefined;
  androidVersion?: string | undefined;
  heartbeatAt: string;
}

export interface ReceiverDeviceRepository {
  createReceiverDevice(input: CreateReceiverDeviceInput): Promise<StoredReceiverDeviceRecord>;
  updateHeartbeat(input: UpdateReceiverHeartbeatInput): Promise<StoredReceiverDeviceRecord | null>;
}

export interface ReceiverDeviceRegisterBody {
  device_name?: string | undefined;
  public_key: string;
  app_version?: string | undefined;
  android_version?: string | undefined;
  install_id?: string | undefined;
  device_install_id?: string | undefined;
  supported_capabilities?: string[] | undefined;
  selected_banks?: string[] | undefined;
}

export interface ReceiverHeartbeatBody {
  device_id: string;
  notification_access: boolean;
  notification_access_enabled: boolean;
  listener_connected: boolean;
  allowed_banks?: string[] | undefined;
  allowed_bank_profile_ids?: string[] | undefined;
  queue_length?: number | undefined;
  last_signal_at?: string | null | undefined;
  last_signal_observed_at?: string | null | undefined;
  android_version?: string | undefined;
  app_version?: string | undefined;
  timestamp?: string | undefined;
  signature?: string | undefined;
  status?: string | undefined;
}

export type ReceiverDeviceValidationResult<T> =
  | { valid: true; value: T; warnings?: AndroidReceiverWarning[] | undefined }
  | { valid: false; code: AndroidReceiverErrorCode; field?: string | undefined };

export class PgReceiverDeviceRepository implements ReceiverDeviceRepository {
  private readonly pool: pg.Pool;

  public constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 5 });
  }

  public async createReceiverDevice(input: CreateReceiverDeviceInput): Promise<StoredReceiverDeviceRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO receiver_devices (
          id, merchant_id, device_name, public_key, app_version, android_version,
          status, trust_score, notification_access_status, last_local_counter,
          last_heartbeat_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          input.device.id,
          input.device.merchantId,
          input.device.deviceName ?? null,
          input.device.publicKey,
          input.device.appVersion ?? null,
          input.device.androidVersion ?? null,
          input.device.status,
          input.device.trustScore,
          input.device.notificationAccessStatus,
          input.device.lastLocalCounter,
          input.device.lastHeartbeatAt,
          input.device.createdAt,
          input.device.updatedAt
        ]
      );

      await client.query(
        `INSERT INTO audit_events (
          id, merchant_id, event_type, object_type, object_id, actor_type, payload_redacted
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          input.auditEvent.id,
          input.auditEvent.merchantId,
          input.auditEvent.eventType,
          input.auditEvent.objectType,
          input.auditEvent.objectId,
          'api',
          JSON.stringify(input.auditEvent.payloadRedacted)
        ]
      );

      await client.query('COMMIT');
      return input.device;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateHeartbeat(input: UpdateReceiverHeartbeatInput): Promise<StoredReceiverDeviceRecord | null> {
    const status = deriveReceiverDeviceOperationalStatus({
      notificationAccessStatus: input.notificationAccessStatus,
      listenerConnected: input.listenerConnected,
      allowedBankProfileIds: input.allowedBankProfileIds,
      reportedStatus: input.reportedStatus
    });

    const result = await this.pool.query(
      `UPDATE receiver_devices
       SET notification_access_status = $1,
           last_heartbeat_at = $2,
           app_version = COALESCE($3, app_version),
           android_version = COALESCE($4, android_version),
           status = $5,
           updated_at = $2
       WHERE merchant_id = $6 AND id = $7
       RETURNING id, merchant_id, device_name, public_key, app_version, android_version,
         status, trust_score, notification_access_status, last_local_counter,
         last_heartbeat_at, created_at, updated_at`,
      [
        input.notificationAccessStatus,
        input.heartbeatAt,
        input.appVersion ?? null,
        input.androidVersion ?? null,
        status,
        input.merchantId,
        input.deviceId
      ]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return toReceiverDevice(result.rows[0] as Record<string, string | number | boolean | Date | null>);
  }
}

export function validateReceiverDeviceRegisterBody(
  body: unknown
): ReceiverDeviceValidationResult<ReceiverDeviceRegisterBody> {
  const validation = validateAndroidReceiverRegistrationRequest(body);
  if (!validation.valid) {
    return validation;
  }

  const candidate = body as Partial<ReceiverDeviceRegisterBody>;
  return {
    valid: true,
    value: {
      ...validation.value,
      selected_banks: candidate.selected_banks
    }
  };
}

export function validateReceiverHeartbeatBody(body: unknown): ReceiverDeviceValidationResult<ReceiverHeartbeatBody> {
  const normalizedInput = normalizeHeartbeatAliases(body);
  const validation = validateAndroidReceiverHeartbeatRequest(normalizedInput);
  if (!validation.valid) {
    return validation;
  }

  return {
    valid: true,
    value: {
      device_id: validation.value.device_id,
      notification_access: validation.value.notification_access_enabled,
      notification_access_enabled: validation.value.notification_access_enabled,
      listener_connected: validation.value.listener_connected,
      allowed_banks: validation.value.allowed_bank_profile_ids,
      allowed_bank_profile_ids: validation.value.allowed_bank_profile_ids,
      queue_length: validation.value.queue_length,
      last_signal_at: validation.value.last_signal_observed_at,
      last_signal_observed_at: validation.value.last_signal_observed_at,
      app_version: validation.value.app_version,
      android_version: validation.value.android_version,
      timestamp: validation.value.timestamp,
      signature: validation.value.signature,
      status: (body as Partial<ReceiverHeartbeatBody>).status
    },
    warnings: validation.warnings
  };
}

export function deriveReceiverDeviceOperationalStatus(input: {
  notificationAccessStatus: boolean;
  listenerConnected: boolean;
  allowedBankProfileIds?: readonly string[] | undefined;
  reportedStatus?: string | undefined;
}): ReceiverDeviceStatus {
  if (input.reportedStatus === 'force_review_local') {
    return 'force_review_local';
  }

  if (!input.notificationAccessStatus) {
    return 'notification_access_missing';
  }

  if (!input.listenerConnected) {
    return 'needs_reconnect';
  }

  if (Array.isArray(input.allowedBankProfileIds) && input.allowedBankProfileIds.length === 0) {
    return 'bank_targets_missing';
  }

  return 'active';
}

export function buildReceiverDeviceCreateInput(params: {
  body: ReceiverDeviceRegisterBody;
  merchantId: string;
  deviceId: string;
  auditEventId: string;
  now: Date;
}): CreateReceiverDeviceInput {
  const timestamp = params.now.toISOString();
  const device: StoredReceiverDeviceRecord = {
    id: params.deviceId,
    merchantId: params.merchantId,
    deviceName: params.body.device_name,
    publicKey: params.body.public_key,
    appVersion: params.body.app_version,
    androidVersion: params.body.android_version,
    status: 'pending',
    trustScore: 0,
    notificationAccessStatus: false,
    lastLocalCounter: 0,
    lastHeartbeatAt: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  return {
    device,
    auditEvent: {
      id: params.auditEventId,
      merchantId: params.merchantId,
      eventType: 'receiver_device.registered',
      objectType: 'receiver_device',
      objectId: params.deviceId,
      payloadRedacted: {
        device_name: params.body.device_name,
        app_version: params.body.app_version,
        android_version: params.body.android_version,
        install_id_present: Boolean(params.body.install_id ?? params.body.device_install_id),
        supported_capabilities: params.body.supported_capabilities ?? [],
        selected_banks: params.body.selected_banks ?? []
      }
    }
  };
}

export function buildReceiverRegistrationResponse(params: {
  device: StoredReceiverDeviceRecord;
  merchantId: string;
  serverTime: string;
}) {
  return {
    device_id: params.device.id,
    merchant_id: params.merchantId,
    status: params.device.status,
    trust_score: params.device.trustScore,
    server_time: params.serverTime,
    required_capabilities: [...RequiredAndroidReceiverCapabilities]
  };
}

export function buildReceiverHeartbeatResponse(params: {
  device: StoredReceiverDeviceRecord;
  serverTime: string;
  warnings: readonly AndroidReceiverWarning[];
  queueLength?: number | undefined;
  allowedBankProfileIds?: readonly string[] | undefined;
  receiverRuntimeConfig?: ReceiverRuntimeConfigResponse | null | undefined;
}) {
  const effectiveWarnings = receiverWarningsWithHeartbeatFreshness(params);
  const receiverHealth = buildReceiverHealth({
    ...params,
    warnings: effectiveWarnings
  });
  return {
    device_id: params.device.id,
    device_status: params.device.status,
    status: params.device.status,
    notification_access: params.device.notificationAccessStatus,
    last_heartbeat_at: params.device.lastHeartbeatAt,
    server_time: params.serverTime,
    receiver_mode: effectiveWarnings.length > 0 || receiverHealth.status !== 'healthy' ? 'attention_required' : 'active',
    active_payment_sessions_count: params.receiverRuntimeConfig?.active_payment_sessions_count ?? 0,
    receiver_runtime_config: params.receiverRuntimeConfig ?? null,
    receiver_health: receiverHealth,
    warnings: effectiveWarnings,
    required_actions: receiverRequiredActions(effectiveWarnings)
  };
}

function buildReceiverHealth(params: {
  device: StoredReceiverDeviceRecord;
  serverTime: string;
  warnings: readonly AndroidReceiverWarning[];
  queueLength?: number | undefined;
  allowedBankProfileIds?: readonly string[] | undefined;
}): ReceiverHealth {
  const listenerConnectedRecently =
    !isReceiverHeartbeatStale(params.device, params.serverTime, ReceiverHeartbeatFreshness.degradedAfterMs) &&
    params.device.status !== 'inactive' &&
    params.device.status !== 'needs_reconnect' &&
    !params.warnings.includes(AndroidReceiverWarnings.LISTENER_DISCONNECTED);

  return {
    status: deriveReceiverHealthStatus(params.device, params.serverTime),
    notification_access: params.device.notificationAccessStatus,
    listener_connected_recently: listenerConnectedRecently,
    last_heartbeat_at: params.device.lastHeartbeatAt,
    encrypted_outbox_depth: Math.max(0, params.queueLength ?? 0),
    supported_bank_routes_online: params.allowedBankProfileIds?.length ?? 0,
    device_key_attested: params.device.publicKey.startsWith('-----BEGIN PUBLIC KEY-----'),
    app_integrity_recent: params.device.status !== 'revoked' && params.device.status !== 'suspended',
    clock_skew_ms: 0
  };
}

export function deriveReceiverHealthStatus(
  device: StoredReceiverDeviceRecord,
  serverTime?: string | undefined
): ReceiverHealthStatus {
  if (serverTime && isReceiverHeartbeatStale(device, serverTime, ReceiverHeartbeatFreshness.offlineAfterMs)) {
    return 'offline';
  }
  if (serverTime && isReceiverHeartbeatStale(device, serverTime, ReceiverHeartbeatFreshness.degradedAfterMs)) {
    return 'degraded';
  }
  if (device.status === 'active' && device.notificationAccessStatus) {
    return 'healthy';
  }
  if (device.status === 'inactive' || device.status === 'suspended' || device.status === 'revoked') {
    return 'offline';
  }
  return 'degraded';
}

function receiverWarningsWithHeartbeatFreshness(params: {
  device: StoredReceiverDeviceRecord;
  serverTime: string;
  warnings: readonly AndroidReceiverWarning[];
}): AndroidReceiverWarning[] {
  const warnings = new Set(params.warnings);
  if (isReceiverHeartbeatStale(params.device, params.serverTime, ReceiverHeartbeatFreshness.degradedAfterMs)) {
    warnings.add(AndroidReceiverWarnings.LISTENER_DISCONNECTED);
  }
  return [...warnings];
}

function isReceiverHeartbeatStale(
  device: StoredReceiverDeviceRecord,
  serverTime: string,
  staleAfterMs: number
): boolean {
  if (!device.lastHeartbeatAt) {
    return false;
  }
  const serverMs = Date.parse(serverTime);
  const heartbeatMs = Date.parse(device.lastHeartbeatAt);
  if (!Number.isFinite(serverMs) || !Number.isFinite(heartbeatMs)) {
    return false;
  }
  return serverMs - heartbeatMs > staleAfterMs;
}

function normalizeHeartbeatAliases(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }

  const candidate = body as Partial<ReceiverHeartbeatBody>;
  return {
    ...candidate,
    notification_access_enabled:
      candidate.notification_access_enabled ?? candidate.notification_access,
    allowed_bank_profile_ids: candidate.allowed_bank_profile_ids ?? candidate.allowed_banks,
    last_signal_observed_at: candidate.last_signal_observed_at ?? candidate.last_signal_at
  };
}

function receiverRequiredActions(warnings: readonly AndroidReceiverWarning[]): string[] {
  const actions = new Set<string>();
  for (const warning of warnings) {
    if (warning === AndroidReceiverWarnings.NOTIFICATION_ACCESS_DISABLED) {
      actions.add('enable_notification_access');
    }
    if (warning === AndroidReceiverWarnings.LISTENER_DISCONNECTED) {
      actions.add('reconnect_notification_listener');
    }
    if (warning === AndroidReceiverWarnings.BANK_TARGETS_MISSING) {
      actions.add('configure_bank_targets');
    }
    if (warning === AndroidReceiverWarnings.QUEUE_BACKLOG_HIGH) {
      actions.add('check_receiver_outbox');
    }
    if (warning === AndroidReceiverWarnings.BATTERY_OPTIMIZATION_RISK) {
      actions.add('disable_battery_optimization');
    }
  }

  return [...actions];
}

function toReceiverDevice(row: Record<string, string | number | boolean | Date | null>): StoredReceiverDeviceRecord {
  return {
    id: String(row.id),
    merchantId: String(row.merchant_id),
    deviceName: row.device_name ? String(row.device_name) : undefined,
    publicKey: String(row.public_key),
    appVersion: row.app_version ? String(row.app_version) : undefined,
    androidVersion: row.android_version ? String(row.android_version) : undefined,
    status: String(row.status) as ReceiverDeviceStatus,
    trustScore: Number(row.trust_score),
    notificationAccessStatus: Boolean(row.notification_access_status),
    lastLocalCounter: Number(row.last_local_counter),
    lastHeartbeatAt: row.last_heartbeat_at ? new Date(String(row.last_heartbeat_at)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}
