import pg from 'pg';

const { Pool } = pg;

export type ReceiverDeviceStatus = 'pending' | 'active' | 'degraded' | 'suspended' | 'revoked';

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
  appVersion?: string | undefined;
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
  selected_banks?: string[] | undefined;
}

export interface ReceiverHeartbeatBody {
  device_id: string;
  notification_access: boolean;
  listener_connected: boolean;
  allowed_banks?: string[] | undefined;
  queue_length?: number | undefined;
  last_signal_at?: string | null | undefined;
  app_version?: string | undefined;
  status?: string | undefined;
}

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
    const status: ReceiverDeviceStatus =
      input.notificationAccessStatus && input.listenerConnected ? 'active' : 'degraded';

    const result = await this.pool.query(
      `UPDATE receiver_devices
       SET notification_access_status = $1,
           last_heartbeat_at = $2,
           app_version = COALESCE($3, app_version),
           status = $4,
           updated_at = $2
       WHERE merchant_id = $5 AND id = $6
       RETURNING id, merchant_id, device_name, public_key, app_version, android_version,
         status, trust_score, notification_access_status, last_local_counter,
         last_heartbeat_at, created_at, updated_at`,
      [
        input.notificationAccessStatus,
        input.heartbeatAt,
        input.appVersion ?? null,
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

export function validateReceiverDeviceRegisterBody(body: unknown): ReceiverDeviceRegisterBody | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const candidate = body as Partial<ReceiverDeviceRegisterBody>;
  if (typeof candidate.public_key !== 'string' || !candidate.public_key.trim()) {
    return null;
  }

  return {
    device_name: candidate.device_name,
    public_key: candidate.public_key,
    app_version: candidate.app_version,
    android_version: candidate.android_version,
    selected_banks: candidate.selected_banks
  };
}

export function validateReceiverHeartbeatBody(body: unknown): ReceiverHeartbeatBody | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const candidate = body as Partial<ReceiverHeartbeatBody>;
  if (
    typeof candidate.device_id !== 'string' ||
    typeof candidate.notification_access !== 'boolean' ||
    typeof candidate.listener_connected !== 'boolean'
  ) {
    return null;
  }

  return {
    device_id: candidate.device_id,
    notification_access: candidate.notification_access,
    listener_connected: candidate.listener_connected,
    allowed_banks: candidate.allowed_banks,
    queue_length: candidate.queue_length,
    last_signal_at: candidate.last_signal_at,
    app_version: candidate.app_version,
    status: candidate.status
  };
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
        selected_banks: params.body.selected_banks ?? []
      }
    }
  };
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
