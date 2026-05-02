import Fastify from 'fastify';
import {
  NatsJetStreamRuntime,
  parseNatsRuntimeConfig,
  type DurableConsumerDefinition,
  type InternalEventEnvelope,
  type NatsRuntimeConfig,
  type SafeEventLogger
} from '@swimpay/events';
import { createSignalWorkerConsumers } from './consumers.js';

export interface SignalWorkerRuntime {
  nats: NatsJetStreamRuntime;
  consumers: DurableConsumerDefinition[];
  natsReady: boolean;
}

export async function createSignalWorkerRuntime(env: NodeJS.ProcessEnv, logger: SafeEventLogger): Promise<SignalWorkerRuntime> {
  const natsConfig = parseNatsRuntimeConfig(env);
  const nats = new NatsJetStreamRuntime(natsConfig, logger);
  const consumers = createSignalWorkerConsumers(natsConfig.durablePrefix);

  try {
    await nats.connect();
    await nats.ensureStream();
    for (const consumer of consumers) {
      await nats.subscribe(consumer, createSafeStubHandler('swimpay-signal-worker'));
    }

    return { nats, consumers, natsReady: true };
  } catch (error) {
    logger.error('signal_worker_nats_setup_failed', {
      error_name: error instanceof Error ? error.name : 'UnknownError'
    });
    return { nats, consumers, natsReady: false };
  }
}

export function buildSignalWorkerHealthResponse(params: {
  environment: string;
  runtime: SignalWorkerRuntime | null;
  natsConfig: NatsRuntimeConfig;
}) {
  return {
    service: 'swimpay-signal-worker',
    version: '0.1.0',
    environment: params.environment,
    worker: params.runtime?.natsReady ? 'nats_consumers_registered' : 'idle',
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
