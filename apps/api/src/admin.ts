import pg from 'pg';
import { EventTypes } from '@swimpay/events';
import type { BankTemplateStatus } from '@swimpay/bank-templates';
import { invalidRequest, type ApiErrorResponse } from './orders.js';

const { Pool } = pg;

export const AdminAuditEventTypes = {
  TEMPLATE_DEGRADED: 'admin.template.degraded',
  TEMPLATE_REVIEW_ONLY: 'admin.template.review_only'
} as const;

export type AdminAuditEventType = (typeof AdminAuditEventTypes)[keyof typeof AdminAuditEventTypes];

export interface AdminBankProfileSummary {
  bankProfileId: string;
  displayName: string;
  country: 'RU';
  status: Exclude<BankTemplateStatus, 'new'>;
  reliabilityIndex: number;
  unknownRate24h: number;
  driftRate7d: number;
  autoConfirmStatus: 'disabled' | 'review_only' | 'shadow_testing' | 'trusted_low_amount' | 'trusted';
  updatedAt: string;
}

export interface AdminTemplateSummary {
  templateId: string;
  bankProfileId: string;
  directionLabel: string;
  canonicalTitle: string;
  canonicalBody: string;
  status: BankTemplateStatus;
  seenCount: number;
  humanVerifiedCount: number;
  falsePositiveCount: number;
  reliabilityScore: number;
  lastSeenAt?: string | undefined;
  updatedAt: string;
}

export interface AdminDriftEventSummary {
  eventId: string;
  bankProfileId?: string | undefined;
  status?: string | undefined;
  reasonCodes: string[];
  occurredAt: string;
}

export interface AdminWebhookFailureSummary {
  deliveryId: string;
  merchantId: string;
  endpointId: string;
  eventId: string;
  eventType: string;
  status: string;
  attemptCount: number;
  lastError?: string | undefined;
  nextRetryAt?: string | undefined;
  createdAt: string;
}

export interface AdminReceiverHealthSummary {
  deviceId: string;
  merchantId: string;
  status: string;
  trustScore: number;
  notificationAccess: boolean;
  lastHeartbeatAt?: string | undefined;
  appVersion?: string | undefined;
  updatedAt: string;
}

export interface AdminAuditEventSummary {
  auditEventId: string;
  merchantId?: string | undefined;
  eventType: string;
  objectType: string;
  objectId: string;
  actorType?: string | undefined;
  actorId?: string | undefined;
  payloadRedacted: Record<string, unknown>;
  createdAt: string;
}

export interface AdminTemplateStatusActionInput {
  templateId: string;
  status: Extract<BankTemplateStatus, 'degraded' | 'review_only'>;
  operatorId: string;
  reason?: string | undefined;
  auditEventId: string;
  occurredAt: string;
}

export type AdminTemplateStatusActionResult =
  | { kind: 'updated'; template: AdminTemplateSummary; auditEvent: AdminAuditEventSummary }
  | { kind: 'not_found' };

export interface AdminRepository {
  listBankProfiles(): Promise<AdminBankProfileSummary[]>;
  listTemplates(limit: number): Promise<AdminTemplateSummary[]>;
  listDriftEvents(limit: number): Promise<AdminDriftEventSummary[]>;
  listWebhookFailures(limit: number): Promise<AdminWebhookFailureSummary[]>;
  listReceiverHealth(limit: number): Promise<AdminReceiverHealthSummary[]>;
  searchAuditEvents(input: { limit: number; eventType?: string | undefined; objectType?: string | undefined }): Promise<AdminAuditEventSummary[]>;
  updateTemplateStatus(input: AdminTemplateStatusActionInput): Promise<AdminTemplateStatusActionResult>;
}

export interface AdminActionRequestBody {
  actor_id?: string | undefined;
  reason?: string | undefined;
}

export class PgAdminRepository implements AdminRepository {
  private readonly pool: pg.Pool;

  public constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 4 });
  }

  public async listBankProfiles(): Promise<AdminBankProfileSummary[]> {
    const result = await this.pool.query(
      `SELECT id, bank_name, country, status, reliability_index, unknown_rate_24h,
        drift_rate_7d, auto_confirm_status, updated_at
       FROM bank_profiles
       ORDER BY id ASC`
    );

    return result.rows.map((row) => toBankProfileSummary(row as AdminBankProfileRow));
  }

  public async listTemplates(limit: number): Promise<AdminTemplateSummary[]> {
    const result = await this.pool.query(
      `SELECT id, bank_profile_id, direction_label, canonical_title, canonical_body, status,
        seen_count, human_verified_count, false_positive_count, reliability_score, last_seen_at, updated_at
       FROM bank_templates
       ORDER BY updated_at DESC, id ASC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map((row) => toTemplateSummary(row as AdminTemplateRow));
  }

  public async listDriftEvents(limit: number): Promise<AdminDriftEventSummary[]> {
    const result = await this.pool.query(
      `SELECT id, object_id, payload_redacted, created_at
       FROM audit_events
       WHERE event_type = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [EventTypes.TEMPLATE_DRIFT_DETECTED, limit]
    );

    return result.rows.map((row) => toDriftEventSummary(row as AdminAuditRow));
  }

  public async listWebhookFailures(limit: number): Promise<AdminWebhookFailureSummary[]> {
    const result = await this.pool.query(
      `SELECT id, merchant_id, endpoint_id, event_id, event_type, status, attempt_count,
        next_retry_at, last_error, created_at
       FROM webhook_deliveries
       WHERE status IN ('failed', 'retrying') OR last_error IS NOT NULL
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map((row) => toWebhookFailureSummary(row as AdminWebhookFailureRow));
  }

  public async listReceiverHealth(limit: number): Promise<AdminReceiverHealthSummary[]> {
    const result = await this.pool.query(
      `SELECT id, merchant_id, status, trust_score, notification_access_status,
        last_heartbeat_at, app_version, updated_at
       FROM receiver_devices
       ORDER BY COALESCE(last_heartbeat_at, updated_at) DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map((row) => toReceiverHealthSummary(row as AdminReceiverHealthRow));
  }

  public async searchAuditEvents(input: {
    limit: number;
    eventType?: string | undefined;
    objectType?: string | undefined;
  }): Promise<AdminAuditEventSummary[]> {
    const values: unknown[] = [];
    const filters: string[] = [];

    if (input.eventType) {
      values.push(input.eventType);
      filters.push(`event_type = $${values.length}`);
    }

    if (input.objectType) {
      values.push(input.objectType);
      filters.push(`object_type = $${values.length}`);
    }

    values.push(input.limit);
    const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT id, merchant_id, event_type, object_type, object_id, actor_type, actor_id,
        payload_redacted, created_at
       FROM audit_events
       ${where}
       ORDER BY created_at DESC
       LIMIT $${values.length}`,
      values
    );

    return result.rows.map((row) => toAuditEventSummary(row as AdminAuditRow));
  }

  public async updateTemplateStatus(input: AdminTemplateStatusActionInput): Promise<AdminTemplateStatusActionResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const templateResult = await client.query(
        `UPDATE bank_templates
         SET status = $1, updated_at = $2
         WHERE id = $3
         RETURNING id, bank_profile_id, direction_label, canonical_title, canonical_body, status,
           seen_count, human_verified_count, false_positive_count, reliability_score, last_seen_at, updated_at`,
        [input.status, input.occurredAt, input.templateId]
      );

      if (templateResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return { kind: 'not_found' };
      }

      const template = toTemplateSummary(templateResult.rows[0] as AdminTemplateRow);
      const auditEvent = buildTemplateAuditEvent(input, template);

      await client.query(
        `INSERT INTO audit_events (
          id, event_type, object_type, object_id, actor_type, actor_id, payload_redacted, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          auditEvent.auditEventId,
          auditEvent.eventType,
          auditEvent.objectType,
          auditEvent.objectId,
          auditEvent.actorType ?? null,
          auditEvent.actorId ?? null,
          JSON.stringify(auditEvent.payloadRedacted),
          auditEvent.createdAt
        ]
      );

      await client.query('COMMIT');
      return { kind: 'updated', template, auditEvent };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export class InMemoryAdminRepository implements AdminRepository {
  public readonly bankProfiles: AdminBankProfileSummary[];
  public readonly templates: AdminTemplateSummary[];
  public readonly driftEvents: AdminDriftEventSummary[];
  public readonly webhookFailures: AdminWebhookFailureSummary[];
  public readonly receiverHealth: AdminReceiverHealthSummary[];
  public readonly auditEvents: AdminAuditEventSummary[];

  public constructor(seed: {
    bankProfiles?: AdminBankProfileSummary[] | undefined;
    templates?: AdminTemplateSummary[] | undefined;
    driftEvents?: AdminDriftEventSummary[] | undefined;
    webhookFailures?: AdminWebhookFailureSummary[] | undefined;
    receiverHealth?: AdminReceiverHealthSummary[] | undefined;
    auditEvents?: AdminAuditEventSummary[] | undefined;
  }) {
    this.bankProfiles = seed.bankProfiles ?? [];
    this.templates = seed.templates ?? [];
    this.driftEvents = seed.driftEvents ?? [];
    this.webhookFailures = seed.webhookFailures ?? [];
    this.receiverHealth = seed.receiverHealth ?? [];
    this.auditEvents = seed.auditEvents ?? [];
  }

  public async listBankProfiles(): Promise<AdminBankProfileSummary[]> {
    return [...this.bankProfiles];
  }

  public async listTemplates(limit: number): Promise<AdminTemplateSummary[]> {
    return this.templates.slice(0, limit);
  }

  public async listDriftEvents(limit: number): Promise<AdminDriftEventSummary[]> {
    return this.driftEvents.slice(0, limit);
  }

  public async listWebhookFailures(limit: number): Promise<AdminWebhookFailureSummary[]> {
    return this.webhookFailures.slice(0, limit);
  }

  public async listReceiverHealth(limit: number): Promise<AdminReceiverHealthSummary[]> {
    return this.receiverHealth.slice(0, limit);
  }

  public async searchAuditEvents(input: {
    limit: number;
    eventType?: string | undefined;
    objectType?: string | undefined;
  }): Promise<AdminAuditEventSummary[]> {
    return this.auditEvents
      .filter((event) => !input.eventType || event.eventType === input.eventType)
      .filter((event) => !input.objectType || event.objectType === input.objectType)
      .slice(0, input.limit);
  }

  public async updateTemplateStatus(input: AdminTemplateStatusActionInput): Promise<AdminTemplateStatusActionResult> {
    const template = this.templates.find((candidate) => candidate.templateId === input.templateId);
    if (!template) {
      return { kind: 'not_found' };
    }

    template.status = input.status;
    template.updatedAt = input.occurredAt;
    const auditEvent = buildTemplateAuditEvent(input, template);
    this.auditEvents.unshift(auditEvent);

    return { kind: 'updated', template, auditEvent };
  }
}

export function parseAdminOperatorId(authorization: string | undefined): string | null {
  const match = authorization?.match(/^Bearer\s+admin_([A-Za-z0-9_-]+)$/);
  return match?.[1] ?? null;
}

export function parseAdminLimit(value: unknown, fallback = 50): number {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, 100);
}

export function validateAdminActionBody(body: unknown): AdminActionRequestBody | ApiErrorResponse {
  if (body === undefined || body === null) {
    return {};
  }

  if (typeof body !== 'object' || Array.isArray(body)) {
    return invalidRequest('Admin action request body must be a JSON object.', {});
  }

  const candidate = body as Partial<AdminActionRequestBody>;
  const reason = normalizeOptionalString(candidate.reason);

  if (reason && reason.length > 500) {
    return invalidRequest('Admin action reason is too long.', { max_length: 500 });
  }

  return {
    actor_id: normalizeOptionalString(candidate.actor_id),
    reason: reason ? redactOperatorText(reason) : undefined
  };
}

export function buildAdminTemplateStatusInput(params: {
  templateId: string;
  status: Extract<BankTemplateStatus, 'degraded' | 'review_only'>;
  operatorId: string;
  body: AdminActionRequestBody;
  auditEventId: string;
  occurredAt: string;
}): AdminTemplateStatusActionInput {
  return {
    templateId: params.templateId,
    status: params.status,
    operatorId: params.body.actor_id ?? params.operatorId,
    reason: params.body.reason,
    auditEventId: params.auditEventId,
    occurredAt: params.occurredAt
  };
}

export function toAdminTemplateActionResponse(result: Extract<AdminTemplateStatusActionResult, { kind: 'updated' }>) {
  return {
    template_id: result.template.templateId,
    bank_profile_id: result.template.bankProfileId,
    status: result.template.status,
    audit_event_id: result.auditEvent.auditEventId
  };
}

export function toAdminListResponse<T>(key: string, values: T[]): Record<string, T[]> {
  return { [key]: values };
}

function buildTemplateAuditEvent(
  input: AdminTemplateStatusActionInput,
  template: AdminTemplateSummary
): AdminAuditEventSummary {
  return {
    auditEventId: input.auditEventId,
    eventType: input.status === 'degraded' ? AdminAuditEventTypes.TEMPLATE_DEGRADED : AdminAuditEventTypes.TEMPLATE_REVIEW_ONLY,
    objectType: 'bank_template',
    objectId: template.templateId,
    actorType: 'operator',
    actorId: input.operatorId,
    payloadRedacted: {
      template_id: template.templateId,
      bank_profile_id: template.bankProfileId,
      status: input.status,
      reason: input.reason
    },
    createdAt: input.occurredAt
  };
}

interface AdminBankProfileRow {
  id: string;
  bank_name: string;
  country: string;
  status: string;
  reliability_index: number | string;
  unknown_rate_24h: number | string;
  drift_rate_7d: number | string;
  auto_confirm_status: string;
  updated_at: Date | string;
}

interface AdminTemplateRow {
  id: string;
  bank_profile_id: string;
  direction_label: string;
  canonical_title: string;
  canonical_body: string;
  status: string;
  seen_count: number | string;
  human_verified_count: number | string;
  false_positive_count: number | string;
  reliability_score: number | string;
  last_seen_at: Date | string | null;
  updated_at: Date | string;
}

interface AdminAuditRow {
  id: string;
  merchant_id?: string | null | undefined;
  event_type?: string | undefined;
  object_type?: string | undefined;
  object_id: string;
  actor_type?: string | null | undefined;
  actor_id?: string | null | undefined;
  payload_redacted: unknown;
  created_at: Date | string;
}

interface AdminWebhookFailureRow {
  id: string;
  merchant_id: string;
  endpoint_id: string;
  event_id: string;
  event_type: string;
  status: string;
  attempt_count: number | string;
  next_retry_at: Date | string | null;
  last_error: string | null;
  created_at: Date | string;
}

interface AdminReceiverHealthRow {
  id: string;
  merchant_id: string;
  status: string;
  trust_score: number | string;
  notification_access_status: boolean;
  last_heartbeat_at: Date | string | null;
  app_version: string | null;
  updated_at: Date | string;
}

function toBankProfileSummary(row: AdminBankProfileRow): AdminBankProfileSummary {
  return {
    bankProfileId: String(row.id),
    displayName: String(row.bank_name),
    country: String(row.country) as 'RU',
    status: String(row.status) as AdminBankProfileSummary['status'],
    reliabilityIndex: Number(row.reliability_index),
    unknownRate24h: Number(row.unknown_rate_24h),
    driftRate7d: Number(row.drift_rate_7d),
    autoConfirmStatus: String(row.auto_confirm_status) as AdminBankProfileSummary['autoConfirmStatus'],
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function toTemplateSummary(row: AdminTemplateRow): AdminTemplateSummary {
  return {
    templateId: String(row.id),
    bankProfileId: String(row.bank_profile_id),
    directionLabel: String(row.direction_label),
    canonicalTitle: String(row.canonical_title),
    canonicalBody: String(row.canonical_body),
    status: String(row.status) as BankTemplateStatus,
    seenCount: Number(row.seen_count),
    humanVerifiedCount: Number(row.human_verified_count),
    falsePositiveCount: Number(row.false_positive_count),
    reliabilityScore: Number(row.reliability_score),
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : undefined,
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function toDriftEventSummary(row: AdminAuditRow): AdminDriftEventSummary {
  const payload = toPayloadRecord(row.payload_redacted);

  return {
    eventId: String(row.id),
    bankProfileId: typeof payload.bank_profile_id === 'string' ? payload.bank_profile_id : String(row.object_id),
    status: typeof payload.status === 'string' ? payload.status : undefined,
    reasonCodes: Array.isArray(payload.reason_codes) ? payload.reason_codes.filter((item): item is string => typeof item === 'string') : [],
    occurredAt: new Date(row.created_at).toISOString()
  };
}

function toWebhookFailureSummary(row: AdminWebhookFailureRow): AdminWebhookFailureSummary {
  return {
    deliveryId: String(row.id),
    merchantId: String(row.merchant_id),
    endpointId: String(row.endpoint_id),
    eventId: String(row.event_id),
    eventType: String(row.event_type),
    status: String(row.status),
    attemptCount: Number(row.attempt_count),
    lastError: row.last_error ?? undefined,
    nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at).toISOString() : undefined,
    createdAt: new Date(row.created_at).toISOString()
  };
}

function toReceiverHealthSummary(row: AdminReceiverHealthRow): AdminReceiverHealthSummary {
  return {
    deviceId: String(row.id),
    merchantId: String(row.merchant_id),
    status: String(row.status),
    trustScore: Number(row.trust_score),
    notificationAccess: Boolean(row.notification_access_status),
    lastHeartbeatAt: row.last_heartbeat_at ? new Date(row.last_heartbeat_at).toISOString() : undefined,
    appVersion: row.app_version ?? undefined,
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function toAuditEventSummary(row: AdminAuditRow): AdminAuditEventSummary {
  return {
    auditEventId: String(row.id),
    merchantId: row.merchant_id ? String(row.merchant_id) : undefined,
    eventType: String(row.event_type),
    objectType: String(row.object_type),
    objectId: String(row.object_id),
    actorType: row.actor_type ?? undefined,
    actorId: row.actor_id ?? undefined,
    payloadRedacted: toPayloadRecord(row.payload_redacted),
    createdAt: new Date(row.created_at).toISOString()
  };
}

function toPayloadRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  return {};
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function redactOperatorText(value: string): string {
  return value
    .replace(/(?:\+7|8)[\s().-]*\d{3}[\s().-]*\d{3}[\s().-]*\d{2}[\s().-]*\d{2}/g, '<PHONE>')
    .replace(/\b\d{10,16}\b/g, '<REFERENCE>');
}
