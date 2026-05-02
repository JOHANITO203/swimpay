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
import { createJobWorkerConsumers } from './consumers.js';
import { FetchWebhookHttpClient, PgWebhookRepository, WebhookDeliveryWorker } from './webhooks.js';
import {
  createWebhookDeliveryRequestedHandler,
  parseWebhookWorkerConfig,
  WebhookPollingLoop,
  type WebhookDeliveryProcessor,
  type WebhookWorkerConfig
} from './webhook-runtime.js';

export interface JobWorkerRuntime {
  nats: NatsJetStreamRuntime;
  consumers: DurableConsumerDefinition[];
  natsReady: boolean;
  webhookWorkerReady: boolean;
  webhookPollingEnabled: boolean;
  webhookPollingLoop: WebhookPollingLoop | null;
}

export async function createJobWorkerRuntime(env: NodeJS.ProcessEnv, logger: SafeEventLogger): Promise<JobWorkerRuntime> {
  const natsConfig = parseNatsRuntimeConfig(env);
  const webhookConfig = parseWebhookWorkerConfig(env);
  const nats = new NatsJetStreamRuntime(natsConfig, logger);
  const consumers = createJobWorkerConsumers(natsConfig.durablePrefix);
  const webhookProcessor = createDefaultWebhookProcessor(env, webhookConfig);
  const webhookPollingLoop = webhookProcessor
    ? new WebhookPollingLoop({
        processor: webhookProcessor,
        config: webhookConfig,
        now: () => new Date().toISOString(),
        logger
      })
    : null;

  webhookPollingLoop?.start();

  try {
    await nats.connect();
    await nats.ensureStream();
    for (const consumer of consumers) {
      await nats.subscribe(consumer, createJobWorkerHandler(consumer, webhookProcessor));
    }

    return {
      nats,
      consumers,
      natsReady: true,
      webhookWorkerReady: Boolean(webhookProcessor),
      webhookPollingEnabled: webhookConfig.enabled && Boolean(webhookProcessor),
      webhookPollingLoop
    };
  } catch (error) {
    logger.error('job_worker_nats_setup_failed', {
      error_name: error instanceof Error ? error.name : 'UnknownError'
    });
    return {
      nats,
      consumers,
      natsReady: false,
      webhookWorkerReady: Boolean(webhookProcessor),
      webhookPollingEnabled: webhookConfig.enabled && Boolean(webhookProcessor),
      webhookPollingLoop
    };
  }
}

export function buildJobWorkerHealthResponse(params: {
  environment: string;
  runtime: JobWorkerRuntime | null;
  natsConfig: NatsRuntimeConfig;
}) {
  return {
    service: 'swimpay-job-worker',
    version: '0.1.0',
    environment: params.environment,
    worker: params.runtime?.natsReady ? 'nats_consumers_registered' : 'idle',
    nats: params.runtime?.nats.health() ?? {
      status: 'disconnected',
      stream: params.natsConfig.streamName,
      consumer_count: 0
    },
    webhook_delivery: {
      status: params.runtime?.webhookWorkerReady ? 'configured' : 'unconfigured',
      polling_enabled: params.runtime?.webhookPollingEnabled ?? false
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

function createDefaultWebhookProcessor(env: NodeJS.ProcessEnv, config: WebhookWorkerConfig): WebhookDeliveryProcessor | null {
  if (!env.DATABASE_URL) {
    return null;
  }

  return new WebhookDeliveryWorker({
    repository: new PgWebhookRepository(env.DATABASE_URL),
    httpClient: new FetchWebhookHttpClient(),
    maxAttempts: config.maxAttempts,
    requestTimeoutMs: config.requestTimeoutMs
  });
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
