import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { invalidRequest, type ApiErrorResponse } from './orders.js';

const { Pool } = pg;

export const BankEvidenceStatuses = {
  PENDING_OPERATOR_REVIEW: 'pending_operator_review',
  APPROVED_FOR_REVIEW_ONLY: 'approved_for_review_only',
  REJECTED: 'rejected',
  DEPRECATED: 'deprecated'
} as const;

export type BankEvidenceStatus = (typeof BankEvidenceStatuses)[keyof typeof BankEvidenceStatuses];

export const BankEvidenceSources = {
  ANDROID_PACKAGEMANAGER: 'android_packagemanager',
  SYNTHETIC_DEBUG_ONLY: 'synthetic_debug_only'
} as const;

export type BankEvidenceSource = (typeof BankEvidenceSources)[keyof typeof BankEvidenceSources];

export const BankEvidenceAuditEventTypes = {
  SUBMITTED: 'bank_evidence.submitted',
  REVIEWED: 'bank_evidence.reviewed',
  APPROVED_REVIEW_ONLY: 'bank_evidence.approved_review_only',
  REJECTED: 'bank_evidence.rejected'
} as const;

export type BankEvidenceAuditEventType = (typeof BankEvidenceAuditEventTypes)[keyof typeof BankEvidenceAuditEventTypes];

export interface BankEvidenceRecord {
  evidenceId: string;
  merchantId: string;
  deviceId: string;
  bankProfileId: string;
  packageName: string;
  certSha256: string;
  appVersion?: string | undefined;
  installSource?: string | undefined;
  source: BankEvidenceSource;
  status: BankEvidenceStatus;
  createdAt: string;
  reviewedAt?: string | undefined;
  reviewedBy?: string | undefined;
  reviewReason?: string | undefined;
}

export interface BankEvidenceAuditEvent {
  auditEventId: string;
  merchantId: string;
  eventType: BankEvidenceAuditEventType;
  objectType: 'bank_package_evidence';
  objectId: string;
  actorType: 'receiver_device' | 'operator';
  actorId: string;
  payloadRedacted: Record<string, unknown>;
  createdAt: string;
}

export interface BankEvidenceSubmitInput {
  evidenceId: string;
  merchantId: string;
  deviceId: string;
  bankProfileId: string;
  packageName: string;
  certSha256: string;
  appVersion?: string | undefined;
  installSource?: string | undefined;
  source: BankEvidenceSource;
  auditEventId: string;
  occurredAt: string;
}

export type BankEvidenceSubmitResult =
  | { kind: 'stored'; evidence: BankEvidenceRecord; auditEvent: BankEvidenceAuditEvent }
  | { kind: 'duplicate'; evidence: BankEvidenceRecord }
  | { kind: 'device_not_found' }
  | { kind: 'bank_profile_not_found' };

export interface BankEvidenceReviewInput {
  evidenceId: string;
  operatorId: string;
  reason?: string | undefined;
  auditEventId: string;
  occurredAt: string;
  action: 'approve_review_only' | 'reject';
}

export type BankEvidenceReviewResult =
  | { kind: 'updated'; evidence: BankEvidenceRecord; auditEvents: BankEvidenceAuditEvent[] }
  | { kind: 'not_found' }
  | { kind: 'not_pending' };

export interface BankEvidenceRepository {
  submitEvidence(input: BankEvidenceSubmitInput): Promise<BankEvidenceSubmitResult>;
  listEvidence(limit: number): Promise<BankEvidenceRecord[]>;
  getEvidence(evidenceId: string): Promise<BankEvidenceRecord | null>;
  reviewEvidence(input: BankEvidenceReviewInput): Promise<BankEvidenceReviewResult>;
}

export type BankEvidenceSubmitValidationResult =
  | {
      valid: true;
      value: {
        device_id: string;
        bank_profile_id: string;
        package_name: string;
        cert_sha256: string;
        app_version?: string | undefined;
        install_source?: string | undefined;
        source: BankEvidenceSource;
      };
    }
  | { valid: false; response: ApiErrorResponse };

export function validateBankEvidenceSubmitBody(body: unknown): BankEvidenceSubmitValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, response: invalidRequest('Bank evidence request body must be a JSON object.', {}) };
  }

  if (containsForbiddenSensitiveKey(body)) {
    return { valid: false, response: invalidRequest('Bank evidence must not include raw phone or notification text.', {}) };
  }

  const candidate = body as Record<string, unknown>;
  const source = String(candidate.source ?? BankEvidenceSources.ANDROID_PACKAGEMANAGER);
  if (!isAllowedEvidenceSource(source)) {
    return {
      valid: false,
      response: invalidRequest('Bank evidence source is invalid.', {
        allowed: Object.values(BankEvidenceSources)
      })
    };
  }

  const required = ['device_id', 'bank_profile_id', 'package_name', 'cert_sha256'] as const;
  for (const field of required) {
    if (!isNonEmptyString(candidate[field])) {
      return { valid: false, response: invalidRequest('Bank evidence field is required.', { field }) };
    }
  }

  const packageName = String(candidate.package_name).trim();
  const certSha256 = String(candidate.cert_sha256).trim();
  if (packageName === 'TO_VERIFY' || certSha256 === 'TO_VERIFY') {
    return {
      valid: false,
      response: invalidRequest('TO_VERIFY package/certificate metadata cannot be submitted as evidence.', {
        field: packageName === 'TO_VERIFY' ? 'package_name' : 'cert_sha256'
      })
    };
  }

  if (!isSyntheticDebugValue(packageName) && !isSha256Like(certSha256)) {
    return {
      valid: false,
      response: invalidRequest('Bank evidence certificate hash must be a SHA-256 hex string or synthetic debug marker.', {
        field: 'cert_sha256'
      })
    };
  }

  return {
    valid: true,
    value: {
      device_id: String(candidate.device_id).trim(),
      bank_profile_id: String(candidate.bank_profile_id).trim(),
      package_name: packageName,
      cert_sha256: certSha256,
      app_version: normalizeOptionalString(candidate.app_version),
      install_source: normalizeOptionalString(candidate.install_source),
      source: source as BankEvidenceSource
    }
  };
}

export function validateBankEvidenceReviewBody(body: unknown): { valid: true; reason?: string | undefined } | { valid: false; response: ApiErrorResponse } {
  if (body === undefined || body === null) {
    return { valid: true };
  }

  if (typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, response: invalidRequest('Bank evidence review body must be a JSON object.', {}) };
  }

  if (containsForbiddenSensitiveKey(body)) {
    return { valid: false, response: invalidRequest('Bank evidence review must not include raw phone or notification text.', {}) };
  }

  const reason = redactOperatorText(normalizeOptionalString((body as { reason?: unknown }).reason) ?? '');
  return { valid: true, reason: reason || undefined };
}

export function toBankEvidenceResponse(evidence: BankEvidenceRecord) {
  return {
    evidence_id: evidence.evidenceId,
    merchant_id: evidence.merchantId,
    device_id: evidence.deviceId,
    bank_profile_id: evidence.bankProfileId,
    package_name: evidence.packageName,
    cert_sha256_masked: maskCertificateHash(evidence.certSha256),
    app_version: evidence.appVersion,
    install_source: evidence.installSource,
    source: evidence.source,
    status: evidence.status,
    trusted: false,
    auto_confirm_enabled: false,
    created_at: evidence.createdAt,
    reviewed_at: evidence.reviewedAt,
    reviewed_by: evidence.reviewedBy,
    review_reason: evidence.reviewReason
  };
}

export function toBankEvidenceSubmitResponse(evidence: BankEvidenceRecord) {
  return {
    evidence_id: evidence.evidenceId,
    status: evidence.status,
    next_action: 'operator_review_required',
    trusted: false,
    auto_confirm_enabled: false,
    message: 'evidence accepted for operator review; not trusted yet; no auto-confirm enabled',
    cert_sha256_masked: maskCertificateHash(evidence.certSha256)
  };
}

export function toBankEvidenceReviewResponse(result: Extract<BankEvidenceReviewResult, { kind: 'updated' }>) {
  const reviewAudit = result.auditEvents[result.auditEvents.length - 1];
  return {
    evidence_id: result.evidence.evidenceId,
    status: result.evidence.status,
    trusted: false,
    auto_confirm_enabled: false,
    review_reason: result.evidence.reviewReason,
    audit_event_id: reviewAudit?.auditEventId
  };
}

export class InMemoryBankEvidenceRepository implements BankEvidenceRepository {
  public readonly evidence: BankEvidenceRecord[];
  public readonly auditEvents: BankEvidenceAuditEvent[] = [];
  public readonly verifiedBankAppProfiles: Set<string>;
  private readonly devices: Array<{ merchantId: string; deviceId: string }>;
  private readonly bankProfileIds: Set<string>;
  private readonly evidenceId: () => string;

  public constructor(seed: {
    devices: Array<{ merchantId: string; deviceId: string }>;
    bankProfileIds: string[];
    evidence?: BankEvidenceRecord[] | undefined;
    evidenceId?: (() => string) | undefined;
    auditEvents?: BankEvidenceAuditEvent[] | undefined;
    verifiedBankAppProfiles?: string[] | undefined;
  }) {
    this.devices = seed.devices;
    this.bankProfileIds = new Set(seed.bankProfileIds);
    this.evidence = seed.evidence ?? [];
    this.evidenceId = seed.evidenceId ?? (() => `bev_${this.evidence.length + 1}`);
    this.auditEvents = seed.auditEvents ?? [];
    this.verifiedBankAppProfiles = new Set(seed.verifiedBankAppProfiles ?? []);
  }

  public async submitEvidence(input: BankEvidenceSubmitInput): Promise<BankEvidenceSubmitResult> {
    if (!this.devices.some((device) => device.merchantId === input.merchantId && device.deviceId === input.deviceId)) {
      return { kind: 'device_not_found' };
    }

    if (!this.bankProfileIds.has(input.bankProfileId)) {
      return { kind: 'bank_profile_not_found' };
    }

    const duplicate = this.evidence.find((candidate) => sameObservation(candidate, input));
    if (duplicate) {
      return { kind: 'duplicate', evidence: duplicate };
    }

    const evidence: BankEvidenceRecord = {
      evidenceId: input.evidenceId || this.evidenceId(),
      merchantId: input.merchantId,
      deviceId: input.deviceId,
      bankProfileId: input.bankProfileId,
      packageName: input.packageName,
      certSha256: input.certSha256,
      appVersion: input.appVersion,
      installSource: input.installSource,
      source: input.source,
      status: BankEvidenceStatuses.PENDING_OPERATOR_REVIEW,
      createdAt: input.occurredAt
    };
    this.evidence.unshift(evidence);
    const auditEvent = buildBankEvidenceAuditEvent({
      auditEventId: input.auditEventId,
      merchantId: input.merchantId,
      eventType: BankEvidenceAuditEventTypes.SUBMITTED,
      evidence,
      actorType: 'receiver_device',
      actorId: input.deviceId,
      reason: undefined,
      occurredAt: input.occurredAt
    });
    this.auditEvents.unshift(auditEvent);
    return { kind: 'stored', evidence, auditEvent };
  }

  public async listEvidence(limit: number): Promise<BankEvidenceRecord[]> {
    return this.evidence.slice(0, limit);
  }

  public async getEvidence(evidenceId: string): Promise<BankEvidenceRecord | null> {
    return this.evidence.find((candidate) => candidate.evidenceId === evidenceId) ?? null;
  }

  public async reviewEvidence(input: BankEvidenceReviewInput): Promise<BankEvidenceReviewResult> {
    const evidence = this.evidence.find((candidate) => candidate.evidenceId === input.evidenceId);
    if (!evidence) {
      return { kind: 'not_found' };
    }

    if (evidence.status !== BankEvidenceStatuses.PENDING_OPERATOR_REVIEW) {
      return { kind: 'not_pending' };
    }

    evidence.status =
      input.action === 'approve_review_only' ? BankEvidenceStatuses.APPROVED_FOR_REVIEW_ONLY : BankEvidenceStatuses.REJECTED;
    evidence.reviewedAt = input.occurredAt;
    evidence.reviewedBy = input.operatorId;
    evidence.reviewReason = input.reason;

    const reviewed = buildBankEvidenceAuditEvent({
      auditEventId: randomUUID(),
      merchantId: evidence.merchantId,
      eventType: BankEvidenceAuditEventTypes.REVIEWED,
      evidence,
      actorType: 'operator',
      actorId: input.operatorId,
      reason: input.reason,
      occurredAt: input.occurredAt
    });
    const terminal = buildBankEvidenceAuditEvent({
      auditEventId: input.auditEventId,
      merchantId: evidence.merchantId,
      eventType: input.action === 'approve_review_only' ? BankEvidenceAuditEventTypes.APPROVED_REVIEW_ONLY : BankEvidenceAuditEventTypes.REJECTED,
      evidence,
      actorType: 'operator',
      actorId: input.operatorId,
      reason: input.reason,
      occurredAt: input.occurredAt
    });
    this.auditEvents.unshift(terminal, reviewed);
    return { kind: 'updated', evidence, auditEvents: [reviewed, terminal] };
  }
}

export class PgBankEvidenceRepository implements BankEvidenceRepository {
  private readonly pool: pg.Pool;

  public constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 4 });
  }

  public async submitEvidence(input: BankEvidenceSubmitInput): Promise<BankEvidenceSubmitResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const device = await client.query('SELECT id FROM receiver_devices WHERE merchant_id = $1 AND id = $2', [
        input.merchantId,
        input.deviceId
      ]);
      if (device.rowCount === 0) {
        await client.query('ROLLBACK');
        return { kind: 'device_not_found' };
      }

      const bankProfile = await client.query('SELECT id FROM bank_profiles WHERE id = $1', [input.bankProfileId]);
      if (bankProfile.rowCount === 0) {
        await client.query('ROLLBACK');
        return { kind: 'bank_profile_not_found' };
      }

      const duplicate = await client.query(
        `SELECT *
         FROM bank_package_evidence
         WHERE merchant_id = $1 AND device_id = $2 AND bank_profile_id = $3
           AND package_name = $4 AND cert_sha256 = $5 AND source = $6`,
        [input.merchantId, input.deviceId, input.bankProfileId, input.packageName, input.certSha256, input.source]
      );
      if (duplicate.rowCount && duplicate.rowCount > 0) {
        await client.query('ROLLBACK');
        return { kind: 'duplicate', evidence: toBankEvidenceRecord(duplicate.rows[0] as BankEvidenceRow) };
      }

      const inserted = await client.query(
        `INSERT INTO bank_package_evidence (
          id, merchant_id, device_id, bank_profile_id, package_name, cert_sha256,
          app_version, install_source, source, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending_operator_review', $10)
        RETURNING *`,
        [
          input.evidenceId,
          input.merchantId,
          input.deviceId,
          input.bankProfileId,
          input.packageName,
          input.certSha256,
          input.appVersion ?? null,
          input.installSource ?? null,
          input.source,
          input.occurredAt
        ]
      );

      const evidence = toBankEvidenceRecord(inserted.rows[0] as BankEvidenceRow);
      const auditEvent = buildBankEvidenceAuditEvent({
        auditEventId: input.auditEventId,
        merchantId: input.merchantId,
        eventType: BankEvidenceAuditEventTypes.SUBMITTED,
        evidence,
        actorType: 'receiver_device',
        actorId: input.deviceId,
        reason: undefined,
        occurredAt: input.occurredAt
      });
      await insertBankEvidenceAuditEvent(client, auditEvent);
      await client.query('COMMIT');
      return { kind: 'stored', evidence, auditEvent };
    } catch (error) {
      await client.query('ROLLBACK');
      if (isUniqueViolation(error)) {
        const duplicate = await this.findDuplicate(input);
        if (duplicate) {
          return { kind: 'duplicate', evidence: duplicate };
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  public async listEvidence(limit: number): Promise<BankEvidenceRecord[]> {
    const result = await this.pool.query(
      `SELECT *
       FROM bank_package_evidence
       ORDER BY created_at DESC, id ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map((row) => toBankEvidenceRecord(row as BankEvidenceRow));
  }

  public async getEvidence(evidenceId: string): Promise<BankEvidenceRecord | null> {
    const result = await this.pool.query('SELECT * FROM bank_package_evidence WHERE id = $1', [evidenceId]);
    return result.rowCount === 0 ? null : toBankEvidenceRecord(result.rows[0] as BankEvidenceRow);
  }

  public async reviewEvidence(input: BankEvidenceReviewInput): Promise<BankEvidenceReviewResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const current = await client.query('SELECT * FROM bank_package_evidence WHERE id = $1 FOR UPDATE', [input.evidenceId]);
      if (current.rowCount === 0) {
        await client.query('ROLLBACK');
        return { kind: 'not_found' };
      }

      const evidence = toBankEvidenceRecord(current.rows[0] as BankEvidenceRow);
      if (evidence.status !== BankEvidenceStatuses.PENDING_OPERATOR_REVIEW) {
        await client.query('ROLLBACK');
        return { kind: 'not_pending' };
      }

      const nextStatus =
        input.action === 'approve_review_only' ? BankEvidenceStatuses.APPROVED_FOR_REVIEW_ONLY : BankEvidenceStatuses.REJECTED;
      const updated = await client.query(
        `UPDATE bank_package_evidence
         SET status = $1, reviewed_at = $2, reviewed_by = $3, review_reason = $4
         WHERE id = $5
         RETURNING *`,
        [nextStatus, input.occurredAt, input.operatorId, input.reason ?? null, input.evidenceId]
      );
      const updatedEvidence = toBankEvidenceRecord(updated.rows[0] as BankEvidenceRow);
      const reviewed = buildBankEvidenceAuditEvent({
        auditEventId: randomUUID(),
        merchantId: updatedEvidence.merchantId,
        eventType: BankEvidenceAuditEventTypes.REVIEWED,
        evidence: updatedEvidence,
        actorType: 'operator',
        actorId: input.operatorId,
        reason: input.reason,
        occurredAt: input.occurredAt
      });
      const terminal = buildBankEvidenceAuditEvent({
        auditEventId: input.auditEventId,
        merchantId: updatedEvidence.merchantId,
        eventType: input.action === 'approve_review_only' ? BankEvidenceAuditEventTypes.APPROVED_REVIEW_ONLY : BankEvidenceAuditEventTypes.REJECTED,
        evidence: updatedEvidence,
        actorType: 'operator',
        actorId: input.operatorId,
        reason: input.reason,
        occurredAt: input.occurredAt
      });
      await insertBankEvidenceAuditEvent(client, reviewed);
      await insertBankEvidenceAuditEvent(client, terminal);
      await client.query('COMMIT');
      return { kind: 'updated', evidence: updatedEvidence, auditEvents: [reviewed, terminal] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async findDuplicate(input: BankEvidenceSubmitInput): Promise<BankEvidenceRecord | null> {
    const result = await this.pool.query(
      `SELECT *
       FROM bank_package_evidence
       WHERE merchant_id = $1 AND device_id = $2 AND bank_profile_id = $3
         AND package_name = $4 AND cert_sha256 = $5 AND source = $6`,
      [input.merchantId, input.deviceId, input.bankProfileId, input.packageName, input.certSha256, input.source]
    );
    return result.rowCount === 0 ? null : toBankEvidenceRecord(result.rows[0] as BankEvidenceRow);
  }
}

export function maskCertificateHash(certSha256: string): string {
  if (certSha256 === 'TO_VERIFY') {
    return 'TO_VERIFY';
  }

  if (isSyntheticDebugValue(certSha256)) {
    return 'synthetic_debug_only';
  }

  if (certSha256.length <= 12) {
    return '<CERT_SHA256>';
  }

  return `${certSha256.slice(0, 6)}...${certSha256.slice(-6)}`;
}

function buildBankEvidenceAuditEvent(input: {
  auditEventId: string;
  merchantId: string;
  eventType: BankEvidenceAuditEventType;
  evidence: BankEvidenceRecord;
  actorType: 'receiver_device' | 'operator';
  actorId: string;
  reason?: string | undefined;
  occurredAt: string;
}): BankEvidenceAuditEvent {
  return {
    auditEventId: input.auditEventId,
    merchantId: input.merchantId,
    eventType: input.eventType,
    objectType: 'bank_package_evidence',
    objectId: input.evidence.evidenceId,
    actorType: input.actorType,
    actorId: input.actorId,
    payloadRedacted: {
      evidence_id: input.evidence.evidenceId,
      bank_profile_id: input.evidence.bankProfileId,
      package_name: redactOperatorText(input.evidence.packageName),
      cert_sha256_masked: maskCertificateHash(input.evidence.certSha256),
      source: input.evidence.source,
      status: input.evidence.status,
      trusted: false,
      auto_confirm_enabled: false,
      reason: input.reason
    },
    createdAt: input.occurredAt
  };
}

async function insertBankEvidenceAuditEvent(client: pg.PoolClient, auditEvent: BankEvidenceAuditEvent): Promise<void> {
  await client.query(
    `INSERT INTO audit_events (
      id, merchant_id, event_type, object_type, object_id, actor_type, actor_id, payload_redacted, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      auditEvent.auditEventId,
      auditEvent.merchantId,
      auditEvent.eventType,
      auditEvent.objectType,
      auditEvent.objectId,
      auditEvent.actorType,
      auditEvent.actorId,
      JSON.stringify(auditEvent.payloadRedacted),
      auditEvent.createdAt
    ]
  );
}

function sameObservation(record: BankEvidenceRecord, input: BankEvidenceSubmitInput): boolean {
  return (
    record.merchantId === input.merchantId &&
    record.deviceId === input.deviceId &&
    record.bankProfileId === input.bankProfileId &&
    record.packageName === input.packageName &&
    record.certSha256 === input.certSha256 &&
    record.source === input.source
  );
}

function containsForbiddenSensitiveKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenSensitiveKey(item));
  }

  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
    if (/raw[_-]?phone|(^|_)phone$|buyer_phone|sender_phone|normalized_phone|notification_text|raw_notification|raw_body|raw_title/iu.test(key)) {
      return true;
    }

    return containsForbiddenSensitiveKey(nested);
  });
}

function redactOperatorText(value: string): string {
  return value
    .replace(/(?:\+7|8)[\s().-]*\d{3}[\s().-]*\d{3}[\s().-]*\d{2}[\s().-]*\d{2}/g, '<PHONE>')
    .replace(/\b\d{10,16}\b/g, '<REFERENCE>')
    .replace(/raw[_ -]?notification|notification[_ -]?text|raw[_ -]?body|raw[_ -]?title/giu, '<REDACTED>');
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? redactOperatorText(value.trim()) : undefined;
}

function isAllowedEvidenceSource(value: string): value is BankEvidenceSource {
  return Object.values(BankEvidenceSources).includes(value as BankEvidenceSource);
}

function isSyntheticDebugValue(value: string): boolean {
  return value.includes('synthetic_debug_only');
}

function isSha256Like(value: string): boolean {
  return /^[a-f0-9]{64}$/iu.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
}

interface BankEvidenceRow {
  id: string;
  merchant_id: string;
  device_id: string;
  bank_profile_id: string;
  package_name: string;
  cert_sha256: string;
  app_version: string | null;
  install_source: string | null;
  source: string;
  status: string;
  created_at: Date | string;
  reviewed_at: Date | string | null;
  reviewed_by: string | null;
  review_reason: string | null;
}

function toBankEvidenceRecord(row: BankEvidenceRow): BankEvidenceRecord {
  return {
    evidenceId: String(row.id),
    merchantId: String(row.merchant_id),
    deviceId: String(row.device_id),
    bankProfileId: String(row.bank_profile_id),
    packageName: String(row.package_name),
    certSha256: String(row.cert_sha256),
    appVersion: row.app_version ?? undefined,
    installSource: row.install_source ?? undefined,
    source: String(row.source) as BankEvidenceSource,
    status: String(row.status) as BankEvidenceStatus,
    createdAt: new Date(row.created_at).toISOString(),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewReason: row.review_reason ?? undefined
  };
}
