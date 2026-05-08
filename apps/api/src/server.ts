import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { Redis } from 'ioredis';
import { connect } from 'nats';
import { OAuth2Client } from 'google-auth-library';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { EventTypes, PUBLIC_EVENT_SIGNAL_DISCLOSURE } from '@swimpay/events';
import {
  MetricNames,
  buildHealthSnapshot,
  defaultMetricsRegistry,
  type HealthSnapshot,
  type MetricsRegistry
} from '@swimpay/observability';
import {
  AndroidMerchantAccountAuthPaths,
  AndroidMerchantAccountErrorCodes,
  AndroidMerchantRawDeviceIdentifierFields,
  AndroidMerchantDeviceLookupStatuses,
  ReceivingRouteRailTypes,
  V1StaticBankProfiles,
  buildAndroidMerchantAccountCreateResponse,
  buildAndroidMerchantDeviceLookupResponse,
  getPayerBankLauncherOption,
  getReceiverBankOption,
  validateAndroidMerchantCreateAccountRequest,
  validateAndroidMerchantDeviceLookupRequest,
  validateIntelligenceFeedbackRequest,
  type AndroidMerchantAccountCreateResponse,
  type AndroidMerchantAccountErrorCode,
  type AndroidMerchantDeviceProof,
  type ReceivingRouteRailType
} from '@swimpay/contracts';
import {
  createFastifyLoggerOptions,
  hmacSha256,
  hasOperatorPermission,
  maskPhone,
  normalizeRussianPhone,
  OperatorPermissions,
  OperatorRoles,
  verifyOperatorAuthorization,
  type OperatorAuthConfig,
  type OperatorPermission,
  type OperatorPrincipal,
  type OperatorRole
} from '@swimpay/security';
import {
  createDefaultMerchantIntegrationRepository,
  parseDeliveryLimit,
  toMerchantIntegrationResponse,
  validateWebhookUrl,
  type MerchantIntegrationRepository
} from './developer-integration.js';
import {
  BFF_SESSION_COOKIE_NAME,
  CSRF_HEADER_NAME,
  MerchantPermissions,
  buildSessionCookieOptions,
  createAndroidMerchantMobileSessionToken,
  createCsrfToken,
  createDefaultAuthBffRepository,
  createDefaultMerchantApiKeyVerifier,
  createGoogleOAuthProviderSeam,
  createOpaqueSessionToken,
  hashAndroidMerchantDeviceProof,
  hashAndroidMerchantMobileSessionToken,
  hashBffSessionToken,
  hashCsrfToken,
  hasMerchantPermission,
  merchantPermissionsForRole,
  parseBearerToken,
  parseCookieHeader,
  serializeExpiredSessionCookie,
  serializeSessionCookie,
  verifyCsrfToken,
  verifyMerchantApiKeyAuthorization,
  type AuthBffRepository,
  type AndroidMerchantAccountRecord,
  type AndroidMerchantMobileSessionRecord,
  type BffSessionContext,
  type MerchantApiKeyVerifier,
  type MerchantPermission,
  type MerchantRole
} from './auth-bff.js';
import {
  buildMerchantReceivingRouteRecord,
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
  type StoredMerchantReceivingRouteRecord,
  type StoredOrderRecord,
  type StoredPaymentSessionRecord
} from './orders.js';
import {
  buildBuyerSenderPhoneHintResponse,
  buildCheckoutActionResponse,
  buildPayerBankLauncherSelectionResponse,
  toReceivingRouteCopyDetailsResponse,
  buildReceivingRouteSelectionResponse,
  buildReceiverBankSelectionResponse,
  toReceivingRoutesForBankResponse,
  toCheckoutStatusResponse,
  toPayerBankLaunchersResponse,
  toPaymentSessionReadResponse,
  toReceiverBanksResponse
} from './payment-sessions.js';
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
  isReceiverDeviceEligibleForSignalUpload,
  isReceiverSignalObservedAtWithinTolerance,
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
  type ReviewListItem,
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
import {
  PgBankEvidenceRepository,
  BankEvidenceSources,
  BankEvidenceStatuses,
  toBankEvidenceProductionTrustResponse,
  toBankEvidenceResponse,
  toBankEvidenceReviewDashboardResponse,
  toBankEvidenceReviewResponse,
  toBankEvidenceSubmitResponse,
  validateBankEvidenceReviewBody,
  validateBankEvidenceSubmitBody,
  type BankEvidenceListFilters,
  type BankEvidenceRepository
} from './bank-evidence.js';
import {
  buildIntelligenceFeedbackRecord,
  createDefaultIntelligenceRepository,
  toIntelligenceFeedbackResponse,
  toUnknownShapeResponse,
  type IntelligenceRepository
} from './intelligence.js';

const { Pool } = pg;
const COPY_DETAILS_RATE_LIMIT_MAX = 3;
const COPY_DETAILS_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const COPY_DETAILS_REVEAL_TTL_MS = 2 * 60 * 1000;
const ANDROID_MERCHANT_MOBILE_SESSION_TTL_MS = 60 * 60 * 24 * 30 * 1000;

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

export interface GoogleIdTokenVerificationResult {
  googleSub: string;
}

export interface GoogleIdTokenVerifier {
  verifyIdToken(idToken: string): Promise<GoogleIdTokenVerificationResult | null>;
}

export interface ApiServerOptions {
  environment: string;
  healthChecks?: HealthChecks;
  orderRepository?: OrderRepository;
  receiverDeviceRepository?: ReceiverDeviceRepository;
  signalRepository?: ReceiverSignalRepository;
  reviewRepository?: ReviewRepository;
  adminRepository?: AdminRepository;
  bankEvidenceRepository?: BankEvidenceRepository;
  intelligenceRepository?: IntelligenceRepository | null;
  merchantIntegrationRepository?: MerchantIntegrationRepository | null;
  authBffRepository?: AuthBffRepository | null;
  merchantApiKeyVerifier?: MerchantApiKeyVerifier | null;
  googleIdTokenVerifier?: GoogleIdTokenVerifier | null;
  eventPublisher?: InternalEventPublisher;
  phoneHmacSecret?: string;
  checkoutBaseUrl?: string;
  idGenerator?: IdGenerator;
  receiverDeviceIdGenerator?: () => string;
  signalIdGenerator?: () => string;
  reviewIdGenerator?: ReviewIdGenerator;
  bankEvidenceIdGenerator?: () => string;
  receivingRouteIdGenerator?: () => string;
  androidMerchantDeliveryIdGenerator?: () => string;
  androidMerchantConnectedSite?: {
    url: string;
    status: 'active' | 'problem';
  };
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

class GoogleAuthLibraryIdTokenVerifier implements GoogleIdTokenVerifier {
  private readonly client = new OAuth2Client();

  constructor(private readonly audience: string) {}

  async verifyIdToken(idToken: string): Promise<GoogleIdTokenVerificationResult | null> {
    if (!idToken.trim()) {
      return null;
    }
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.audience
      });
      const googleSub = ticket.getPayload()?.sub?.trim();
      return googleSub ? { googleSub } : null;
    } catch {
      return null;
    }
  }
}

export function createDefaultGoogleIdTokenVerifier(env: NodeJS.ProcessEnv): GoogleIdTokenVerifier | null {
  const audience = env.GOOGLE_OAUTH_CLIENT_ID?.trim() || env.SWIMPAY_ANDROID_GOOGLE_SERVER_CLIENT_ID?.trim();
  return audience ? new GoogleAuthLibraryIdTokenVerifier(audience) : null;
}

export function buildApiServer(options: ApiServerOptions): FastifyInstance {
  const server = Fastify({ logger: createFastifyLoggerOptions() });
  const checks = options.healthChecks ?? createDefaultHealthChecks(process.env);
  const repository = options.orderRepository ?? createDefaultOrderRepository(process.env);
  const receiverDeviceRepository = options.receiverDeviceRepository ?? createDefaultReceiverDeviceRepository(process.env);
  const signalRepository = options.signalRepository ?? createDefaultSignalRepository(process.env);
  const reviewRepository = options.reviewRepository ?? createDefaultReviewRepository(process.env);
  const adminRepository = options.adminRepository ?? createDefaultAdminRepository(process.env);
  const bankEvidenceRepository = options.bankEvidenceRepository ?? createDefaultBankEvidenceRepository(process.env);
  const intelligenceRepository = options.intelligenceRepository ?? createDefaultIntelligenceRepository(process.env, options.environment);
  const merchantIntegrationRepository =
    options.merchantIntegrationRepository ?? createDefaultMerchantIntegrationRepository(process.env);
  const authBffRepository = options.authBffRepository ?? createDefaultAuthBffRepository(process.env);
  const merchantApiKeyVerifier = options.merchantApiKeyVerifier ?? createDefaultMerchantApiKeyVerifier(process.env);
  const googleIdTokenVerifier = options.googleIdTokenVerifier ?? createDefaultGoogleIdTokenVerifier(process.env);
  const eventPublisher = options.eventPublisher ?? createDefaultEventPublisher(process.env);
  const metrics = options.metrics ?? defaultMetricsRegistry;
  const phoneHmacSecret = options.phoneHmacSecret ?? process.env.PHONE_HMAC_SECRET ?? 'local_dev_phone_hmac_secret';
  const checkoutBaseUrl = options.checkoutBaseUrl ?? process.env.CHECKOUT_BASE_URL ?? 'http://localhost:3001/checkout';
  const idGenerator = options.idGenerator ?? createDefaultIdGenerator();
  const receiverDeviceIdGenerator = options.receiverDeviceIdGenerator ?? (() => randomUUID());
  const signalIdGenerator = options.signalIdGenerator ?? createDefaultSignalIdGenerator();
  const reviewIdGenerator = options.reviewIdGenerator ?? createDefaultReviewIdGenerator();
  const bankEvidenceIdGenerator = options.bankEvidenceIdGenerator ?? (() => randomUUID());
  const receivingRouteIdGenerator = options.receivingRouteIdGenerator ?? (() => randomUUID());
  const androidMerchantDeliveryIdGenerator = options.androidMerchantDeliveryIdGenerator ?? (() => randomUUID());
  const androidMerchantConnectedSite = options.androidMerchantConnectedSite ?? parseAndroidMerchantConnectedSite(process.env);
  const adminAuth = options.adminAuth ?? createDefaultAdminAuthConfig(process.env, options.environment);
  const googleOAuthProvider = createGoogleOAuthProviderSeam(process.env, options.environment);
  const clock = options.clock ?? (() => new Date());
  const startedAt = options.startedAt ?? new Date();
  const copyDetailsLimiter = new Map<string, { windowStartedAtMs: number; count: number }>();

  server.addHook('onRequest', async (request, reply) => {
    const incoming = Array.isArray(request.headers['x-correlation-id'])
      ? request.headers['x-correlation-id'][0]
      : request.headers['x-correlation-id'];
    const correlationId = typeof incoming === 'string' && incoming.trim().length > 0 ? incoming.trim() : randomUUID();
    reply.header('X-Correlation-Id', correlationId);
  });

  async function readBffSessionContext(request: FastifyRequest): Promise<{
    context: BffSessionContext;
    sessionTokenHash: string;
  } | null> {
    if (!authBffRepository) {
      return null;
    }
    const sessionToken = parseCookieHeader(readHeader(request.headers.cookie), BFF_SESSION_COOKIE_NAME);
    if (!sessionToken) {
      return null;
    }
    const sessionTokenHash = hashBffSessionToken(sessionToken);
    const context = await authBffRepository.getSessionByHash(sessionTokenHash, clock().toISOString());
    return context ? { context, sessionTokenHash } : null;
  }

  async function requireBffCsrf(request: FastifyRequest, sessionTokenHash: string): Promise<boolean> {
    if (!authBffRepository) {
      return false;
    }
    const storedHash = await authBffRepository.getCsrfSecretHash(sessionTokenHash);
    if (!storedHash) {
      return false;
    }
    return verifyCsrfToken(readHeader(request.headers[CSRF_HEADER_NAME]), storedHash);
  }

  async function resolveMerchantContext(
    request: FastifyRequest,
    reply: FastifyReply,
    permission: MerchantPermission,
    routeOptions: { requireCsrf?: boolean } = {}
  ): Promise<{ merchantId: string; source: 'bff_session' | 'dev_test_bearer' } | null> {
    const session = await readBffSessionContext(request);
    if (session) {
      const membership = session.context.activeMembership;
      if (!membership || !hasMerchantPermission(membership.role, permission)) {
        reply.status(403).send(invalidRequest('Merchant permission is required.', { permission }));
        return null;
      }
      if (routeOptions.requireCsrf && !(await requireBffCsrf(request, session.sessionTokenHash))) {
        reply.status(403).send(invalidRequest('A valid CSRF token is required for this merchant action.', {}));
        return null;
      }
      return { merchantId: membership.merchantId, source: 'bff_session' };
    }

    const merchantId = parseMerchantId(request.headers.authorization, { allowTestBearer: options.environment !== 'production' });
    return merchantId ? { merchantId, source: 'dev_test_bearer' } : null;
  }

  async function resolveSdkMerchantId(request: FastifyRequest): Promise<string | null> {
    const apiKeyPrincipal = await verifyMerchantApiKeyAuthorization(request.headers.authorization, merchantApiKeyVerifier);
    if (apiKeyPrincipal) {
      return apiKeyPrincipal.merchantId;
    }
    return parseMerchantId(request.headers.authorization, { allowTestBearer: options.environment !== 'production' });
  }

  async function resolveAndroidMerchantContext(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ merchantId: string; source: 'android_mobile_session' | 'dev_test_bearer' } | null> {
    const bearerToken = parseBearerToken(request.headers.authorization);
    if (bearerToken?.startsWith('spm_')) {
      if (!authBffRepository) {
        reply.status(503).send(authBffRepositoryUnavailableError());
        return null;
      }
      const mobileSession = await authBffRepository.getAndroidMerchantMobileSessionByHash(
        hashAndroidMerchantMobileSessionToken(bearerToken),
        clock().toISOString()
      );
      return mobileSession ? { merchantId: mobileSession.merchantId, source: 'android_mobile_session' } : null;
    }

    const merchantId = parseMerchantId(request.headers.authorization, { allowTestBearer: options.environment !== 'production' });
    return merchantId ? { merchantId, source: 'dev_test_bearer' } : null;
  }

  async function requireAndroidMerchantId(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
    const context = await resolveAndroidMerchantContext(request, reply);
    if (context) {
      return context.merchantId;
    }
    if (!reply.sent) {
      reply.status(401).send(
        invalidRequest('An Android merchant mobile session is required for this endpoint.', {
          authorization: 'Bearer spm_<mobile_session_token>'
        })
      );
    }
    return null;
  }

  async function requireAndroidMerchantMobileSession(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<AndroidMerchantMobileSessionRecord | null> {
    const bearerToken = parseBearerToken(request.headers.authorization);
    if (!bearerToken?.startsWith('spm_')) {
      reply.status(401).send(
        invalidRequest('An Android merchant mobile session is required for this endpoint.', {
          authorization: 'Bearer spm_<mobile_session_token>'
        })
      );
      return null;
    }
    if (!authBffRepository) {
      reply.status(503).send(authBffRepositoryUnavailableError());
      return null;
    }
    const mobileSession = await authBffRepository.getAndroidMerchantMobileSessionByHash(
      hashAndroidMerchantMobileSessionToken(bearerToken),
      clock().toISOString()
    );
    if (!mobileSession) {
      reply.status(401).send(
        invalidRequest('An Android merchant mobile session is required for this endpoint.', {
          authorization: 'Bearer spm_<mobile_session_token>'
        })
      );
      return null;
    }
    return mobileSession;
  }

  server.get('/auth/google/start', async (_request, reply) => {
    if (!googleOAuthProvider.productionReady) {
      return reply.status(503).send(
        invalidRequest('Google OAuth provider is not configured for production BFF login.', {
          reason: googleOAuthProvider.reason
        })
      );
    }
    if (!googleOAuthProvider.configured) {
      return reply.status(501).send(
        invalidRequest('Google OAuth provider seam is available but not configured in this environment.', {
          provider: 'google',
          callback_path: googleOAuthProvider.callbackPath
        })
      );
    }
    return reply.status(501).send(
      invalidRequest('Google OAuth redirect flow is prepared but not enabled by this local build.', {
        provider: 'google',
        authorization_endpoint: googleOAuthProvider.authorizationEndpoint
      })
    );
  });

  server.get('/auth/google/callback', async (_request, reply) =>
    reply.status(501).send(invalidRequest('Google OAuth callback seam is present; provider exchange is a production follow-up.', {}))
  );

  server.post('/auth/dev/bootstrap-session', async (request, reply) => {
    if (options.environment === 'production') {
      return reply.status(404).send(invalidRequest('Development BFF login is disabled in production.', {}));
    }
    if (!authBffRepository) {
      return reply.status(503).send(invalidRequest('BFF session repository is not configured.', {}));
    }

    const body = request.body as Record<string, unknown> | null;
    const userId = asNonEmptyString(body?.user_id) ?? randomUUID();
    const merchantId = asNonEmptyString(body?.merchant_id) ?? randomUUID();
    const role = parseMerchantRole(body?.role) ?? 'owner';
    const now = clock();
    const sessionToken = createOpaqueSessionToken();
    const csrfToken = createCsrfToken();
    const expiresAt = new Date(now.getTime() + buildSessionCookieOptions(options.environment).maxAgeSeconds * 1000).toISOString();
    const context = await authBffRepository.bootstrapDevSession({
      userId,
      merchantId,
      email: asNonEmptyString(body?.email) ?? 'dev-merchant@swimpay.local',
      name: asNonEmptyString(body?.name) ?? 'Development Merchant',
      role,
      sessionIdHash: hashBffSessionToken(sessionToken),
      csrfSecretHash: hashCsrfToken(csrfToken),
      expiresAt,
      now: now.toISOString()
    });

    reply.header('Set-Cookie', serializeSessionCookie(sessionToken, buildSessionCookieOptions(options.environment)));
    return reply.status(201).send(toMeResponse(context, csrfToken));
  });

  server.get('/v1/me', async (request, reply) => {
    const session = await readBffSessionContext(request);
    if (!session) {
      return reply.status(401).send(invalidRequest('An authenticated BFF session is required.', {}));
    }
    return reply.status(200).send(toMeResponse(session.context));
  });

  server.post('/auth/logout', async (request, reply) => {
    const session = await readBffSessionContext(request);
    if (!session) {
      reply.header('Set-Cookie', serializeExpiredSessionCookie(options.environment));
      return reply.status(204).send();
    }
    if (!(await requireBffCsrf(request, session.sessionTokenHash))) {
      return reply.status(403).send(invalidRequest('A valid CSRF token is required for logout.', {}));
    }
    await authBffRepository?.revokeSession(session.sessionTokenHash, clock().toISOString());
    reply.header('Set-Cookie', serializeExpiredSessionCookie(options.environment));
    return reply.status(204).send();
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

  server.get('/v1/intelligence/bank-profiles', async () => ({
    profiles: V1StaticBankProfiles,
    count: V1StaticBankProfiles.length,
    profile_mode: 'static_controlled_v1',
    feedback_mutates_runtime_rules: false,
    official_bank_confirmation: false
  }));

  server.post('/v1/intelligence/feedback', async (request, reply) => {
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for intelligence feedback.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }

    const body = validateIntelligenceFeedbackRequest(request.body);
    if (!body.valid) {
      return reply.status(400).send(receiverContractError(body.code, body.field));
    }
    if (!intelligenceRepository) {
      return reply.status(503).send(intelligenceRepositoryUnavailableError());
    }

    const record = buildIntelligenceFeedbackRecord({
      feedbackId: randomUUID(),
      merchantId,
      request: body.value
    });
    const stored = await intelligenceRepository.storeFeedback(record);

    return reply.status(202).send(toIntelligenceFeedbackResponse(stored));
  });

  server.get('/v1/intelligence/unknown-shapes', async (request, reply) => {
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for unknown shape monitoring.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }
    if (!intelligenceRepository) {
      return reply.status(503).send(intelligenceRepositoryUnavailableError());
    }

    return reply.status(200).send({
      unknown_shapes: (await intelligenceRepository.listUnknownShapes(merchantId)).map(toUnknownShapeResponse),
      read_only: true,
      mutates_runtime_rules: false,
      promotes_profile: false,
      official_bank_confirmation: false,
      creates_payment_review: false
    });
  });

  server.get('/v1/merchant/integration', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.INTEGRATION_READ);
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(invalidRequest('An authenticated merchant session is required for developer integration.', {}));
    }
    if (!merchantIntegrationRepository) {
      return reply.status(503).send(developerIntegrationUnavailableError());
    }

    return reply.status(200).send(
      toMerchantIntegrationResponse(await merchantIntegrationRepository.getIntegration(merchantContext.merchantId, clock().toISOString()))
    );
  });

  server.post('/v1/merchant/integration/keys', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.INTEGRATION_KEYS_CREATE, {
      requireCsrf: true
    });
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(invalidRequest('An authenticated merchant session is required for developer integration.', {}));
    }
    if (!merchantIntegrationRepository) {
      return reply.status(503).send(developerIntegrationUnavailableError());
    }

    return reply.status(201).send(
      toMerchantIntegrationResponse(await merchantIntegrationRepository.ensureApiKey(merchantContext.merchantId, clock().toISOString()))
    );
  });

  server.post('/v1/merchant/integration/keys/rotate', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.INTEGRATION_KEYS_ROTATE, {
      requireCsrf: true
    });
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(invalidRequest('An authenticated merchant session is required for developer integration.', {}));
    }
    if (!merchantIntegrationRepository) {
      return reply.status(503).send(developerIntegrationUnavailableError());
    }

    return reply.status(201).send(
      toMerchantIntegrationResponse(await merchantIntegrationRepository.rotateApiKey(merchantContext.merchantId, clock().toISOString()))
    );
  });

  server.post('/v1/merchant/integration/webhook-secret/rotate', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.INTEGRATION_KEYS_ROTATE, {
      requireCsrf: true
    });
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(invalidRequest('An authenticated merchant session is required for developer integration.', {}));
    }
    if (!merchantIntegrationRepository) {
      return reply.status(503).send(developerIntegrationUnavailableError());
    }

    return reply.status(201).send(
      toMerchantIntegrationResponse(await merchantIntegrationRepository.rotateWebhookSecret(merchantContext.merchantId, clock().toISOString()))
    );
  });

  server.put('/v1/merchant/integration/webhook-url', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.INTEGRATION_WEBHOOK_UPDATE, {
      requireCsrf: true
    });
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(invalidRequest('An authenticated merchant session is required for developer integration.', {}));
    }
    if (!merchantIntegrationRepository) {
      return reply.status(503).send(developerIntegrationUnavailableError());
    }
    const body = request.body as { webhook_url?: unknown } | null;
    const webhookUrl = validateWebhookUrl(body?.webhook_url, options.environment);
    if (!webhookUrl.valid) {
      return reply.status(400).send(invalidRequest(webhookUrl.message, { field: 'webhook_url' }));
    }

    return reply.status(200).send(
      toMerchantIntegrationResponse(
        await merchantIntegrationRepository.updateWebhookUrl(merchantContext.merchantId, webhookUrl.value, clock().toISOString())
      )
    );
  });

  server.post('/v1/merchant/integration/test-webhook', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.INTEGRATION_WEBHOOK_TEST, {
      requireCsrf: true
    });
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(invalidRequest('An authenticated merchant session is required for developer integration.', {}));
    }
    if (!merchantIntegrationRepository) {
      return reply.status(503).send(developerIntegrationUnavailableError());
    }

    return reply.status(202).send(await merchantIntegrationRepository.enqueueTestWebhook(merchantContext.merchantId, clock().toISOString()));
  });

  server.get('/v1/merchant/integration/webhook-deliveries', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.INTEGRATION_DELIVERY_READ);
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(invalidRequest('An authenticated merchant session is required for developer integration.', {}));
    }
    if (!merchantIntegrationRepository) {
      return reply.status(503).send(developerIntegrationUnavailableError());
    }
    const query = request.query as { limit?: string };

    return reply.status(200).send({
      deliveries: await merchantIntegrationRepository.listDeliveries(merchantContext.merchantId, parseDeliveryLimit(query.limit)),
      public_webhook_events: ['payment.confirmed', 'payment.rejected', 'payment.expired'],
      raw_payload_included: false,
      official_bank_confirmation: false
    });
  });

  server.post('/v1/merchant/integration/webhook-deliveries/:id/retry', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.INTEGRATION_DELIVERY_RETRY, {
      requireCsrf: true
    });
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(invalidRequest('An authenticated merchant session is required for developer integration.', {}));
    }
    if (!merchantIntegrationRepository) {
      return reply.status(503).send(developerIntegrationUnavailableError());
    }
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Delivery id is required.', {}));
    }

    const result = await merchantIntegrationRepository.retryDelivery(merchantContext.merchantId, params.id, clock().toISOString());
    return reply.status(result.status === 'not_found' ? 404 : 202).send(result);
  });

  server.post('/v1/orders', async (request, reply) => {
    const merchantId = await resolveSdkMerchantId(request);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A valid merchant API key or authenticated development merchant bearer is required.', {})
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

  server.post('/v1/merchant/receiving-routes', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }
    const body = validateReceivingRouteCreateBody(request.body);
    if ('error' in body) {
      return reply.status(400).send(body);
    }
    const now = clock().toISOString();
    const route = buildMerchantReceivingRouteRecord({
      routeId: receivingRouteIdGenerator(),
      merchantId,
      bankProfileId: body.bank_profile_id,
      railType: body.rail_type,
      receiverIdentifier: body.receiver_identifier,
      routeCode: body.route_code,
      displayLabel: body.display_label,
      enabled: body.enabled,
      recommended: body.recommended,
      reviewPolicy: body.review_policy,
      feesHint: body.fees_hint,
      encryptionSecret: phoneHmacSecret,
      now
    });
    if ('error' in route) {
      return reply.status(400).send(route);
    }
    const result = await repository.createReceivingRoute({
      route,
      auditEventId: idGenerator.auditEventId()
    });
    if (result.kind === 'duplicate_route_code') {
      return reply.status(409).send({
        error: {
          code: 'duplicate_route_code',
          message: 'Receiving route code already exists for this merchant.',
          details: { route_code: body.route_code }
        }
      });
    }
    return reply.status(201).send({
      route: toMerchantReceivingRouteResponse(result.route),
      official_bank_confirmation: false
    });
  });

  server.get('/v1/merchant/receiving-routes', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }
    const routes = await repository.listReceivingRoutes(merchantId);
    return reply.status(200).send({
      routes: routes.map((route) => toMerchantReceivingRouteResponse(route)),
      official_bank_confirmation: false
    });
  });

  server.patch('/v1/merchant/receiving-routes/:route_id', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }
    const params = request.params as { route_id?: string };
    if (!params.route_id) {
      return reply.status(400).send(invalidRequest('Receiving route id is required.', {}));
    }
    const body = validateReceivingRoutePatchBody(request.body);
    if ('error' in body) {
      return reply.status(400).send(body);
    }
    const result = await repository.updateReceivingRoute({
      merchantId,
      routeId: params.route_id,
      patch: body,
      auditEventId: idGenerator.auditEventId(),
      now: clock().toISOString()
    });
    if (result.kind === 'not_found') {
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Receiving route was not found.',
          details: { route_id: params.route_id }
        }
      });
    }
    return reply.status(200).send({
      route: toMerchantReceivingRouteResponse(result.route),
      official_bank_confirmation: false
    });
  });

  server.get('/v1/checkout/:id/receiver-banks', async (request, reply) => {
    const loaded = await loadCheckoutSession({ request, reply, repository });
    if (!loaded) {
      return reply;
    }

    const routes = await repository!.listReceiverBanksForCheckout(loaded.paymentSession.merchantId, loaded.paymentSession.id);
    return reply.status(200).send(toReceiverBanksResponse(loaded.paymentSession, routes));
  });

  server.post('/v1/checkout/:id/receiver-bank', async (request, reply) => {
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Payment session id is required.', {}));
    }
    const body = request.body as { receiver_bank_id?: unknown } | undefined;
    if (typeof body?.receiver_bank_id !== 'string') {
      return reply.status(400).send(invalidRequest('receiver_bank_id is required.', {}));
    }
    const receiverBank = getReceiverBankOption(body.receiver_bank_id);
    if (!receiverBank) {
      return reply.status(400).send(invalidRequest('receiver_bank_id is not supported for this checkout.', {
        receiver_bank_id: body.receiver_bank_id
      }));
    }

    const result = await repository.selectReceiverBank({
      merchantId,
      paymentSessionId: params.id,
      receiverBankId: receiverBank.receiver_bank_id,
      bankProfileId: receiverBank.bank_profile_id,
      auditEventId: idGenerator.auditEventId(),
      now: clock().toISOString()
    });
    return sendCheckoutMutationResult(reply, result, (updated) =>
      buildReceiverBankSelectionResponse({ ...updated, now: clock() })
    );
  });

  server.get('/v1/checkout/:id/receiver-banks/:bank_profile_id/routes', async (request, reply) => {
    const loaded = await loadCheckoutSession({ request, reply, repository });
    if (!loaded) {
      return reply;
    }
    const params = request.params as { id?: string; bank_profile_id?: string };
    if (!params.bank_profile_id) {
      return reply.status(400).send(invalidRequest('bank_profile_id is required.', {}));
    }
    const receiverBank = getReceiverBankOption(params.bank_profile_id);
    if (!receiverBank) {
      return reply.status(400).send(invalidRequest('bank_profile_id is not supported for this checkout.', {
        bank_profile_id: params.bank_profile_id
      }));
    }
    if (loaded.paymentSession.selectedReceiverBankProfileId !== receiverBank.bank_profile_id) {
      return reply.status(409).send({
        error: {
          code: 'receiver_bank_not_selected',
          message: 'Select the receiver bank before revealing receiving routes.',
          details: { bank_profile_id: receiverBank.bank_profile_id }
        }
      });
    }
    const routes = await repository!.listReceivingRoutesForCheckoutBank(
      loaded.paymentSession.merchantId,
      loaded.paymentSession.id,
      receiverBank.bank_profile_id
    );
    return reply.status(200).send(
      toReceivingRoutesForBankResponse({
        paymentSession: loaded.paymentSession,
        bankProfileId: receiverBank.bank_profile_id,
        routes
      })
    );
  });

  server.post('/v1/checkout/:id/receiving-route', async (request, reply) => {
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Payment session id is required.', {}));
    }
    const body = request.body as { receiving_route_id?: unknown } | undefined;
    if (typeof body?.receiving_route_id !== 'string' || !body.receiving_route_id.trim()) {
      return reply.status(400).send(invalidRequest('receiving_route_id is required.', {}));
    }
    const loaded = await repository.getPaymentSessionById(merchantId, params.id);
    if (!loaded?.paymentSession.selectedReceiverBankProfileId) {
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Payment session or selected receiver bank was not found.',
          details: {}
        }
      });
    }
    const visibleRoutes = await repository.listReceivingRoutesForCheckoutBank(
      merchantId,
      params.id,
      loaded.paymentSession.selectedReceiverBankProfileId
    );
    const selectedRoute = visibleRoutes.find((route) => route.route_id === body.receiving_route_id) ?? null;
    if (!selectedRoute) {
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Receiving route was not found for the selected receiver bank.',
          details: { receiving_route_id: body.receiving_route_id }
        }
      });
    }
    const result = await repository.selectReceivingRoute({
      merchantId,
      paymentSessionId: params.id,
      receivingRouteId: selectedRoute.route_id,
      auditEventId: idGenerator.auditEventId(),
      now: clock().toISOString()
    });
    return sendCheckoutMutationResult(reply, result, (updated) =>
      buildReceivingRouteSelectionResponse({ ...updated, now: clock(), route: selectedRoute })
    );
  });

  server.get('/v1/checkout/:id/receiving-route/copy-details', async (request, reply) => {
    applyCopyDetailsNoStoreHeaders(reply);
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Payment session id is required.', {}));
    }

    const result = await repository.getSelectedReceivingRouteCopyDetails({
      merchantId,
      paymentSessionId: params.id,
      encryptionSecret: phoneHmacSecret,
      now: clock().toISOString()
    });

    if (result.kind === 'not_found') {
      return reply.status(404).send(invalidRequest('Selected receiving route was not found.', { payment_session_id: params.id }));
    }
    if (result.kind === 'expired') {
      return reply.status(409).send(invalidRequest('Payment session is expired.', { payment_session_id: params.id }));
    }
    if (result.kind === 'inactive') {
      return reply.status(409).send({
        error: {
          code: 'checkout_session_inactive',
          message: 'Copy details are available only for active checkout sessions.',
          details: { payment_session_id: params.id }
        }
      });
    }
    if (result.kind === 'not_selected') {
      return reply.status(409).send(
        invalidRequest('Receiving route must be selected before copy details are available.', {
          payment_session_id: params.id
        })
      );
    }

    const rateLimitKey = buildCopyDetailsRateLimitKey({
      sessionId: result.paymentSession.id,
      routeId: result.route.route_id,
      fingerprint: coarseClientFingerprint(request.headers, request.ip)
    });
    if (isCopyDetailsRateLimited(copyDetailsLimiter, rateLimitKey, clock().getTime())) {
      reply.header('Retry-After', String(Math.ceil(COPY_DETAILS_RATE_LIMIT_WINDOW_MS / 1000)));
      return reply.status(429).send({
        error: {
          code: 'copy_details_rate_limited',
          message: 'Destination copy was requested too often. Try again later.',
          details: {
            payment_session_id: result.paymentSession.id,
            receiving_route_id: result.route.route_id
          }
        }
      });
    }

    const now = clock();
    await repository.recordCheckoutDestinationCopied({
      merchantId,
      paymentSessionId: result.paymentSession.id,
      routeId: result.route.route_id,
      railType: result.route.rail_type,
      receiverIdentifierMasked: result.route.receiver_identifier_masked,
      auditEventId: idGenerator.auditEventId(),
      now: now.toISOString()
    });

    return reply.status(200).send(
      toReceivingRouteCopyDetailsResponse({
        paymentSession: result.paymentSession,
        route: result.route,
        receiverIdentifier: result.receiverIdentifier,
        revealExpiresAt: new Date(now.getTime() + COPY_DETAILS_REVEAL_TTL_MS).toISOString()
      })
    );
  });

  server.post('/v1/checkout/:id/buyer-sender-phone', async (request, reply) => {
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Payment session id is required.', {}));
    }
    const body = request.body as { buyer_sender_phone?: unknown } | undefined;
    if (typeof body?.buyer_sender_phone !== 'string') {
      return reply.status(400).send(invalidRequest('buyer_sender_phone is required.', {}));
    }
    const normalizedPhone = normalizeRussianPhone(body.buyer_sender_phone);
    if (!normalizedPhone) {
      return reply.status(400).send(invalidRequest('buyer_sender_phone must be a valid Russian phone number.', {}));
    }
    const result = await repository.saveBuyerSenderPhoneHint({
      merchantId,
      paymentSessionId: params.id,
      buyerSenderPhoneHmac: hmacSha256(normalizedPhone, phoneHmacSecret),
      buyerSenderPhoneMasked: maskPhone(normalizedPhone),
      auditEventId: idGenerator.auditEventId(),
      now: clock().toISOString()
    });
    return sendCheckoutMutationResult(reply, result, (updated) =>
      buildBuyerSenderPhoneHintResponse({ ...updated, now: clock() })
    );
  });

  server.get('/v1/checkout/:id/payer-bank-launchers', async (request, reply) => {
    const loaded = await loadCheckoutSession({ request, reply, repository });
    if (!loaded) {
      return reply;
    }

    return reply.status(200).send(toPayerBankLaunchersResponse(loaded.paymentSession));
  });

  server.post('/v1/checkout/:id/payer-bank-launcher', async (request, reply) => {
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Payment session id is required.', {}));
    }
    const body = request.body as { payer_bank_launcher_id?: unknown } | undefined;
    if (typeof body?.payer_bank_launcher_id !== 'string') {
      return reply.status(400).send(invalidRequest('payer_bank_launcher_id is required.', {}));
    }
    const launcher = getPayerBankLauncherOption(body.payer_bank_launcher_id);
    if (!launcher) {
      return reply.status(400).send(invalidRequest('payer_bank_launcher_id is not supported for this checkout.', {
        payer_bank_launcher_id: body.payer_bank_launcher_id
      }));
    }
    const loaded = await repository.getPaymentSessionById(merchantId, params.id);
    if (!loaded?.paymentSession.selectedReceivingRouteId) {
      return reply.status(409).send({
        error: {
          code: 'receiving_route_required',
          message: 'Select a merchant receiving route before choosing the payer bank launcher.',
          details: {}
        }
      });
    }

    const result = await repository.selectPayerBankLauncher({
      merchantId,
      paymentSessionId: params.id,
      payerBankLauncherId: launcher.payer_bank_launcher_id,
      auditEventId: idGenerator.auditEventId(),
      now: clock().toISOString()
    });
    return sendCheckoutMutationResult(reply, result, (updated) =>
      buildPayerBankLauncherSelectionResponse({ ...updated, now: clock() })
    );
  });

  server.post('/v1/checkout/:id/payment-instructions-shown', async (request, reply) => {
    const result = await mutateSimpleCheckoutAction({ request, reply, repository, idGenerator, clock, action: 'instructions' });
    if (!result) {
      return reply;
    }
    return reply.status(200).send(buildCheckoutActionResponse({ ...result, now: clock() }));
  });

  server.post('/v1/checkout/:id/continue-to-bank', async (request, reply) => {
    const result = await mutateSimpleCheckoutAction({ request, reply, repository, idGenerator, clock, action: 'receiver_armed' });
    if (!result) {
      return reply;
    }
    return reply.status(200).send(buildCheckoutActionResponse({ ...result, now: clock() }));
  });

  server.post('/v1/checkout/:id/claimed-paid', async (request, reply) => {
    const result = await mutateSimpleCheckoutAction({ request, reply, repository, idGenerator, clock, action: 'claimed_paid' });
    if (!result) {
      return reply;
    }
    return reply.status(202).send(buildCheckoutActionResponse({ ...result, now: clock(), buyerClaimedPaid: true }));
  });

  server.get('/v1/checkout/:id/status', async (request, reply) => {
    const loaded = await loadCheckoutSession({ request, reply, repository });
    if (!loaded) {
      return reply;
    }

    return reply.status(200).send(
      toCheckoutStatusResponse({
        order: loaded.order,
        paymentSession: loaded.paymentSession,
        now: clock()
      })
    );
  });

  server.post('/v1/receiver-devices/register', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.RECEIVER_CONFIGURE, {
      requireCsrf: true
    });
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(
        invalidRequest('An authenticated merchant session is required for receiver device registration.', {})
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
      merchantId: merchantContext.merchantId,
      deviceId: receiverDeviceIdGenerator(),
      auditEventId: idGenerator.auditEventId(),
      now: clock()
    });

    let device;
    try {
      device = await receiverDeviceRepository.createReceiverDevice(input);
    } catch (error) {
      if (isPgForeignKeyViolation(error)) {
        return reply.status(401).send(
          invalidRequest('An authenticated merchant session is required for receiver device registration.', {})
        );
      }
      throw error;
    }
    metrics.increment(MetricNames.RECEIVER_REGISTRATIONS_TOTAL);

    return reply.status(201).send(
      buildReceiverRegistrationResponse({
        device,
        merchantId: merchantContext.merchantId,
        serverTime: clock().toISOString()
      })
    );
  });

  server.post('/v1/receiver-devices/heartbeat', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.RECEIVER_CONFIGURE, {
      requireCsrf: true
    });
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(
        invalidRequest('An authenticated merchant session is required for receiver heartbeat.', {})
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
      merchantId: merchantContext.merchantId,
      deviceId: body.value.device_id,
      notificationAccessStatus: body.value.notification_access,
      listenerConnected: body.value.listener_connected,
      allowedBankProfileIds: body.value.allowed_bank_profile_ids,
      reportedStatus: body.value.status,
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

    if (
      options.environment === 'production' &&
      !isReceiverSignalObservedAtWithinTolerance({
        observedAt: body.value.observed_at,
        receivedAt: clock()
      })
    ) {
      metrics.increment(MetricNames.RECEIVER_SIGNALS_REJECTED_TOTAL);
      return reply.status(400).send(receiverContractError('timestamp_out_of_range', 'observed_at'));
    }

    const device = await signalRepository.getReceiverDevice({
      merchantId: body.value.merchant_id,
      deviceId: body.value.device_id
    });
    if (!device) {
      metrics.increment(MetricNames.RECEIVER_SIGNALS_REJECTED_TOTAL);
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

    if (!isReceiverDeviceEligibleForSignalUpload(device)) {
      metrics.increment(MetricNames.RECEIVER_SIGNALS_REJECTED_TOTAL);
      return reply.status(403).send({
        error: {
          code: 'receiver_device_disabled',
          message: 'Receiver device is not allowed to upload signals.',
          details: {
            device_id: body.value.device_id,
            status: device.status
          }
        }
      });
    }

    const signatureVerification = verifyReceiverSignalSignature(body.value, device.publicKey);
    if (!signatureVerification.valid) {
      metrics.increment(MetricNames.RECEIVER_SIGNATURE_INVALID_TOTAL);
      metrics.increment(MetricNames.RECEIVER_SIGNALS_REJECTED_TOTAL);
      return reply.status(401).send({
        error: {
          code: signatureVerification.reason === 'missing_signature' ? 'signature_missing' : 'invalid_signature',
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

  server.post('/v1/bank-evidence', async (request, reply) => {
    const merchantId = parseMerchantId(request.headers.authorization);
    if (!merchantId) {
      return reply.status(401).send(
        invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
          authorization: 'Bearer test_<merchant_id>'
        })
      );
    }

    if (!bankEvidenceRepository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Bank evidence repository is not configured.',
          details: {}
        }
      });
    }

    const body = validateBankEvidenceSubmitBody(request.body);
    if (!body.valid) {
      return reply.status(400).send(body.response);
    }

    const occurredAt = clock().toISOString();
    const result = await bankEvidenceRepository.submitEvidence({
      evidenceId: bankEvidenceIdGenerator(),
      merchantId,
      deviceId: body.value.device_id,
      bankProfileId: body.value.bank_profile_id,
      packageName: body.value.package_name,
      certSha256: body.value.cert_sha256,
      appVersion: body.value.app_version,
      installSource: body.value.install_source,
      source: body.value.source,
      auditEventId: idGenerator.auditEventId(),
      occurredAt
    });

    switch (result.kind) {
      case 'stored':
        return reply.status(201).send(toBankEvidenceSubmitResponse(result.evidence));
      case 'duplicate':
        return reply.status(200).send(toBankEvidenceSubmitResponse(result.evidence, { duplicate: true }));
      case 'device_not_found':
        return reply.status(404).send({
          error: {
            code: 'receiver_device_not_found',
            message: 'Receiver device was not found.',
            details: { device_id: body.value.device_id }
          }
        });
      case 'bank_profile_not_found':
        return reply.status(400).send({
          error: {
            code: 'bank_profile_not_found',
            message: 'Bank profile was not found.',
            details: { bank_profile_id: body.value.bank_profile_id }
          }
        });
    }
  });

  server.get('/v1/reviews', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
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

  server.post(AndroidMerchantAccountAuthPaths.DEVICE_LOOKUP, async (request, reply) => {
    if (!authBffRepository) {
      return reply.status(503).send(authBffRepositoryUnavailableError());
    }
    const parsed = validateAndroidMerchantDeviceLookupRequest(request.body);
    if (!parsed.valid) {
      return reply.status(400).send(androidMerchantAccountContractError(parsed.code, parsed.field));
    }

    const result = await authBffRepository.lookupAndroidMerchantDevice({
      deviceProofHash: hashAndroidMerchantDeviceProof(parsed.value.device_proof.install_public_key),
      lookupIntent: parsed.value.lookup_intent,
      now: clock().toISOString()
    });
    return reply.status(200).send(
      buildAndroidMerchantDeviceLookupResponse({
        device_status: result.deviceStatus,
        device_id: result.device?.id ?? null,
        merchant_id: result.device?.merchantId ?? null
      })
    );
  });

  server.post(AndroidMerchantAccountAuthPaths.CREATE_ACCOUNT, async (request, reply) => {
    if (!authBffRepository) {
      return reply.status(503).send(authBffRepositoryUnavailableError());
    }
    const parsed = validateAndroidMerchantCreateAccountRequest(request.body);
    if (!parsed.valid) {
      return reply.status(400).send(androidMerchantAccountContractError(parsed.code, parsed.field));
    }

    const now = clock();
    const userId = randomUUID();
    const merchantId = randomUUID();
    const deviceId = randomUUID();
    const mobileSessionId = randomUUID();
    const mobileSessionToken = createAndroidMerchantMobileSessionToken();
    const expiresAt = new Date(now.getTime() + ANDROID_MERCHANT_MOBILE_SESSION_TTL_MS).toISOString();
    const result = await authBffRepository.createAndroidMerchantAccount({
      userId,
      merchantId,
      deviceId,
      mobileSessionId,
      mobileSessionHash: hashAndroidMerchantMobileSessionToken(mobileSessionToken),
      profileType: parsed.value.profile_type,
      businessLabel: truncateAndroidMerchantBusinessLabel(parsed.value.business_label ?? null),
      displayHandle: buildAndroidMerchantDisplayHandle(userId),
      deviceProofHash: hashAndroidMerchantDeviceProof(parsed.value.device_proof.install_public_key),
      expiresAt,
      now: now.toISOString()
    });

    if (result.kind === 'device_already_registered') {
      return reply.status(409).send(
        invalidRequest('This Android merchant device proof is already linked to an account.', {
          device_status: AndroidMerchantDeviceLookupStatuses.KNOWN_DEVICE
        })
      );
    }

    return reply.status(201).send(toAndroidMerchantAccountCreateResponse(result.account, mobileSessionToken));
  });

  server.post(AndroidMerchantAccountAuthPaths.GOOGLE_EXCHANGE, async (request, reply) => {
    if (!authBffRepository) {
      return reply.status(503).send(authBffRepositoryUnavailableError());
    }
    if (!googleIdTokenVerifier) {
      return reply.status(503).send(googleRecoveryUnconfiguredError('account_recovery'));
    }
    const parsed = validateAndroidMerchantGoogleExchangeRequest(request.body);
    if (!parsed.valid) {
      return reply.status(400).send(androidMerchantAccountContractError(parsed.code, parsed.field));
    }
    const verified = await googleIdTokenVerifier.verifyIdToken(parsed.value.id_token);
    if (!verified) {
      return reply.status(401).send(googleIdTokenRejectedError('account_recovery'));
    }

    const now = clock();
    const mobileSessionToken = createAndroidMerchantMobileSessionToken();
    const result = await authBffRepository.recoverAndroidMerchantAccountWithGoogle({
      googleSub: verified.googleSub,
      deviceProofHash: hashAndroidMerchantDeviceProof(parsed.value.device_proof.install_public_key),
      deviceId: randomUUID(),
      mobileSessionId: randomUUID(),
      mobileSessionHash: hashAndroidMerchantMobileSessionToken(mobileSessionToken),
      expiresAt: new Date(now.getTime() + ANDROID_MERCHANT_MOBILE_SESSION_TTL_MS).toISOString(),
      now: now.toISOString()
    });
    if (result.kind === 'google_sub_not_linked') {
      return reply.status(404).send(
        invalidRequest('Google account is not linked to a SwimPay Android profile.', {
          provider: 'google',
          purpose: 'account_recovery'
        })
      );
    }
    if (result.kind === 'device_already_registered') {
      return reply.status(409).send(
        invalidRequest('This Android merchant device proof is already linked to another account.', {
          device_status: AndroidMerchantDeviceLookupStatuses.KNOWN_DEVICE
        })
      );
    }
    return reply.status(200).send(toAndroidMerchantAccountCreateResponse(result.account, mobileSessionToken));
  });

  server.post(AndroidMerchantAccountAuthPaths.GOOGLE_LINK, async (request, reply) => {
    const mobileSession = await requireAndroidMerchantMobileSession(request, reply);
    if (!mobileSession) {
      return;
    }
    if (!authBffRepository) {
      return reply.status(503).send(authBffRepositoryUnavailableError());
    }
    if (!googleIdTokenVerifier) {
      return reply.status(503).send(googleRecoveryUnconfiguredError('account_recovery_linking'));
    }
    const idToken = parseGoogleIdToken(request.body);
    if (!idToken) {
      return reply.status(400).send(
        invalidRequest('A Google ID token is required for account recovery linking.', {
          provider: 'google',
          purpose: 'account_recovery_linking'
        })
      );
    }
    const verified = await googleIdTokenVerifier.verifyIdToken(idToken);
    if (!verified) {
      return reply.status(401).send(googleIdTokenRejectedError('account_recovery_linking'));
    }
    const link = await authBffRepository.linkAndroidMerchantGoogleSub({
      userId: mobileSession.userId,
      googleSub: verified.googleSub,
      now: clock().toISOString()
    });
    if (link.kind === 'google_sub_conflict') {
      return reply.status(409).send(
        invalidRequest('Google account is already linked to another SwimPay profile.', {
          provider: 'google',
          purpose: 'account_recovery_linking'
        })
      );
    }
    return reply.status(200).send({
      status: 'linked',
      provider: 'google',
      purpose: 'account_recovery_linking'
    });
  });

  server.get('/v1/android-merchant/dashboard-summary', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
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
    return reply.status(200).send(toAndroidMerchantDashboardSummaryResponse(reviews));
  });

  server.get('/v1/android-merchant/payments/:id', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
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
      return reply.status(400).send(invalidRequest('Payment id is required.', {}));
    }

    const reviews = await reviewRepository.listOpenReviews(merchantId);
    const review = reviews.find((item) => [item.id, item.orderId, item.paymentSessionId].includes(params.id!));
    if (!review) {
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Payment review was not found.',
          details: { payment_id: params.id }
        }
      });
    }

    const route = repository ? await findSelectedRouteForReview(repository, merchantId, review) : null;
    return reply.status(200).send(toAndroidMerchantPaymentDetailResponse(review, route));
  });

  server.get('/v1/android-merchant/connected-site', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    void merchantId;
    const query = request.query as { developer_mode?: string | boolean | undefined };
    const developerMode = query.developer_mode === true || query.developer_mode === 'true';
    return reply.status(200).send(toAndroidMerchantConnectedSiteResponse(androidMerchantConnectedSite, developerMode));
  });

  server.post('/v1/android-merchant/connected-site/test', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    const occurredAt = clock().toISOString();
    const deliveryId = androidMerchantDeliveryIdGenerator();
    await eventPublisher.publish({
      eventId: idGenerator.auditEventId(),
      eventType: EventTypes.WEBHOOK_DELIVERY_REQUESTED,
      version: 1,
      occurredAt,
      merchantId,
      idempotencyKey: `android_merchant_connected_site_test:${merchantId}:${deliveryId}`,
      data: {
        delivery_id: deliveryId,
        test_only: true,
        source: 'android_merchant_connected_site_test',
        ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
      }
    });
    return reply.status(202).send({
      status: 'test_queued',
      delivery_id: deliveryId,
      safe_status: 'Notification envoyée',
      android_sent_webhook_directly: false,
      ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
    });
  });

  server.post('/v1/android-merchant/configuration-test', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }
    const body = parseAndroidMerchantConfigurationTestBody(request.body);
    const routes = await repository.listReceivingRoutes(merchantId);
    return reply.status(200).send(
      toAndroidMerchantConfigurationTestResponse({
        receiverConnected: body.receiverConnected,
        notificationAccessActive: body.notificationAccessActive,
        bankChosen: routes.some((route) => route.enabled),
        receivingMethodAdded: routes.some((route) => route.enabled),
        connectedSiteConfigured: body.connectedSiteConfigured ?? androidMerchantConnectedSite.status === 'active'
      })
    );
  });

  server.post('/v1/reviews/:id/confirm', async (request, reply) => {
    const context = await resolveMerchantContext(request, reply, MerchantPermissions.PAYMENTS_REVIEW_CONFIRM, {
      requireCsrf: true
    });
    if (!context) {
      if (!reply.sent) {
        return reply.status(401).send(
          invalidRequest('A merchant dashboard session or development bearer token is required for manual confirmation.', {
            authorization: 'Bearer test_<merchant_id>'
          })
        );
      }
      return;
    }
    const { merchantId } = context;

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
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
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

  server.get('/v1/admin/intelligence/feedback', async (request, reply) => {
    const operator = requireAdminPermission({
      request,
      reply,
      adminAuth,
      permission: OperatorPermissions.VIEW_BANK_TEMPLATES
    });
    if (!operator) {
      return reply;
    }
    if (!intelligenceRepository) {
      return reply.status(503).send(intelligenceRepositoryUnavailableError());
    }

    const query = request.query as { limit?: string; merchant_id?: string };
    const feedback = await intelligenceRepository.listFeedback({
      merchantId: typeof query.merchant_id === 'string' && query.merchant_id.trim().length > 0 ? query.merchant_id.trim() : undefined,
      limit: parseAdminLimit(query.limit)
    });

    return reply.status(200).send({
      feedback: feedback.map(toIntelligenceFeedbackResponse),
      read_only: true,
      mutates_runtime_rules: false,
      promotes_profile: false,
      official_bank_confirmation: false,
      creates_payment_review: false
    });
  });

  server.get('/v1/admin/intelligence/unknown-shapes', async (request, reply) => {
    const operator = requireAdminPermission({
      request,
      reply,
      adminAuth,
      permission: OperatorPermissions.VIEW_BANK_TEMPLATES
    });
    if (!operator) {
      return reply;
    }
    if (!intelligenceRepository) {
      return reply.status(503).send(intelligenceRepositoryUnavailableError());
    }

    const query = request.query as { merchant_id?: string };
    const merchantId = typeof query.merchant_id === 'string' && query.merchant_id.trim().length > 0 ? query.merchant_id.trim() : undefined;

    return reply.status(200).send({
      unknown_shapes: (await intelligenceRepository.listUnknownShapes(merchantId)).map(toUnknownShapeResponse),
      read_only: true,
      mutates_runtime_rules: false,
      promotes_profile: false,
      official_bank_confirmation: false,
      creates_payment_review: false
    });
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

  server.get('/v1/admin/bank-app-signatures', async (request, reply) => {
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
    return reply
      .status(200)
      .send(toAdminListResponse('bank_app_signatures', await adminRepository.listBankAppSignatures(parseAdminLimit(query.limit))));
  });

  server.get('/v1/admin/bank-evidence', async (request, reply) => {
    const operator = requireAdminPermission({
      request,
      reply,
      adminAuth,
      permission: OperatorPermissions.VIEW_BANK_TEMPLATES
    });
    if (!operator) {
      return reply;
    }

    if (!bankEvidenceRepository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Bank evidence repository is not configured.',
          details: {}
        }
      });
    }

    const query = request.query as {
      limit?: string;
      status?: string;
      bank_profile_id?: string;
      package_name?: string;
      source?: string;
      submitted_after?: string;
      submitted_before?: string;
    };
    const evidence = await bankEvidenceRepository.listEvidence({
      limit: parseAdminLimit(query.limit),
      filters: parseBankEvidenceListFilters(query)
    });
    return reply.status(200).send(toAdminListResponse('bank_evidence', evidence.map(toBankEvidenceResponse)));
  });

  server.get('/v1/admin/bank-evidence/review-dashboard', async (request, reply) => {
    const operator = requireAdminPermission({
      request,
      reply,
      adminAuth,
      permission: OperatorPermissions.VIEW_BANK_TEMPLATES
    });
    if (!operator) {
      return reply;
    }

    if (!bankEvidenceRepository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Bank evidence repository is not configured.',
          details: {}
        }
      });
    }

    const query = request.query as { limit?: string };
    const evidence = await bankEvidenceRepository.listEvidence({
      limit: parseAdminLimit(query.limit),
      filters: {}
    });
    return reply.status(200).send(toBankEvidenceReviewDashboardResponse(evidence));
  });

  server.get('/v1/admin/bank-evidence/:id', async (request, reply) => {
    const operator = requireAdminPermission({
      request,
      reply,
      adminAuth,
      permission: OperatorPermissions.VIEW_BANK_TEMPLATES
    });
    if (!operator) {
      return reply;
    }

    if (!bankEvidenceRepository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Bank evidence repository is not configured.',
          details: {}
        }
      });
    }

    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Bank evidence id is required.', {}));
    }

    const evidence = await bankEvidenceRepository.getEvidence(params.id);
    if (!evidence) {
      return reply.status(404).send({
        error: {
          code: 'bank_evidence_not_found',
          message: 'Bank evidence was not found.',
          details: { evidence_id: params.id }
        }
      });
    }

    return reply.status(200).send(toBankEvidenceResponse(evidence));
  });

  server.post('/v1/admin/bank-evidence/:id/approve-review-only', async (request, reply) => {
    return handleBankEvidenceReviewAction({
      request,
      reply,
      bankEvidenceRepository,
      adminAuth,
      requiredPermission: OperatorPermissions.PROMOTE_BANK_TEMPLATES,
      action: 'approve_review_only',
      auditEventId: idGenerator.auditEventId(),
      occurredAt: clock().toISOString()
    });
  });

  server.post('/v1/admin/bank-evidence/:id/reject', async (request, reply) => {
    return handleBankEvidenceReviewAction({
      request,
      reply,
      bankEvidenceRepository,
      adminAuth,
      requiredPermission: OperatorPermissions.DEGRADE_BANK_TEMPLATES,
      action: 'reject',
      auditEventId: idGenerator.auditEventId(),
      occurredAt: clock().toISOString()
    });
  });

  server.post('/v1/admin/bank-evidence/:id/deprecate', async (request, reply) => {
    return handleBankEvidenceReviewAction({
      request,
      reply,
      bankEvidenceRepository,
      adminAuth,
      requiredPermission: OperatorPermissions.DEGRADE_BANK_TEMPLATES,
      action: 'deprecate',
      auditEventId: idGenerator.auditEventId(),
      occurredAt: clock().toISOString()
    });
  });

  server.post('/v1/admin/bank-evidence/:id/request-production-trust', async (request, reply) => {
    return handleBankEvidenceProductionTrustAction({
      request,
      reply,
      bankEvidenceRepository,
      adminAuth,
      requiredPermission: OperatorPermissions.REQUEST_BANK_EVIDENCE_PRODUCTION_TRUST,
      action: 'request_production_trust',
      auditEventId: idGenerator.auditEventId(),
      occurredAt: clock().toISOString()
    });
  });

  server.post('/v1/admin/bank-evidence/:id/approve-production-trust', async (request, reply) => {
    return handleBankEvidenceProductionTrustAction({
      request,
      reply,
      bankEvidenceRepository,
      adminAuth,
      requiredPermission: OperatorPermissions.APPROVE_BANK_EVIDENCE_PRODUCTION_TRUST,
      action: 'approve_production_trust',
      auditEventId: idGenerator.auditEventId(),
      occurredAt: clock().toISOString()
    });
  });

  server.post('/v1/admin/bank-evidence/:id/revoke-production-trust', async (request, reply) => {
    return handleBankEvidenceProductionTrustAction({
      request,
      reply,
      bankEvidenceRepository,
      adminAuth,
      requiredPermission: OperatorPermissions.REVOKE_BANK_EVIDENCE_PRODUCTION_TRUST,
      action: 'revoke_production_trust',
      auditEventId: idGenerator.auditEventId(),
      occurredAt: clock().toISOString()
    });
  });

  server.post('/v1/admin/bank-app-signatures/:id/verify', async (request, reply) => {
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
      return reply.status(400).send(invalidRequest('Bank app signature id is required.', {}));
    }

    const body = validateAdminActionBody(request.body);
    if ('error' in body) {
      return reply.status(400).send(body);
    }

    const result = await adminRepository.verifyBankAppSignature({
      signatureId: params.id,
      operatorId: operator.operatorId,
      reason: body.reason,
      auditEventId: idGenerator.auditEventId(),
      occurredAt: clock().toISOString()
    });

    if (result.kind === 'updated') {
      return reply.status(200).send({
        signature_id: result.signature.signatureId,
        bank_profile_id: result.signature.bankProfileId,
        package_name: result.signature.packageName,
        cert_sha256_masked: result.signature.certSha256Masked,
        status: result.signature.status,
        audit_event_id: result.auditEvent.auditEventId
      });
    }

    if (result.kind === 'not_found') {
      return reply.status(404).send({
        error: {
          code: 'bank_app_signature_not_found',
          message: 'Bank app signature was not found.',
          details: { signature_id: params.id }
        }
      });
    }

    return reply.status(409).send({
      error: {
        code: 'bank_app_signature_to_verify',
        message: 'TO_VERIFY package or certificate metadata cannot be trusted automatically.',
        details: { signature_id: params.id }
      }
    });
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

    const query = request.query as {
      limit?: string;
      event_type?: string;
      object_type?: string;
      object_id?: string;
      actor_id?: string;
      created_after?: string;
      created_before?: string;
    };
    return reply.status(200).send(
      toAdminListResponse(
        'audit_events',
        await adminRepository.searchAuditEvents({
          limit: parseAdminLimit(query.limit),
          eventType: query.event_type,
          objectType: query.object_type,
          objectId: query.object_id,
          actorId: query.actor_id,
          createdAfter: query.created_after,
          createdBefore: query.created_before
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

function createDefaultBankEvidenceRepository(env: NodeJS.ProcessEnv): BankEvidenceRepository | null {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  return new PgBankEvidenceRepository(databaseUrl);
}

async function loadCheckoutSession(params: {
  request: FastifyRequest;
  reply: FastifyReply;
  repository: OrderRepository | null;
}): Promise<{ order: StoredOrderRecord; paymentSession: StoredPaymentSessionRecord } | null> {
  const merchantId = parseMerchantId(params.request.headers.authorization);
  if (!merchantId) {
    params.reply.status(401).send(
      invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
        authorization: 'Bearer test_<merchant_id>'
      })
    );
    return null;
  }
  if (!params.repository) {
    params.reply.status(503).send(orderRepositoryUnavailableError());
    return null;
  }
  const routeParams = params.request.params as { id?: string };
  if (!routeParams.id) {
    params.reply.status(400).send(invalidRequest('Payment session id is required.', {}));
    return null;
  }

  const result = await params.repository.getPaymentSessionById(merchantId, routeParams.id);
  if (!result) {
    params.reply.status(404).send({
      error: {
        code: 'not_found',
        message: 'Payment session was not found.',
        details: { payment_session_id: routeParams.id }
      }
    });
    return null;
  }

  return result;
}

async function mutateSimpleCheckoutAction(params: {
  request: FastifyRequest;
  reply: FastifyReply;
  repository: OrderRepository | null;
  idGenerator: IdGenerator;
  clock: () => Date;
  action: 'instructions' | 'receiver_armed' | 'claimed_paid';
}) {
  const merchantId = parseMerchantId(params.request.headers.authorization);
  if (!merchantId) {
    params.reply.status(401).send(
      invalidRequest('A test merchant bearer token is required for this foundation endpoint.', {
        authorization: 'Bearer test_<merchant_id>'
      })
    );
    return null;
  }
  if (!params.repository) {
    params.reply.status(503).send(orderRepositoryUnavailableError());
    return null;
  }
  const routeParams = params.request.params as { id?: string };
  if (!routeParams.id) {
    params.reply.status(400).send(invalidRequest('Payment session id is required.', {}));
    return null;
  }

  const input = {
    merchantId,
    paymentSessionId: routeParams.id,
    auditEventId: params.idGenerator.auditEventId(),
    now: params.clock().toISOString()
  };
  const loaded = await params.repository.getPaymentSessionById(merchantId, routeParams.id);
  if (!loaded) {
    params.reply.status(404).send({
      error: {
        code: 'not_found',
        message: 'Payment session was not found.',
        details: {}
      }
    });
    return null;
  }
  if (
    (params.action === 'instructions' || params.action === 'receiver_armed') &&
    (!loaded.paymentSession.selectedReceivingRouteId || !loaded.paymentSession.selectedPayerBankLauncherId)
  ) {
    params.reply.status(409).send({
      error: {
        code: 'checkout_selection_incomplete',
        message: 'Receiver bank, receiving route and payer launcher must be selected before payment instructions are shown.',
        details: {}
      }
    });
    return null;
  }
  const result = await mutateCheckoutActionRepository(params.repository, params.action, input);
  switch (result.kind) {
    case 'updated':
      return result;
    case 'not_found':
      params.reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Payment session was not found.',
          details: {}
        }
      });
      return null;
    case 'expired':
      params.reply.status(409).send({
        error: {
          code: 'checkout_session_expired',
          message: 'Checkout session is expired.',
          details: {}
        }
      });
      return null;
  }
}

function mutateCheckoutActionRepository(
  repository: OrderRepository,
  action: 'instructions' | 'receiver_armed' | 'claimed_paid',
  input: Parameters<OrderRepository['markPaymentInstructionsShown']>[0]
) {
  switch (action) {
    case 'instructions':
      return repository.markPaymentInstructionsShown(input);
    case 'receiver_armed':
      return repository.markReceiverArmed(input);
    case 'claimed_paid':
      return repository.markBuyerClaimedPaid(input);
  }
}

function sendCheckoutMutationResult<T>(
  reply: FastifyReply,
  result: Awaited<ReturnType<OrderRepository['selectReceiverBank']>>,
  mapUpdated: (updated: { kind: 'updated'; order: StoredOrderRecord; paymentSession: StoredPaymentSessionRecord }) => T
) {
  switch (result.kind) {
    case 'updated':
      return mapUpdated(result);
    case 'not_found':
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Payment session was not found.',
          details: {}
        }
      });
    case 'expired':
      return reply.status(409).send({
        error: {
          code: 'checkout_session_expired',
          message: 'Checkout session is expired.',
          details: {}
        }
      });
  }
}

interface AndroidMerchantConnectedSiteConfig {
  url: string | null;
  status: 'active' | 'problem';
}

function toAndroidMerchantAccountCreateResponse(
  account: AndroidMerchantAccountRecord,
  mobileSessionToken: string
): AndroidMerchantAccountCreateResponse {
  return buildAndroidMerchantAccountCreateResponse({
    user_id: account.userId,
    merchant_id: account.merchantId,
    device_id: account.deviceId,
    profile_type: account.profileType,
    display_handle: account.displayHandle,
    permissions: account.permissions,
    mobile_session_token: mobileSessionToken,
    mobile_session_expires_at: account.mobileSession.expiresAt
  });
}

function buildAndroidMerchantDisplayHandle(userId: string): string {
  return `merchant-${userId.replaceAll('-', '').slice(0, 8)}`;
}

function truncateAndroidMerchantBusinessLabel(value: string | null): string | null {
  return value ? value.slice(0, 80) : null;
}

function androidMerchantAccountContractError(code: AndroidMerchantAccountErrorCode, field?: string) {
  if (code === AndroidMerchantAccountErrorCodes.RAW_DEVICE_IDENTIFIER_REJECTED) {
    return {
      error: {
        code,
        message: 'Raw Android device identifiers are not accepted for merchant device lookup.',
        details: {
          field,
          rejected_fields: AndroidMerchantRawDeviceIdentifierFields
        }
      }
    };
  }

  if (code === AndroidMerchantAccountErrorCodes.MERCHANT_IDENTITY_NAME_REJECTED) {
    return {
      error: {
        code,
        message: 'Android account creation does not collect merchant first or last names.',
        details: {
          field
        }
      }
    };
  }

  return {
    error: {
      code,
      message: 'Android merchant account request payload is invalid.',
      details: {
        field
      }
    }
  };
}

function googleRecoveryUnconfiguredError(purpose: 'account_recovery' | 'account_recovery_linking') {
  return {
    error: {
      code: 'google_recovery_unconfigured',
      message: 'Google is optional recovery only and is not configured for this environment.',
      details: {
        provider: 'google',
        purpose
      }
    }
  };
}

function validateAndroidMerchantGoogleExchangeRequest(
  body: unknown
):
  | { valid: true; value: { id_token: string; device_proof: AndroidMerchantDeviceProof } }
  | { valid: false; code: AndroidMerchantAccountErrorCode; field?: string } {
  const idToken = parseGoogleIdToken(body);
  if (!idToken) {
    return {
      valid: false,
      code: AndroidMerchantAccountErrorCodes.PAYLOAD_INVALID,
      field: 'id_token'
    };
  }
  const parsedDeviceProof = validateAndroidMerchantDeviceLookupRequest(body);
  if (!parsedDeviceProof.valid) {
    return parsedDeviceProof;
  }
  return {
    valid: true,
    value: {
      id_token: idToken,
      device_proof: parsedDeviceProof.value.device_proof
    }
  };
}

function parseGoogleIdToken(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }
  return asNonEmptyString((body as Record<string, unknown>).id_token);
}

function googleIdTokenRejectedError(purpose: 'account_recovery' | 'account_recovery_linking') {
  return invalidRequest('Google ID token could not be verified.', {
    provider: 'google',
    purpose
  });
}

function authBffRepositoryUnavailableError() {
  return {
    error: {
      code: 'service_unavailable',
      message: 'Android merchant auth repository is not configured.',
      details: {}
    }
  };
}

function toAndroidMerchantDashboardSummaryResponse(reviews: ReviewListItem[]): Record<string, unknown> {
  const sorted = sortAndroidMerchantReviews(reviews);
  return {
    payments_to_review_count: sorted.length,
    confirmed_today_count: 0,
    notifications_sent_count: 0,
    receiver_status: {
      status: 'action_required',
      label: 'Téléphone',
      display: 'Action requise'
    },
    recent_detected_payments: sorted.slice(0, 5).map((item) => ({
      review_id: item.id,
      order_id: item.orderId,
      payment_session_id: item.paymentSessionId,
      amount: amountResponse(item.amountMinor, item.currency),
      bank_display_name: bankDisplayNameForProfile(item.bankProfileId),
      status: 'to_review',
      status_label: 'À vérifier',
      created_at: item.createdAt
    })),
    ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
  };
}

async function findSelectedRouteForReview(
  repository: OrderRepository,
  merchantId: string,
  review: { paymentSessionId: string }
): Promise<StoredMerchantReceivingRouteRecord | null> {
  if (!hasLinkedPaymentSession(review.paymentSessionId)) {
    return null;
  }

  const loaded = await repository.getPaymentSessionById(merchantId, review.paymentSessionId);
  if (!loaded?.paymentSession.selectedReceivingRouteId) {
    return null;
  }
  const routes = await repository.listReceivingRoutes(merchantId);
  return routes.find((route) => route.route_id === loaded.paymentSession.selectedReceivingRouteId) ?? null;
}

function hasLinkedPaymentSession(paymentSessionId: string): boolean {
  return paymentSessionId.trim().length > 0 && paymentSessionId !== 'null';
}

function toAndroidMerchantPaymentDetailResponse(
  review: {
    id: string;
    orderId: string;
    paymentSessionId: string;
    bankProfileId?: string | undefined;
    amountMinor?: number | undefined;
    currency?: string | undefined;
    referenceCodeMasked?: string | undefined;
    createdAt: string;
    reasonCode: string;
    positiveReasonCodes: string[];
    negativeReasonCodes: string[];
  },
  route: StoredMerchantReceivingRouteRecord | null
): Record<string, unknown> {
  return {
    payment: {
      id: review.id,
      review_id: review.id,
      order_id: review.orderId,
      payment_session_id: review.paymentSessionId,
      status: 'to_review',
      status_label: 'À vérifier',
      amount_expected: amountResponse(review.amountMinor, review.currency),
      amount_detected: amountResponse(review.amountMinor, review.currency),
      bank_display_name: bankDisplayNameForProfile(review.bankProfileId),
      receiving_method_masked: route ? receivingMethodMaskedLabel(route) : 'Moyen de réception masqué',
      payment_reference: review.referenceCodeMasked ?? '<REFERENCE>',
      signal_received_at: review.createdAt,
      reason_labels: reasonLabelsForAndroidMerchantReview([
        review.reasonCode,
        ...review.positiveReasonCodes,
        ...review.negativeReasonCodes
      ]),
      allowed_actions: ['reject_signal', 'reject_order']
    },
    ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
  };
}

function toAndroidMerchantConnectedSiteResponse(
  config: AndroidMerchantConnectedSiteConfig,
  developerMode: boolean
): Record<string, unknown> {
  const active = config.status === 'active' && Boolean(config.url);
  return {
    webhook_url_display: active ? config.url : null,
    status: active ? 'active' : 'problem',
    status_label: active ? 'Connexion active' : 'Action nécessaire',
    last_delivery_status: 'none',
    last_delivery_at: null,
    latest_deliveries: [],
    developer_details: developerMode
      ? {
          event_types_visible: true,
          signature_status_visible: true
        }
      : null,
    ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
  };
}

function toAndroidMerchantConfigurationTestResponse(input: {
  receiverConnected: boolean;
  notificationAccessActive: boolean;
  bankChosen: boolean;
  receivingMethodAdded: boolean;
  connectedSiteConfigured: boolean;
}): Record<string, unknown> {
  const phoneReady = input.receiverConnected && input.notificationAccessActive;
  const checklist = [
    { label: 'Téléphone connecté', status: phoneReady ? 'passed' : 'action_required' },
    { label: 'Banque choisie', status: input.bankChosen ? 'passed' : 'action_required' },
    { label: 'Moyen de réception ajouté', status: input.receivingMethodAdded ? 'passed' : 'action_required' },
    { label: 'Site ou application connecté', status: input.connectedSiteConfigured ? 'passed' : 'action_required' }
  ];
  const ready = checklist.every((item) => item.status === 'passed');
  return {
    outcome: ready ? 'ready' : 'action_required',
    confirms_real_payment: false,
    emits_payment_confirmed_webhook: false,
    checklist,
    ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
  };
}

function sortAndroidMerchantReviews<T extends { createdAt: string }>(reviews: T[]): T[] {
  return reviews.slice().sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function amountResponse(amountMinor: number | undefined, currency: string | undefined): { value: string; currency: string } {
  return {
    value: formatAmountMinor(amountMinor ?? 0),
    currency: currency ?? 'RUB'
  };
}

function bankDisplayNameForProfile(bankProfileId: string | undefined): string {
  switch (bankProfileId) {
    case 'sber_ru':
      return 'Sberbank';
    case 'tbank_ru':
      return 'T-Bank';
    case 'vtb_ru':
      return 'VTB';
    case 'alfa_ru':
      return 'Alfa-Bank';
    case 'gazprombank_ru':
      return 'Gazprombank';
    default:
      return 'Banque choisie';
  }
}

function receivingMethodMaskedLabel(route: StoredMerchantReceivingRouteRecord): string {
  const railLabel = route.rail_type === 'phone_transfer' ? 'Numéro de téléphone' : 'Carte bancaire';
  return `${railLabel} · ${route.receiver_identifier_masked}`;
}

function reasonLabelsForAndroidMerchantReview(reasonCodes: string[]): string[] {
  const labels = new Set<string>();
  for (const reasonCode of reasonCodes) {
    const normalized = reasonCode.toLowerCase();
    if (
      normalized.includes('review_only') ||
      normalized.includes('manual') ||
      normalized.includes('requires_review') ||
      normalized.includes('receiver_route')
    ) {
      labels.add('Validation manuelle en bêta');
    }
    if (normalized.includes('reference')) {
      labels.add('Référence non visible');
    }
    if (normalized.includes('amount_only')) {
      labels.add('Seul le montant a été reconnu');
    }
    if (normalized.includes('collision') || normalized.includes('multiple')) {
      labels.add('Plusieurs paiements similaires');
    }
    if (normalized.includes('bank') || normalized.includes('untrusted')) {
      labels.add('Banque encore en test');
    }
  }
  if (labels.size === 0) {
    labels.add('Validation manuelle en bêta');
  }
  return [...labels];
}

function parseAndroidMerchantConfigurationTestBody(body: unknown): {
  receiverConnected: boolean;
  notificationAccessActive: boolean;
  connectedSiteConfigured?: boolean | undefined;
} {
  const candidate = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  return {
    receiverConnected: candidate.receiver_connected === true,
    notificationAccessActive: candidate.notification_access_active === true,
    connectedSiteConfigured:
      typeof candidate.connected_site_configured === 'boolean' ? candidate.connected_site_configured : undefined
  };
}

function parseAndroidMerchantConnectedSite(env: NodeJS.ProcessEnv): AndroidMerchantConnectedSiteConfig {
  const url = env.ANDROID_MERCHANT_WEBHOOK_URL ?? env.DEV_MERCHANT_WEBHOOK_URL ?? null;
  return {
    url,
    status: url ? 'active' : 'problem'
  };
}

function orderRepositoryUnavailableError() {
  return {
    error: {
      code: 'service_unavailable',
      message: 'Order repository is not configured.',
      details: {}
    }
  };
}

function applyCopyDetailsNoStoreHeaders(reply: FastifyReply): void {
  reply.header('Cache-Control', 'no-store');
  reply.header('Pragma', 'no-cache');
}

function coarseClientFingerprint(headers: FastifyRequest['headers'], requestIp: string): string {
  const forwardedFor = headers['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const clientIp = typeof forwardedValue === 'string' && forwardedValue.trim()
    ? forwardedValue.split(',')[0]?.trim() || requestIp
    : requestIp;
  const userAgent = headers['user-agent'];
  const agentValue = Array.isArray(userAgent) ? userAgent[0] : userAgent;
  return `${clientIp}|${agentValue ?? 'unknown-agent'}`;
}

function buildCopyDetailsRateLimitKey(input: {
  sessionId: string;
  routeId: string;
  fingerprint: string;
}): string {
  return `${input.sessionId}:${input.routeId}:${input.fingerprint}`;
}

function isCopyDetailsRateLimited(
  limiter: Map<string, { windowStartedAtMs: number; count: number }>,
  key: string,
  nowMs: number
): boolean {
  const current = limiter.get(key);
  if (!current || nowMs - current.windowStartedAtMs >= COPY_DETAILS_RATE_LIMIT_WINDOW_MS) {
    limiter.set(key, { windowStartedAtMs: nowMs, count: 1 });
    return false;
  }

  if (current.count >= COPY_DETAILS_RATE_LIMIT_MAX) {
    return true;
  }

  current.count += 1;
  return false;
}

interface ReceivingRouteCreateBody {
  bank_profile_id: string;
  rail_type: ReceivingRouteRailType;
  receiver_identifier: string;
  route_code: string;
  display_label: string;
  enabled?: boolean | undefined;
  recommended?: boolean | undefined;
  review_policy?: StoredMerchantReceivingRouteRecord['review_policy'] | undefined;
  fees_hint?: string | undefined;
}

function validateReceivingRouteCreateBody(body: unknown): ReceivingRouteCreateBody | ReturnType<typeof invalidRequest> {
  if (!body || typeof body !== 'object') {
    return invalidRequest('Receiving route request body must be a JSON object.', {});
  }
  const candidate = body as Partial<Record<keyof ReceivingRouteCreateBody, unknown>>;
  if (typeof candidate.bank_profile_id !== 'string' || !candidate.bank_profile_id.trim()) {
    return invalidRequest('bank_profile_id is required.', {});
  }
  if (typeof candidate.rail_type !== 'string' || !ReceivingRouteRailTypes.includes(candidate.rail_type as ReceivingRouteRailType)) {
    return invalidRequest('rail_type must be phone_transfer or card_transfer.', {});
  }
  if (typeof candidate.receiver_identifier !== 'string' || !candidate.receiver_identifier.trim()) {
    return invalidRequest('receiver_identifier is required.', {});
  }
  if (typeof candidate.route_code !== 'string' || !candidate.route_code.trim()) {
    return invalidRequest('route_code is required.', {});
  }
  if (typeof candidate.display_label !== 'string' || !candidate.display_label.trim()) {
    return invalidRequest('display_label is required.', {});
  }

  return {
    bank_profile_id: candidate.bank_profile_id.trim(),
    rail_type: candidate.rail_type as ReceivingRouteRailType,
    receiver_identifier: candidate.receiver_identifier.trim(),
    route_code: candidate.route_code.trim(),
    display_label: candidate.display_label.trim(),
    enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : undefined,
    recommended: typeof candidate.recommended === 'boolean' ? candidate.recommended : undefined,
    review_policy:
      candidate.review_policy === 'review_first' || candidate.review_policy === 'eligible_low_risk_later'
        ? candidate.review_policy
        : undefined,
    fees_hint: typeof candidate.fees_hint === 'string' && candidate.fees_hint.trim() ? candidate.fees_hint.trim() : undefined
  };
}

function validateReceivingRoutePatchBody(
  body: unknown
): Partial<Pick<StoredMerchantReceivingRouteRecord, 'enabled' | 'recommended' | 'display_label' | 'fees_hint'>> | ReturnType<typeof invalidRequest> {
  if (!body || typeof body !== 'object') {
    return invalidRequest('Receiving route patch body must be a JSON object.', {});
  }
  const candidate = body as {
    enabled?: unknown;
    recommended?: unknown;
    display_label?: unknown;
    fees_hint?: unknown;
  };
  const patch: Partial<Pick<StoredMerchantReceivingRouteRecord, 'enabled' | 'recommended' | 'display_label' | 'fees_hint'>> = {};
  if (typeof candidate.enabled === 'boolean') {
    patch.enabled = candidate.enabled;
  }
  if (typeof candidate.recommended === 'boolean') {
    patch.recommended = candidate.recommended;
  }
  if (typeof candidate.display_label === 'string') {
    const displayLabel = candidate.display_label.trim();
    if (!displayLabel) {
      return invalidRequest('display_label cannot be blank.', {});
    }
    patch.display_label = displayLabel;
  }
  if (typeof candidate.fees_hint === 'string') {
    patch.fees_hint = candidate.fees_hint.trim() || undefined;
  }
  return patch;
}

function toMerchantReceivingRouteResponse(route: StoredMerchantReceivingRouteRecord): Record<string, unknown> {
  return {
    route_id: route.route_id,
    bank_profile_id: route.bank_profile_id,
    rail_type: route.rail_type,
    receiver_identifier_type: route.receiver_identifier_type,
    receiver_identifier_masked: route.receiver_identifier_masked,
    route_code: route.route_code,
    display_label: route.display_label,
    enabled: route.enabled,
    recommended: route.recommended,
    review_policy: route.review_policy,
    fees_hint: route.fees_hint,
    created_at: route.created_at,
    updated_at: route.updated_at,
    auto_confirm_enabled: false,
    official_bank_confirmation: false
  };
}

function parseBankEvidenceListFilters(query: {
  status?: string;
  bank_profile_id?: string;
  package_name?: string;
  source?: string;
  submitted_after?: string;
  submitted_before?: string;
}): BankEvidenceListFilters {
  const filters: BankEvidenceListFilters = {};
  if (query.status && Object.values(BankEvidenceStatuses).includes(query.status as (typeof BankEvidenceStatuses)[keyof typeof BankEvidenceStatuses])) {
    filters.status = query.status as BankEvidenceListFilters['status'];
  }
  if (query.bank_profile_id) {
    filters.bankProfileId = query.bank_profile_id;
  }
  if (query.package_name) {
    filters.packageName = query.package_name;
  }
  if (query.source && Object.values(BankEvidenceSources).includes(query.source as (typeof BankEvidenceSources)[keyof typeof BankEvidenceSources])) {
    filters.source = query.source as BankEvidenceListFilters['source'];
  }
  if (query.submitted_after) {
    filters.submittedAfter = query.submitted_after;
  }
  if (query.submitted_before) {
    filters.submittedBefore = query.submitted_before;
  }
  return filters;
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

function readHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function parseMerchantRole(value: unknown): MerchantRole | null {
  const role = asNonEmptyString(value);
  return role === 'owner' || role === 'admin' || role === 'developer' || role === 'operator' || role === 'viewer'
    ? role
    : null;
}

function toMeResponse(context: BffSessionContext, csrfToken?: string) {
  return {
    user: {
      id: context.user.id,
      email: context.user.email,
      name: context.user.name,
      avatar_url: context.user.avatarUrl,
      status: context.user.status,
      google_sub_present: Boolean(context.user.googleSub)
    },
    active_merchant_id: context.session.activeMerchantId,
    active_membership: context.activeMembership
      ? {
          merchant_id: context.activeMembership.merchantId,
          role: context.activeMembership.role,
          permissions: merchantPermissionsForRole(context.activeMembership.role)
        }
      : null,
    memberships: context.memberships.map((membership) => ({
      merchant_id: membership.merchantId,
      role: membership.role,
      status: membership.status
    })),
    admin_roles: context.adminRoles.map((role) => ({
      role: role.role,
      status: role.status
    })),
    session: {
      expires_at: context.session.expiresAt,
      revoked: Boolean(context.session.revokedAt)
    },
    ...(csrfToken ? { csrf_token: csrfToken } : {})
  };
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

function isPgForeignKeyViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === '23503');
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

async function handleBankEvidenceReviewAction(params: {
  request: FastifyRequest;
  reply: FastifyReply;
  bankEvidenceRepository: BankEvidenceRepository | null;
  adminAuth: OperatorAuthConfig;
  requiredPermission: OperatorPermission;
  action: 'approve_review_only' | 'reject' | 'deprecate';
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

  if (!params.bankEvidenceRepository) {
    return params.reply.status(503).send({
      error: {
        code: 'service_unavailable',
        message: 'Bank evidence repository is not configured.',
        details: {}
      }
    });
  }

  const routeParams = params.request.params as { id?: string };
  if (!routeParams.id) {
    return params.reply.status(400).send(invalidRequest('Bank evidence id is required.', {}));
  }

  const body = validateBankEvidenceReviewBody(params.request.body);
  if (!body.valid) {
    return params.reply.status(400).send(body.response);
  }

  const result = await params.bankEvidenceRepository.reviewEvidence({
    evidenceId: routeParams.id,
    operatorId: operator.operatorId,
    reason: body.reason,
    auditEventId: params.auditEventId,
    occurredAt: params.occurredAt,
    action: params.action
  });

  switch (result.kind) {
    case 'updated':
      return params.reply.status(200).send(toBankEvidenceReviewResponse(result));
    case 'not_found':
      return params.reply.status(404).send({
        error: {
          code: 'bank_evidence_not_found',
          message: 'Bank evidence was not found.',
          details: { evidence_id: routeParams.id }
        }
      });
    case 'not_pending':
      return params.reply.status(409).send({
        error: {
          code: 'bank_evidence_not_pending',
          message: 'Bank evidence was already reviewed and cannot be reviewed again.',
          details: { evidence_id: routeParams.id }
        }
      });
  }
}

async function handleBankEvidenceProductionTrustAction(params: {
  request: FastifyRequest;
  reply: FastifyReply;
  bankEvidenceRepository: BankEvidenceRepository | null;
  adminAuth: OperatorAuthConfig;
  requiredPermission: OperatorPermission;
  action: 'request_production_trust' | 'approve_production_trust' | 'revoke_production_trust';
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

  if (!params.bankEvidenceRepository) {
    return params.reply.status(503).send({
      error: {
        code: 'service_unavailable',
        message: 'Bank evidence repository is not configured.',
        details: {}
      }
    });
  }

  const routeParams = params.request.params as { id?: string };
  if (!routeParams.id) {
    return params.reply.status(400).send(invalidRequest('Bank evidence id is required.', {}));
  }

  const body = validateBankEvidenceReviewBody(params.request.body);
  if (!body.valid) {
    return params.reply.status(400).send(body.response);
  }

  const result = await params.bankEvidenceRepository.transitionProductionTrust({
    evidenceId: routeParams.id,
    operatorId: operator.operatorId,
    reason: body.reason,
    auditEventId: params.auditEventId,
    occurredAt: params.occurredAt,
    action: params.action
  });

  switch (result.kind) {
    case 'updated':
      return params.reply.status(200).send(toBankEvidenceProductionTrustResponse(result));
    case 'not_found':
      return params.reply.status(404).send({
        error: {
          code: 'bank_evidence_not_found',
          message: 'Bank evidence was not found.',
          details: { evidence_id: routeParams.id }
        }
      });
    case 'not_review_only':
      return params.reply.status(409).send(bankEvidenceTransitionError('bank_evidence_not_review_only', routeParams.id));
    case 'not_requested':
      return params.reply.status(409).send(bankEvidenceTransitionError('bank_evidence_production_trust_not_requested', routeParams.id));
    case 'not_approved':
      return params.reply.status(409).send(bankEvidenceTransitionError('bank_evidence_production_trust_not_approved', routeParams.id));
    case 'dual_control_required':
      return params.reply.status(409).send(bankEvidenceTransitionError('bank_evidence_dual_control_required', routeParams.id));
    case 'to_verify_not_trustable':
      return params.reply.status(409).send(bankEvidenceTransitionError('bank_evidence_to_verify_not_trustable', routeParams.id));
    case 'synthetic_not_trustable':
      return params.reply.status(409).send(bankEvidenceTransitionError('bank_evidence_synthetic_not_trustable', routeParams.id));
    case 'source_not_trustable':
      return params.reply.status(409).send(bankEvidenceTransitionError('bank_evidence_source_not_trustable', routeParams.id));
  }
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

function intelligenceRepositoryUnavailableError() {
  return {
    error: {
      code: 'service_unavailable',
      message: 'Intelligence repository is not configured.',
      details: {}
    }
  };
}

function developerIntegrationUnavailableError() {
  return {
    error: {
      code: 'service_unavailable',
      message: 'Developer integration repository is not configured.',
      details: {}
    }
  };
}

function bankEvidenceTransitionError(code: string, evidenceId: string) {
  return {
    error: {
      code,
      message: bankEvidenceTransitionErrorMessage(code),
      details: {
        evidence_id: evidenceId
      }
    }
  };
}

function bankEvidenceTransitionErrorMessage(code: string): string {
  switch (code) {
    case 'bank_evidence_not_review_only':
      return 'Bank evidence must first be approved for review-only before production trust can be requested.';
    case 'bank_evidence_production_trust_not_requested':
      return 'Bank evidence production trust must be requested before it can be approved.';
    case 'bank_evidence_production_trust_not_approved':
      return 'Bank evidence production trust is not approved and cannot be revoked.';
    case 'bank_evidence_dual_control_required':
      return 'A different operator must approve the production trust request.';
    case 'bank_evidence_to_verify_not_trustable':
      return 'TO_VERIFY package or certificate metadata cannot become production trusted.';
    case 'bank_evidence_synthetic_not_trustable':
      return 'Synthetic debug evidence cannot become production trusted.';
    case 'bank_evidence_source_not_trustable':
      return 'Only Android PackageManager evidence can request production trust.';
    default:
      return 'Bank evidence production trust transition is not allowed.';
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
