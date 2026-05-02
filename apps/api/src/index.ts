import { buildApiServer } from './server.js';

const host = process.env.API_HOST ?? '0.0.0.0';
const port = Number.parseInt(process.env.API_PORT ?? '3000', 10);

const server = buildApiServer({
  environment: process.env.NODE_ENV ?? 'development'
});

await server.listen({ host, port });
