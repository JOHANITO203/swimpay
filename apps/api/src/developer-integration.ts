import { createHash, randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { PUBLIC_EVENT_SIGNAL_DISCLOSURE } from '@swimpay/events';
import { encryptSecret, hashApiKey, hashWebhookSecret, validatePublicWebhookUrlSyntax } from '@swimpay/security';

const { Pool } = pg;

export const PUBLIC_V1_WEBHOOK_EVENTS = ['payment.confirmed', 'payment.rejected', 'payment.expired'] as const;

export type PublicV1WebhookEventType = (typeof PUBLIC_V1_WEBHOOK_EVENTS)[number];
export type IntegrationType = 'web' | 'android' | 'both';
export type WebhookStatus = 'not_configured' | 'active' | 'problem';

export interface MerchantIntegrationState {
  merchantId: string;
  publicKey: string;
  secretKeyMasked: string | null;
  secretKeyCreatedAt: string | null;
  secretKeyLastRotatedAt: string | null;
  webhookSecretMasked: string | null;
  webhookSecretCreatedAt: string | null;
  webhookSecretLastRotatedAt: string | null;
  webhookUrl: string | null;
  webhookStatus: WebhookStatus;
  integrationType: IntegrationType;
  createdAt: string;
  updatedAt: string;
}

export interface SecretLifecycleResult {
  integration: MerchantIntegrationState;
  secretKeyOnce?: string | undefined;
  webhookSecretOnce?: string | undefined;
}

export interface WebhookUrlUpdateResult {
  integration: MerchantIntegrationState;
  webhookSecretOnce?: string | undefined;
}

export interface MerchantDeliveryHistoryRow {
  eventId: string;
  eventType: PublicV1WebhookEventType;
  deliveryId: string;
  status: string;
  attempts: number;
  lastHttpStatus: number | null;
  createdAt: string;
  deliveredAt: string | null;
  nextRetryAt: string | null;
  safeErrorSummary: string | null;
}

export interface WebhookTestResult {
  status: 'test_queued' | 'action_required';
  deliveryId?: string | undefined;
  eventId?: string | undefined;
  safeStatus: string;
  testOnly: true;
  triggersFulfillment: false;
  officialBankConfirmation: false;
}

export interface WebhookRetryResult {
  status: 'retry_queued' | 'not_found' | 'not_retryable';
  deliveryId?: string | undefined;
  replayOfDeliveryId?: string | undefined;
}

export interface MerchantIntegrationRepository {
  getIntegration(merchantId: string, now: string): Promise<MerchantIntegrationState>;
  ensureApiKey(merchantId: string, now: string): Promise<SecretLifecycleResult>;
  rotateApiKey(merchantId: string, now: string): Promise<SecretLifecycleResult>;
  rotateWebhookSecret(merchantId: string, now: string): Promise<SecretLifecycleResult>;
  updateWebhookUrl(merchantId: string, webhookUrl: string, now: string): Promise<WebhookUrlUpdateResult>;
  listDeliveries(merchantId: string, limit: number): Promise<MerchantDeliveryHistoryRow[]>;
  enqueueTestWebhook(merchantId: string, now: string): Promise<WebhookTestResult>;
  retryDelivery(merchantId: string, deliveryId: string, now: string): Promise<WebhookRetryResult>;
}

export class InMemoryMerchantIntegrationRepository implements MerchantIntegrationRepository {
  private readonly integrations = new Map<string, MerchantIntegrationMutable>();
  private readonly deliveries: MerchantDeliveryMutable[] = [];

  public async getIntegration(merchantId: string, now: string): Promise<MerchantIntegrationState> {
    return toIntegrationState(this.ensureIntegration(merchantId, now));
  }

  public async ensureApiKey(merchantId: string, now: string): Promise<SecretLifecycleResult> {
    const integration = this.ensureIntegration(merchantId, now);
    if (integration.secretKeyMasked) {
      return { integration: toIntegrationState(integration) };
    }

    const secretKeyOnce = generateSecretKey();
    integration.secretKeyHash = hashApiKey(secretKeyOnce);
    integration.secretKeyMasked = maskSecret(secretKeyOnce);
    integration.secretKeyCreatedAt = now;
    integration.secretKeyLastRotatedAt = now;
    integration.updatedAt = now;
    return { integration: toIntegrationState(integration), secretKeyOnce };
  }

  public async rotateApiKey(merchantId: string, now: string): Promise<SecretLifecycleResult> {
    const integration = this.ensureIntegration(merchantId, now);
    const secretKeyOnce = generateSecretKey();
    integration.secretKeyHash = hashApiKey(secretKeyOnce);
    integration.secretKeyMasked = maskSecret(secretKeyOnce);
    integration.secretKeyCreatedAt ??= now;
    integration.secretKeyLastRotatedAt = now;
    integration.updatedAt = now;
    return { integration: toIntegrationState(integration), secretKeyOnce };
  }

  public async rotateWebhookSecret(merchantId: string, now: string): Promise<SecretLifecycleResult> {
    const integration = this.ensureIntegration(merchantId, now);
    const webhookSecretOnce = generateWebhookSecret();
    integration.webhookSecretHash = hashWebhookSecret(webhookSecretOnce);
    integration.webhookSecretMasked = maskSecret(webhookSecretOnce);
    integration.webhookSecretCreatedAt ??= now;
    integration.webhookSecretLastRotatedAt = now;
    integration.updatedAt = now;
    return { integration: toIntegrationState(integration), webhookSecretOnce };
  }

  public async updateWebhookUrl(merchantId: string, webhookUrl: string, now: string): Promise<WebhookUrlUpdateResult> {
    const integration = this.ensureIntegration(merchantId, now);
    let webhookSecretOnce: string | undefined;
    if (!integration.webhookSecretHash) {
      webhookSecretOnce = generateWebhookSecret();
      integration.webhookSecretHash = hashWebhookSecret(webhookSecretOnce);
      integration.webhookSecretMasked = maskSecret(webhookSecretOnce);
      integration.webhookSecretCreatedAt = now;
      integration.webhookSecretLastRotatedAt = now;
    }
    integration.webhookUrl = webhookUrl;
    integration.webhookStatus = 'active';
    integration.updatedAt = now;
    return { integration: toIntegrationState(integration), webhookSecretOnce };
  }

  public async listDeliveries(merchantId: string, limit: number): Promise<MerchantDeliveryHistoryRow[]> {
    return this.deliveries
      .filter((delivery) => delivery.merchantId === merchantId && isPublicV1WebhookEvent(delivery.eventType))
      .slice(0, Math.max(0, limit))
      .map(toDeliveryHistoryRow);
  }

  public async enqueueTestWebhook(merchantId: string, now: string): Promise<WebhookTestResult> {
    const integration = this.ensureIntegration(merchantId, now);
    if (!integration.webhookUrl || !integration.webhookSecretHash) {
      return {
        status: 'action_required',
        safeStatus: 'Webhook URL or webhook secret is not configured.',
        testOnly: true,
        triggersFulfillment: false,
        officialBankConfirmation: false
      };
    }

    const deliveryId = randomUUID();
    const eventId = `evt_test_${randomToken(16)}`;
    this.deliveries.unshift({
      merchantId,
      deliveryId,
      eventId,
      eventType: 'payment.confirmed',
      status: 'pending',
      attempts: 0,
      lastHttpStatus: null,
      createdAt: now,
      deliveredAt: null,
      nextRetryAt: now,
      safeErrorSummary: null,
      replayOfDeliveryId: null
    });

    return {
      status: 'test_queued',
      deliveryId,
      eventId,
      safeStatus: 'Safe test webhook queued.',
      testOnly: true,
      triggersFulfillment: false,
      officialBankConfirmation: false
    };
  }

  public async retryDelivery(merchantId: string, deliveryId: string, now: string): Promise<WebhookRetryResult> {
    const delivery = this.deliveries.find((item) => item.merchantId === merchantId && item.deliveryId === deliveryId);
    if (!delivery) {
      return { status: 'not_found' };
    }
    if (!['failed', 'dead', 'pending'].includes(delivery.status)) {
      return { status: 'not_retryable', deliveryId };
    }

    const replayDeliveryId = randomUUID();
    this.deliveries.unshift({
      ...delivery,
      deliveryId: replayDeliveryId,
      status: 'pending',
      attempts: 0,
      createdAt: now,
      deliveredAt: null,
      nextRetryAt: now,
      safeErrorSummary: null,
      replayOfDeliveryId: delivery.deliveryId
    });
    return { status: 'retry_queued', deliveryId: replayDeliveryId, replayOfDeliveryId: delivery.deliveryId };
  }

  public seedDelivery(merchantId: string, delivery: Partial<MerchantDeliveryMutable> & { deliveryId: string }): void {
    this.deliveries.unshift({
      merchantId,
      eventId: delivery.eventId ?? `evt_${randomToken(12)}`,
      eventType: delivery.eventType ?? 'payment.confirmed',
      status: delivery.status ?? 'failed',
      attempts: delivery.attempts ?? 1,
      lastHttpStatus: delivery.lastHttpStatus ?? 500,
      createdAt: delivery.createdAt ?? new Date().toISOString(),
      deliveredAt: delivery.deliveredAt ?? null,
      nextRetryAt: delivery.nextRetryAt ?? null,
      safeErrorSummary: sanitizeErrorSummary(delivery.safeErrorSummary ?? 'connection failed'),
      replayOfDeliveryId: delivery.replayOfDeliveryId ?? null,
      deliveryId: delivery.deliveryId
    });
  }

  private ensureIntegration(merchantId: string, now: string): MerchantIntegrationMutable {
    const existing = this.integrations.get(merchantId);
    if (existing) {
      return existing;
    }

    const integration: MerchantIntegrationMutable = {
      merchantId,
      publicKey: generatePublicKey(),
      secretKeyHash: null,
      secretKeyMasked: null,
      secretKeyCreatedAt: null,
      secretKeyLastRotatedAt: null,
      webhookSecretHash: null,
      webhookSecretMasked: null,
      webhookSecretCreatedAt: null,
      webhookSecretLastRotatedAt: null,
      webhookUrl: null,
      webhookStatus: 'not_configured',
      integrationType: 'both',
      createdAt: now,
      updatedAt: now
    };
    this.integrations.set(merchantId, integration);
    return integration;
  }
}

export class PgMerchantIntegrationRepository implements MerchantIntegrationRepository {
  private readonly pool: pg.Pool;
  private readonly secretEncryptionKey: string;

  public constructor(connectionString: string, secretEncryptionKey: string) {
    this.secretEncryptionKey = secretEncryptionKey;
    this.pool = new Pool({ connectionString, max: 4 });
  }

  public async getIntegration(merchantId: string, now: string): Promise<MerchantIntegrationState> {
    const integration = await this.ensureIntegration(merchantId, now);
    return this.hydrateIntegration(integration.merchant_id);
  }

  public async ensureApiKey(merchantId: string, now: string): Promise<SecretLifecycleResult> {
    await this.ensureIntegration(merchantId, now);
    const current = await this.pool.query(
      `SELECT secret_key_masked FROM merchant_integrations WHERE merchant_id = $1 AND secret_key_masked IS NOT NULL`,
      [merchantId]
    );
    if (current.rowCount && current.rowCount > 0) {
      return { integration: await this.hydrateIntegration(merchantId) };
    }
    return this.rotateApiKey(merchantId, now);
  }

  public async rotateApiKey(merchantId: string, now: string): Promise<SecretLifecycleResult> {
    const secretKeyOnce = generateSecretKey();
    const masked = maskSecret(secretKeyOnce);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await ensureMerchantRow(client, merchantId, now);
      await client.query(`UPDATE api_keys SET status = 'revoked', revoked_at = $2 WHERE merchant_id = $1 AND status = 'active'`, [
        merchantId,
        now
      ]);
      const apiKey = await client.query(
        `INSERT INTO api_keys (merchant_id, key_hash, scopes, status, created_at)
         VALUES ($1, $2, $3::jsonb, 'active', $4)
         RETURNING id`,
        [merchantId, hashApiKey(secretKeyOnce), JSON.stringify(['orders.write', 'orders.read', 'webhooks.read']), now]
      );
      await client.query(
        `INSERT INTO merchant_integrations (
          merchant_id, public_key, api_key_id, secret_key_masked, secret_key_created_at,
          secret_key_last_rotated_at, integration_type, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $5, 'both', $5, $5)
        ON CONFLICT (merchant_id) DO UPDATE SET
          api_key_id = EXCLUDED.api_key_id,
          secret_key_masked = EXCLUDED.secret_key_masked,
          secret_key_created_at = COALESCE(merchant_integrations.secret_key_created_at, EXCLUDED.secret_key_created_at),
          secret_key_last_rotated_at = EXCLUDED.secret_key_last_rotated_at,
          updated_at = EXCLUDED.updated_at`,
        [merchantId, generatePublicKey(), apiKey.rows[0]?.id, masked, now]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return { integration: await this.hydrateIntegration(merchantId), secretKeyOnce };
  }

  public async rotateWebhookSecret(merchantId: string, now: string): Promise<SecretLifecycleResult> {
    const webhookSecretOnce = generateWebhookSecret();
    await this.ensureIntegration(merchantId, now);
    await this.pool.query(
      `UPDATE merchant_integrations
       SET webhook_secret_hash = $2,
           webhook_secret_encrypted = $3,
           webhook_secret_masked = $4,
           webhook_secret_created_at = COALESCE(webhook_secret_created_at, $5::timestamptz),
           webhook_secret_last_rotated_at = $5::timestamptz,
           updated_at = $5::timestamptz
       WHERE merchant_id = $1`,
      [merchantId, hashWebhookSecret(webhookSecretOnce), encryptSecret(webhookSecretOnce, this.secretEncryptionKey), maskSecret(webhookSecretOnce), now]
    );
    await this.syncWebhookEndpoint(merchantId, now);

    return { integration: await this.hydrateIntegration(merchantId), webhookSecretOnce };
  }

  public async updateWebhookUrl(merchantId: string, webhookUrl: string, now: string): Promise<WebhookUrlUpdateResult> {
    await this.ensureIntegration(merchantId, now);
    let webhookSecretOnce: string | undefined;
    const existing = await this.pool.query(
      `SELECT webhook_secret_hash FROM merchant_integrations WHERE merchant_id = $1`,
      [merchantId]
    );
    if (!existing.rows[0]?.webhook_secret_hash) {
      webhookSecretOnce = generateWebhookSecret();
      await this.pool.query(
        `UPDATE merchant_integrations
         SET webhook_secret_hash = $2,
             webhook_secret_encrypted = $3,
             webhook_secret_masked = $4,
             webhook_secret_created_at = $5::timestamptz,
             webhook_secret_last_rotated_at = $5::timestamptz,
             updated_at = $5::timestamptz
         WHERE merchant_id = $1`,
        [
          merchantId,
          hashWebhookSecret(webhookSecretOnce),
          encryptSecret(webhookSecretOnce, this.secretEncryptionKey),
          maskSecret(webhookSecretOnce),
          now
        ]
      );
    }
    await this.pool.query(
      `UPDATE merchant_integrations
       SET webhook_url = $2,
           webhook_status = 'active',
           updated_at = $3::timestamptz
       WHERE merchant_id = $1`,
      [merchantId, webhookUrl, now]
    );
    await this.syncWebhookEndpoint(merchantId, now);

    return { integration: await this.hydrateIntegration(merchantId), webhookSecretOnce };
  }

  public async listDeliveries(merchantId: string, limit: number): Promise<MerchantDeliveryHistoryRow[]> {
    const result = await this.pool.query(
      `SELECT event_id, event_type, id AS delivery_id, status, attempt_count, last_http_status,
              created_at, delivered_at, next_retry_at, last_error
       FROM webhook_deliveries
       WHERE merchant_id = $1
         AND event_type = ANY($2::text[])
       ORDER BY created_at DESC
       LIMIT $3`,
      [merchantId, PUBLIC_V1_WEBHOOK_EVENTS, limit]
    );
    return result.rows.map((row) => ({
      eventId: row.event_id,
      eventType: row.event_type,
      deliveryId: row.delivery_id,
      status: row.status,
      attempts: Number(row.attempt_count ?? 0),
      lastHttpStatus: row.last_http_status ?? null,
      createdAt: toIso(row.created_at),
      deliveredAt: row.delivered_at ? toIso(row.delivered_at) : null,
      nextRetryAt: row.next_retry_at ? toIso(row.next_retry_at) : null,
      safeErrorSummary: sanitizeErrorSummary(row.last_error)
    }));
  }

  public async enqueueTestWebhook(merchantId: string, now: string): Promise<WebhookTestResult> {
    const integration = await this.hydrateIntegration((await this.ensureIntegration(merchantId, now)).merchant_id);
    if (!integration.webhookUrl || !integration.webhookSecretMasked) {
      return {
        status: 'action_required',
        safeStatus: 'Webhook URL or webhook secret is not configured.',
        testOnly: true,
        triggersFulfillment: false,
        officialBankConfirmation: false
      };
    }
    const endpoint = await this.getActiveEndpoint(merchantId);
    if (!endpoint) {
      return {
        status: 'action_required',
        safeStatus: 'Webhook endpoint is not ready.',
        testOnly: true,
        triggersFulfillment: false,
        officialBankConfirmation: false
      };
    }

    const eventId = `evt_test_${randomToken(16)}`;
    const deliveryId = randomUUID();
    const payload = {
      id: eventId,
      type: 'payment.confirmed',
      created_at: now,
      merchant_id: merchantId,
      test_only: true,
      triggers_fulfillment: false,
      data: {
        order_id: 'test_order',
        payment_session_id: 'test_session',
        amount_minor: 100,
        currency: 'RUB',
        decision: 'manual_confirmed',
        ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
      }
    };
    await this.pool.query(
      `INSERT INTO webhook_deliveries (
        id, merchant_id, endpoint_id, event_id, event_type, payload_hash, payload_json,
        status, attempt_count, max_attempts, next_retry_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 'payment.confirmed', $5, $6::jsonb, 'pending', 0, 3, $7, $7, $7)`,
      [deliveryId, merchantId, endpoint.id, eventId, payloadHash(payload), JSON.stringify(payload), now]
    );

    return {
      status: 'test_queued',
      deliveryId,
      eventId,
      safeStatus: 'Safe test webhook queued.',
      testOnly: true,
      triggersFulfillment: false,
      officialBankConfirmation: false
    };
  }

  public async retryDelivery(merchantId: string, deliveryId: string, now: string): Promise<WebhookRetryResult> {
    const original = await this.pool.query(
      `SELECT * FROM webhook_deliveries
       WHERE merchant_id = $1
         AND id = $2
         AND event_type = ANY($3::text[])`,
      [merchantId, deliveryId, PUBLIC_V1_WEBHOOK_EVENTS]
    );
    const row = original.rows[0];
    if (!row) {
      return { status: 'not_found' };
    }
    if (!['pending', 'failed', 'dead'].includes(row.status)) {
      return { status: 'not_retryable', deliveryId };
    }

    const replayDeliveryId = randomUUID();
    await this.pool.query(
      `INSERT INTO webhook_deliveries (
        id, merchant_id, endpoint_id, event_id, event_type, payload_hash, payload_json,
        status, attempt_count, max_attempts, next_retry_at, created_at, updated_at, replay_of_delivery_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'pending', 0, $8, $9, $9, $9, $10)`,
      [
        replayDeliveryId,
        row.merchant_id,
        row.endpoint_id,
        `${row.event_id}.retry.${randomToken(8)}`,
        row.event_type,
        row.payload_hash,
        JSON.stringify(row.payload_json ?? {}),
        row.max_attempts,
        now,
        row.id
      ]
    );
    return { status: 'retry_queued', deliveryId: replayDeliveryId, replayOfDeliveryId: row.id };
  }

  private async ensureIntegration(merchantId: string, now: string): Promise<MerchantIntegrationRow> {
    await this.pool.query(
      `INSERT INTO merchants (id, name, status, created_at, updated_at)
       VALUES ($1, $2, 'active', $3, $3)
       ON CONFLICT (id) DO NOTHING`,
      [merchantId, 'SwimPay merchant', now]
    );
    await this.pool.query(
      `INSERT INTO merchant_integrations (merchant_id, public_key, integration_type, created_at, updated_at)
       VALUES ($1, $2, 'both', $3, $3)
       ON CONFLICT (merchant_id) DO NOTHING`,
      [merchantId, generatePublicKey(), now]
    );
    const row = await this.pool.query(`SELECT * FROM merchant_integrations WHERE merchant_id = $1`, [merchantId]);
    return row.rows[0] as MerchantIntegrationRow;
  }

  private async hydrateIntegration(merchantId: string): Promise<MerchantIntegrationState> {
    const row = await this.pool.query(`SELECT * FROM merchant_integrations WHERE merchant_id = $1`, [merchantId]);
    return toIntegrationState(fromIntegrationRow(row.rows[0] as MerchantIntegrationRow));
  }

  private async syncWebhookEndpoint(merchantId: string, now: string): Promise<void> {
    const integration = await this.pool.query(
      `SELECT webhook_url, webhook_secret_hash, webhook_secret_encrypted, webhook_endpoint_id FROM merchant_integrations WHERE merchant_id = $1`,
      [merchantId]
    );
    const row = integration.rows[0];
    if (!row?.webhook_url || !row.webhook_secret_hash) {
      return;
    }
    const endpointId = row.webhook_endpoint_id ?? randomUUID();
    await this.pool.query(
      `INSERT INTO webhook_endpoints (
        id, merchant_id, url, secret_hash, secret_encrypted, enabled_events, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'active', $7, $7)
      ON CONFLICT (id) DO UPDATE SET
        url = EXCLUDED.url,
        secret_hash = EXCLUDED.secret_hash,
        secret_encrypted = EXCLUDED.secret_encrypted,
        enabled_events = EXCLUDED.enabled_events,
        status = 'active',
        updated_at = EXCLUDED.updated_at`,
      [
        endpointId,
        merchantId,
        row.webhook_url,
        row.webhook_secret_hash,
        row.webhook_secret_encrypted,
        JSON.stringify(PUBLIC_V1_WEBHOOK_EVENTS),
        now
      ]
    );
    await this.pool.query(
      `UPDATE merchant_integrations SET webhook_endpoint_id = $2, updated_at = $3 WHERE merchant_id = $1`,
      [merchantId, endpointId, now]
    );
  }

  private async getActiveEndpoint(merchantId: string): Promise<{ id: string } | null> {
    const result = await this.pool.query(
      `SELECT id FROM webhook_endpoints WHERE merchant_id = $1 AND status = 'active' ORDER BY updated_at DESC LIMIT 1`,
      [merchantId]
    );
    return result.rows[0] ? { id: result.rows[0].id } : null;
  }
}

export function toMerchantIntegrationResponse(input: SecretLifecycleResult | WebhookUrlUpdateResult | MerchantIntegrationState) {
  const integration = 'integration' in input ? input.integration : input;
  const response: Record<string, unknown> = {
    merchant_id: integration.merchantId,
    public_key: integration.publicKey,
    secret_key_masked: integration.secretKeyMasked,
    secret_key_created_at: integration.secretKeyCreatedAt,
    secret_key_last_rotated_at: integration.secretKeyLastRotatedAt,
    webhook_secret_masked: integration.webhookSecretMasked,
    webhook_secret_created_at: integration.webhookSecretCreatedAt,
    webhook_secret_last_rotated_at: integration.webhookSecretLastRotatedAt,
    webhook_url: integration.webhookUrl,
    webhook_status: integration.webhookStatus,
    integration_type: integration.integrationType,
    created_at: integration.createdAt,
    updated_at: integration.updatedAt,
    public_webhook_events: PUBLIC_V1_WEBHOOK_EVENTS,
    payment_confirmed_after_manual_confirmation: true,
    official_bank_confirmation: false
  };
  if ('secretKeyOnce' in input && input.secretKeyOnce) {
    response.secret_key_once = input.secretKeyOnce;
    response.secret_key_show_once = true;
  }
  if ('webhookSecretOnce' in input && input.webhookSecretOnce) {
    response.webhook_secret_once = input.webhookSecretOnce;
    response.webhook_secret_show_once = true;
  }
  return response;
}

export function validateWebhookUrl(input: unknown): { valid: true; value: string } | { valid: false; message: string } {
  return validatePublicWebhookUrlSyntax(input);
}

export function isPublicV1WebhookEvent(value: string): value is PublicV1WebhookEventType {
  return (PUBLIC_V1_WEBHOOK_EVENTS as readonly string[]).includes(value);
}

export function parseDeliveryLimit(value: unknown): number {
  if (typeof value !== 'string') {
    return 10;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 10;
  }
  return Math.min(parsed, 50);
}

export function createDefaultMerchantIntegrationRepository(
  env: NodeJS.ProcessEnv,
  environment = 'development'
): MerchantIntegrationRepository | null {
  if (!env.DATABASE_URL) {
    return null;
  }
  return new PgMerchantIntegrationRepository(env.DATABASE_URL, resolveWebhookSecretEncryptionKey(env, environment));
}

function resolveWebhookSecretEncryptionKey(env: NodeJS.ProcessEnv, environment: string): string {
  const key = env.WEBHOOK_SECRET_ENCRYPTION_KEY?.trim();
  if (key) {
    return key;
  }
  if (environment === 'production') {
    throw new Error('WEBHOOK_SECRET_ENCRYPTION_KEY is required in production.');
  }
  return 'local_dev_webhook_secret_encryption_key';
}

interface MerchantIntegrationMutable {
  merchantId: string;
  publicKey: string;
  secretKeyHash: string | null;
  secretKeyMasked: string | null;
  secretKeyCreatedAt: string | null;
  secretKeyLastRotatedAt: string | null;
  webhookSecretHash: string | null;
  webhookSecretMasked: string | null;
  webhookSecretCreatedAt: string | null;
  webhookSecretLastRotatedAt: string | null;
  webhookUrl: string | null;
  webhookStatus: WebhookStatus;
  integrationType: IntegrationType;
  createdAt: string;
  updatedAt: string;
}

interface MerchantDeliveryMutable {
  merchantId: string;
  eventId: string;
  eventType: PublicV1WebhookEventType;
  deliveryId: string;
  status: string;
  attempts: number;
  lastHttpStatus: number | null;
  createdAt: string;
  deliveredAt: string | null;
  nextRetryAt: string | null;
  safeErrorSummary: string | null;
  replayOfDeliveryId: string | null;
}

interface MerchantIntegrationRow {
  merchant_id: string;
  public_key: string;
  secret_key_masked: string | null;
  secret_key_created_at: string | Date | null;
  secret_key_last_rotated_at: string | Date | null;
  webhook_secret_hash: string | null;
  webhook_secret_encrypted?: string | null;
  webhook_secret_masked: string | null;
  webhook_secret_created_at: string | Date | null;
  webhook_secret_last_rotated_at: string | Date | null;
  webhook_url: string | null;
  webhook_status: WebhookStatus;
  integration_type: IntegrationType;
  created_at: string | Date;
  updated_at: string | Date;
}

function fromIntegrationRow(row: MerchantIntegrationRow): MerchantIntegrationMutable {
  return {
    merchantId: row.merchant_id,
    publicKey: row.public_key,
    secretKeyHash: null,
    secretKeyMasked: row.secret_key_masked,
    secretKeyCreatedAt: row.secret_key_created_at ? toIso(row.secret_key_created_at) : null,
    secretKeyLastRotatedAt: row.secret_key_last_rotated_at ? toIso(row.secret_key_last_rotated_at) : null,
    webhookSecretHash: row.webhook_secret_hash,
    webhookSecretMasked: row.webhook_secret_masked,
    webhookSecretCreatedAt: row.webhook_secret_created_at ? toIso(row.webhook_secret_created_at) : null,
    webhookSecretLastRotatedAt: row.webhook_secret_last_rotated_at ? toIso(row.webhook_secret_last_rotated_at) : null,
    webhookUrl: row.webhook_url,
    webhookStatus: row.webhook_status,
    integrationType: row.integration_type,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function toIntegrationState(input: MerchantIntegrationMutable): MerchantIntegrationState {
  return {
    merchantId: input.merchantId,
    publicKey: input.publicKey,
    secretKeyMasked: input.secretKeyMasked,
    secretKeyCreatedAt: input.secretKeyCreatedAt,
    secretKeyLastRotatedAt: input.secretKeyLastRotatedAt,
    webhookSecretMasked: input.webhookSecretMasked,
    webhookSecretCreatedAt: input.webhookSecretCreatedAt,
    webhookSecretLastRotatedAt: input.webhookSecretLastRotatedAt,
    webhookUrl: input.webhookUrl,
    webhookStatus: input.webhookStatus,
    integrationType: input.integrationType,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt
  };
}

function toDeliveryHistoryRow(delivery: MerchantDeliveryMutable): MerchantDeliveryHistoryRow {
  return {
    eventId: delivery.eventId,
    eventType: delivery.eventType,
    deliveryId: delivery.deliveryId,
    status: delivery.status,
    attempts: delivery.attempts,
    lastHttpStatus: delivery.lastHttpStatus,
    createdAt: delivery.createdAt,
    deliveredAt: delivery.deliveredAt,
    nextRetryAt: delivery.nextRetryAt,
    safeErrorSummary: sanitizeErrorSummary(delivery.safeErrorSummary)
  };
}

async function ensureMerchantRow(client: pg.PoolClient, merchantId: string, now: string): Promise<void> {
  await client.query(
    `INSERT INTO merchants (id, name, status, created_at, updated_at)
     VALUES ($1, $2, 'active', $3, $3)
     ON CONFLICT (id) DO NOTHING`,
    [merchantId, 'SwimPay merchant', now]
  );
}

function generatePublicKey(): string {
  return `pk_test_${randomToken(24)}`;
}

function generateSecretKey(): string {
  return `sk_test_${randomToken(32)}`;
}

function generateWebhookSecret(): string {
  return `whsec_${randomToken(32)}`;
}

function randomToken(bytes: number): string {
  return randomBytes(bytes).toString('base64url');
}

function maskSecret(secret: string): string {
  const parts = secret.split('_');
  const prefix = parts[0] === 'whsec' ? 'whsec' : parts.slice(0, 2).join('_');
  return `${prefix}_••••${secret.slice(-4)}`;
}

function payloadHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function sanitizeErrorSummary(input: unknown): string | null {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return null;
  }
  return input
    .replace(/whsec_[A-Za-z0-9_-]+/gu, '[secret]')
    .replace(/sk_(live|test)_[A-Za-z0-9_-]+/gu, '[secret]')
    .replace(/\+7\d{10}/gu, '[phone]')
    .replace(/\b\d{12,19}\b/gu, '[card]')
    .slice(0, 180);
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
