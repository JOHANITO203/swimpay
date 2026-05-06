import pg from 'pg';
import {
  buildUnknownShapeMonitoringRecord,
  type IntelligenceFeedbackRequest,
  type IntentBoundLearningMetadata,
  type UnknownShapeMonitoringRecord
} from '@swimpay/contracts';

const { Pool } = pg;

export interface IntelligenceFeedbackRecord {
  feedback_id: string;
  merchant_id: string;
  shape_hash: string;
  bank_profile_id: string;
  package_name: string;
  profile_version: string;
  classification_guess: string;
  human_label: string;
  feedback: string;
  timestamp: string;
  review_status: 'pending' | 'accepted' | 'rejected' | 'duplicate';
  learning_metadata: IntentBoundLearningMetadata;
  mutates_runtime_rules: false;
  promotes_profile: false;
  official_bank_confirmation: false;
  creates_payment_review?: false;
}

export interface UnknownShapeRecord extends UnknownShapeMonitoringRecord {
  merchant_id?: string | undefined;
}

export interface IntelligenceRepository {
  storeFeedback(input: IntelligenceFeedbackRecord): Promise<IntelligenceFeedbackRecord>;
  listFeedback(input?: { merchantId?: string | undefined; limit?: number | undefined }): Promise<IntelligenceFeedbackRecord[]>;
  listUnknownShapes(merchantId?: string): Promise<UnknownShapeRecord[]>;
}

export function buildIntelligenceFeedbackRecord(input: {
  feedbackId: string;
  merchantId: string;
  request: IntelligenceFeedbackRequest;
}): IntelligenceFeedbackRecord {
  return {
    feedback_id: input.feedbackId,
    merchant_id: input.merchantId,
    shape_hash: input.request.shape_hash,
    bank_profile_id: input.request.bank_profile_id,
    package_name: input.request.package_name,
    profile_version: input.request.profile_version,
    classification_guess: input.request.classification_guess,
    human_label: input.request.human_label,
    feedback: input.request.feedback,
    timestamp: input.request.timestamp,
    review_status: input.request.review_status,
    learning_metadata: input.request.learning_metadata,
    mutates_runtime_rules: false,
    promotes_profile: false,
    official_bank_confirmation: false,
    creates_payment_review: false
  };
}

export class InMemoryIntelligenceRepository implements IntelligenceRepository {
  private readonly feedback = new Map<string, IntelligenceFeedbackRecord>();
  private readonly unknownShapes = new Map<string, UnknownShapeRecord>();

  public async storeFeedback(input: IntelligenceFeedbackRecord): Promise<IntelligenceFeedbackRecord> {
    this.feedback.set(input.feedback_id, input);
    if (input.classification_guess === 'unknown') {
      this.upsertUnknownShape(input);
    }
    return input;
  }

  public async listFeedback(input: { merchantId?: string | undefined; limit?: number | undefined } = {}): Promise<IntelligenceFeedbackRecord[]> {
    return Array.from(this.feedback.values())
      .filter((record) => !input.merchantId || record.merchant_id === input.merchantId)
      .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
      .slice(0, input.limit ?? 100);
  }

  public async listUnknownShapes(merchantId?: string): Promise<UnknownShapeRecord[]> {
    return Array.from(this.unknownShapes.values())
      .filter((record) => !merchantId || record.merchant_id === merchantId)
      .sort((left, right) => Date.parse(right.last_seen_at) - Date.parse(left.last_seen_at));
  }

  private upsertUnknownShape(input: IntelligenceFeedbackRecord): void {
    const key = unknownShapeKey(input.merchant_id, input.shape_hash, input.bank_profile_id, input.package_name);
    const existing = this.unknownShapes.get(key);
    const record = buildUnknownShapeMonitoringRecord({
      shape_hash: input.shape_hash,
      bank_profile_id: input.bank_profile_id,
      package_name: input.package_name,
      profile_version: input.profile_version,
      seen_count: (existing?.seen_count ?? 0) + 1,
      first_seen_at: existing?.first_seen_at ?? input.timestamp,
      last_seen_at: input.timestamp
    });
    this.unknownShapes.set(key, {
      ...record,
      merchant_id: input.merchant_id
    });
  }
}

export class PgIntelligenceRepository implements IntelligenceRepository {
  private readonly pool: pg.Pool;

  public constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 4 });
  }

  public async storeFeedback(input: IntelligenceFeedbackRecord): Promise<IntelligenceFeedbackRecord> {
    await this.pool.query(
      `INSERT INTO intelligence_feedback (
        id, merchant_id, shape_hash, bank_profile_id, package_name, profile_version,
        classification_guess, human_label, feedback, feedback_timestamp, review_status,
        learning_context, intent_relation, active_payment_intent_present, collision_detected,
        payment_window_status, review_created, mutates_runtime_rules, promotes_profile,
        official_bank_confirmation, creates_payment_review
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, false, false,
        false, false
      )`,
      [
        input.feedback_id,
        input.merchant_id,
        input.shape_hash,
        input.bank_profile_id,
        input.package_name,
        input.profile_version,
        input.classification_guess,
        input.human_label,
        input.feedback,
        input.timestamp,
        input.review_status,
        input.learning_metadata.learning_context,
        input.learning_metadata.intent_relation,
        input.learning_metadata.active_payment_intent_present,
        input.learning_metadata.collision_detected,
        input.learning_metadata.payment_window_status,
        input.learning_metadata.review_created
      ]
    );

    if (input.classification_guess === 'unknown') {
      await this.pool.query(
        `INSERT INTO intelligence_unknown_shapes (
          merchant_id, shape_hash, bank_profile_id, package_name, profile_version,
          classification_guess, seen_count, first_seen_at, last_seen_at, review_status,
          learning_context, read_only, mutates_runtime_rules, promotes_profile,
          official_bank_confirmation, creates_payment_review
        ) VALUES (
          $1, $2, $3, $4, $5,
          'unknown', 1, $6, $6, 'pending',
          'background_observation', true, false, false,
          false, false
        )
        ON CONFLICT (merchant_id, shape_hash, bank_profile_id, package_name)
        DO UPDATE SET
          seen_count = intelligence_unknown_shapes.seen_count + 1,
          last_seen_at = EXCLUDED.last_seen_at,
          profile_version = EXCLUDED.profile_version,
          updated_at = now()`,
        [
          input.merchant_id,
          input.shape_hash,
          input.bank_profile_id,
          input.package_name,
          input.profile_version,
          input.timestamp
        ]
      );
    }

    return input;
  }

  public async listFeedback(input: { merchantId?: string | undefined; limit?: number | undefined } = {}): Promise<IntelligenceFeedbackRecord[]> {
    const values: unknown[] = [];
    const filters: string[] = [];
    if (input.merchantId) {
      values.push(input.merchantId);
      filters.push(`merchant_id = $${values.length}`);
    }
    values.push(input.limit ?? 100);
    const result = await this.pool.query(
      `SELECT * FROM intelligence_feedback
       ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
       ORDER BY created_at DESC, id ASC
       LIMIT $${values.length}`,
      values
    );
    return result.rows.map((row) => toFeedbackRecord(row as IntelligenceFeedbackRow));
  }

  public async listUnknownShapes(merchantId?: string): Promise<UnknownShapeRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM intelligence_unknown_shapes
       ${merchantId ? 'WHERE merchant_id = $1' : ''}
       ORDER BY last_seen_at DESC, shape_hash ASC`,
      merchantId ? [merchantId] : []
    );
    return result.rows.map((row) => toUnknownShapeRecord(row as UnknownShapeRow));
  }
}

export function createDefaultIntelligenceRepository(env: NodeJS.ProcessEnv, environment: string): IntelligenceRepository | null {
  if (env.DATABASE_URL) {
    return new PgIntelligenceRepository(env.DATABASE_URL);
  }
  if (environment === 'production') {
    return null;
  }
  return new InMemoryIntelligenceRepository();
}

export function toIntelligenceFeedbackResponse(record: IntelligenceFeedbackRecord): IntelligenceFeedbackRecord {
  return {
    ...record,
    mutates_runtime_rules: false,
    promotes_profile: false,
    official_bank_confirmation: false,
    creates_payment_review: false
  };
}

export function toUnknownShapeResponse(record: UnknownShapeRecord): UnknownShapeRecord {
  return {
    ...record,
    read_only: true,
    mutates_runtime_rules: false,
    promotes_profile: false,
    official_bank_confirmation: false,
    creates_payment_review: false
  };
}

function unknownShapeKey(merchantId: string, shapeHash: string, bankProfileId: string, packageName: string): string {
  return `${merchantId}:${shapeHash}:${bankProfileId}:${packageName}`;
}

interface IntelligenceFeedbackRow {
  id: string;
  merchant_id: string;
  shape_hash: string;
  bank_profile_id: string;
  package_name: string;
  profile_version: string;
  classification_guess: string;
  human_label: string;
  feedback: string;
  feedback_timestamp: Date | string;
  review_status: 'pending' | 'accepted' | 'rejected' | 'duplicate';
  learning_context: 'intent_bound_feedback' | 'background_observation';
  intent_relation: IntentBoundLearningMetadata['intent_relation'];
  active_payment_intent_present: boolean;
  collision_detected: boolean;
  payment_window_status: IntentBoundLearningMetadata['payment_window_status'];
  review_created: boolean;
}

interface UnknownShapeRow {
  merchant_id: string;
  shape_hash: string;
  bank_profile_id: string;
  package_name: string;
  profile_version: string;
  classification_guess: 'unknown';
  seen_count: number;
  first_seen_at: Date | string;
  last_seen_at: Date | string;
  review_status: 'pending';
  learning_context: 'background_observation';
}

function toFeedbackRecord(row: IntelligenceFeedbackRow): IntelligenceFeedbackRecord {
  return {
    feedback_id: row.id,
    merchant_id: row.merchant_id,
    shape_hash: row.shape_hash,
    bank_profile_id: row.bank_profile_id,
    package_name: row.package_name,
    profile_version: row.profile_version,
    classification_guess: row.classification_guess,
    human_label: row.human_label,
    feedback: row.feedback,
    timestamp: toIso(row.feedback_timestamp),
    review_status: row.review_status,
    learning_metadata: {
      learning_context: row.learning_context,
      intent_relation: row.intent_relation,
      active_payment_intent_present: row.active_payment_intent_present,
      collision_detected: row.collision_detected,
      payment_window_status: row.payment_window_status,
      review_created: row.review_created,
      profile_version: row.profile_version,
      shape_hash: row.shape_hash,
      mutates_runtime_rules: false,
      promotes_profile: false
    },
    mutates_runtime_rules: false,
    promotes_profile: false,
    official_bank_confirmation: false,
    creates_payment_review: false
  };
}

function toUnknownShapeRecord(row: UnknownShapeRow): UnknownShapeRecord {
  return {
    ...buildUnknownShapeMonitoringRecord({
      shape_hash: row.shape_hash,
      bank_profile_id: row.bank_profile_id,
      package_name: row.package_name,
      profile_version: row.profile_version,
      seen_count: row.seen_count,
      first_seen_at: toIso(row.first_seen_at),
      last_seen_at: toIso(row.last_seen_at)
    }),
    merchant_id: row.merchant_id
  };
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
