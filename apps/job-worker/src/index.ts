import Fastify from 'fastify';
import {
  EventTypes,
  NatsJetStreamRuntime,
  parseNatsRuntimeConfig,
  type DurableConsumerDefinition,
  type InternalEventEnvelope,
  type NatsRuntimeConfig,
  type SafeEventLogger
} from '@swimpay/events';
import {
  RuntimeStatusTracker,
  createWorkerStatus,
  defaultMetricsRegistry,
  type MetricsRegistry
} from '@swimpay/observability';
import { createJobWorkerConsumers } from './consumers.js';
import { PgWorkerIdempotencyLedger } from './idempotency-ledger.js';
import { FetchWebhookHttpClient, PgWebhookRepository, WebhookDeliveryWorker } from './webhooks.js';
import {
  createWebhookDeliveryRequestedHandler,
  parseWebhookWorkerConfig,
  WebhookPollingLoop,
  type WebhookDeliveryProcessor,
  type WebhookWorkerConfig
} from './webhook-runtime.js';
import {
  NoNotificationFallbackPollingLoop,
  PgNoNotificationFallbackRepository,
  parseNoNotificationFallbackConfig,
  type NoNotificationFallbackConfig,
  type NoNotificationFallbackProcessor
} from './no-notification-fallback.js';

export interface JobWorkerRuntime {
  nats: NatsJetStreamRuntime;
  consumers: DurableConsumerDefinition[];
  natsReady: boolean;
  webhookWorkerReady: boolean;
  webhookPollingEnabled: boolean;
  webhookPollingLoop: WebhookPollingLoop | null;
  noNotificationFallbackReady: boolean;
  noNotificationFallbackEnabled: boolean;
  noNotificationFallbackLoop: NoNotificationFallbackPollingLoop | null;
  statusTracker: RuntimeStatusTracker;
}

export async function createJobWorkerRuntime(
  env: NodeJS.ProcessEnv,
  logger: SafeEventLogger,
  metrics: MetricsRegistry = defaultMetricsRegistry
): Promise<JobWorkerRuntime> {
  const natsConfig = parseNatsRuntimeConfig(env);
  const webhookConfig = parseWebhookWorkerConfig(env);
  const noNotificationFallbackConfig = parseNoNotificationFallbackConfig(env);
  const nats = new NatsJetStreamRuntime(natsConfig, logger, metrics);
  const consumers = createJobWorkerConsumers(natsConfig.durablePrefix);
  const statusTracker = new RuntimeStatusTracker();
  const webhookProcessor = createDefaultWebhookProcessor(env, webhookConfig, metrics);
  const noNotificationFallbackProcessor = createDefaultNoNotificationFallbackProcessor(env, noNotificationFallbackConfig);
  const webhookPollingLoop = webhookProcessor
    ? new WebhookPollingLoop({
        processor: webhookProcessor,
        config: webhookConfig,
        now: () => new Date().toISOString(),
        logger
      })
    : null;
  const noNotificationFallbackLoop = noNotificationFallbackProcessor
    ? new NoNotificationFallbackPollingLoop({
        processor: noNotificationFallbackProcessor,
        config: noNotificationFallbackConfig,
        now: () => new Date().toISOString(),
        logger
      })
    : null;

  webhookPollingLoop?.start();
  noNotificationFallbackLoop?.start();

  try {
    await nats.connect();
    await nats.ensureStream();
    for (const consumer of consumers) {
      const handler = createJobWorkerHandler(consumer, webhookProcessor);
      await nats.subscribe(consumer, async (event) => {
        try {
          const result = await handler(event);
          statusTracker.recordProcessed(event.id, new Date().toISOString());
          return result;
        } catch (error) {
          statusTracker.recordError(error, new Date().toISOString());
          throw error;
        }
      });
    }

    return {
      nats,
      consumers,
      natsReady: true,
      webhookWorkerReady: Boolean(webhookProcessor),
      webhookPollingEnabled: webhookConfig.enabled && Boolean(webhookProcessor),
      webhookPollingLoop,
      noNotificationFallbackReady: Boolean(noNotificationFallbackProcessor),
      noNotificationFallbackEnabled: noNotificationFallbackConfig.enabled && Boolean(noNotificationFallbackProcessor),
      noNotificationFallbackLoop,
      statusTracker
    };
  } catch (error) {
    logger.error('job_worker_nats_setup_failed', {
      error_name: error instanceof Error ? error.name : 'UnknownError'
    });
    statusTracker.recordError(error, new Date().toISOString());
    return {
      nats,
      consumers,
      natsReady: false,
      webhookWorkerReady: Boolean(webhookProcessor),
      webhookPollingEnabled: webhookConfig.enabled && Boolean(webhookProcessor),
      webhookPollingLoop,
      noNotificationFallbackReady: Boolean(noNotificationFallbackProcessor),
      noNotificationFallbackEnabled: noNotificationFallbackConfig.enabled && Boolean(noNotificationFallbackProcessor),
      noNotificationFallbackLoop,
      statusTracker
    };
  }
}

export function buildJobWorkerHealthResponse(params: {
  environment: string;
  runtime: JobWorkerRuntime | null;
  natsConfig: NatsRuntimeConfig;
}) {
  return {
    version: '0.1.0',
    environment: params.environment,
    ...createWorkerStatus({
      service: 'swimpay-job-worker',
      workerState: params.runtime?.natsReady ? 'nats_consumers_registered' : 'idle',
      configuredConsumers: params.runtime?.consumers.map((consumer) => consumer.durableName) ?? [],
      tracker: params.runtime?.statusTracker
    }),
    nats: params.runtime?.nats.health() ?? {
      status: 'disconnected',
      stream: params.natsConfig.streamName,
      consumer_count: 0
    },
    webhook_delivery: {
      status: params.runtime?.webhookWorkerReady ? 'configured' : 'unconfigured',
      polling_enabled: params.runtime?.webhookPollingEnabled ?? false
    },
    no_notification_fallback: {
      status: params.runtime?.noNotificationFallbackReady ? 'configured' : 'unconfigured',
      polling_enabled: params.runtime?.noNotificationFallbackEnabled ?? false
    },
    consumers: params.runtime?.consumers.map((consumer) => ({
      durable_name: consumer.durableName,
      subject: consumer.subject,
      event_type: consumer.eventType
    })) ?? []
  };
}

function createJobWorkerHandler(consumer: DurableConsumerDefinition, webhookProcessor: WebhookDeliveryProcessor | null) {
  if (consumer.eventType === EventTypes.WEBHOOK_DELIVERY_REQUESTED && webhookProcessor) {
    return createWebhookDeliveryRequestedHandler(webhookProcessor, () => new Date().toISOString());
  }

  return createSafeStubHandler('swimpay-job-worker');
}

function createSafeStubHandler(workerName: string) {
  return async (event: InternalEventEnvelope): Promise<{ kind: 'ok' }> => {
    // Task 025 intentionally acknowledges known events only. Business work starts in tasks 026 and 027.
    void workerName;
    void event;
    return { kind: 'ok' };
  };
}

function createDefaultWebhookProcessor(
  env: NodeJS.ProcessEnv,
  config: WebhookWorkerConfig,
  metrics: MetricsRegistry
): WebhookDeliveryProcessor | null {
  if (!env.DATABASE_URL) {
    return null;
  }

  return new WebhookDeliveryWorker({
    repository: new PgWebhookRepository(env.DATABASE_URL),
    httpClient: new FetchWebhookHttpClient(),
    idempotencyLedger: new PgWorkerIdempotencyLedger(env.DATABASE_URL),
    maxAttempts: config.maxAttempts,
    requestTimeoutMs: config.requestTimeoutMs,
    metrics
  });
}

function createDefaultNoNotificationFallbackProcessor(
  env: NodeJS.ProcessEnv,
  config: NoNotificationFallbackConfig
): NoNotificationFallbackProcessor | null {
  if (!config.enabled || !env.DATABASE_URL) {
    return null;
  }

  return new PgNoNotificationFallbackRepository(env.DATABASE_URL);
}

function fastifyLoggerAdapter(server: ReturnType<typeof Fastify>): SafeEventLogger {
  return {
    info: (message, fields) => server.log.info(fields ?? {}, message),
    warn: (message, fields) => server.log.warn(fields ?? {}, message),
    error: (message, fields) => server.log.error(fields ?? {}, message)
  };
}

async function main(): Promise<void> {
  const server = Fastify({ logger: true });
  const logger = fastifyLoggerAdapter(server);
  const natsConfig = parseNatsRuntimeConfig(process.env);
  const runtime = await createJobWorkerRuntime(process.env, logger);

  server.get('/health', async () =>
    buildJobWorkerHealthResponse({
      environment: process.env.NODE_ENV ?? 'development',
      runtime,
      natsConfig
    })
  );

  const shutdown = async () => {
    runtime.webhookPollingLoop?.stop();
    runtime.noNotificationFallbackLoop?.stop();
    await runtime.nats.close();
    await server.close();
  };

  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });

  await server.listen({
    host: '0.0.0.0',
    port: Number.parseInt(process.env.JOB_WORKER_HEALTH_PORT ?? '3011', 10)
  });
}

if (process.env.NODE_ENV !== 'test') {
  await main();
}
