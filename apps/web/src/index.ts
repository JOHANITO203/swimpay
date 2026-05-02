import Fastify from 'fastify';

const server = Fastify({ logger: true });

server.get('/health', async () => ({
  service: 'swimpay-web',
  version: '0.1.0',
  environment: process.env.NODE_ENV ?? 'development'
}));

server.get('/', async (_request, reply) => {
  reply.type('text/html');
  return '<!doctype html><html lang="en"><head><title>SwimPay</title></head><body><main><h1>SwimPay</h1><p>Payment signal engine foundation.</p></main></body></html>';
});

await server.listen({
  host: process.env.WEB_HOST ?? '0.0.0.0',
  port: Number.parseInt(process.env.WEB_PORT ?? '3001', 10)
});
