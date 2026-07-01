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
  AllReceiverBankProfiles,
  buildAndroidMerchantAccountCreateResponse,
  buildAndroidMerchantDeviceLookupResponse,
  getPayerBankLauncherOption,
  getReceiverBankOption,
  receivingCurrencyForBankProfile,
  normalizeWalletIdentifier,
  receivingRailForBuyerPaymentMethod,
  validateAndroidMerchantCreateAccountRequest,
  validateAndroidMerchantDeviceRecoverRequest,
  validateAndroidMerchantDeviceLookupRequest,
  validateIntelligenceFeedbackRequest,
  type AndroidMerchantAccountCreateResponse,
  type AndroidMerchantAccountErrorCode,
  type AndroidMerchantDeviceProof,
  type BuyerCheckoutPaymentMethod,
  type CheckoutFallbackAction,
  type CheckoutUnavailableReason,
  type MerchantPaymentReadiness,
  type OrderStatus,
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
  PUBLIC_V1_WEBHOOK_EVENTS,
  toMerchantIntegrationResponse,
  validateWebhookUrl,
  type MerchantDeliveryHistoryRow,
  type MerchantIntegrationRepository,
  type MerchantIntegrationState,
  type WebhookReadiness
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
  androidMerchantMobilePermissions,
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
  type MerchantApiKeyPrincipal,
  type MerchantApiKeyVerifier,
  type MerchantPermission,
  type MerchantRole
} from './auth-bff.js';
import {
  buildMerchantReceivingRouteRecord,
  buildExpectedPaymentProfileMutation,
  buildOrderCreateInput,
  currencyMinorDigits,
  formatAmountMinor,
  invalidRequest,
  parseMerchantId,
  PgOrderRepository,
  receiverIdentifierTypeForRail,
  resolveOrderAmount,
  validateExpectedPaymentProfileBody,
  validateCreateOrderBody,
  type IdGenerator,
  type ActiveReceiverPaymentSession,
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
  type ReviewActorIdentity,
  type ReviewIdGenerator,
  type ReviewListItem,
  type ReviewRepository
} from './reviews.js';
import { FxRateService } from './fx.js';
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
import {
  PgMerchantMetricsRepository,
  parseMerchantMetricsBucket,
  parseMerchantMetricsRange,
  type MerchantMetricsRepository,
  type MerchantMetricsSummary,
  type MerchantMetricsTimeseries
} from './merchant-metrics.js';

const { Pool } = pg;
const COPY_DETAILS_RATE_LIMIT_MAX = 3;
const COPY_DETAILS_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const SECRET_REVEAL_RATE_LIMIT_MAX = 5;
const SECRET_REVEAL_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const COPY_DETAILS_REVEAL_TTL_MS = 2 * 60 * 1000;
const ANDROID_MERCHANT_MOBILE_SESSION_TTL_MS = 60 * 60 * 24 * 30 * 1000;
const SDK_API_KEY_SCOPES = {
  ORDERS_READ: 'orders.read',
  ORDERS_WRITE: 'orders.write',
  ORDERS_CREATE_LEGACY: 'orders:create'
} as const;
const SDK_ORDER_CREATE_SCOPES = [SDK_API_KEY_SCOPES.ORDERS_WRITE, SDK_API_KEY_SCOPES.ORDERS_CREATE_LEGACY] as const;
const SDK_ORDER_READ_SCOPES = [SDK_API_KEY_SCOPES.ORDERS_READ] as const;

type SdkApiKeyScope = (typeof SDK_API_KEY_SCOPES)[keyof typeof SDK_API_KEY_SCOPES];

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
  /** Verified Google email when the token carries a verified email; otherwise undefined. */
  email?: string;
}

export interface GoogleIdTokenVerifier {
  verifyIdToken(idToken: string): Promise<GoogleIdTokenVerificationResult | null>;
}

type GoogleTokenInfoFetch = (
  input: string | URL,
  init?: { method?: string; headers?: Record<string, string>; signal?: AbortSignal }
) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
}>;

const GOOGLE_TOKENINFO_TIMEOUT_MS = 2_500;

export interface AndroidMerchantSupportTicketCreateInput {
  id: string;
  merchantId: string;
  userId: string;
  category: string;
  subject: string;
  message: string;
  safeContext: Record<string, unknown>;
  createdAt: string;
}

export interface AndroidMerchantSupportTicketRecord extends AndroidMerchantSupportTicketCreateInput {
  status: 'created' | 'closed';
  updatedAt: string;
}

export interface AndroidMerchantSupportTicketRepository {
  create(input: AndroidMerchantSupportTicketCreateInput): Promise<AndroidMerchantSupportTicketRecord>;
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
  merchantMetricsRepository?: MerchantMetricsRepository | null;
  supportTicketRepository?: AndroidMerchantSupportTicketRepository | null;
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
  supportTicketIdGenerator?: () => string;
  androidMerchantConnectedSite?: {
    url: string;
    status: 'active' | 'problem';
  };
  adminAuth?: OperatorAuthConfig;
  metrics?: MetricsRegistry;
  fxRateService?: Pick<FxRateService, 'quoteToUsd' | 'quote'> | null;
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

function resolveRequiredSecret(input: {
  optionValue?: string | undefined;
  envValue?: string | undefined;
  envName: string;
  environment: string;
  localFallback: string;
}): string {
  const explicitValue = input.optionValue?.trim();
  if (explicitValue) {
    return explicitValue;
  }
  const envValue = input.envValue?.trim();
  if (envValue) {
    return envValue;
  }
  if (input.environment === 'production') {
    throw new Error(`${input.envName} is required in production.`);
  }
  return input.localFallback;
}

function hasSdkApiKeyScope(principal: MerchantApiKeyPrincipal, acceptedScopes: readonly SdkApiKeyScope[]): boolean {
  return acceptedScopes.some((scope) => principal.scopes.includes(scope));
}

class GoogleAuthLibraryIdTokenVerifier implements GoogleIdTokenVerifier {
  private readonly client = new OAuth2Client();

  constructor(
    private readonly audiences: readonly string[],
    private readonly tokenInfoFetch: GoogleTokenInfoFetch | null = bindGoogleTokenInfoFetch()
  ) {}

  async verifyIdToken(idToken: string): Promise<GoogleIdTokenVerificationResult | null> {
    if (!idToken.trim()) {
      return null;
    }
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: [...this.audiences]
      });
      const payload = ticket.getPayload();
      const googleSub = payload?.sub?.trim();
      if (!googleSub) {
        return null;
      }
      const email = payload?.email_verified === true ? payload.email?.trim() : undefined;
      return email ? { googleSub, email } : { googleSub };
    } catch {
      return verifyGoogleIdTokenWithTokenInfo(idToken, this.audiences, this.tokenInfoFetch);
    }
  }
}

function bindGoogleTokenInfoFetch(): GoogleTokenInfoFetch | null {
  return typeof globalThis.fetch === 'function'
    ? ((input, init) => globalThis.fetch(input, init as RequestInit) as Promise<Response>)
    : null;
}

export async function verifyGoogleIdTokenWithTokenInfo(
  idToken: string,
  acceptedAudiences: readonly string[],
  tokenInfoFetch: GoogleTokenInfoFetch | null = bindGoogleTokenInfoFetch(),
  now: () => number = () => Date.now(),
  timeoutMs: number = GOOGLE_TOKENINFO_TIMEOUT_MS
): Promise<GoogleIdTokenVerificationResult | null> {
  if (!idToken.trim() || acceptedAudiences.length === 0 || !tokenInfoFetch) {
    return null;
  }
  const abortController = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = abortController
    ? setTimeout(() => abortController.abort(), Math.max(1, timeoutMs))
    : null;
  try {
    const tokenInfoUrl = new URL('https://oauth2.googleapis.com/tokeninfo');
    tokenInfoUrl.searchParams.set('id_token', idToken);
    const requestInit: { method: string; headers: Record<string, string>; signal?: AbortSignal } = {
      method: 'GET',
      headers: { Accept: 'application/json' }
    };
    if (abortController) {
      requestInit.signal = abortController.signal;
    }
    const response = await tokenInfoFetch(tokenInfoUrl, requestInit);
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }
    const claims = payload as Record<string, unknown>;
    const googleSub = typeof claims.sub === 'string' ? claims.sub.trim() : '';
    const audience = typeof claims.aud === 'string' ? claims.aud.trim() : '';
    const issuer = typeof claims.iss === 'string' ? claims.iss.trim() : '';
    const expirySeconds = parseGoogleExpirySeconds(claims.exp);
    const issuerAllowed = issuer === 'accounts.google.com' || issuer === 'https://accounts.google.com';
    if (
      !googleSub ||
      !acceptedAudiences.includes(audience) ||
      !issuerAllowed ||
      expirySeconds === null ||
      expirySeconds * 1000 <= now()
    ) {
      return null;
    }
    const emailVerified = claims.email_verified === true || claims.email_verified === 'true';
    const email = emailVerified && typeof claims.email === 'string' ? claims.email.trim() : '';
    return email ? { googleSub, email } : { googleSub };
  } catch {
    return null;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function parseGoogleExpirySeconds(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveGoogleIdTokenAudiences(env: NodeJS.ProcessEnv, environment = env.NODE_ENV ?? 'development'): string[] {
  const candidates = environment === 'production'
    ? [env.SWIMPAY_ANDROID_GOOGLE_SERVER_CLIENT_ID]
    : [
        env.SWIMPAY_ANDROID_GOOGLE_SERVER_CLIENT_ID,
        env.SWIMPAY_ANDROID_STAGING_GOOGLE_SERVER_CLIENT_ID,
        env.GOOGLE_OAUTH_CLIENT_ID
      ];
  return candidates
    .flatMap((value) => normalizeGoogleIdTokenAudienceEnvValue(value))
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index);
}

function normalizeGoogleIdTokenAudienceEnvValue(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => normalizeGoogleIdTokenAudience(part))
    .filter((part): part is string => Boolean(part));
}

function normalizeGoogleIdTokenAudience(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const unquoted = trimmed.replace(/^["']+|["']+$/gu, '').trim();
  return unquoted || null;
}

export function extractGoogleIdTokenAudienceForDiagnostics(idToken: string): string | null {
  const payloadSegment = idToken.split('.')[1]?.trim();
  if (!payloadSegment) {
    return null;
  }
  return runJsonParse(() => Buffer.from(payloadSegment, 'base64url').toString('utf8'))?.aud ?? null;
}

function runJsonParse(readPayload: () => string): { aud: string } | null {
  try {
    const parsed = JSON.parse(readPayload()) as { aud?: unknown };
    return typeof parsed.aud === 'string' ? { aud: parsed.aud } : null;
  } catch {
    return null;
  }
}

function maskGoogleAudienceForDiagnostics(audience: string | null): string | null {
  if (!audience) {
    return null;
  }
  if (audience.length <= 18) {
    return '<configured>';
  }
  return `${audience.slice(0, 8)}...${audience.slice(-24)}`;
}

function googleIdTokenRejectedDiagnostics(idToken: string, acceptedAudiences: readonly string[]): Record<string, unknown> {
  const tokenAudience = extractGoogleIdTokenAudienceForDiagnostics(idToken);
  return {
    token_audience_hint: maskGoogleAudienceForDiagnostics(tokenAudience),
    token_audience_configured: tokenAudience ? acceptedAudiences.includes(tokenAudience) : false,
    configured_audience_count: acceptedAudiences.length,
    configured_audience_hints: acceptedAudiences.map((audience) => maskGoogleAudienceForDiagnostics(audience))
  };
}

export function createDefaultGoogleIdTokenVerifier(env: NodeJS.ProcessEnv, environment = env.NODE_ENV ?? 'development'): GoogleIdTokenVerifier | null {
  const audiences = resolveGoogleIdTokenAudiences(env, environment);
  return audiences.length > 0 ? new GoogleAuthLibraryIdTokenVerifier(audiences) : null;
}

export function buildApiServer(options: ApiServerOptions): FastifyInstance {
  const phoneHmacSecret = resolveRequiredSecret({
    optionValue: options.phoneHmacSecret,
    envValue: process.env.PHONE_HMAC_SECRET,
    envName: 'PHONE_HMAC_SECRET',
    environment: options.environment,
    localFallback: 'local_dev_phone_hmac_secret'
  });
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
    options.merchantIntegrationRepository ?? createDefaultMerchantIntegrationRepository(process.env, options.environment);
  const merchantMetricsRepository = options.merchantMetricsRepository ?? createDefaultMerchantMetricsRepository(process.env);
  const supportTicketRepository = options.supportTicketRepository ?? createDefaultSupportTicketRepository(process.env);
  const authBffRepository = options.authBffRepository ?? createDefaultAuthBffRepository(process.env);
  const merchantApiKeyVerifier = options.merchantApiKeyVerifier ?? createDefaultMerchantApiKeyVerifier(process.env);
  const googleIdTokenAudiences = resolveGoogleIdTokenAudiences(process.env, options.environment);
  const googleIdTokenVerifier = options.googleIdTokenVerifier ?? createDefaultGoogleIdTokenVerifier(process.env, options.environment);
  const eventPublisher = options.eventPublisher ?? createDefaultEventPublisher(process.env);
  const metrics = options.metrics ?? defaultMetricsRegistry;
  const checkoutBaseUrl = options.checkoutBaseUrl ?? process.env.CHECKOUT_BASE_URL ?? 'http://localhost:3001/checkout';
  const fxRateService = options.fxRateService === undefined ? new FxRateService() : options.fxRateService;
  const idGenerator = options.idGenerator ?? createDefaultIdGenerator();
  const receiverDeviceIdGenerator = options.receiverDeviceIdGenerator ?? (() => randomUUID());
  const signalIdGenerator = options.signalIdGenerator ?? createDefaultSignalIdGenerator();
  const reviewIdGenerator = options.reviewIdGenerator ?? createDefaultReviewIdGenerator();
  const bankEvidenceIdGenerator = options.bankEvidenceIdGenerator ?? (() => randomUUID());
  const receivingRouteIdGenerator = options.receivingRouteIdGenerator ?? (() => randomUUID());
  const androidMerchantDeliveryIdGenerator = options.androidMerchantDeliveryIdGenerator ?? (() => randomUUID());
  const supportTicketIdGenerator = options.supportTicketIdGenerator ?? (() => `sup_${randomUUID()}`);
  const androidMerchantConnectedSite = options.androidMerchantConnectedSite ?? parseAndroidMerchantConnectedSite(process.env);
  const adminAuth = options.adminAuth ?? createDefaultAdminAuthConfig(process.env, options.environment);
  const googleOAuthProvider = createGoogleOAuthProviderSeam(process.env, options.environment);
  const clock = options.clock ?? (() => new Date());
  const startedAt = options.startedAt ?? new Date();
  const copyDetailsLimiter = new Map<string, { windowStartedAtMs: number; count: number }>();
  const secretRevealLimiter = new Map<string, { windowStartedAtMs: number; count: number }>();

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
    routeOptions: { requireCsrf?: boolean; allowAndroidMobile?: boolean } = {}
  ): Promise<{
    merchantId: string;
    source: 'bff_session' | 'android_mobile_session' | 'dev_test_bearer';
    userId?: string | undefined;
    deviceId?: string | undefined;
  } | null> {
    const bearerToken = parseBearerToken(request.headers.authorization);
    const hasAndroidMobileBearer = bearerToken?.startsWith('spm_') ?? false;
    if (hasAndroidMobileBearer && !routeOptions.allowAndroidMobile) {
      reply.status(401).send(
        invalidRequest('Android merchant mobile bearer is not accepted for this merchant endpoint.', {
          authorization: 'dashboard_session_required'
        })
      );
      return null;
    }

    if (routeOptions.allowAndroidMobile && hasAndroidMobileBearer) {
      const androidContext = await resolveAndroidMerchantContext(request, reply);
      if (androidContext) {
        if (!androidMerchantMobilePermissions().includes(permission)) {
          reply.status(403).send(invalidRequest('Android merchant mobile permission is required.', { permission }));
          return null;
        }
        return androidContext;
      }
      if (reply.sent) {
        return null;
      }
      reply.status(401).send(
        invalidRequest('A valid Android merchant mobile session is required for this merchant action.', {
          authorization: 'Bearer spm_<mobile_session_token>'
        })
      );
      return null;
    }

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
      return { merchantId: membership.merchantId, source: 'bff_session', userId: session.context.user.id };
    }

    if (routeOptions.allowAndroidMobile) {
      const androidContext = await resolveAndroidMerchantContext(request, reply);
      if (androidContext) {
        if (!androidMerchantMobilePermissions().includes(permission)) {
          reply.status(403).send(invalidRequest('Android merchant mobile permission is required.', { permission }));
          return null;
        }
        return androidContext;
      }
      if (reply.sent) {
        return null;
      }
    }

    const merchantId = parseMerchantId(request.headers.authorization, { allowTestBearer: options.environment !== 'production' });
    return merchantId ? { merchantId, source: 'dev_test_bearer' } : null;
  }

  async function resolveSdkMerchantContext(
    request: FastifyRequest,
    reply: FastifyReply,
    acceptedScopes: readonly SdkApiKeyScope[]
  ): Promise<{ merchantId: string; source: 'api_key' | 'dev_test_bearer' } | null> {
    const apiKeyPrincipal = await verifyMerchantApiKeyAuthorization(request.headers.authorization, merchantApiKeyVerifier);
    if (apiKeyPrincipal) {
      if (hasSdkApiKeyScope(apiKeyPrincipal, acceptedScopes)) {
        return { merchantId: apiKeyPrincipal.merchantId, source: 'api_key' };
      }
      reply.status(403).send(
        invalidRequest('API key scope is required for this endpoint.', {
          required_scopes: acceptedScopes,
          api_key_id: apiKeyPrincipal.apiKeyId
        })
      );
      return null;
    }
    const merchantId = parseMerchantId(request.headers.authorization, { allowTestBearer: options.environment !== 'production' });
    return merchantId ? { merchantId, source: 'dev_test_bearer' } : null;
  }

  async function resolveAndroidMerchantContext(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{
    merchantId: string;
    source: 'android_mobile_session' | 'dev_test_bearer';
    userId?: string | undefined;
    deviceId?: string | undefined;
  } | null> {
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
      return mobileSession
        ? {
            merchantId: mobileSession.merchantId,
            source: 'android_mobile_session',
            userId: mobileSession.userId,
            deviceId: mobileSession.deviceId
          }
        : null;
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

  function reviewActorFromMerchantContext(context: {
    source: 'bff_session' | 'android_mobile_session' | 'dev_test_bearer';
    userId?: string | undefined;
    deviceId?: string | undefined;
  }): ReviewActorIdentity {
    if (context.source === 'android_mobile_session') {
      return {
        actorType: 'android_merchant',
        actorId: context.userId,
        actorSource: 'android_mobile_session',
        actorDisplay: 'Android Merchant'
      };
    }

    if (context.source === 'bff_session') {
      return {
        actorType: 'dashboard_merchant',
        actorId: context.userId,
        actorSource: 'bff_session',
        actorDisplay: 'Dashboard Merchant'
      };
    }

    return {
      actorType: 'dashboard_merchant',
      actorSource: 'dev_test_bearer',
      actorDisplay: 'Development Bearer'
    };
  }

  async function resolveReceiverConfigureContext(
    request: FastifyRequest,
    reply: FastifyReply,
    permission: MerchantPermission
  ): Promise<{ merchantId: string; source: 'bff_session' | 'android_mobile_session' | 'dev_test_bearer' } | null> {
    const bearerToken = parseBearerToken(request.headers.authorization);
    if (bearerToken?.startsWith('spm_')) {
      const androidContext = await resolveAndroidMerchantContext(request, reply);
      if (androidContext) {
        return androidContext;
      }
      if (reply.sent) {
        return null;
      }
      reply.status(401).send(
        invalidRequest('A valid Android merchant mobile session is required for receiver configuration.', {
          authorization: 'Bearer spm_<mobile_session_token>'
        })
      );
      return null;
    }
    return resolveMerchantContext(request, reply, permission, { requireCsrf: true });
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
    if (parseBearerToken(request.headers.authorization)?.startsWith('spm_')) {
      return reply.status(401).send(
        invalidRequest('Android merchant mobile bearer is not accepted for this BFF endpoint.', {
          authorization: 'dashboard_session_required'
        })
      );
    }
    const session = await readBffSessionContext(request);
    if (!session) {
      return reply.status(401).send(invalidRequest('An authenticated BFF session is required.', {}));
    }
    return reply.status(200).send(toMeResponse(session.context));
  });

  server.post('/auth/logout', async (request, reply) => {
    if (parseBearerToken(request.headers.authorization)?.startsWith('spm_')) {
      return reply.status(401).send(
        invalidRequest('Android merchant mobile bearer is not accepted for this BFF endpoint.', {
          authorization: 'dashboard_session_required'
        })
      );
    }
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
    const merchantId = parseMerchantId(request.headers.authorization, { allowTestBearer: options.environment !== 'production' });
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
    const merchantId = parseMerchantId(request.headers.authorization, { allowTestBearer: options.environment !== 'production' });
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
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.INTEGRATION_READ, {
      allowAndroidMobile: true
    });
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
      requireCsrf: true,
      allowAndroidMobile: true
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
      requireCsrf: true,
      allowAndroidMobile: true
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
      requireCsrf: true,
      allowAndroidMobile: true
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
      requireCsrf: true,
      allowAndroidMobile: true
    });
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(invalidRequest('An authenticated merchant session is required for developer integration.', {}));
    }
    if (!merchantIntegrationRepository) {
      return reply.status(503).send(developerIntegrationUnavailableError());
    }
    const body = request.body as { webhook_url?: unknown } | null;
    const webhookUrl = validateWebhookUrl(body?.webhook_url);
    if (!webhookUrl.valid) {
      return reply.status(400).send(invalidRequest(webhookUrl.message, { field: 'webhook_url' }));
    }

    return reply.status(200).send(
      toMerchantIntegrationResponse(
        await merchantIntegrationRepository.updateWebhookUrl(merchantContext.merchantId, webhookUrl.value, clock().toISOString())
      )
    );
  });

  server.post('/v1/merchant/integration/provision', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.INTEGRATION_KEYS_CREATE, {
      requireCsrf: true,
      allowAndroidMobile: true
    });
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(invalidRequest('An authenticated merchant session is required for developer integration.', {}));
    }
    if (!merchantIntegrationRepository) {
      return reply.status(503).send(developerIntegrationUnavailableError());
    }
    const body = request.body as { webhook_url?: unknown } | null;
    const webhookUrl = validateWebhookUrl(body?.webhook_url);
    if (!webhookUrl.valid) {
      return reply.status(400).send(invalidRequest(webhookUrl.message, { field: 'webhook_url' }));
    }

    const result = await merchantIntegrationRepository.provisionIntegration(
      merchantContext.merchantId,
      webhookUrl.value,
      clock().toISOString()
    );
    request.log.info(
      { merchant_id: merchantContext.merchantId, source: merchantContext.source },
      'merchant_integration_provisioned'
    );
    return reply.status(201).send(toMerchantIntegrationResponse(result));
  });

  server.post('/v1/merchant/integration/secrets/reveal', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.INTEGRATION_SECRETS_REVEAL, {
      requireCsrf: true,
      allowAndroidMobile: true
    });
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(invalidRequest('An authenticated merchant session is required for developer integration.', {}));
    }
    if (!merchantIntegrationRepository) {
      return reply.status(503).send(developerIntegrationUnavailableError());
    }
    if (isSecretRevealRateLimited(secretRevealLimiter, merchantContext.merchantId, clock().getTime())) {
      reply.header('Retry-After', String(Math.ceil(SECRET_REVEAL_RATE_LIMIT_WINDOW_MS / 1000)));
      return reply.status(429).send({
        error: {
          code: 'secret_reveal_rate_limited',
          message: 'Secret reveal was requested too often. Try again later.',
          details: {}
        }
      });
    }

    const reveal = await merchantIntegrationRepository.revealSecrets(
      merchantContext.merchantId,
      merchantContext.source,
      clock().toISOString()
    );
    request.log.info(
      {
        merchant_id: merchantContext.merchantId,
        source: merchantContext.source,
        revealed_fields: [...(reveal.secretKey ? ['secret_key'] : []), ...(reveal.webhookSecret ? ['webhook_secret'] : [])]
      },
      'merchant_secret_reveal'
    );
    return reply.status(200).send({
      merchant_id: merchantContext.merchantId,
      secret_key: reveal.secretKey,
      webhook_secret: reveal.webhookSecret,
      webhook_url: reveal.webhookUrl,
      secret_key_requires_rotation: reveal.secretKeyRequiresRotation,
      webhook_secret_requires_rotation: reveal.webhookSecretRequiresRotation,
      reveal_audited: true
    });
  });

  server.post('/v1/merchant/integration/test-webhook', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.INTEGRATION_WEBHOOK_TEST, {
      requireCsrf: true,
      allowAndroidMobile: true
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
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.INTEGRATION_DELIVERY_READ, {
      allowAndroidMobile: true
    });
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
      public_webhook_events: PUBLIC_V1_WEBHOOK_EVENTS,
      raw_payload_included: false,
      official_bank_confirmation: false
    });
  });

  server.post('/v1/merchant/integration/webhook-deliveries/:id/retry', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.INTEGRATION_DELIVERY_RETRY, {
      requireCsrf: true,
      allowAndroidMobile: true
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
    const merchantContext = await resolveSdkMerchantContext(request, reply, SDK_ORDER_CREATE_SCOPES);
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(
        invalidRequest('A valid merchant API key or authenticated development merchant bearer is required.', {})
      );
    }
    const { merchantId } = merchantContext;

    const body = validateCreateOrderBody(request.body);
    if ('error' in body) {
      return reply.status(400).send(body);
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

    const resolvedAmount = await resolveOrderAmount(body, fxRateService);
    if ('error' in resolvedAmount) {
      const errorCode = resolvedAmount.error.code;
      if (errorCode === 'fx_rate_unavailable') {
        request.log.error(
          { merchant_id: merchantId, display_price_present: Boolean(body.display_price) },
          'order_creation_blocked_fx_rate_unavailable'
        );
        return reply.status(409).send(resolvedAmount);
      }
      return reply.status(400).send(resolvedAmount);
    }

    const readiness = await resolveMerchantPaymentReadiness(repository, merchantId);
    if (merchantContext.source === 'api_key' && !readiness.payment_ready) {
      return reply.status(409).send(merchantPaymentSetupRequiredError(readiness));
    }

    if (merchantContext.source === 'api_key' && merchantIntegrationRepository) {
      const webhookReadiness = await merchantIntegrationRepository.getWebhookReadiness(merchantId);
      if (webhookReadiness.webhookStatus !== 'active') {
        request.log.error(
          { merchant_id: merchantId, webhook_status: webhookReadiness.webhookStatus },
          'order_creation_blocked_webhook_not_active'
        );
        return reply.status(409).send(merchantWebhookSetupRequiredError(webhookReadiness));
      }
    }

    // Symmetry gate: never accept an order in a currency the merchant has no
    // active receiving route for (e.g. an XOF order against a RUB-only merchant).
    if (
      merchantContext.source === 'api_key' &&
      !readiness.receivable_currencies.includes(resolvedAmount.currency)
    ) {
      request.log.error(
        { merchant_id: merchantId, requested_currency: resolvedAmount.currency, receivable_currencies: readiness.receivable_currencies },
        'order_creation_blocked_currency_not_receivable'
      );
      return reply.status(409).send(merchantCurrencyRouteRequiredError(resolvedAmount.currency, readiness.receivable_currencies));
    }

    const createInput = buildOrderCreateInput({
      body,
      merchantId,
      phoneHmacSecret,
      idGenerator,
      clock,
      resolvedAmount
    });

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
        value: formatAmountMinor(result.order.amountMinor, result.order.currency),
        currency: result.order.currency
      },
      reference: result.paymentSession.referenceCode,
      expires_at: result.order.expiresAt
    };

    return reply.status(201).send(response);
  });

  server.get('/v1/orders/:id', async (request, reply) => {
    const merchantContext = await resolveSdkMerchantContext(request, reply, SDK_ORDER_READ_SCOPES);
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(
        invalidRequest('A valid merchant API key or authenticated development merchant bearer is required.', {})
      );
    }
    const { merchantId } = merchantContext;

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

    const result = await repository.getCheckoutSessionById(params.id);
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
    const availableRoutes = await repository.listReceiverBanksForCheckout(
      result.paymentSession.merchantId,
      result.paymentSession.id
    );

    // Compute payable currency count from routes — same logic as the status endpoint.
    // When >= 2 currencies are available and no currency has been chosen yet, the
    // checkout_state will be 'currency_selection' so the web checkout can render the
    // currency picker.  Passing undefined here (old behaviour) would have left the state
    // stuck at buyer_identity / receiver_bank_selection and the picker would never appear.
    const payableCurrencyCount = [...new Set(availableRoutes.map((r) => receivingCurrencyForBankProfile(r.bank_profile_id)))].length;

    return reply.status(200).send(
      toPaymentSessionReadResponse({
        order: result.order,
        paymentSession: result.paymentSession,
        now: clock(),
        availableRoutes,
        payableCurrencyCount
      })
    );
  });

  server.post('/v1/payment-sessions/:id/no-notification-manual-check', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }

    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Payment session id is required.', {}));
    }

    const result = await repository.requestNoNotificationManualCheck({
      merchantId,
      paymentSessionId: params.id,
      reviewId: `rev_${randomUUID()}`,
      auditEventId: idGenerator.auditEventId(),
      now: clock().toISOString()
    });

    switch (result.kind) {
      case 'created':
        return reply.status(201).send({
          status: 'manual_check_requested',
          review_id: result.reviewId,
          payment_session_id: result.paymentSessionId,
          reason_label: result.reasonLabel,
          merchant_notification: {
            title: 'Paiement en attente',
            body: 'Aucun signal bancaire detecte pour cette commande. Ouvrez votre banque pour verifier la reception, puis confirmez ou rejetez dans SwimPay.'
          },
          merchant_actions: ['open_bank', 'view_order', 'confirm_received', 'reject'],
          confirmation_type: 'manual_bank_check',
          does_not_confirm_payment: true,
          emits_webhook: false,
          official_bank_confirmation: false
        });
      case 'not_due':
        return reply.status(409).send({
          error: {
            code: 'manual_check_not_due',
            message: 'No-notification manual check is not due yet.',
            details: { elapsed_seconds: result.elapsedSeconds, minimum_elapsed_seconds: 120 }
          }
        });
      case 'not_eligible':
        return reply.status(409).send({
          error: {
            code: 'manual_check_not_eligible',
            message: 'Payment session is not eligible for no-notification manual check.',
            details: { reason: result.reason }
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
      case 'not_found':
        return reply.status(404).send({
          error: {
            code: 'not_found',
            message: 'Payment session was not found.',
            details: { payment_session_id: params.id }
          }
        });
    }
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
    if (result.kind === 'duplicate_receiver_identifier') {
      return reply.status(409).send({
        error: {
          code: 'duplicate_receiving_method',
          message: 'Receiving method already exists for this merchant.',
          details: { rail_type: body.rail_type }
        }
      });
    }
    return reply.status(201).send({
      route: toMerchantReceivingRouteResponse(result.route),
      official_bank_confirmation: false
    });
  });

  server.get('/v1/merchant/readiness', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.RECEIVING_METHODS_READ, {
      allowAndroidMobile: true
    });
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(invalidRequest('An authenticated merchant session is required for merchant readiness.', {}));
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }

    return reply.status(200).send(await resolveMerchantPaymentReadiness(repository, merchantContext.merchantId));
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

  server.get('/v1/merchant/receiving-methods', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }
    const routes = await repository.listReceivingRoutes(merchantId);
    return reply.status(200).send({
      methods: routes.map((route) => toMerchantReceivingMethodResponse(route)),
      official_bank_confirmation: false
    });
  });

  server.post('/v1/merchant/receiving-methods', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }

    const body = validateReceivingMethodCreateBody(request.body);
    if ('error' in body) {
      return reply.status(400).send(body);
    }

    const routeId = receivingRouteIdGenerator();
    const now = clock().toISOString();
    const route = buildMerchantReceivingRouteRecord({
      routeId,
      merchantId,
      bankProfileId: body.bank_id,
      railType:
        body.type === 'phone' ? 'phone_transfer' : body.type === 'mobile_money' ? 'mobile_money' : 'card_transfer',
      receiverIdentifier: body.value,
      routeCode: buildReceivingMethodRouteCode({
        bankId: body.bank_id,
        type: body.type,
        last4: body.last4,
        routeId
      }),
      displayLabel: body.label ?? buildReceivingMethodDefaultLabel(body.bank_id, body.type),
      enabled: body.status !== 'inactive',
      recommended: body.is_default,
      reviewPolicy: body.type === 'phone' ? 'eligible_low_risk_later' : 'review_first',
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
          details: {}
        }
      });
    }
    if (result.kind === 'duplicate_receiver_identifier') {
      return reply.status(409).send({
        error: {
          code: 'duplicate_receiving_method',
          message: 'Receiving method already exists for this merchant.',
          details: { type: body.type }
        }
      });
    }

    return reply.status(201).send({
      method: toMerchantReceivingMethodResponse(result.route),
      official_bank_confirmation: false
    });
  });

  server.patch('/v1/merchant/receiving-methods/:method_id', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }
    const params = request.params as { method_id?: string };
    if (!params.method_id) {
      return reply.status(400).send(invalidRequest('Receiving method id is required.', {}));
    }
    const body = validateReceivingMethodPatchBody(request.body);
    if ('error' in body) {
      return reply.status(400).send(body);
    }
    const routePatch: Partial<Pick<StoredMerchantReceivingRouteRecord, 'enabled' | 'recommended' | 'display_label'>> = {};
    if (body.status) {
      routePatch.enabled = body.status === 'active';
    }
    if (body.is_default !== undefined) {
      routePatch.recommended = body.is_default;
    }
    if (body.label !== undefined) {
      routePatch.display_label = body.label;
    }
    const result = await repository.updateReceivingRoute({
      merchantId,
      routeId: params.method_id,
      patch: routePatch,
      auditEventId: idGenerator.auditEventId(),
      now: clock().toISOString()
    });
    if (result.kind === 'not_found') {
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Receiving method was not found.',
          details: { id: params.method_id }
        }
      });
    }
    return reply.status(200).send({
      method: toMerchantReceivingMethodResponse(result.route),
      official_bank_confirmation: false
    });
  });

  server.post('/v1/merchant/receiving-methods/:method_id/disable', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }
    const params = request.params as { method_id?: string };
    if (!params.method_id) {
      return reply.status(400).send(invalidRequest('Receiving method id is required.', {}));
    }
    const result = await repository.updateReceivingRoute({
      merchantId,
      routeId: params.method_id,
      patch: { enabled: false },
      auditEventId: idGenerator.auditEventId(),
      now: clock().toISOString()
    });
    if (result.kind === 'not_found') {
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Receiving method was not found.',
          details: { id: params.method_id }
        }
      });
    }
    return reply.status(200).send({
      method: toMerchantReceivingMethodResponse(result.route),
      official_bank_confirmation: false
    });
  });

  server.post('/v1/merchant/receiving-methods/:method_id/revoke', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }
    const params = request.params as { method_id?: string };
    if (!params.method_id) {
      return reply.status(400).send(invalidRequest('Receiving method id is required.', {}));
    }
    const body = validateReceivingRouteRevokeBody(request.body);
    if ('error' in body) {
      return reply.status(400).send(body);
    }
    const result = await repository.updateReceivingRoute({
      merchantId,
      routeId: params.method_id,
      patch: {
        enabled: false,
        recommended: false,
        lifecycle_status: 'revoked',
        revocation_reason: body.reason
      },
      auditEventId: idGenerator.auditEventId(),
      now: clock().toISOString()
    });
    if (result.kind === 'not_found') {
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Receiving method was not found.',
          details: { id: params.method_id }
        }
      });
    }
    return reply.status(200).send({
      method: toMerchantReceivingMethodResponse(result.route),
      official_bank_confirmation: false
    });
  });

  server.post('/v1/merchant/receiving-methods/:method_id/set-default', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }
    const params = request.params as { method_id?: string };
    if (!params.method_id) {
      return reply.status(400).send(invalidRequest('Receiving method id is required.', {}));
    }
    const result = await repository.updateReceivingRoute({
      merchantId,
      routeId: params.method_id,
      patch: { recommended: true },
      auditEventId: idGenerator.auditEventId(),
      now: clock().toISOString()
    });
    if (result.kind === 'not_found') {
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Receiving method was not found.',
          details: { id: params.method_id }
        }
      });
    }
    return reply.status(200).send({
      method: toMerchantReceivingMethodResponse(result.route),
      official_bank_confirmation: false
    });
  });

  server.delete('/v1/merchant/receiving-methods/:method_id', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    if (!repository) {
      return reply.status(503).send(orderRepositoryUnavailableError());
    }
    const params = request.params as { method_id?: string };
    if (!params.method_id) {
      return reply.status(400).send(invalidRequest('Receiving method id is required.', {}));
    }
    const result = await repository.deleteReceivingRoute({
      merchantId,
      routeId: params.method_id,
      auditEventId: idGenerator.auditEventId(),
      now: clock().toISOString()
    });
    if (result.kind === 'not_found') {
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Receiving method was not found.',
          details: { id: params.method_id }
        }
      });
    }
    return reply.status(200).send({
      method: toMerchantReceivingMethodResponse(result.route),
      deleted: true,
      deleted_method_id: params.method_id,
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

  server.post('/v1/checkout/:id/expected-payment-profile', async (request, reply) => {
    const loaded = await loadCheckoutSession({ request, reply, repository });
    if (!loaded) {
      return reply;
    }
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Payment session id is required.', {}));
    }
    const checkoutProfileBody = validateExpectedPaymentProfileBody(request.body);
    if ('error' in checkoutProfileBody) {
      return reply.status(400).send(checkoutProfileBody);
    }
    const allRoutes = await repository!.listReceiverBanksForCheckout(loaded.paymentSession.merchantId, params.id);
    const compatibleRoutes = filterRoutesForExpectedPaymentMethod(allRoutes, checkoutProfileBody.payment_method);
    if (compatibleRoutes.length === 0) {
      const availableMethods = {
        card: availableBuyerMethodsForRoutes(allRoutes).includes('card'),
        sbp: availableBuyerMethodsForRoutes(allRoutes).includes('sbp'),
        mobile_money: availableBuyerMethodsForRoutes(allRoutes).includes('mobile_money'),
        wallet: availableBuyerMethodsForRoutes(allRoutes).includes('wallet')
      };
      return reply.status(409).send({
        error: {
          code: 'no_receiving_route_for_method',
          message: 'Merchant has no active receiving route for the selected payment method.',
          details: {
            payment_method: checkoutProfileBody.payment_method,
            required_rail_type: receivingRailForBuyerPaymentMethod(checkoutProfileBody.payment_method),
            sender_bank_id: checkoutProfileBody.sender_bank_id,
            available_methods: availableBuyerMethodsForRoutes(allRoutes),
            available_payment_methods: availableMethods,
            fallback_actions: buildFallbackActionsForAvailableMethods(availableMethods),
            unavailable_reason: availableMethods.card || availableMethods.sbp || availableMethods.mobile_money || availableMethods.wallet
              ? 'method_not_supported_by_merchant'
              : 'merchant_no_active_receiving_method'
          }
        },
        official_bank_confirmation: false
      });
    }
    const preferredReceiverRoute = selectPreferredCompatibilityRoute(compatibleRoutes);
    const mutation = buildExpectedPaymentProfileMutation({
      body: request.body,
      loaded,
      phoneHmacSecret,
      auditEventId: idGenerator.auditEventId(),
      now: clock().toISOString(),
      compatibility: {
        receivingRouteId: preferredReceiverRoute.route_id,
        receiverBankId: preferredReceiverRoute.bank_profile_id,
        bankProfileId: preferredReceiverRoute.bank_profile_id,
        payerBankLauncherId: checkoutProfileBody.sender_bank_id
      }
    });
    if ('error' in mutation) {
      return reply.status(400).send(mutation);
    }
    const result = await repository!.saveExpectedPaymentProfile(mutation);
    return sendCheckoutMutationResult(reply, result, (updated) =>
      buildReceiverBankSelectionResponse({ ...updated, now: clock(), availableRoutes: allRoutes })
    );
  });

  server.post('/v1/checkout/:id/receiver-bank', async (request, reply) => {
    const loaded = await loadCheckoutSession({ request, reply, repository });
    if (!loaded) {
      return reply;
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

    const result = await repository!.selectReceiverBank({
      merchantId: loaded.paymentSession.merchantId,
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
    const routes = filterRoutesForExpectedPaymentMethod(await repository!.listReceivingRoutesForCheckoutBank(
      loaded.paymentSession.merchantId,
      loaded.paymentSession.id,
      receiverBank.bank_profile_id
    ), loaded.paymentSession.paymentMethod);
    return reply.status(200).send(
      toReceivingRoutesForBankResponse({
        paymentSession: loaded.paymentSession,
        bankProfileId: receiverBank.bank_profile_id,
        routes
      })
    );
  });

  server.post('/v1/checkout/:id/receiving-route', async (request, reply) => {
    const loaded = await loadCheckoutSession({ request, reply, repository });
    if (!loaded) {
      return reply;
    }
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Payment session id is required.', {}));
    }
    const body = request.body as { receiving_route_id?: unknown } | undefined;
    if (typeof body?.receiving_route_id !== 'string' || !body.receiving_route_id.trim()) {
      return reply.status(400).send(invalidRequest('receiving_route_id is required.', {}));
    }
    if (!loaded?.paymentSession.selectedReceiverBankProfileId) {
      return reply.status(404).send({
        error: {
          code: 'not_found',
          message: 'Payment session or selected receiver bank was not found.',
          details: {}
        }
      });
    }
    const visibleRoutes = filterRoutesForExpectedPaymentMethod(await repository!.listReceivingRoutesForCheckoutBank(
      loaded.paymentSession.merchantId,
      params.id,
      loaded.paymentSession.selectedReceiverBankProfileId
    ), loaded.paymentSession.paymentMethod);
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

    // The selected route drives the settlement currency: if it differs from the session
    // currency, re-quote to the route's currency (from the frozen base) before locking, so
    // the buyer pays in the route's currency and reconciliation expects that amount. FX-down
    // or non-requotable → best-effort: proceed in the current currency (currency_mismatch
    // handles it), never block route selection on FX availability.
    let sessionForSelection = loaded.paymentSession;
    const routeCurrency = receivingCurrencyForBankProfile(selectedRoute.bank_profile_id).toUpperCase();
    if (routeCurrency !== sessionForSelection.currency.toUpperCase() && fxRateService) {
      const baseCurrency = (sessionForSelection.baseCurrency ?? sessionForSelection.currency).toUpperCase();
      const baseAmountMinor = sessionForSelection.baseAmountMinor ?? sessionForSelection.expectedAmountMinor;
      const fx = await fxRateService.quote(
        baseCurrency,
        routeCurrency,
        baseAmountMinor,
        currencyMinorDigits(baseCurrency),
        currencyMinorDigits(routeCurrency)
      );
      if (fx.kind === 'ok') {
        const requoted = await repository!.requotePaymentSessionCurrency({
          merchantId: sessionForSelection.merchantId,
          paymentSessionId: params.id,
          currency: routeCurrency,
          amountMinor: fx.quote.amountMinorTarget,
          fxRate: fx.quote.rate,
          fxSource: fx.quote.source,
          fxTimestamp: fx.quote.rateTimestamp,
          auditEventId: idGenerator.auditEventId(),
          now: clock().toISOString()
        });
        if (requoted.kind === 'requoted') {
          sessionForSelection = requoted.paymentSession;
        }
      }
    }

    const result = await repository!.selectReceivingRoute({
      merchantId: sessionForSelection.merchantId,
      paymentSessionId: params.id,
      receivingRouteId: selectedRoute.route_id,
      expectedPaymentFingerprintForPayableAmount: buildExpectedPaymentFingerprintForSession(
        sessionForSelection,
        phoneHmacSecret
      ),
      auditEventId: idGenerator.auditEventId(),
      now: clock().toISOString()
    });
    return sendCheckoutMutationResult(reply, result, (updated) =>
      buildReceivingRouteSelectionResponse({ ...updated, now: clock(), route: selectedRoute })
    );
  });

  server.get('/v1/checkout/:id/receiving-route/copy-details', async (request, reply) => {
    applyCopyDetailsNoStoreHeaders(reply);
    const loaded = await loadCheckoutSession({ request, reply, repository });
    if (!loaded) {
      return reply;
    }
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Payment session id is required.', {}));
    }

    const result = await repository!.getSelectedReceivingRouteCopyDetails({
      merchantId: loaded.paymentSession.merchantId,
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
    await repository!.recordCheckoutDestinationCopied({
      merchantId: loaded.paymentSession.merchantId,
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
    const loaded = await loadCheckoutSession({ request, reply, repository });
    if (!loaded) {
      return reply;
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
    const result = await repository!.saveBuyerSenderPhoneHint({
      merchantId: loaded.paymentSession.merchantId,
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
    const loaded = await loadCheckoutSession({ request, reply, repository });
    if (!loaded) {
      return reply;
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
    if (!loaded?.paymentSession.selectedReceivingRouteId) {
      return reply.status(409).send({
        error: {
          code: 'receiving_route_required',
          message: 'Select a merchant receiving route before choosing the payer bank launcher.',
          details: {}
        }
      });
    }
    if (
      loaded.paymentSession.senderBankId &&
      launcher.payer_bank_launcher_id !== loaded.paymentSession.senderBankId
    ) {
      return reply.status(409).send({
        error: {
          code: 'payer_launcher_mismatch',
          message: 'The payer bank launcher must match the buyer sender bank.',
          details: {
            sender_bank_id: loaded.paymentSession.senderBankId,
            payer_bank_launcher_id: launcher.payer_bank_launcher_id,
            fallback_actions: ['refresh_methods', 'return_to_merchant']
          }
        },
        official_bank_confirmation: false
      });
    }

    const result = await repository!.selectPayerBankLauncher({
      merchantId: loaded.paymentSession.merchantId,
      paymentSessionId: params.id,
      payerBankLauncherId: launcher.payer_bank_launcher_id,
      auditEventId: idGenerator.auditEventId(),
      now: clock().toISOString()
    });
    return sendCheckoutMutationResult(reply, result, (updated) =>
      buildPayerBankLauncherSelectionResponse({ ...updated, now: clock() })
    );
  });

  // ---------------------------------------------------------------------------
  // Merchant FX — live reference rates for the currency-comparison screen.
  // Public reference data only (ECB / CBR / UEMOA peg via FxRateService); a rate is
  // never invented. Unavailable pairs are reported as available:false (not omitted)
  // so the merchant app shows an honest "indisponible" row instead of a silent gap.
  // ---------------------------------------------------------------------------
  server.get('/v1/fx/rates', async (request, reply) => {
    const FX_COMPARISON_CURRENCIES = ['USD', 'RUB', 'XOF', 'EUR'];
    const query = (request.query ?? {}) as { base?: unknown };
    const requestedBase = typeof query.base === 'string' ? query.base.toUpperCase() : 'USD';
    const base = FX_COMPARISON_CURRENCIES.includes(requestedBase) ? requestedBase : 'USD';
    const baseDigits = currencyMinorDigits(base);
    // Probe with 1,000,000 base units so even the smallest pair (e.g. XOF→EUR) yields a
    // positive target minor amount — quote() rejects sub-unit results. The returned
    // unit `rate` string is independent of the probe amount.
    const probeMinor = 1_000_000 * 10 ** baseDigits;

    const rates: Array<{
      currency: string;
      rate: string | null;
      source: string | null;
      rate_timestamp: string | null;
      available: boolean;
    }> = [];

    for (const target of FX_COMPARISON_CURRENCIES) {
      if (target === base) {
        continue;
      }
      let entry: {
        currency: string;
        rate: string | null;
        source: string | null;
        rate_timestamp: string | null;
        available: boolean;
      } = { currency: target, rate: null, source: null, rate_timestamp: null, available: false };
      if (fxRateService) {
        try {
          const result = await fxRateService.quote(
            base,
            target,
            probeMinor,
            baseDigits,
            currencyMinorDigits(target)
          );
          if (result.kind === 'ok') {
            entry = {
              currency: target,
              rate: result.quote.rate,
              source: result.quote.source,
              rate_timestamp: result.quote.rateTimestamp,
              available: true
            };
          }
        } catch {
          // Leave unavailable — never 500 on FX downtime, never invent a rate.
        }
      }
      rates.push(entry);
    }

    return reply.status(200).send({ base, rates });
  });

  // ---------------------------------------------------------------------------
  // Currency-first checkout — payable currencies listing + currency selection
  // ---------------------------------------------------------------------------

  server.get('/v1/checkout/:id/payable-currencies', async (request, reply) => {
    const loaded = await loadCheckoutSession({ request, reply, repository });
    if (!loaded) {
      return reply;
    }

    const readiness = await resolveMerchantPaymentReadiness(repository!, loaded.paymentSession.merchantId);
    const baseCurrency = (loaded.paymentSession.baseCurrency ?? loaded.paymentSession.currency).toUpperCase();
    const baseAmountMinor = loaded.paymentSession.baseAmountMinor ?? loaded.paymentSession.expectedAmountMinor;
    const currentCurrency = loaded.paymentSession.currency.toUpperCase();

    // Current currency is always present, no quote block.
    const currencies: Array<{
      currency: string;
      amount_minor: number;
      formatted: string;
      is_current: boolean;
      quote?: { rate: string; source: string; base_currency: string; base_amount_minor: number };
    }> = [
      {
        currency: currentCurrency,
        amount_minor: loaded.paymentSession.expectedAmountMinor,
        formatted: `${formatAmountMinor(loaded.paymentSession.expectedAmountMinor, currentCurrency)} ${currentCurrency}`,
        is_current: true
      }
    ];

    // For each receivable currency != current currency, try to quote from base.
    for (const candidate of readiness.receivable_currencies) {
      const candidateUpper = candidate.toUpperCase();
      if (candidateUpper === currentCurrency) {
        continue;
      }
      if (!fxRateService) {
        // FX service not configured — silently omit all non-current currencies.
        continue;
      }
      try {
        const result = await fxRateService.quote(
          baseCurrency,
          candidateUpper,
          baseAmountMinor,
          currencyMinorDigits(baseCurrency),
          currencyMinorDigits(candidateUpper)
        );
        if (result.kind !== 'ok') {
          // Silently omit unavailable candidates — never 500 on FX downtime.
          continue;
        }
        currencies.push({
          currency: candidateUpper,
          amount_minor: result.quote.amountMinorTarget,
          formatted: `${formatAmountMinor(result.quote.amountMinorTarget, candidateUpper)} ${candidateUpper}`,
          is_current: false,
          quote: {
            rate: result.quote.rate,
            source: result.quote.source,
            base_currency: baseCurrency,
            base_amount_minor: baseAmountMinor
          }
        });
      } catch {
        // Silently omit on unexpected errors.
      }
    }

    return reply.status(200).send({ currencies });
  });

  server.post('/v1/checkout/:id/currency', async (request, reply) => {
    const loaded = await loadCheckoutSession({ request, reply, repository });
    if (!loaded) {
      return reply;
    }
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.status(400).send(invalidRequest('Payment session id is required.', {}));
    }

    const body = request.body as { currency?: unknown } | undefined;
    if (typeof body?.currency !== 'string') {
      return reply.status(400).send(invalidRequest('currency is required.', {}));
    }
    const selectedCurrency = body.currency.toUpperCase();

    // Compute payable currencies (before FX quoting — only availability check).
    const readiness = await resolveMerchantPaymentReadiness(repository!, loaded.paymentSession.merchantId);
    const payableCurrencies = new Set(readiness.receivable_currencies.map((c) => c.toUpperCase()));
    const currentCurrency = loaded.paymentSession.currency.toUpperCase();

    if (!payableCurrencies.has(selectedCurrency)) {
      return reply.status(400).send({
        error: {
          code: 'currency_not_payable',
          message: 'The selected currency is not payable for this checkout.',
          details: { currency: selectedCurrency, payable_currencies: [...payableCurrencies] }
        }
      });
    }

    // Determine the amount in the selected currency.
    const baseCurrency = (loaded.paymentSession.baseCurrency ?? loaded.paymentSession.currency).toUpperCase();
    const baseAmountMinor = loaded.paymentSession.baseAmountMinor ?? loaded.paymentSession.expectedAmountMinor;
    let amountMinor: number;
    let fxRate: string;
    let fxSource: string;
    let fxTimestamp: string;

    if (selectedCurrency === currentCurrency) {
      // Identity selection: marks currency_selected_at without changing amounts.
      amountMinor = loaded.paymentSession.expectedAmountMinor;
      fxRate = '1';
      fxSource = 'identity';
      fxTimestamp = clock().toISOString();
    } else if (!fxRateService) {
      // FX service not configured — cannot quote a non-identity currency.
      return reply.status(409).send({
        error: {
          code: 'fx_rate_unavailable',
          message: 'Exchange rate is currently unavailable for the selected currency.',
          details: { currency: selectedCurrency }
        }
      });
    } else {
      // Quote from base currency to selected currency.
      const result = await fxRateService.quote(
        baseCurrency,
        selectedCurrency,
        baseAmountMinor,
        currencyMinorDigits(baseCurrency),
        currencyMinorDigits(selectedCurrency)
      );
      if (result.kind !== 'ok') {
        return reply.status(409).send({
          error: {
            code: 'fx_rate_unavailable',
            message: 'Exchange rate is currently unavailable for the selected currency.',
            details: { currency: selectedCurrency }
          }
        });
      }
      amountMinor = result.quote.amountMinorTarget;
      fxRate = result.quote.rate;
      fxSource = result.quote.source;
      fxTimestamp = result.quote.rateTimestamp;
    }

    const result = await repository!.requotePaymentSessionCurrency({
      merchantId: loaded.paymentSession.merchantId,
      paymentSessionId: params.id,
      currency: selectedCurrency,
      amountMinor,
      fxRate,
      fxSource,
      fxTimestamp,
      auditEventId: idGenerator.auditEventId(),
      now: clock().toISOString()
    });

    switch (result.kind) {
      case 'requoted': {
        const availableRoutes = await repository!.listReceiverBanksForCheckout(
          loaded.paymentSession.merchantId,
          params.id
        );
        const payableCurrencyCount = [
          ...new Set(availableRoutes.map((r) => receivingCurrencyForBankProfile(r.bank_profile_id)))
        ].length;
        return reply.status(200).send(
          toCheckoutStatusResponse({
            order: loaded.order,
            paymentSession: result.paymentSession,
            now: clock(),
            payableCurrencyCount
          })
        );
      }
      case 'route_already_locked':
        return reply.status(409).send({
          error: {
            code: 'route_already_locked',
            message: 'A receiving route is already locked for this session; currency cannot be changed.',
            details: {}
          }
        });
      case 'not_requotable':
        return reply.status(409).send({
          error: {
            code: 'checkout_step_out_of_order',
            message: 'Currency cannot be changed from the current payment session status.',
            details: {}
          }
        });
      case 'not_found':
        return reply.status(404).send({
          error: {
            code: 'not_found',
            message: 'Payment session was not found.',
            details: {}
          }
        });
    }
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
    const alreadyFinal = result.kind === 'already_final';
    const buyerClaimResult = 'claimResult' in result ? result.claimResult : undefined;
    return reply.status(alreadyFinal ? 200 : 202).send(
      buildCheckoutActionResponse({
        ...result,
        now: clock(),
        buyerClaimedPaid: !alreadyFinal,
        buyerClaimResult: buyerClaimResult ?? 'claim_recorded'
      })
    );
  });

  server.get('/v1/checkout/:id/status', async (request, reply) => {
    const loaded = await loadCheckoutSession({ request, reply, repository });
    if (!loaded) {
      return reply;
    }

    const availableRoutes = await repository!.listReceiverBanksForCheckout(
      loaded.paymentSession.merchantId,
      loaded.paymentSession.id
    );

    // Count receivable currencies from routes so the currency_selection step can be
    // triggered correctly. Computed here (before FX quoting) — the step gate opens when
    // >= 2 receivable currencies exist, regardless of FX availability.
    const receivableCurrencies = [...new Set(availableRoutes.map((r) => receivingCurrencyForBankProfile(r.bank_profile_id)))];

    reply.header('Cache-Control', 'no-store').header('Pragma', 'no-cache');
    return reply.status(200).send(
      toCheckoutStatusResponse({
        order: loaded.order,
        paymentSession: loaded.paymentSession,
        now: clock(),
        availableRoutes,
        payableCurrencyCount: receivableCurrencies.length
      })
    );
  });

  server.post('/v1/receiver-devices/register', async (request, reply) => {
    const merchantContext = await resolveReceiverConfigureContext(request, reply, MerchantPermissions.RECEIVER_CONFIGURE);
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
    const merchantContext = await resolveReceiverConfigureContext(request, reply, MerchantPermissions.RECEIVER_CONFIGURE);
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

    const receiverRuntimeConfig = repository
      ? await resolveAndroidReceiverRuntimeConfig(repository, merchantContext.merchantId, heartbeatAt)
      : null;

    return reply.status(200).send(
      buildReceiverHeartbeatResponse({
        device,
        serverTime: heartbeatAt,
        warnings: body.warnings ?? [],
        queueLength: body.value.queue_length,
        allowedBankProfileIds: body.value.allowed_bank_profile_ids,
        receiverRuntimeConfig
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
    const merchantId = parseMerchantId(request.headers.authorization, { allowTestBearer: options.environment !== 'production' });
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
    // Account creation is now anchored on Google (recover-or-create). It uses the same
    // id-token verifier seam as google-exchange and fails closed when Google is unconfigured.
    if (!googleIdTokenVerifier) {
      return reply.status(503).send(googleRecoveryUnconfiguredError('account_recovery'));
    }
    const parsed = validateAndroidMerchantCreateAccountRequest(request.body);
    if (!parsed.valid) {
      return reply.status(400).send(androidMerchantAccountContractError(parsed.code, parsed.field));
    }
    const verified = await googleIdTokenVerifier.verifyIdToken(parsed.value.id_token);
    if (!verified) {
      const diagnostics = googleIdTokenRejectedDiagnostics(parsed.value.id_token, googleIdTokenAudiences);
      server.log.warn(
        {
          provider: 'google',
          purpose: 'account_recovery',
          ...diagnostics
        },
        'google_id_token_rejected'
      );
      return reply.status(401).send(googleIdTokenRejectedError('account_recovery', diagnostics));
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
      googleSub: verified.googleSub,
      googleEmail: verified.email ?? null,
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

    // recovered → 200 (no new merchant); created → 201. Both return a mobile session.
    const statusCode = result.kind === 'recovered' ? 200 : 201;
    return reply.status(statusCode).send(toAndroidMerchantAccountCreateResponse(result.account, mobileSessionToken));
  });

  server.post(AndroidMerchantAccountAuthPaths.DEVICE_RECOVER, async (request, reply) => {
    if (!authBffRepository) {
      return reply.status(503).send(authBffRepositoryUnavailableError());
    }
    const parsed = validateAndroidMerchantDeviceRecoverRequest(request.body);
    if (!parsed.valid) {
      return reply.status(400).send(androidMerchantAccountContractError(parsed.code, parsed.field));
    }

    const now = clock();
    const mobileSessionToken = createAndroidMerchantMobileSessionToken();
    const result = await authBffRepository.recoverAndroidMerchantKnownDevice({
      deviceProofHash: hashAndroidMerchantDeviceProof(parsed.value.device_proof.install_public_key),
      mobileSessionId: randomUUID(),
      mobileSessionHash: hashAndroidMerchantMobileSessionToken(mobileSessionToken),
      expiresAt: new Date(now.getTime() + ANDROID_MERCHANT_MOBILE_SESSION_TTL_MS).toISOString(),
      now: now.toISOString()
    });
    if (result.kind === 'recovered') {
      return reply.status(200).send(toAndroidMerchantAccountCreateResponse(result.account, mobileSessionToken));
    }
    if (result.kind === 'recovery_required') {
      return reply.status(409).send(
        invalidRequest('This Android merchant device requires account recovery.', {
          device_status: AndroidMerchantDeviceLookupStatuses.RECOVERY_REQUIRED,
          recovery_options: ['google']
        })
      );
    }
    return reply.status(404).send(
      invalidRequest('Known Android merchant device was not found.', {
        device_status: AndroidMerchantDeviceLookupStatuses.RECOVERY_REQUIRED,
        recovery_options: ['google']
      })
    );
  });

  server.post(AndroidMerchantAccountAuthPaths.SESSION_REFRESH, async (request, reply) => {
    const mobileSession = await requireAndroidMerchantMobileSession(request, reply);
    if (!mobileSession) {
      return;
    }
    if (!authBffRepository) {
      return reply.status(503).send(authBffRepositoryUnavailableError());
    }
    const bearerToken = parseBearerToken(request.headers.authorization);
    if (!bearerToken) {
      return reply.status(401).send(
        invalidRequest('An Android merchant mobile session is required for this endpoint.', {
          authorization: 'Bearer spm_<mobile_session_token>'
        })
      );
    }
    const now = clock();
    const refreshed = await authBffRepository.refreshAndroidMerchantMobileSession({
      mobileSessionHash: hashAndroidMerchantMobileSessionToken(bearerToken),
      expiresAt: new Date(now.getTime() + ANDROID_MERCHANT_MOBILE_SESSION_TTL_MS).toISOString(),
      now: now.toISOString()
    });
    if (!refreshed) {
      return reply.status(401).send(
        invalidRequest('Android merchant mobile session could not be refreshed.', {
          recovery_options: ['device_recover', 'google']
        })
      );
    }
    return reply.status(200).send({
      mobile_session: {
        expires_at: refreshed.expiresAt,
        sliding_renewal: true
      }
    });
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
      const diagnostics = googleIdTokenRejectedDiagnostics(parsed.value.id_token, googleIdTokenAudiences);
      server.log.warn(
        {
          provider: 'google',
          purpose: 'account_recovery',
          ...diagnostics
        },
        'google_id_token_rejected'
      );
      return reply.status(401).send(
        googleIdTokenRejectedError(
          'account_recovery',
          diagnostics
        )
      );
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
      const diagnostics = googleIdTokenRejectedDiagnostics(idToken, googleIdTokenAudiences);
      server.log.warn(
        {
          provider: 'google',
          purpose: 'account_recovery_linking',
          ...diagnostics
        },
        'google_id_token_rejected'
      );
      return reply.status(401).send(
        googleIdTokenRejectedError(
          'account_recovery_linking',
          diagnostics
        )
      );
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

  server.get('/v1/android-merchant/confirmation-settings', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    void merchantId;
    return reply.status(200).send({
      mode: 'manual_review_required',
      allow_auto_confirmation: false,
      android_can_confirm_payments: false,
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false,
      ai_confirmation_status: 'future_only_not_active_v1',
      updated_at: clock().toISOString()
    });
  });

  server.put('/v1/android-merchant/confirmation-settings', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    if (androidSupportPayloadHasForbiddenAutomation(request.body)) {
      return reply.status(400).send(invalidRequest('Auto-confirmation is not configurable in V1.', {}));
    }
    void merchantId;
    return reply.status(200).send({
      mode: 'manual_review_required',
      allow_auto_confirmation: false,
      android_can_confirm_payments: false,
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false,
      ai_confirmation_status: 'future_only_not_active_v1',
      updated_at: clock().toISOString()
    });
  });

  server.post('/v1/android-merchant/support-tickets', async (request, reply) => {
    const mobileSession = await requireAndroidMerchantMobileSession(request, reply);
    if (!mobileSession) {
      return;
    }
    const parsed = parseAndroidSupportTicketBody(request.body);
    if ('error' in parsed) {
      return reply.status(400).send(parsed.error);
    }
    if (!supportTicketRepository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Support ticket storage is unavailable.'
        }
      });
    }
    const now = clock().toISOString();
    const ticket = await supportTicketRepository.create({
      id: supportTicketIdGenerator(),
      merchantId: mobileSession.merchantId,
      userId: mobileSession.userId,
      category: parsed.value.category,
      subject: parsed.value.subject,
      message: parsed.value.message,
      safeContext: parsed.value.safeContext,
      createdAt: now
    });
    return reply.status(201).send({
      ticket_id: ticket.id,
      merchant_id: ticket.merchantId,
      status: ticket.status,
      category: ticket.category,
      created_at: ticket.createdAt,
      safe_message: 'Demande support creee. Aucun secret ni donnee brute n a ete accepte.',
      official_bank_confirmation: false
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
    const metricSummary = merchantMetricsRepository
      ? await merchantMetricsRepository.getSummary({ merchantId, range: '30d', now: clock() })
      : null;
    const metricTimeseries = merchantMetricsRepository
      ? await merchantMetricsRepository.getTimeseries({ merchantId, range: '30d', bucket: 'day', now: clock() })
      : null;
    const now = clock().toISOString();
    const readiness = repository ? await resolveMerchantPaymentReadiness(repository, merchantId) : null;
    const receiverRuntimeConfig = repository
      ? await resolveAndroidReceiverRuntimeConfig(repository, merchantId, now)
      : null;
    return reply.status(200).send(
      toAndroidMerchantDashboardSummaryResponse(
        reviews,
        metricSummary,
        metricTimeseries,
        readiness,
        receiverRuntimeConfig
      )
    );
  });

  server.get('/v1/android-merchant/orders', async (request, reply) => {
    const merchantId = await requireAndroidMerchantId(request, reply);
    if (!merchantId) {
      return;
    }
    if (!repository?.listMerchantOrders) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Order list repository is not configured.',
          details: {}
        }
      });
    }

    const orders = await repository.listMerchantOrders(merchantId, { limit: 50 });
    return reply.status(200).send(toAndroidMerchantOrdersResponse(orders));
  });

  server.get('/v1/merchant/metrics/summary', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.PAYMENTS_REVIEW_READ, {
      allowAndroidMobile: true
    });
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(invalidRequest('An authenticated merchant session is required for metrics.', {}));
    }
    if (!merchantMetricsRepository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Merchant metrics repository is not configured.',
          details: {}
        }
      });
    }
    const query = request.query as { range?: unknown };
    const summary = await merchantMetricsRepository.getSummary({
      merchantId: merchantContext.merchantId,
      range: parseMerchantMetricsRange(query.range),
      now: clock()
    });
    return reply.status(200).send(toMerchantMetricsSummaryResponse(summary));
  });

  server.get('/v1/merchant/metrics/timeseries', async (request, reply) => {
    const merchantContext = await resolveMerchantContext(request, reply, MerchantPermissions.PAYMENTS_REVIEW_READ, {
      allowAndroidMobile: true
    });
    if (!merchantContext) {
      if (reply.sent) return reply;
      return reply.status(401).send(invalidRequest('An authenticated merchant session is required for metrics.', {}));
    }
    if (!merchantMetricsRepository) {
      return reply.status(503).send({
        error: {
          code: 'service_unavailable',
          message: 'Merchant metrics repository is not configured.',
          details: {}
        }
      });
    }
    const query = request.query as { range?: unknown; bucket?: unknown };
    const timeseries = await merchantMetricsRepository.getTimeseries({
      merchantId: merchantContext.merchantId,
      range: parseMerchantMetricsRange(query.range),
      bucket: parseMerchantMetricsBucket(query.bucket),
      now: clock()
    });
    return reply.status(200).send(toMerchantMetricsTimeseriesResponse(timeseries));
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
    const query = request.query as { developer_mode?: string | boolean | undefined };
    const developerMode = query.developer_mode === true || query.developer_mode === 'true';
    if (merchantIntegrationRepository) {
      const now = clock().toISOString();
      const integration = await merchantIntegrationRepository.getIntegration(merchantId, now);
      const deliveries = await merchantIntegrationRepository.listDeliveries(merchantId, 5);
      return reply
        .status(200)
        .send(toAndroidMerchantConnectedSiteIntegrationResponse(integration, deliveries, developerMode));
    }
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
      requireCsrf: true,
      allowAndroidMobile: true
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
      actor: reviewActorFromMerchantContext(context),
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
    const context = await resolveMerchantContext(request, reply, MerchantPermissions.PAYMENTS_REVIEW_REJECT, {
      requireCsrf: true,
      allowAndroidMobile: true
    });
    if (!context) {
      if (!reply.sent) {
        return reply.status(401).send(
          invalidRequest('A merchant dashboard session or Android merchant mobile session is required for review rejection.', {
            authorization: 'Bearer spm_<mobile_session_token>'
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
      actor: reviewActorFromMerchantContext(context),
      idGenerator: reviewIdGenerator,
      now: occurredAt
    });
    const result = await reviewRepository.rejectReview(input);

    if (result.kind !== 'updated') {
      return reply.status(reviewActionErrorStatus(result.kind)).send(reviewActionErrorResponse(result.kind, params.id));
    }
    if (!result.idempotent) {
      metrics.increment(MetricNames.REVIEWS_REJECTED_TOTAL);

      await eventPublisher.publish(
        buildReviewActionEvent({
          eventId: reviewIdGenerator.eventId(),
          result,
          merchantId,
          occurredAt
        })
      );
    }

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

function createDefaultSupportTicketRepository(env: NodeJS.ProcessEnv): AndroidMerchantSupportTicketRepository | null {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  return new PgAndroidMerchantSupportTicketRepository(databaseUrl);
}

function createDefaultMerchantMetricsRepository(env: NodeJS.ProcessEnv): MerchantMetricsRepository | null {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  return new PgMerchantMetricsRepository(databaseUrl);
}

class PgAndroidMerchantSupportTicketRepository implements AndroidMerchantSupportTicketRepository {
  private readonly pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 3 });
  }

  async create(input: AndroidMerchantSupportTicketCreateInput): Promise<AndroidMerchantSupportTicketRecord> {
    const result = await this.pool.query(
      `INSERT INTO android_merchant_support_tickets (
        id, merchant_id, user_id, category, subject, message, safe_context, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'created', $8, $8)
      RETURNING id, merchant_id, user_id, category, subject, message, safe_context, status, created_at, updated_at`,
      [
        input.id,
        input.merchantId,
        input.userId,
        input.category,
        input.subject,
        input.message,
        JSON.stringify(input.safeContext),
        input.createdAt
      ]
    );
    const row = result.rows[0] as {
      id: string;
      merchant_id: string;
      user_id: string;
      category: string;
      subject: string;
      message: string;
      safe_context: Record<string, unknown>;
      status: 'created' | 'closed';
      created_at: Date;
      updated_at: Date;
    };
    return {
      id: row.id,
      merchantId: row.merchant_id,
      userId: row.user_id,
      category: row.category,
      subject: row.subject,
      message: row.message,
      safeContext: row.safe_context,
      status: row.status,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }
}

async function loadCheckoutSession(params: {
  request: FastifyRequest;
  reply: FastifyReply;
  repository: OrderRepository | null;
}): Promise<{ order: StoredOrderRecord; paymentSession: StoredPaymentSessionRecord } | null> {
  if (!params.repository) {
    params.reply.status(503).send(orderRepositoryUnavailableError());
    return null;
  }
  const routeParams = params.request.params as { id?: string };
  if (!routeParams.id) {
    params.reply.status(400).send(invalidRequest('Payment session id is required.', {}));
    return null;
  }

  const result = await params.repository.getCheckoutSessionById(routeParams.id);
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

function filterRoutesForExpectedPaymentMethod(
  routes: readonly StoredMerchantReceivingRouteRecord[],
  paymentMethod: StoredPaymentSessionRecord['paymentMethod']
): StoredMerchantReceivingRouteRecord[] {
  if (!paymentMethod) {
    return [...routes];
  }
  const expectedRail = receivingRailForBuyerPaymentMethod(paymentMethod);
  return routes.filter((route) => route.rail_type === expectedRail);
}

function availableBuyerMethodsForRoutes(
  routes: readonly StoredMerchantReceivingRouteRecord[]
): Array<BuyerCheckoutPaymentMethod> {
  const rails = new Set<ReceivingRouteRailType>(routes.map((route) => route.rail_type));
  const methods: Array<BuyerCheckoutPaymentMethod> = [];
  if (rails.has('card_transfer')) {
    methods.push('card');
  }
  if (rails.has('phone_transfer')) {
    methods.push('sbp');
  }
  if (rails.has('mobile_money')) {
    methods.push('mobile_money');
  }
  if (rails.has('wallet_transfer')) {
    methods.push('wallet');
  }
  return methods;
}

function buildFallbackActionsForAvailableMethods(methods: { card: boolean; sbp: boolean }): CheckoutFallbackAction[] {
  return [
    methods.card ? 'switch_to_card' : null,
    methods.sbp ? 'switch_to_sbp' : null,
    'refresh_methods',
    'return_to_merchant'
  ].filter((action): action is CheckoutFallbackAction => Boolean(action));
}

function selectPreferredCompatibilityRoute(
  routes: readonly StoredMerchantReceivingRouteRecord[]
): StoredMerchantReceivingRouteRecord {
  return routes.find((route) => route.recommended) ?? routes[0]!;
}

async function mutateSimpleCheckoutAction(params: {
  request: FastifyRequest;
  reply: FastifyReply;
  repository: OrderRepository | null;
  idGenerator: IdGenerator;
  clock: () => Date;
  action: 'instructions' | 'receiver_armed' | 'claimed_paid';
}) {
  const loaded = await loadCheckoutSession({
    request: params.request,
    reply: params.reply,
    repository: params.repository
  });
  if (!loaded) {
    return null;
  }
  const routeParams = params.request.params as { id?: string };
  if (!routeParams.id) {
    params.reply.status(400).send(invalidRequest('Payment session id is required.', {}));
    return null;
  }
  const forbiddenField = findForbiddenCheckoutActionCredentialField(params.request.body);
  if (forbiddenField) {
    params.reply.status(400).send(invalidRequest('Checkout action does not accept buyer payment credentials.', {
      field: forbiddenField
    }));
    return null;
  }

  const input = {
    merchantId: loaded.paymentSession.merchantId,
    paymentSessionId: routeParams.id,
    auditEventId: params.idGenerator.auditEventId(),
    now: params.clock().toISOString()
  };
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
  if ((params.action === 'instructions' || params.action === 'receiver_armed') && !loaded.paymentSession.paymentMethod) {
    params.reply.status(409).send({
      error: {
        code: 'expected_payment_profile_required',
        message: 'Buyer identity and sender method must be saved before payment instructions are shown.',
        details: {}
      }
    });
    return null;
  }
  if (params.action === 'instructions' || params.action === 'receiver_armed') {
    const routeAvailability = await selectedReceivingRouteStillAvailable({
      repository: params.repository!,
      paymentSession: loaded.paymentSession
    });
    if (!routeAvailability.available) {
      params.reply.status(409).send({
        error: {
          code: 'receiving_route_unavailable',
          message: 'The selected receiving route is no longer active or compatible with this checkout.',
          details: {
            payment_method: loaded.paymentSession.paymentMethod,
            receiving_route_id: loaded.paymentSession.selectedReceivingRouteId,
            unavailable_reason: routeAvailability.unavailable_reason,
            fallback_actions: routeAvailability.fallback_actions
          }
        },
        official_bank_confirmation: false
      });
      return null;
    }
  }
  if (params.action === 'receiver_armed' && !loaded.paymentSession.paymentInstructionsShownAt) {
    params.reply.status(409).send({
      error: {
        code: 'payment_instructions_not_shown',
        message: 'Payment instructions must be shown before the receiver can be armed.',
        details: {}
      }
    });
    return null;
  }
  if (params.action === 'receiver_armed' && loaded.paymentSession.status === 'receiver_armed') {
    return { kind: 'updated', order: loaded.order, paymentSession: loaded.paymentSession };
  }
  const result = await mutateCheckoutActionRepository(params.repository!, params.action, input);
  switch (result.kind) {
    case 'updated':
      return result;
    case 'already_final':
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
    case 'invalid_transition':
      params.reply.status(409).send({
        error: {
          code: 'checkout_step_out_of_order',
          message: 'Checkout step cannot be applied from the current payment session status.',
          details: { current_status: result.currentStatus }
        }
      });
      return null;
  }
}

function buildExpectedPaymentFingerprintForSession(
  session: StoredPaymentSessionRecord,
  phoneHmacSecret: string
): ((payableAmountMinor: number) => string) | undefined {
  if (!session.senderBankId || !session.paymentMethod) {
    return undefined;
  }

  return (payableAmountMinor: number): string =>
    hmacSha256(
      `expected_payment_fingerprint:${[
        session.merchantId,
        session.id,
        String(payableAmountMinor),
        session.referenceCode,
        session.senderBankId,
        session.paymentMethod,
        new Date(session.validUntil).toISOString()
      ].join('|')}`,
      phoneHmacSecret
    );
}

function findForbiddenCheckoutActionCredentialField(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const forbidden =
    /^(sender_card_number|card_number|cardnumber|card_pan|pan|full_card|sender_phone|phone|cvv|cvc|security_code|expiration|expiry|exp_month|exp_year|pin|sms_code)$/iu;
  for (const [key, nested] of Object.entries(value)) {
    if (forbidden.test(key)) {
      return key;
    }
    const child = findForbiddenCheckoutActionCredentialField(nested);
    if (child) {
      return child;
    }
  }
  return null;
}

async function selectedReceivingRouteStillAvailable(params: {
  repository: OrderRepository;
  paymentSession: StoredPaymentSessionRecord;
}): Promise<
  | { available: true }
  | {
      available: false;
      unavailable_reason: CheckoutUnavailableReason;
      fallback_actions: CheckoutFallbackAction[];
    }
> {
  if (
    !params.paymentSession.paymentMethod ||
    !params.paymentSession.selectedReceiverBankProfileId ||
    !params.paymentSession.selectedReceivingRouteId
  ) {
    return {
      available: false,
      unavailable_reason: 'route_disabled',
      fallback_actions: ['refresh_methods', 'return_to_merchant']
    };
  }

  const visibleMerchantRoutes = await params.repository.listReceiverBanksForCheckout(
    params.paymentSession.merchantId,
    params.paymentSession.id
  );
  const availableMethods = {
    card: availableBuyerMethodsForRoutes(visibleMerchantRoutes).includes('card'),
    sbp: availableBuyerMethodsForRoutes(visibleMerchantRoutes).includes('sbp')
  };
  const fallbackActions = buildFallbackActionsForAvailableMethods(availableMethods);

  const routes = filterRoutesForExpectedPaymentMethod(
    await params.repository.listReceivingRoutesForCheckoutBank(
      params.paymentSession.merchantId,
      params.paymentSession.id,
      params.paymentSession.selectedReceiverBankProfileId
    ),
    params.paymentSession.paymentMethod
  );

  if (routes.some((route) => route.route_id === params.paymentSession.selectedReceivingRouteId)) {
    return { available: true };
  }

  const route = (await params.repository.listReceivingRoutes(params.paymentSession.merchantId)).find(
    (candidate) => candidate.route_id === params.paymentSession.selectedReceivingRouteId
  );
  return {
    available: false,
    unavailable_reason: route?.lifecycle_status === 'revoked' ? 'route_revoked' : 'route_disabled',
    fallback_actions: fallbackActions.length > 0 ? fallbackActions : ['refresh_methods', 'return_to_merchant']
  };
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
    case 'amount_lease_unavailable':
      return reply.status(409).send({
        error: {
          code: 'amount_lease_unavailable',
          message: 'No payable amount is available for this checkout route right now.',
          details: {
            unavailable_reason: 'amount_lease_unavailable',
            fallback_actions: ['refresh_methods', 'return_to_merchant']
          }
        },
        official_bank_confirmation: false
      });
    case 'invalid_transition':
      return reply.status(409).send({
        error: {
          code: 'checkout_step_out_of_order',
          message: 'Checkout step cannot be applied from the current payment session status.',
          details: { current_status: result.currentStatus }
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

function googleIdTokenRejectedError(purpose: 'account_recovery' | 'account_recovery_linking', diagnostics: Record<string, unknown>) {
  return {
    error: {
      code: 'google_id_token_rejected',
      message: 'Google ID token could not be verified.',
      details: {
        provider: 'google',
        purpose,
        ...diagnostics
      }
    }
  };
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

interface AndroidReceiverRuntimeConfig {
  merchant_id: string;
  enabled_bank_profile_ids: string[];
  payment_intent_active: boolean;
  receiver_armed: boolean;
  expected_payment_profile_present: boolean;
  receiving_route_locked: boolean;
  active_payment_sessions_count: number;
  active_until: string | null;
}

async function resolveAndroidReceiverRuntimeConfig(
  repository: OrderRepository,
  merchantId: string,
  now: string
): Promise<AndroidReceiverRuntimeConfig> {
  const activeSessions = repository.listActiveReceiverPaymentSessions
    ? await repository.listActiveReceiverPaymentSessions(merchantId, now)
    : [];
  const activeBankProfileIds = activeSessions
    .map((item) => item.paymentSession.selectedReceiverBankProfileId)
    .filter((id): id is string => Boolean(id));
  const configuredRoutes = await repository.listReceiverBanksForCheckout(merchantId, '__merchant_receiver_runtime__');
  const configuredBankProfileIds = configuredRoutes.map((route) => route.bank_profile_id);
  const enabledBankProfileIds = [...new Set([...activeBankProfileIds, ...configuredBankProfileIds])].sort();
  const activeUntil = latestActiveUntil(activeSessions);

  return {
    merchant_id: merchantId,
    enabled_bank_profile_ids: enabledBankProfileIds,
    payment_intent_active: activeSessions.length > 0,
    receiver_armed: activeSessions.some((item) => Boolean(item.paymentSession.receiverArmedAt)),
    expected_payment_profile_present: activeSessions.some((item) =>
      Boolean(item.paymentSession.expectedPaymentFingerprint && item.paymentSession.paymentMethod)
    ),
    receiving_route_locked: activeSessions.some((item) => isReceivingRouteLockedForRuntime(item.paymentSession, now)),
    active_payment_sessions_count: activeSessions.length,
    active_until: activeUntil
  };
}

function latestActiveUntil(activeSessions: ActiveReceiverPaymentSession[]): string | null {
  const latestMs = activeSessions.reduce<number | null>((latest, item) => {
    const candidate = item.paymentSession.routeLockExpiresAt ?? item.paymentSession.validUntil;
    const candidateMs = Date.parse(candidate);
    if (!Number.isFinite(candidateMs)) {
      return latest;
    }
    return latest === null || candidateMs > latest ? candidateMs : latest;
  }, null);
  return latestMs === null ? null : new Date(latestMs).toISOString();
}

function isReceivingRouteLockedForRuntime(
  paymentSession: StoredPaymentSessionRecord,
  now: string
): boolean {
  if (!paymentSession.selectedReceivingRouteId || !paymentSession.routeLockedAt || !paymentSession.routeLockExpiresAt) {
    return false;
  }
  const nowMs = Date.parse(now);
  const expiresMs = Date.parse(paymentSession.routeLockExpiresAt);
  return Number.isFinite(nowMs) && Number.isFinite(expiresMs) && expiresMs > nowMs;
}

function toAndroidMerchantDashboardSummaryResponse(
  reviews: ReviewListItem[],
  metricSummary: MerchantMetricsSummary | null = null,
  metricTimeseries: MerchantMetricsTimeseries | null = null,
  readiness: MerchantPaymentReadiness | null = null,
  receiverRuntimeConfig: AndroidReceiverRuntimeConfig | null = null
): Record<string, unknown> {
  const sorted = sortAndroidMerchantReviews(reviews);
  const merchantSetupStatus = readiness?.merchant_setup_status ?? 'receiver_required';
  const paymentReady = readiness?.payment_ready ?? false;
  const readinessMessage = paymentReady
    ? 'Paiements disponibles en validation manuelle.'
    : merchantSetupStatus === 'receiving_method_required'
      ? 'Ajoutez un moyen de réception pour activer les paiements.'
      : 'Votre configuration doit être complétée avant de recevoir des paiements.';
  return {
    payments_to_review_count: sorted.length,
    confirmed_today_count: metricSummary?.confirmedPaymentCount ?? 0,
    notifications_sent_count: 0,
    metrics_summary: metricSummary ? toMerchantMetricsSummaryResponse(metricSummary) : null,
    metrics_timeseries: metricTimeseries ? toMerchantMetricsTimeseriesResponse(metricTimeseries) : null,
    merchant_setup_status: merchantSetupStatus,
    payment_ready: paymentReady,
    setup_actions: readiness?.setup_actions ?? ['connect_receiver'],
    readiness_message: readinessMessage,
    receiver_runtime_config: receiverRuntimeConfig,
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

function toMerchantMetricsSummaryResponse(summary: MerchantMetricsSummary): Record<string, unknown> {
  return {
    range: summary.range,
    currency: summary.currency,
    confirmed_payment_count: summary.confirmedPaymentCount,
    confirmed_amount_minor: summary.confirmedAmountMinor,
    pending_review_count: summary.pendingReviewCount,
    rejected_payment_count: summary.rejectedPaymentCount,
    expired_payment_count: summary.expiredPaymentCount,
    failed_count: summary.failedCount,
    confirmation_rate: summary.confirmationRate,
    average_manual_confirmation_delay_seconds: summary.averageManualConfirmationDelaySeconds,
    ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
  };
}

function toMerchantMetricsTimeseriesResponse(timeseries: MerchantMetricsTimeseries): Record<string, unknown> {
  return {
    range: timeseries.range,
    bucket: timeseries.bucket,
    points: timeseries.points.map((point) => ({
      date: point.date,
      confirmed_payment_count: point.confirmedPaymentCount,
      confirmed_amount_minor: point.confirmedAmountMinor,
      pending_review_count: point.pendingReviewCount,
      rejected_payment_count: point.rejectedPaymentCount,
      expired_payment_count: point.expiredPaymentCount,
      confirmation_rate: point.confirmationRate
    })),
    ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
  };
}

const ANDROID_MERCHANT_CONFIRMED_ORDER_STATUSES = new Set<OrderStatus>(['manual_confirmed', 'fulfilled']);
const ANDROID_MERCHANT_FAILED_ORDER_STATUSES = new Set<OrderStatus>(['rejected', 'expired']);

function toAndroidMerchantOrdersResponse(orders: StoredOrderRecord[]): Record<string, unknown> {
  const confirmedOrders = orders.filter((order) => ANDROID_MERCHANT_CONFIRMED_ORDER_STATUSES.has(order.status));
  const failedCount = orders.filter((order) => ANDROID_MERCHANT_FAILED_ORDER_STATUSES.has(order.status)).length;
  const confirmedAmountMinor = confirmedOrders.reduce((total, order) => total + order.amountMinor, 0);
  const finalCount = confirmedOrders.length + failedCount;
  const confirmationRate = finalCount > 0 ? Math.round((confirmedOrders.length / finalCount) * 100) : 0;

  return {
    summary: {
      confirmed_order_count: confirmedOrders.length,
      confirmed_amount_minor: confirmedAmountMinor,
      failed_count: failedCount,
      confirmation_rate: confirmationRate,
      currency: confirmedOrders[0]?.currency ?? orders[0]?.currency ?? 'RUB'
    },
    orders: confirmedOrders.map((order) => ({
      order_id: order.id,
      external_id: order.externalId,
      product_name: order.productName,
      amount: amountResponse(order.amountMinor, order.currency),
      status: order.status,
      status_label: androidMerchantOrderStatusLabel(order.status),
      helper: 'Confirmation marchand',
      confirmed_at: order.updatedAt
    })),
    ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
  };
}

function androidMerchantOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'manual_confirmed':
    case 'fulfilled':
      return 'Confirmee';
    case 'rejected':
      return 'Rejetee';
    case 'expired':
      return 'Expiree';
    default:
      return 'En attente';
  }
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
    displayAmountMinor?: number | undefined;
    payableAmountMinor?: number | undefined;
    detectedAmountMinor?: number | undefined;
    amountDeltaMinor?: number | undefined;
    amountRiskLabel?: string | undefined;
    currency?: string | undefined;
    referenceCodeMasked?: string | undefined;
    createdAt: string;
    reasonCode: string;
    score?: number | undefined;
    positiveReasonCodes: string[];
    negativeReasonCodes: string[];
  },
  route: StoredMerchantReceivingRouteRecord | null
): Record<string, unknown> {
  const reasonCodes = [
    review.reasonCode,
    ...review.positiveReasonCodes,
    ...review.negativeReasonCodes
  ];
  const displayAmountMinor = review.displayAmountMinor ?? review.amountMinor;
  const payableAmountMinor = review.payableAmountMinor ?? review.amountMinor;
  const detectedAmountMinor = review.detectedAmountMinor ?? review.amountMinor;
  const amountDeltaMinor =
    review.amountDeltaMinor ??
    (detectedAmountMinor !== undefined && payableAmountMinor !== undefined
      ? Math.abs(detectedAmountMinor - payableAmountMinor)
      : undefined);
  const riskLabel = review.amountRiskLabel ?? amountRiskLabelForAndroidMerchantReview(reasonCodes, amountDeltaMinor);

  return {
    payment: {
      id: review.id,
      review_id: review.id,
      order_id: review.orderId,
      payment_session_id: review.paymentSessionId,
      status: 'to_review',
      status_label: 'À vérifier',
      amount_displayed: amountResponse(displayAmountMinor, review.currency),
      amount_expected: amountResponse(payableAmountMinor, review.currency),
      amount_detected: amountResponse(detectedAmountMinor, review.currency),
      amount_delta_minor: amountDeltaMinor ?? null,
      amount_delta: amountResponse(amountDeltaMinor, review.currency),
      risk_label: riskLabel,
      bank_display_name: bankDisplayNameForProfile(review.bankProfileId),
      receiving_method_masked: route ? receivingMethodMaskedLabel(route) : 'Moyen de réception masqué',
      payment_reference: review.referenceCodeMasked ?? '<REFERENCE>',
      signal_received_at: review.createdAt,
      score: review.score ?? null,
      reason_labels: reasonLabelsForAndroidMerchantReview(reasonCodes),
      timeline: [
        {
          label: 'Signal reçu',
          occurred_at: review.createdAt
        },
        {
          label: 'Review créée',
          occurred_at: review.createdAt
        }
      ],
      allowed_actions: ['reject_signal', 'reject_order']
    },
    ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
  };
}

function toAndroidMerchantConnectedSiteIntegrationResponse(
  integration: MerchantIntegrationState,
  deliveries: MerchantDeliveryHistoryRow[],
  developerMode: boolean
): Record<string, unknown> {
  const active = integration.webhookStatus === 'active' && Boolean(integration.webhookUrl);
  const latestDelivery = deliveries[0] ?? null;
  const merchantDeliveryStatus = latestDelivery ? merchantDeliveryHealthLabel(latestDelivery.status) : 'none';
  return {
    webhook_url_display: active ? integration.webhookUrl : null,
    status: active ? 'active' : 'problem',
    status_label: active ? 'Connexion active' : 'Action nécessaire',
    last_delivery_status: merchantDeliveryStatus,
    last_delivery_at: latestDelivery?.deliveredAt ?? latestDelivery?.createdAt ?? null,
    latest_deliveries: null,
    developer_details: developerMode
      ? {
          event_types_visible: true,
          signature_status_visible: true,
          latest_deliveries: deliveries.map((delivery) => ({
            delivery_id: delivery.deliveryId,
            status: delivery.status,
            attempts: delivery.attempts,
            last_http_status: delivery.lastHttpStatus,
            created_at: delivery.createdAt,
            delivered_at: delivery.deliveredAt,
            safe_error_summary: delivery.safeErrorSummary
          }))
        }
      : null,
    ...PUBLIC_EVENT_SIGNAL_DISCLOSURE
  };
}

function merchantDeliveryHealthLabel(status: string): 'ok' | 'attention' {
  return ['delivered', 'success', 'succeeded'].includes(status) ? 'ok' : 'attention';
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
    value: formatAmountMinor(amountMinor ?? 0, currency),
    currency: currency ?? 'RUB'
  };
}

function amountRiskLabelForAndroidMerchantReview(reasonCodes: string[], amountDeltaMinor: number | undefined): string {
  const normalized = reasonCodes.map((reason) => reason.toUpperCase());
  if (normalized.includes('DISPLAY_AMOUNT_ONLY_MATCH')) {
    return 'Montant affiché seulement';
  }
  if (normalized.includes('PAYABLE_AMOUNT_MISMATCH')) {
    return 'Montant exact attendu différent';
  }
  if (normalized.includes('PAYABLE_AMOUNT_EXACT_MATCH') && (amountDeltaMinor ?? 0) === 0) {
    return 'Montant exact attendu reconnu';
  }
  return 'Validation manuelle requise';
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
    const upper = reasonCode.toUpperCase();
    if (upper === 'PAYABLE_AMOUNT_EXACT_MATCH') {
      labels.add('Montant exact attendu reconnu');
    }
    if (upper === 'DISPLAY_AMOUNT_ONLY_MATCH') {
      labels.add('Montant affiché seulement');
    }
    if (upper === 'PAYABLE_AMOUNT_MISMATCH') {
      labels.add('Montant exact attendu différent');
    }
    if (upper === 'RECONCILIATION_AMOUNT_EXPECTED') {
      labels.add('Micro-ajustement attendu');
    }
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

function parseAndroidSupportTicketBody(body: unknown):
  | { value: { category: string; subject: string; message: string; safeContext: Record<string, unknown> } }
  | { error: ReturnType<typeof invalidRequest> } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: invalidRequest('Support ticket body is required.', {}) };
  }
  if ('merchant_id' in body) {
    return { error: invalidRequest('merchant_id is derived from the Android merchant session.', {}) };
  }
  if (androidSupportPayloadContainsForbiddenSecret(body)) {
    return { error: invalidRequest('Support ticket contains raw data or secrets.', {}) };
  }
  const record = body as Record<string, unknown>;
  const category = typeof record.category === 'string' ? record.category.trim() : '';
  const subject = typeof record.subject === 'string' ? record.subject.trim() : '';
  const message = typeof record.message === 'string' ? record.message.trim() : '';
  if (!['receiver_issue', 'payment_review_issue', 'integration_webhook_issue', 'account_security_issue', 'other'].includes(category)) {
    return { error: invalidRequest('Support category is invalid.', { field: 'category' }) };
  }
  if (subject.length < 3 || subject.length > 140) {
    return { error: invalidRequest('Support subject is invalid.', { field: 'subject' }) };
  }
  if (message.length < 12 || message.length > 4000) {
    return { error: invalidRequest('Support message is invalid.', { field: 'message' }) };
  }
  const safeContext = sanitizeAndroidSupportContext(record.safe_context);
  return { value: { category, subject, message, safeContext } };
}

function sanitizeAndroidSupportContext(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const allowed = new Set([
    'app_version',
    'android_version',
    'notification_access_enabled',
    'receiver_status',
    'last_error_code',
    'screen'
  ]);
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!allowed.has(key)) {
      continue;
    }
    if (entry === null || ['string', 'number', 'boolean'].includes(typeof entry)) {
      result[key] = entry;
    }
  }
  return result;
}

function androidSupportPayloadHasForbiddenAutomation(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const serialized = JSON.stringify(value).toLowerCase();
  return serialized.includes('auto_confirm') || serialized.includes('autoconfirm') || serialized.includes('allow_auto_confirmation":true');
}

function androidSupportPayloadContainsForbiddenSecret(value: unknown): boolean {
  const serialized = JSON.stringify(value);
  return [
    /\bsk_(test|live|staging)?[A-Za-z0-9_-]{6,}/i,
    /\bwhsec_[A-Za-z0-9_-]{6,}/i,
    /\bspm_[A-Za-z0-9_-]{6,}/i,
    /\+?7\d{10}/,
    /\b\d{13,19}\b/,
    /raw_notification|notification_body|notification_title|raw_text|bank_credentials|sms_code|pin|cvv/i
  ].some((pattern) => pattern.test(serialized));
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

async function resolveMerchantPaymentReadiness(
  repository: OrderRepository,
  merchantId: string
): Promise<MerchantPaymentReadiness> {
  const routes = await repository.listReceiverBanksForCheckout(merchantId, '__merchant_readiness__');
  const methods = {
    card: routes.some((route) => route.rail_type === 'card_transfer'),
    sbp: routes.some((route) => route.rail_type === 'phone_transfer'),
    mobile_money: routes.some((route) => route.rail_type === 'mobile_money'),
    wallet: routes.some((route) => route.rail_type === 'wallet_transfer')
  };
  const receivableCurrencies = [
    ...new Set(routes.map((route) => receivingCurrencyForBankProfile(route.bank_profile_id)))
  ];

  if (routes.length === 0) {
    return {
      merchant_setup_status: 'receiving_method_required',
      payment_ready: false,
      active_receiving_route_count: 0,
      available_payment_methods: methods,
      receivable_currencies: receivableCurrencies,
      setup_actions: ['add_receiving_method'],
      unavailable_reason: 'merchant_no_active_receiving_method',
      manual_fallback_ready: false,
      signal_assisted_ready: false,
      official_bank_confirmation: false
    };
  }

  return {
    merchant_setup_status: 'ready_for_manual_payments',
    payment_ready: true,
    active_receiving_route_count: routes.length,
    available_payment_methods: methods,
    receivable_currencies: receivableCurrencies,
    setup_actions: [],
    manual_fallback_ready: true,
    signal_assisted_ready: false,
    official_bank_confirmation: false
  };
}

function merchantWebhookSetupRequiredError(readiness: WebhookReadiness): Record<string, unknown> {
  return {
    error: {
      code: 'merchant_webhook_setup_required',
      message: 'Merchant must register an active webhook endpoint before accepting orders.',
      details: {
        webhook_status: readiness.webhookStatus,
        integration_ready: readiness.integrationReady,
        setup_actions: ['configure_webhook'],
        setup_hint: 'Register the webhook URL via PUT /v1/merchant/integration/webhook-url or provision the full integration via POST /v1/merchant/integration/provision.'
      }
    }
  };
}

function merchantCurrencyRouteRequiredError(
  requestedCurrency: string,
  receivableCurrencies: readonly string[]
): Record<string, unknown> {
  return {
    error: {
      code: 'merchant_currency_route_required',
      message: 'Merchant has no active receiving route for the requested order currency.',
      details: {
        requested_currency: requestedCurrency,
        receivable_currencies: receivableCurrencies,
        setup_actions: ['add_receiving_method'],
        setup_hint: 'Add a receiving method in this currency (e.g. a West Africa mobile money route for XOF) before creating orders in it.'
      }
    }
  };
}

function merchantPaymentSetupRequiredError(readiness: MerchantPaymentReadiness): Record<string, unknown> {
  return {
    error: {
      code: 'merchant_payment_setup_required',
      message: 'Merchant must add an active receiving method before accepting payments.',
      details: {
        merchant_setup_status: readiness.merchant_setup_status,
        payment_ready: false,
        unavailable_reason: readiness.unavailable_reason ?? 'merchant_no_active_receiving_method',
        setup_actions: readiness.setup_actions
      }
    },
    merchant_setup_status: readiness.merchant_setup_status,
    payment_ready: false,
    setup_actions: readiness.setup_actions,
    official_bank_confirmation: false
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

function isSecretRevealRateLimited(
  limiter: Map<string, { windowStartedAtMs: number; count: number }>,
  key: string,
  nowMs: number
): boolean {
  const current = limiter.get(key);
  if (!current || nowMs - current.windowStartedAtMs >= SECRET_REVEAL_RATE_LIMIT_WINDOW_MS) {
    limiter.set(key, { windowStartedAtMs: nowMs, count: 1 });
    return false;
  }

  if (current.count >= SECRET_REVEAL_RATE_LIMIT_MAX) {
    return true;
  }

  current.count += 1;
  return false;
}

interface ReceivingRouteCreateBody {
  bank_profile_id: string;
  rail_type: ReceivingRouteRailType;
  receiver_identifier_type?: StoredMerchantReceivingRouteRecord['receiver_identifier_type'] | undefined;
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
  const forbiddenField = findForbiddenReceivingCredentialField(body);
  if (forbiddenField) {
    return invalidRequest('Receiving route must not include card secrets or bank credentials.', { field: forbiddenField });
  }
  const candidate = body as Partial<Record<keyof ReceivingRouteCreateBody, unknown>>;
  if ('bank_profile_ids' in body) {
    return invalidRequest('Receiving route must target exactly one V1 bank profile.', { field: 'bank_profile_ids' });
  }
  if (typeof candidate.bank_profile_id !== 'string' || !candidate.bank_profile_id.trim()) {
    return invalidRequest('bank_profile_id is required.', {});
  }
  if (typeof candidate.rail_type !== 'string' || !ReceivingRouteRailTypes.includes(candidate.rail_type as ReceivingRouteRailType)) {
    return invalidRequest(`rail_type must be one of: ${ReceivingRouteRailTypes.join(', ')}.`, { rail_type: candidate.rail_type });
  }
  const railType = candidate.rail_type as ReceivingRouteRailType;
  if ('receiver_identifier_type' in candidate && candidate.receiver_identifier_type !== undefined) {
    // Wallet rails derive the identifier type from the value (email / tag / phone),
    // so any of the three is acceptable when provided explicitly.
    if (railType === 'wallet_transfer') {
      if (candidate.receiver_identifier_type !== 'email' && candidate.receiver_identifier_type !== 'tag' && candidate.receiver_identifier_type !== 'phone') {
        return invalidRequest('receiver_identifier_type must match rail_type.', {
          rail_type: railType,
          receiver_identifier_type: candidate.receiver_identifier_type,
          expected_receiver_identifier_type: 'email | tag | phone'
        });
      }
    } else {
      const expectedReceiverIdentifierType = receiverIdentifierTypeForRail(railType);
      if (candidate.receiver_identifier_type !== expectedReceiverIdentifierType) {
        return invalidRequest('receiver_identifier_type must match rail_type.', {
          rail_type: railType,
          receiver_identifier_type: candidate.receiver_identifier_type,
          expected_receiver_identifier_type: expectedReceiverIdentifierType
        });
      }
    }
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
    rail_type: railType,
    receiver_identifier_type:
      railType === 'wallet_transfer'
        ? normalizeWalletIdentifier(candidate.receiver_identifier)?.type ?? 'email'
        : receiverIdentifierTypeForRail(railType),
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

interface ReceivingMethodCreateBody {
  type: 'card' | 'phone' | 'mobile_money';
  value: string;
  bank_id: string;
  label?: string | undefined;
  is_default?: boolean | undefined;
  status?: 'active' | 'inactive' | undefined;
  last4: string;
}

function validateReceivingMethodCreateBody(body: unknown): ReceivingMethodCreateBody | ReturnType<typeof invalidRequest> {
  if (!body || typeof body !== 'object') {
    return invalidRequest('Receiving method request body must be a JSON object.', {});
  }
  const forbiddenField = findForbiddenReceivingCredentialField(body);
  if (forbiddenField) {
    return invalidRequest('Receiving method must not include card secrets or bank credentials.', { field: forbiddenField });
  }
  const candidate = body as {
    type?: unknown;
    value?: unknown;
    bank_id?: unknown;
    label?: unknown;
    is_default?: unknown;
    status?: unknown;
  };
  if (candidate.type !== 'card' && candidate.type !== 'phone' && candidate.type !== 'mobile_money') {
    return invalidRequest('type must be card, phone or mobile_money.', { type: candidate.type });
  }
  if (typeof candidate.bank_id !== 'string' || !candidate.bank_id.trim()) {
    return invalidRequest('bank_id is required.', {});
  }
  if (typeof candidate.value !== 'string' || !candidate.value.trim()) {
    return invalidRequest('value is required.', {});
  }
  const normalizedValue = normalizeReceivingMethodValue(candidate.type, candidate.value);
  if (!normalizedValue) {
    return invalidRequest('Receiving method value is not valid for the selected type.', { type: candidate.type });
  }
  if (candidate.status !== undefined && candidate.status !== 'active' && candidate.status !== 'inactive') {
    return invalidRequest('status must be active or inactive.', { status: candidate.status });
  }

  const label = typeof candidate.label === 'string' && candidate.label.trim()
    ? candidate.label.trim()
    : undefined;
  return {
    type: candidate.type,
    value: candidate.value.trim(),
    bank_id: candidate.bank_id.trim(),
    label,
    is_default: typeof candidate.is_default === 'boolean' ? candidate.is_default : undefined,
    status: candidate.status,
    last4: normalizedValue.replace(/\D/g, '').slice(-4)
  };
}

interface ReceivingMethodPatchBody {
  label?: string | undefined;
  status?: 'active' | 'inactive' | undefined;
  is_default?: boolean | undefined;
}

function validateReceivingMethodPatchBody(body: unknown): ReceivingMethodPatchBody | ReturnType<typeof invalidRequest> {
  if (!body || typeof body !== 'object') {
    return invalidRequest('Receiving method patch body must be a JSON object.', {});
  }
  const forbiddenField = findForbiddenReceivingCredentialField(body);
  if (forbiddenField) {
    return invalidRequest('Receiving method must not include card secrets or bank credentials.', { field: forbiddenField });
  }
  const candidate = body as { label?: unknown; status?: unknown; is_default?: unknown };
  const patch: ReceivingMethodPatchBody = {};
  if (typeof candidate.label === 'string') {
    const label = candidate.label.trim();
    if (!label) {
      return invalidRequest('label cannot be blank.', {});
    }
    patch.label = label;
  }
  if (candidate.status !== undefined) {
    if (candidate.status !== 'active' && candidate.status !== 'inactive') {
      return invalidRequest('status must be active or inactive.', { status: candidate.status });
    }
    patch.status = candidate.status;
  }
  if (typeof candidate.is_default === 'boolean') {
    patch.is_default = candidate.is_default;
  }
  return patch;
}

function normalizeReceivingMethodValue(type: 'card' | 'phone' | 'mobile_money', value: string): string | null {
  if (type === 'phone') {
    return normalizeRussianPhone(value);
  }
  if (type === 'mobile_money') {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 16) {
    return null;
  }
  return digits;
}

function findForbiddenReceivingCredentialField(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const forbidden = /^(cvv|cvc|security_code|expiration|expiry|exp_month|exp_year|pin|sms_code|bank_password|password)$/iu;
  for (const [key, nested] of Object.entries(value)) {
    if (forbidden.test(key)) {
      return key;
    }
    const child = findForbiddenReceivingCredentialField(nested);
    if (child) {
      return child;
    }
  }
  return null;
}

function buildReceivingMethodRouteCode(input: {
  bankId: string;
  type: 'card' | 'phone' | 'mobile_money';
  last4: string;
  routeId: string;
}): string {
  return `${input.bankId}-${input.type}-${input.last4}-${input.routeId}`;
}

function buildReceivingMethodDefaultLabel(bankId: string, type: 'card' | 'phone' | 'mobile_money'): string {
  const bank =
    AllReceiverBankProfiles.find((profile) => profile.bank_profile_id === bankId)?.display_name ??
    V1StaticBankProfiles.find((profile) => profile.bank_profile_id === bankId)?.display_name ??
    bankId;
  if (type === 'phone') {
    return `${bank} telephone`;
  }
  if (type === 'mobile_money') {
    return `${bank} mobile money`;
  }
  return `${bank} card`;
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

function validateReceivingRouteRevokeBody(body: unknown): { reason: string } | ReturnType<typeof invalidRequest> {
  if (!body || typeof body !== 'object') {
    return invalidRequest('Receiving route revoke body must be a JSON object.', {});
  }
  const reason = typeof (body as { reason?: unknown }).reason === 'string'
    ? (body as { reason: string }).reason.trim()
    : '';
  if (reason.length < 8) {
    return invalidRequest('A clear revocation reason is required.', {
      field: 'reason'
    });
  }
  return { reason };
}

function toMerchantReceivingRouteResponse(route: StoredMerchantReceivingRouteRecord): Record<string, unknown> {
  return {
    route_id: route.route_id,
    bank_profile_id: route.bank_profile_id,
    rail_type: route.rail_type,
    receiver_identifier_type: route.receiver_identifier_type,
    receiver_identifier_masked: route.receiver_identifier_masked,
    receiver_identifier_last4: route.receiver_identifier_last4,
    route_code: route.route_code,
    display_label: route.display_label,
    enabled: route.enabled,
    recommended: route.recommended,
    lifecycle_status: route.lifecycle_status,
    pending_disable_at: route.pending_disable_at,
    disabled_at: route.disabled_at,
    revoked_at: route.revoked_at,
    review_policy: route.review_policy,
    fees_hint: route.fees_hint,
    created_at: route.created_at,
    updated_at: route.updated_at,
    auto_confirm_enabled: false,
    official_bank_confirmation: false
  };
}

function toMerchantReceivingMethodResponse(route: StoredMerchantReceivingRouteRecord): Record<string, unknown> {
  const type = route.rail_type === 'phone_transfer' ? 'phone' : 'card';
  const methodStatus = receivingMethodStatusForRoute(route);
  return {
    id: route.route_id,
    route_id: route.route_id,
    type,
    bank_id: route.bank_profile_id,
    bank_profile_id: route.bank_profile_id,
    label: route.display_label,
    masked_value: route.receiver_identifier_masked,
    last4: route.receiver_identifier_last4,
    status: methodStatus,
    lifecycle_status: route.lifecycle_status,
    is_default: route.recommended,
    created_at: route.created_at,
    updated_at: route.updated_at,
    confirmation_type: 'notification_signal',
    official_bank_confirmation: false
  };
}

function receivingMethodStatusForRoute(route: StoredMerchantReceivingRouteRecord): 'active' | 'inactive' | 'pending_disable' | 'revoked' | 'deleted' {
  if (route.lifecycle_status === 'deleted' || route.deleted_at) return 'deleted';
  if (route.lifecycle_status === 'pending_disable') return 'pending_disable';
  if (route.lifecycle_status === 'revoked') return 'revoked';
  return route.enabled && route.lifecycle_status === 'active' ? 'active' : 'inactive';
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
    return_url: order.returnUrl,
    amount: {
      value: formatAmountMinor(order.amountMinor, order.currency),
      currency: order.currency
    },
    expires_at: order.expiresAt,
    latest_event: 'payment_session.created'
  };
}
