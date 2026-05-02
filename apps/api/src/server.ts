import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { Redis } from 'ioredis';
import { connect } from 'nats';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import {
  MetricNames,
  buildHealthSnapshot,
  defaultMetricsRegistry,
  type HealthSnapshot,
  type MetricsRegistry
} from '@swimpay/observability';
import {
  createFastifyLoggerOptions,
  hasOperatorPermission,
  OperatorPermissions,
  OperatorRoles,
  verifyOperatorAuthorization,
  type OperatorAuthConfig,
  type OperatorPermission,
  type OperatorPrincipal,
  type OperatorRole
} from '@swimpay/security';
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
  buildReceiverHeartbeatResponse,
  buildReceiverDeviceCreateInput,
  buildReceiverRegistrationResponse,
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
import {
  buildReviewActionEvent,
  buildReviewActionInput,
  PgReviewRepository,
  toReviewActionResponse,
  toReviewListResponse,
  validateReviewActionBody,
  type ReviewIdGenerator,
  type ReviewRepository
} from './reviews.js';
import {
  buildAdminTemplateStatusInput,
  parseAdminLimit,
  PgAdminRepository,
  toAdminListResponse,
  toAdminTemplateActionResponse,
  validateAdminActionBody,
  validateAdminPromoteBody,
  type AdminRepository
} from './admin.js';

const { Pool } = pg;

export type {
  CreateOrderWithSessionInput,
  CreateOrderWithSessionResult,
  OrderRepository,
  StoredAuditEventRecord,
  StoredOrderRecord,
  StoredPaymentSessionRecord
} from './orders.js';
export type {
  ReviewActionInput,
  ReviewActionResult,
  ReviewCreateInput,
  ReviewCreateResult,
  ReviewListItem,
  ReviewRepository
} from './reviews.js';

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
  reviewRepository?: ReviewRepository;
  adminRepository?: AdminRepository;
  eventPublisher?: InternalEventPublisher;
  phoneHmacSecret?: string;
  checkoutBaseUrl?: string;
  idGenerator?: IdGenerator;
  receiverDeviceIdGenerator?: () => string;
  signalIdGenerator?: () => string;
  reviewIdGenerator?: ReviewIdGenerator;
  adminAuth?: OperatorAuthConfig;
  metrics?: MetricsRegistry;
  clock?: () => Date;
  startedAt?: Date;
}

export type HealthResponse = HealthSnapshot & { service: 'swimpay-api'; version: '0.1.0' };

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
  const server = Fastify({ logger: createFastifyLoggerOptions() });
  const checks = options.healthChecks ?? createDefaultHealthChecks(process.env);
  const repository = options.orderRepository ?? createDefaultOrderRepository(process.env);
  const receiverDeviceRepository = options.receiverDeviceRepository ?? createDefaultReceiverDeviceRepository(process.env);
  const signalRepository = options.signalRepository ?? createDefaultSignalRepository(process.env);
  const reviewRepository = options.reviewRepository ?? createDefaultReviewRepository(process.env);
  const adminRepository = options.adminRepository ?? createDefaultAdminRepository(process.env);
  const eventPublisher = options.eventPublisher ?? createDefaultEventPublisher(process.env);
  const metrics = options.metrics ?? defaultMetricsRegistry;
  const phoneHmacSecret = options.phoneHmacSecret ?? process.env.PHONE_HMAC_SECRET ?? 'local_dev_phone_hmac_secret';
  const checkoutBaseUrl = options.checkoutBaseUrl ?? process.env.CHECKOUT_BASE_URL ?? 'http://localhost:3001/checkout';
  const idGenerator = options.idGenerator ?? createDefaultIdGenerator();
  const receiverDeviceIdGenerator = options.receiverDeviceIdGenerator ?? (() => randomUUID());
  const signalIdGenerator = options.signalIdGenerator ?? createDefaultSignalIdGenerator();
  const reviewIdGenerator = options.reviewIdGenerator ?? createDefaultReviewIdGenerator();
  const adminAuth = options.adminAuth ?? createDefaultAdminAuthConfig(process.env, options.environment);
  const clock = options.clock ?? (() => new Date());
  const startedAt = options.startedAt ?? new Date();

  server.addHook('onRequest', async (request, reply) => {
    const incoming = Array.isArray(request.headers['x-correlation-id'])
      ? request.headers['x-correlation-id'][0]
      : request.headers['x-correlation-id'];
    const correlationId = typeof incoming === 'string' && incoming.trim().length > 0 ? incoming.trim() : randomUUID();
    reply.header('X-Correlation-Id', correlationId);
  });

  server.get('/health', async (): Promise<HealthResponse> =>
    buildHealthSnapshot({
      service: 'swimpay-api',
      version: '0.1.0',
      environment: options.environment,
      dependencies: {
        database: await checks.database(),
        nats: await checks.nats(),
        valkey: await checks.valkey()
      },
      startedAtMs: startedAt.getTime(),
      now: clock
    }) as HealthResponse
  );

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
    metrics.increment(MetricNames.ORDERS_CREATED_TOTAL);
    metrics.increment(MetricNames.PAYMENT_SESSIONS_CREATED_TOTAL);

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
    if (!body.valid) {
      return reply.status(400).send(receiverContractError(body.code, body.field));
    }

    const input = buildReceiverDeviceCreateInput({
      body: body.value,
      merchantId,
      deviceId: receiverDeviceIdGenerator(),
      auditEventId: idGenerator.auditEventId(),
      now: clock()
    });

    const device = await receiverDeviceRepository.createReceiverDevice(input);
    metrics.increment(MetricNames.RECEIVER_REGISTRATIONS_TOTAL);

    return reply.status(201).send(
      buildReceiverRegistrationResponse({
        device,
        merchantId,
        serverTime: clock().toISOString()
      })
    );
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
    if (!body.valid) {
      return reply.status(400).send(receiverContractError(body.code, body.field));
    }

    const heartbeatAt = clock().toISOString();
    const device = await receiverDeviceRepository.updateHeartbeat({
      merchantId,
      deviceId: body.value.device_id,
      notificationAccessStatus: body.value.notification_access,
      listenerConnected: body.value.listener_connected,
      appVersion: body.value.app_version,
      androidVersion: body.value.android_version,
      heartbeatAt
    });

    if (!device) {
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Receiver device was not found.',
          details: {
            device_id: body.value.device_id
          }
        }
      });
    }
    metrics.increment(MetricNames.RECEIVER_HEARTBEATS_TOTAL);

    return reply.status(200).send(
      buildReceiverHeartbeatResponse({
        device,
        serverTime: heartbeatAt,
        warnings: body.warnings ?? []
      })
    );
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
    if (!body.valid) {
      metrics.increment(MetricNames.RECEIVER_SIGNALS_REJECTED_TOTAL);
      const statusCode = body.code === 'signature_missing' || body.code === 'signature_invalid' ? 401 : 400;
      return reply.status(statusCode).send(receiverContractError(body.code, body.field));
    }

    const device = await signalRepository.getReceiverDevice({
      merchantId: body.value.merchant_id,
      deviceId: body.value.device_id
    });
    if (!device) {
      return reply.status(404).send({
        error: {
          code: 'receiver_device_not_found',
          message: 'Receiver device was not found.',
          details: {
            device_id: body.value.device_id
          }
        }
      });
    }

    if (!verifyReceiverSignalSignature(body.value, device.publicKey)) {
      metrics.increment(MetricNames.RECEIVER_SIGNATURE_INVALID_TOTAL);
      metrics.increment(MetricNames.RECEIVER_SIGNALS_REJECTED_TOTAL);
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
      body: body.value,
      signalId: signalIdGenerator(),
      auditEventId: idGenerator.auditEventId(),
      receivedAt
    });
    const result = await signalRepository.ingestSignal(input);

    if (result.kind !== 'stored') {
      if (result.kind === 'duplicate_event_id' || result.kind === 'duplicate_notification_hash') {
        metrics.increment(MetricNames.SIGNALS_DUPLICATE_TOTAL);
      }
      metrics.increment(MetricNames.RECEIVER_SIGNALS_REJECTED_TOTAL);
      const statusCode = result.kind === 'bank_profile_not_found' || result.kind === 'package_signature_rejected' ? 400 : 409;
      return reply.status(statusCode).send({
        error: {
          code: result.kind,
          message: signalIngestionErrorMessage(result.kind),
          details: {}
        }
      });
    }
    metrics.increment(MetricNames.SIGNALS_RECEIVED_TOTAL);
    metrics.increment(MetricNames.RECEIVER_SIGNALS_ACCEPTED_TOTAL);

    await eventPublisher.publish(
      buildSignalReceivedEvent({
        eventId: body.value.event_id,
        signalId: result.signalId,
        merchantId: body.value.merchant_id,
        deviceId: body.value.device_id,
        bankProfileId: body.value.bank_profile_id,
        notificationHash: body.value.notification_hash,
        occurredAt: receivedAt
      })
    );

    return reply.status(201).send({
      signal_id: result.signalId,
      status: 'received',
      accepted: true,
      reason_codes: [],
      server_time: receivedAt,
      next_action: 'backend_decision_pending'
    });
  });

  server.get('/v1/reviews', async (request, reply) => {
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }

    if (!reviewRepository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Review repository is not configured.',
          details: {}
        }
      });
    }

    const reviews = await reviewRepository.listOpenReviews(merchantId);
    return reply.status(200).send(toReviewListResponse(reviews));
  });

  server.post('/v1/reviews/:id/confirm', async (request, reply) => {
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }

    if (!reviewRepository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Review repository is not configured.',
          details: {}
        }
      });
    }

    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Review id is required.', {}));
    }

    const body = validateReviewActionBody(request.body, 'confirmed');
    if ('error' in body) {
      return reply.status(400).send(body);
    }

    const occurredAt = clock().toISOString();
    const input = buildReviewActionInput({
      merchantId,
      reviewId: params.id,
      action: 'confirmed',
      body,
      idGenerator: reviewIdGenerator,
      now: occurredAt
    });
    const result = await reviewRepository.confirmReview(input);

    if (result.kind !== 'updated') {
      return reply.status(reviewActionErrorStatus(result.kind)).send(reviewActionErrorResponse(result.kind, params.id));
    }
    metrics.increment(MetricNames.REVIEWS_CONFIRMED_TOTAL);

    await eventPublisher.publish(
      buildReviewActionEvent({
        eventId: reviewIdGenerator.eventId(),
        result,
        merchantId,
        occurredAt
      })
    );

    return reply.status(200).send(toReviewActionResponse(result));
  });

  server.post('/v1/reviews/:id/reject', async (request, reply) => {
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }

    if (!reviewRepository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Review repository is not configured.',
          details: {}
        }
      });
    }

    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Review id is required.', {}));
    }

    const body = validateReviewActionBody(request.body, 'rejected');
    if ('error' in body) {
      return reply.status(400).send(body);
    }

    const occurredAt = clock().toISOString();
    const input = buildReviewActionInput({
      merchantId,
      reviewId: params.id,
      action: 'rejected',
      body,
      idGenerator: reviewIdGenerator,
      now: occurredAt
    });
    const result = await reviewRepository.rejectReview(input);

    if (result.kind !== 'updated') {
      return reply.status(reviewActionErrorStatus(result.kind)).send(reviewActionErrorResponse(result.kind, params.id));
    }
    metrics.increment(MetricNames.REVIEWS_REJECTED_TOTAL);

    await eventPublisher.publish(
      buildReviewActionEvent({
        eventId: reviewIdGenerator.eventId(),
        result,
        merchantId,
        occurredAt
      })
    );

    return reply.status(200).send(toReviewActionResponse(result));
  });

  server.get('/v1/admin/bank-profiles', async (request, reply) => {
    const operator = requireAdminPermission({
      request,
      reply,
      adminAuth,
      permission: OperatorPermissions.VIEW_BANK_TEMPLATES
    });
    if (!operator) {
      return reply;
    }

    if (!adminRepository) {
      return reply.status(503).send(adminRepositoryUnavailableError());
    }

    return reply.status(200).send(toAdminListResponse('bank_profiles', await adminRepository.listBankProfiles()));
  });

  server.get('/v1/admin/metrics', async (request, reply) => {
    const operator = requireAdminPermission({
      request,
      reply,
      adminAuth,
      permission: OperatorPermissions.VIEW_ADMIN_DASHBOARD
    });
    if (!operator) {
      return reply;
    }

    return reply.status(200).send({
      metrics: metrics.snapshot()
    });
  });

  server.get('/v1/admin/runtime-status', async (request, reply) => {
    const operator = requireAdminPermission({
      request,
      reply,
      adminAuth,
      permission: OperatorPermissions.VIEW_ADMIN_DASHBOARD
    });
    if (!operator) {
      return reply;
    }

    return reply.status(200).send({
      service: 'swimpay-api',
      environment: options.environment,
      uptime_seconds: Math.max(0, Math.floor((clock().getTime() - startedAt.getTime()) / 1_000)),
      timestamp: clock().toISOString()
    });
  });

  server.get('/v1/admin/templates', async (request, reply) => {
    const operator = requireAdminPermission({
      request,
      reply,
      adminAuth,
      permission: OperatorPermissions.VIEW_BANK_TEMPLATES
    });
    if (!operator) {
      return reply;
    }

    if (!adminRepository) {
      return reply.status(503).send(adminRepositoryUnavailableError());
    }

    const query = request.query as { limit?: string };
    return reply.status(200).send(toAdminListResponse('templates', await adminRepository.listTemplates(parseAdminLimit(query.limit))));
  });

  server.post('/v1/admin/templates/:id/degrade', async (request, reply) => {
    return handleAdminTemplateStatusAction({
      request,
      reply,
      adminRepository,
      adminAuth,
      requiredPermission: OperatorPermissions.DEGRADE_BANK_TEMPLATES,
      status: 'degraded',
      auditEventId: idGenerator.auditEventId(),
      occurredAt: clock().toISOString()
    });
  });

  server.post('/v1/admin/templates/:id/promote', async (request, reply) => {
    const operator = requireAdminPermission({
      request,
      reply,
      adminAuth,
      permission: OperatorPermissions.PROMOTE_BANK_TEMPLATES
    });
    if (!operator) {
      return reply;
    }

    if (!adminRepository) {
      return reply.status(503).send(adminRepositoryUnavailableError());
    }

    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Template id is required.', {}));
    }

    const body = validateAdminPromoteBody(request.body);
    if ('error' in body) {
      return reply.status(400).send(body);
    }

    const result = await adminRepository.updateTemplateStatus(
      buildAdminTemplateStatusInput({
        templateId: params.id,
        status: body.target_status,
        operatorId: operator.operatorId,
        body,
        auditEventId: idGenerator.auditEventId(),
        occurredAt: clock().toISOString()
      })
    );

    return sendAdminTemplateActionResult(reply, result, params.id);
  });

  server.post('/v1/admin/templates/:id/review-only', async (request, reply) => {
    return handleAdminTemplateStatusAction({
      request,
      reply,
      adminRepository,
      adminAuth,
      requiredPermission: OperatorPermissions.DEGRADE_BANK_TEMPLATES,
      status: 'review_only',
      auditEventId: idGenerator.auditEventId(),
      occurredAt: clock().toISOString()
    });
  });

  server.post('/v1/admin/templates/:id/disable', async (request, reply) => {
    return handleAdminTemplateStatusAction({
      request,
      reply,
      adminRepository,
      adminAuth,
      requiredPermission: OperatorPermissions.DISABLE_BANK_TEMPLATES,
      status: 'disabled',
      auditEventId: idGenerator.auditEventId(),
      occurredAt: clock().toISOString()
    });
  });

  server.post('/v1/admin/templates/:id/false-positive', async (request, reply) => {
    const operator = requireAdminPermission({
      request,
      reply,
      adminAuth,
      permission: OperatorPermissions.DISABLE_BANK_TEMPLATES
    });
    if (!operator) {
      return reply;
    }

    if (!adminRepository) {
      return reply.status(503).send(adminRepositoryUnavailableError());
    }

    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Template id is required.', {}));
    }

    const body = validateAdminActionBody(request.body);
    if ('error' in body) {
      return reply.status(400).send(body);
    }

    const result = await adminRepository.markTemplateFalsePositive({
      templateId: params.id,
      operatorId: operator.operatorId,
      reason: body.reason,
      auditEventId: idGenerator.auditEventId(),
      occurredAt: clock().toISOString()
    });

    return sendAdminTemplateActionResult(reply, result, params.id);
  });

  server.get('/v1/admin/drift-events', async (request, reply) => {
    const operator = requireAdminPermission({
      request,
      reply,
      adminAuth,
      permission: OperatorPermissions.VIEW_BANK_TEMPLATES
    });
    if (!operator) {
      return reply;
    }

    if (!adminRepository) {
      return reply.status(503).send(adminRepositoryUnavailableError());
    }

    const query = request.query as { limit?: string };
    return reply.status(200).send(toAdminListResponse('drift_events', await adminRepository.listDriftEvents(parseAdminLimit(query.limit))));
  });

  server.get('/v1/admin/webhook-failures', async (request, reply) => {
    const operator = requireAdminPermission({
      request,
      reply,
      adminAuth,
      permission: OperatorPermissions.VIEW_WEBHOOKS
    });
    if (!operator) {
      return reply;
    }

    if (!adminRepository) {
      return reply.status(503).send(adminRepositoryUnavailableError());
    }

    const query = request.query as { limit?: string };
    return reply
      .status(200)
      .send(toAdminListResponse('webhook_failures', await adminRepository.listWebhookFailures(parseAdminLimit(query.limit))));
  });

  server.get('/v1/admin/receiver-health', async (request, reply) => {
    const operator = requireAdminPermission({
      request,
      reply,
      adminAuth,
      permission: OperatorPermissions.VIEW_ADMIN_DASHBOARD
    });
    if (!operator) {
      return reply;
    }

    if (!adminRepository) {
      return reply.status(503).send(adminRepositoryUnavailableError());
    }

    const query = request.query as { limit?: string };
    return reply.status(200).send(toAdminListResponse('receiver_health', await adminRepository.listReceiverHealth(parseAdminLimit(query.limit))));
  });

  server.get('/v1/admin/audit-events', async (request, reply) => {
    const operator = requireAdminPermission({
      request,
      reply,
      adminAuth,
      permission: OperatorPermissions.VIEW_AUDIT_LOGS
    });
    if (!operator) {
      return reply;
    }

    if (!adminRepository) {
      return reply.status(503).send(adminRepositoryUnavailableError());
    }

    const query = request.query as { limit?: string; event_type?: string; object_type?: string };
    return reply.status(200).send(
      toAdminListResponse(
        'audit_events',
        await adminRepository.searchAuditEvents({
          limit: parseAdminLimit(query.limit),
          eventType: query.event_type,
          objectType: query.object_type
        })
      )
    );
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

function createDefaultReviewRepository(env: NodeJS.ProcessEnv): ReviewRepository | null {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  return new PgReviewRepository(databaseUrl);
}

function createDefaultAdminRepository(env: NodeJS.ProcessEnv): AdminRepository | null {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  return new PgAdminRepository(databaseUrl);
}

function createDefaultEventPublisher(env: NodeJS.ProcessEnv): InternalEventPublisher {
  if (!env.NATS_URL) {
    return new NoopEventPublisher();
  }

  return new NatsEventPublisher(env.NATS_URL);
}

function createDefaultAdminAuthConfig(env: NodeJS.ProcessEnv, environment: string): OperatorAuthConfig {
  const mode = parseAdminAuthMode(env.ADMIN_AUTH_MODE, environment);
  return {
    mode,
    environment,
    devToken: env.DEV_ADMIN_TOKEN,
    devOperatorId: env.DEV_ADMIN_OPERATOR_ID ?? 'dev_operator',
    devRole: parseOperatorRole(env.DEV_ADMIN_ROLE) ?? OperatorRoles.ADMIN,
    tokenHmacSecret: env.ADMIN_TOKEN_HMAC_SECRET
  };
}

function parseAdminAuthMode(value: string | undefined, environment: string): OperatorAuthConfig['mode'] {
  if (value === 'dev_token' || value === 'signed_token') {
    return value;
  }

  return environment === 'production' ? 'signed_token' : 'dev_token';
}

function parseOperatorRole(value: string | undefined): OperatorRole | undefined {
  return Object.values(OperatorRoles).includes(value as OperatorRole) ? (value as OperatorRole) : undefined;
}

function createDefaultIdGenerator(): IdGenerator {
  return {
    orderId: () => randomUUID(),
    paymentSessionId: () => randomUUID(),
    auditEventId: () => randomUUID(),
    referenceCode: () => `SWP-${randomUUID().slice(0, 8).toUpperCase()}`
  };
}

function createDefaultReviewIdGenerator(): ReviewIdGenerator {
  return {
    reviewActionId: () => randomUUID(),
    auditEventId: () => randomUUID(),
    eventId: () => randomUUID()
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

function receiverContractError(code: string, field?: string) {
  return {
    error: {
      code,
      message: receiverContractErrorMessage(code),
      details: field ? { field } : {}
    }
  };
}

function receiverContractErrorMessage(code: string): string {
  switch (code) {
    case 'signature_missing':
      return 'Receiver signal signature is required.';
    case 'signature_invalid':
      return 'Receiver signal signature is invalid.';
    case 'raw_phone_rejected':
      return 'Receiver payload must not include raw phone fields.';
    case 'raw_notification_rejected':
      return 'Receiver payload must not include raw notification text.';
    case 'local_counter_replay':
      return 'Receiver local_counter must be a positive replay-protection counter.';
    case 'timestamp_out_of_range':
      return 'Receiver timestamp is invalid or out of accepted bounds.';
    case 'package_not_allowed':
      return 'Notification package is not allowlisted for receiver processing.';
    default:
      return 'Android Receiver contract payload is invalid.';
  }
}

function reviewActionErrorStatus(
  kind: 'not_found' | 'not_open' | 'already_confirmed' | 'rejection_scope_conflict'
): 404 | 409 {
  return kind === 'not_found' ? 404 : 409;
}

function reviewActionErrorResponse(
  kind: 'not_found' | 'not_open' | 'already_confirmed' | 'rejection_scope_conflict',
  reviewId: string
) {
  switch (kind) {
    case 'not_found':
      return {
        error: {
          code: 'not_found',
          message: 'Review item was not found.',
          details: {
            review_id: reviewId
          }
        }
      };
    case 'not_open':
      return {
        error: {
          code: 'review_not_open',
          message: 'Review item is no longer open.',
          details: {
            review_id: reviewId
          }
        }
      };
    case 'already_confirmed':
      return {
        error: {
          code: 'already_confirmed',
          message: 'Review item cannot confirm an order or signal that is already confirmed.',
          details: {
            review_id: reviewId
          }
        }
      };
    case 'rejection_scope_conflict':
      return {
        error: {
          code: 'review_rejection_scope_conflict',
          message: 'Review rejection scope cannot be escalated after the review is already resolved.',
          details: {
            review_id: reviewId
          }
        }
      };
  }
}

async function handleAdminTemplateStatusAction(params: {
  request: FastifyRequest;
  reply: FastifyReply;
  adminRepository: AdminRepository | null;
  adminAuth: OperatorAuthConfig;
  requiredPermission: OperatorPermission;
  status: 'degraded' | 'review_only' | 'disabled';
  auditEventId: string;
  occurredAt: string;
}) {
  const operator = requireAdminPermission({
    request: params.request,
    reply: params.reply,
    adminAuth: params.adminAuth,
    permission: params.requiredPermission
  });
  if (!operator) {
    return params.reply;
  }

  if (!params.adminRepository) {
    return params.reply.status(503).send(adminRepositoryUnavailableError());
  }

  const routeParams = params.request.params as { id?: string };
  if (!routeParams.id) {
    return params.reply.status(400).send(invalidRequest('Template id is required.', {}));
  }

  const body = validateAdminActionBody(params.request.body);
  if ('error' in body) {
    return params.reply.status(400).send(body);
  }

  const result = await params.adminRepository.updateTemplateStatus(
    buildAdminTemplateStatusInput({
      templateId: routeParams.id,
      status: params.status,
      operatorId: operator.operatorId,
      body,
      auditEventId: params.auditEventId,
      occurredAt: params.occurredAt
    })
  );

  return sendAdminTemplateActionResult(params.reply, result, routeParams.id);
}

function requireAdminPermission(params: {
  request: FastifyRequest;
  reply: FastifyReply;
  adminAuth: OperatorAuthConfig;
  permission: OperatorPermission;
}): OperatorPrincipal | null {
  const authorization = Array.isArray(params.request.headers.authorization)
    ? params.request.headers.authorization[0]
    : params.request.headers.authorization;
  const result = verifyOperatorAuthorization(authorization, params.adminAuth);

  if (result.kind !== 'authenticated') {
    const statusCode = result.reason === 'missing_bearer_token' ? 401 : 401;
    params.reply.status(statusCode).send(adminAuthorizationError(result.reason));
    return null;
  }

  if (!hasOperatorPermission(result.operator.role, params.permission)) {
    params.reply.status(403).send(adminPermissionDeniedError(result.operator, params.permission));
    return null;
  }

  return result.operator;
}

function sendAdminTemplateActionResult(
  reply: FastifyReply,
  result: Awaited<ReturnType<AdminRepository['updateTemplateStatus']>>,
  templateId: string
) {
  switch (result.kind) {
    case 'updated':
      return reply.status(200).send(toAdminTemplateActionResponse(result));
    case 'not_found':
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Bank template was not found.',
          details: {
            template_id: templateId
          }
        }
      });
    case 'false_positive_present':
      return reply.status(409).send({
        error: {
          code: 'template_false_positive_present',
          message: 'Template with false positives cannot be promoted to a trusted status.',
          details: {
            template_id: templateId
          }
        }
      });
    case 'verified_bank_app_required':
      return reply.status(409).send({
        error: {
          code: 'verified_bank_app_required',
          message: 'Template cannot be trusted while bank package/certificate metadata is unverified or TO_VERIFY.',
          details: {
            template_id: templateId
          }
        }
      });
    case 'insufficient_evidence':
      return reply.status(409).send({
        error: {
          code: 'insufficient_template_evidence',
          message: 'Template does not have enough evidence for the requested promotion.',
          details: {
            template_id: templateId,
            missing_evidence: result.missingEvidence
          }
        }
      });
  }
}

function adminAuthorizationError(reason: string) {
  return {
    error: {
      code: reason === 'missing_bearer_token' ? 'operator_auth_required' : 'operator_auth_rejected',
      message: 'A valid operator bearer token is required for admin endpoints.',
      details: {
        reason
      }
    }
  };
}

function adminPermissionDeniedError(operator: OperatorPrincipal, requiredPermission: OperatorPermission) {
  return {
    error: {
      code: 'operator_permission_denied',
      message: 'Operator role does not have the required admin permission.',
      details: {
        operator_id: operator.operatorId,
        role: operator.role,
        required_permission: requiredPermission
      }
    }
  };
}

function adminRepositoryUnavailableError() {
  return {
    error: {
      code: 'service_unavailable',
      message: 'Admin repository is not configured.',
      details: {}
    }
  };
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
