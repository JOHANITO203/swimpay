import Fastify, { type FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';
import { connect } from 'nats';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import {
  buildOrderCreateInput,
  formatAmountMinor,
  invalidRequest,
  parseMerchantId,
  PgOrderRepository,
  validateCreateOrderBody,
  type IdGenerator,
  type OrderCreateResponse,
  type OrderReadResponse,
  type OrderRepository,
  type StoredOrderRecord
} from './orders.js';
import { toPaymentSessionReadResponse } from './payment-sessions.js';
import {
  buildReceiverDeviceCreateInput,
  PgReceiverDeviceRepository,
  validateReceiverDeviceRegisterBody,
  validateReceiverHeartbeatBody,
  type ReceiverDeviceRepository
} from './receiver-devices.js';
import {
  buildSignalIngestionInput,
  buildSignalReceivedEvent,
  createDefaultSignalIdGenerator,
  NatsEventPublisher,
  NoopEventPublisher,
  PgSignalRepository,
  validateReceiverSignalBody,
  verifyReceiverSignalSignature,
  type InternalEventPublisher,
  type ReceiverSignalRepository
} from './signals.js';

const { Pool } = pg;

export type {
  CreateOrderWithSessionInput,
  CreateOrderWithSessionResult,
  OrderRepository,
  StoredAuditEventRecord,
  StoredOrderRecord,
  StoredPaymentSessionRecord
} from './orders.js';

export type DependencyStatus = 'ok' | 'error' | 'skipped';

export interface HealthChecks {
  database: () => Promise<DependencyStatus>;
  nats: () => Promise<DependencyStatus>;
  valkey: () => Promise<DependencyStatus>;
}

export interface ApiServerOptions {
  environment: string;
  healthChecks?: HealthChecks;
  orderRepository?: OrderRepository;
  receiverDeviceRepository?: ReceiverDeviceRepository;
  signalRepository?: ReceiverSignalRepository;
  eventPublisher?: InternalEventPublisher;
  phoneHmacSecret?: string;
  checkoutBaseUrl?: string;
  idGenerator?: IdGenerator;
  receiverDeviceIdGenerator?: () => string;
  signalIdGenerator?: () => string;
  clock?: () => Date;
}

export interface HealthResponse {
  service: 'swimpay-api';
  version: '0.1.0';
  environment: string;
  dependencies: {
    database: DependencyStatus;
    nats: DependencyStatus;
    valkey: DependencyStatus;
  };
}

async function checkDatabase(url: string | undefined): Promise<DependencyStatus> {
  if (!url) {
    return 'skipped';
  }

  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await pool.query('SELECT 1');
    return 'ok';
  } catch {
    return 'error';
  } finally {
    await pool.end();
  }
}

async function checkNats(url: string | undefined): Promise<DependencyStatus> {
  if (!url) {
    return 'skipped';
  }

  try {
    const connection = await connect({ servers: url, timeout: 750 });
    await connection.close();
    return 'ok';
  } catch {
    return 'error';
  }
}

async function checkValkey(url: string | undefined): Promise<DependencyStatus> {
  if (!url) {
    return 'skipped';
  }

  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false
  });
  try {
    await client.connect();
    await client.ping();
    return 'ok';
  } catch {
    return 'error';
  } finally {
    client.disconnect();
  }
}

export function createDefaultHealthChecks(env: NodeJS.ProcessEnv): HealthChecks {
  return {
    database: () => checkDatabase(env.DATABASE_URL),
    nats: () => checkNats(env.NATS_URL),
    valkey: () => checkValkey(env.VALKEY_URL)
  };
}

export function buildApiServer(options: ApiServerOptions): FastifyInstance {
  const server = Fastify({ logger: true });
  const checks = options.healthChecks ?? createDefaultHealthChecks(process.env);
  const repository = options.orderRepository ?? createDefaultOrderRepository(process.env);
  const receiverDeviceRepository = options.receiverDeviceRepository ?? createDefaultReceiverDeviceRepository(process.env);
  const signalRepository = options.signalRepository ?? createDefaultSignalRepository(process.env);
  const eventPublisher = options.eventPublisher ?? createDefaultEventPublisher(process.env);
  const phoneHmacSecret = options.phoneHmacSecret ?? process.env.PHONE_HMAC_SECRET ?? 'local_dev_phone_hmac_secret';
  const checkoutBaseUrl = options.checkoutBaseUrl ?? process.env.CHECKOUT_BASE_URL ?? 'http://localhost:3001/checkout';
  const idGenerator = options.idGenerator ?? createDefaultIdGenerator();
  const receiverDeviceIdGenerator = options.receiverDeviceIdGenerator ?? (() => randomUUID());
  const signalIdGenerator = options.signalIdGenerator ?? createDefaultSignalIdGenerator();
  const clock = options.clock ?? (() => new Date());

  server.get('/health', async (): Promise<HealthResponse> => ({
    service: 'swimpay-api',
    version: '0.1.0',
    environment: options.environment,
    dependencies: {
      database: await checks.database(),
      nats: await checks.nats(),
      valkey: await checks.valkey()
    }
  }));

  server.post('/v1/orders', async (request, reply) => {
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }

    const body = validateCreateOrderBody(request.body);
    if ('error' in body) {
      return reply.status(400).send(body);
    }

    const createInput = buildOrderCreateInput({
      body,
      merchantId,
      phoneHmacSecret,
      idGenerator,
      clock
    });

    if ('error' in createInput) {
      return reply.status(400).send(createInput);
    }

    if (!repository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Order repository is not configured.',
          details: {}
        }
      });
    }

    const result = await repository.createOrderWithSession(createInput);
    if (result.kind === 'duplicate_external_id') {
      return reply.status(409).send({
        error: {
          code: 'duplicate_external_id',
          message: 'Order external_id already exists for this merchant.',
          details: {
            external_id: body.external_id
          }
        }
      });
    }

    const response: OrderCreateResponse = {
      order_id: result.order.id,
      payment_session_id: result.paymentSession.id,
      status: result.paymentSession.status,
      checkout_url: `${checkoutBaseUrl}/${result.paymentSession.id}`,
      amount: {
        value: formatAmountMinor(result.order.amountMinor),
        currency: result.order.currency
      },
      reference: result.paymentSession.referenceCode,
      expires_at: result.order.expiresAt
    };

    return reply.status(201).send(response);
  });

  server.get('/v1/orders/:id', async (request, reply) => {
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }

    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Order id is required.', {}));
    }

    if (!repository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Order repository is not configured.',
          details: {}
        }
      });
    }

    const result = await repository.getOrderById(merchantId, params.id);
    if (!result) {
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Order was not found.',
          details: {
            order_id: params.id
          }
        }
      });
    }

    const response = toOrderReadResponse(result.order, result.paymentSession?.id ?? null);
    return reply.status(200).send(response);
  });

  server.get('/v1/payment-sessions/:id', async (request, reply) => {
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }

    if (!repository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Order repository is not configured.',
          details: {}
        }
      });
    }

    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Payment session id is required.', {}));
    }

    const result = await repository.getPaymentSessionById(merchantId, params.id);
    if (!result) {
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Payment session was not found.',
          details: {
            payment_session_id: params.id
          }
        }
      });
    }

    return reply.status(200).send(
      toPaymentSessionReadResponse({
        order: result.order,
        paymentSession: result.paymentSession,
        now: clock()
      })
    );
  });

  server.post('/v1/receiver-devices/register', async (request, reply) => {
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }

    if (!receiverDeviceRepository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Receiver device repository is not configured.',
          details: {}
        }
      });
    }

    const body = validateReceiverDeviceRegisterBody(request.body);
    if (!body) {
      return reply.status(400).send(invalidRequest('Receiver device registration request is invalid.', {}));
    }

    const input = buildReceiverDeviceCreateInput({
      body,
      merchantId,
      deviceId: receiverDeviceIdGenerator(),
      auditEventId: idGenerator.auditEventId(),
      now: clock()
    });

    const device = await receiverDeviceRepository.createReceiverDevice(input);

    return reply.status(201).send({
      device_id: device.id,
      status: device.status,
      trust_score: device.trustScore
    });
  });

  server.post('/v1/receiver-devices/heartbeat', async (request, reply) => {
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }

    if (!receiverDeviceRepository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Receiver device repository is not configured.',
          details: {}
        }
      });
    }

    const body = validateReceiverHeartbeatBody(request.body);
    if (!body) {
      return reply.status(400).send(invalidRequest('Receiver heartbeat request is invalid.', {}));
    }

    const heartbeatAt = clock().toISOString();
    const device = await receiverDeviceRepository.updateHeartbeat({
      merchantId,
      deviceId: body.device_id,
      notificationAccessStatus: body.notification_access,
      listenerConnected: body.listener_connected,
      appVersion: body.app_version,
      heartbeatAt
    });

    if (!device) {
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Receiver device was not found.',
          details: {
            device_id: body.device_id
          }
        }
      });
    }

    return reply.status(200).send({
      device_id: device.id,
      status: device.status,
      notification_access: device.notificationAccessStatus,
      last_heartbeat_at: device.lastHeartbeatAt
    });
  });

  server.post('/v1/receiver/signals', async (request, reply) => {
    if (!signalRepository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Signal repository is not configured.',
          details: {}
        }
      });
    }

    const body = validateReceiverSignalBody(request.body);
    if (!body) {
      return reply.status(400).send(invalidRequest('Receiver signal request is invalid.', {}));
    }

    const device = await signalRepository.getReceiverDevice({
      merchantId: body.merchant_id,
      deviceId: body.device_id
    });
    if (!device) {
      return reply.status(404).send({
        error: {
          code: 'receiver_device_not_found',
          message: 'Receiver device was not found.',
          details: {
            device_id: body.device_id
          }
        }
      });
    }

    if (!verifyReceiverSignalSignature(body, device.publicKey)) {
      return reply.status(401).send({
        error: {
          code: 'invalid_signature',
          message: 'Receiver signal signature is invalid.',
          details: {}
        }
      });
    }

    const receivedAt = clock().toISOString();
    const input = buildSignalIngestionInput({
      body,
      signalId: signalIdGenerator(),
      auditEventId: idGenerator.auditEventId(),
      receivedAt
    });
    const result = await signalRepository.ingestSignal(input);

    if (result.kind !== 'stored') {
      const statusCode = result.kind === 'bank_profile_not_found' || result.kind === 'package_signature_rejected' ? 400 : 409;
      return reply.status(statusCode).send({
        error: {
          code: result.kind,
          message: signalIngestionErrorMessage(result.kind),
          details: {}
        }
      });
    }

    await eventPublisher.publish(
      buildSignalReceivedEvent({
        eventId: body.event_id,
        signalId: result.signalId,
        merchantId: body.merchant_id,
        deviceId: body.device_id,
        bankProfileId: body.bank_profile_id,
        notificationHash: body.notification_hash,
        occurredAt: receivedAt
      })
    );

    return reply.status(201).send({
      signal_id: result.signalId,
      status: 'received'
    });
  });

  return server;
}

function createDefaultOrderRepository(env: NodeJS.ProcessEnv): OrderRepository | null {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  return new PgOrderRepository(databaseUrl);
}

function createDefaultReceiverDeviceRepository(env: NodeJS.ProcessEnv): ReceiverDeviceRepository | null {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  return new PgReceiverDeviceRepository(databaseUrl);
}

function createDefaultSignalRepository(env: NodeJS.ProcessEnv): ReceiverSignalRepository | null {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  return new PgSignalRepository(databaseUrl);
}

function createDefaultEventPublisher(env: NodeJS.ProcessEnv): InternalEventPublisher {
  if (!env.NATS_URL) {
    return new NoopEventPublisher();
  }

  return new NatsEventPublisher(env.NATS_URL);
}

function createDefaultIdGenerator(): IdGenerator {
  return {
    orderId: () => randomUUID(),
    paymentSessionId: () => randomUUID(),
    auditEventId: () => randomUUID(),
    referenceCode: () => `SWP-${randomUUID().slice(0, 8).toUpperCase()}`
  };
}

function signalIngestionErrorMessage(code: string): string {
  switch (code) {
    case 'duplicate_event_id':
      return 'Receiver signal event_id was already received.';
    case 'duplicate_notification_hash':
      return 'Receiver signal notification_hash was already received.';
    case 'local_counter_regression':
      return 'Receiver signal local_counter must be strictly increasing.';
    case 'bank_profile_not_found':
      return 'Receiver signal bank profile was not found.';
    case 'package_signature_rejected':
      return 'Receiver signal package signature is rejected.';
    case 'device_not_found':
      return 'Receiver device was not found.';
    default:
      return 'Receiver signal could not be accepted.';
  }
}

function toOrderReadResponse(order: StoredOrderRecord, paymentSessionId: string | null): OrderReadResponse {
  return {
    order_id: order.id,
    external_id: order.externalId,
    status: order.status,
    payment_session_id: paymentSessionId,
    amount: {
      value: formatAmountMinor(order.amountMinor),
      currency: order.currency
    },
    expires_at: order.expiresAt,
    latest_event: 'payment_session.receiver_arming_requested'
  };
}
