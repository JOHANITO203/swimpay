import Fastify from 'fastify';

const server = Fastify({ logger: true });

server.get('/health', async () => ({
  service: 'swimpay-signal-worker',
  version: '0.1.0',
  environment: process.env.NODE_ENV ?? 'development',
  worker: 'idle'
}));

await server.listen({
  host: '0.0.0.0',
  port: Number.parseInt(process.env.SIGNAL_WORKER_HEALTH_PORT ?? '3010', 10)
});
