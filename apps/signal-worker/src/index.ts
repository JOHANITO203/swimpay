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
import { createSignalWorkerConsumers } from './consumers.js';
import { PgSignalRuntimeRepository, SignalRuntimeProcessor, createSignalReceivedHandler } from './runtime.js';

export interface SignalWorkerRuntime {
  nats: NatsJetStreamRuntime;
  consumers: DurableConsumerDefinition[];
  natsReady: boolean;
  closeSignalRepository?: (() => Promise<void>) | undefined;
  statusTracker: RuntimeStatusTracker;
}

export async function createSignalWorkerRuntime(
  env: NodeJS.ProcessEnv,
  logger: SafeEventLogger,
  metrics: MetricsRegistry = defaultMetricsRegistry
): Promise<SignalWorkerRuntime> {
  const natsConfig = parseNatsRuntimeConfig(env);
  const nats = new NatsJetStreamRuntime(natsConfig, logger, metrics);
  const consumers = createSignalWorkerConsumers(natsConfig.durablePrefix);
  const statusTracker = new RuntimeStatusTracker();
  const signalRepository = env.DATABASE_URL
    ? new PgSignalRuntimeRepository({
        connectionString: env.DATABASE_URL,
        publishInternalEvent: (event) => nats.publish(event)
      })
    : null;
  const processor = signalRepository
    ? new SignalRuntimeProcessor({
        repository: signalRepository,
        metrics
      })
    : null;
  const closeSignalRepository =
    signalRepository
      ? async () => {
          await signalRepository.close();
        }
      : undefined;

  try {
    await nats.connect();
    await nats.ensureStream();
    for (const consumer of consumers) {
      const handler =
        consumer.eventType === EventTypes.SIGNAL_RECEIVED && processor
          ? createSignalReceivedHandler(processor)
          : createSafeStubHandler('swimpay-signal-worker');
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

    return { nats, consumers, natsReady: true, closeSignalRepository, statusTracker };
  } catch (error) {
    logger.error('signal_worker_nats_setup_failed', {
      error_name: error instanceof Error ? error.name : 'UnknownError'
    });
    statusTracker.recordError(error, new Date().toISOString());
    return { nats, consumers, natsReady: false, closeSignalRepository, statusTracker };
  }
}

export function buildSignalWorkerHealthResponse(params: {
  environment: string;
  runtime: SignalWorkerRuntime | null;
  natsConfig: NatsRuntimeConfig;
}) {
  return {
    version: '0.1.0',
    environment: params.environment,
    ...createWorkerStatus({
      service: 'swimpay-signal-worker',
      workerState: params.runtime?.natsReady ? 'nats_consumers_registered' : 'idle',
      configuredConsumers: params.runtime?.consumers.map((consumer) => consumer.durableName) ?? [],
      tracker: params.runtime?.statusTracker
    }),
    nats: params.runtime?.nats.health() ?? {
      status: 'disconnected',
      stream: params.natsConfig.streamName,
      consumer_count: 0
    },
    consumers: params.runtime?.consumers.map((consumer) => ({
      durable_name: consumer.durableName,
      subject: consumer.subject,
      event_type: consumer.eventType
    })) ?? []
  };
}

function createSafeStubHandler(workerName: string) {
  return async (event: InternalEventEnvelope): Promise<{ kind: 'ok' }> => {
    // Task 025 intentionally acknowledges known events only. Business work starts in task 027.
    void workerName;
    void event;
    return { kind: 'ok' };
  };
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
  const runtime = await createSignalWorkerRuntime(process.env, logger);

  server.get('/health', async () =>
    buildSignalWorkerHealthResponse({
      environment: process.env.NODE_ENV ?? 'development',
      runtime,
      natsConfig
    })
  );

  const shutdown = async () => {
    await runtime.nats.close();
    await runtime.closeSignalRepository?.();
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
    port: Number.parseInt(process.env.SIGNAL_WORKER_HEALTH_PORT ?? '3010', 10)
  });
}

if (process.env.NODE_ENV !== 'test') {
  await main();
}
