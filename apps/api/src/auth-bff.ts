import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import pg from 'pg';
import { hashApiKey } from '@swimpay/security';

const { Pool } = pg;

export const BFF_SESSION_COOKIE_NAME = 'swimpay_bff_session';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export const MerchantRoles = {
  OWNER: 'owner',
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
} as const;

export type MerchantRole = (typeof MerchantRoles)[keyof typeof MerchantRoles];

export const MerchantPermissions = {
  INTEGRATION_READ: 'integration.read',
  INTEGRATION_KEYS_CREATE: 'integration.keys.create',
  INTEGRATION_KEYS_ROTATE: 'integration.keys.rotate',
  INTEGRATION_WEBHOOK_UPDATE: 'integration.webhook.update',
  INTEGRATION_WEBHOOK_TEST: 'integration.webhook.test',
  INTEGRATION_DELIVERY_READ: 'integration.delivery.read',
  INTEGRATION_DELIVERY_RETRY: 'integration.delivery.retry',
  PAYMENTS_REVIEW_READ: 'payments.review.read',
  PAYMENTS_REVIEW_CONFIRM: 'payments.review.confirm',
  PAYMENTS_REVIEW_REJECT: 'payments.review.reject',
  RECEIVER_CONFIGURE: 'receiver.configure',
  RECEIVING_METHODS_READ: 'receiving_methods.read',
  RECEIVING_METHODS_WRITE: 'receiving_methods.write',
  SETTINGS_READ: 'settings.read',
  SETTINGS_WRITE: 'settings.write'
} as const;

export type MerchantPermission = (typeof MerchantPermissions)[keyof typeof MerchantPermissions];

export const AdminRoles = {
  SWIMPAY_ADMIN: 'swimpay_admin',
  SUPPORT_OPERATOR: 'support_operator',
  RISK_OPERATOR: 'risk_operator',
  DEVELOPER_OPS: 'developer_ops',
  READONLY_AUDITOR: 'readonly_auditor'
} as const;

export type AdminRole = (typeof AdminRoles)[keyof typeof AdminRoles];

export const AdminPermissions = {
  INTELLIGENCE_READ: 'admin.intelligence.read',
  UNKNOWN_SHAPES_READ: 'admin.unknown_shapes.read',
  FEEDBACK_READ: 'admin.feedback.read',
  WEBHOOK_FAILURES_READ: 'admin.webhook_failures.read',
  MERCHANT_SUPPORT_READ: 'admin.merchant_support.read',
  AUDIT_READ: 'admin.audit.read'
} as const;

export type AdminPermission = (typeof AdminPermissions)[keyof typeof AdminPermissions];

const ALL_MERCHANT_PERMISSIONS = Object.values(MerchantPermissions);

const MERCHANT_ROLE_PERMISSIONS: Record<MerchantRole, readonly MerchantPermission[]> = {
  owner: ALL_MERCHANT_PERMISSIONS,
  admin: ALL_MERCHANT_PERMISSIONS,
  developer: [
    MerchantPermissions.INTEGRATION_READ,
    MerchantPermissions.INTEGRATION_KEYS_CREATE,
    MerchantPermissions.INTEGRATION_KEYS_ROTATE,
    MerchantPermissions.INTEGRATION_WEBHOOK_UPDATE,
    MerchantPermissions.INTEGRATION_WEBHOOK_TEST,
    MerchantPermissions.INTEGRATION_DELIVERY_READ,
    MerchantPermissions.INTEGRATION_DELIVERY_RETRY,
    MerchantPermissions.SETTINGS_READ
  ],
  operator: [
    MerchantPermissions.PAYMENTS_REVIEW_READ,
    MerchantPermissions.PAYMENTS_REVIEW_CONFIRM,
    MerchantPermissions.PAYMENTS_REVIEW_REJECT,
    MerchantPermissions.RECEIVING_METHODS_READ
  ],
  viewer: [
    MerchantPermissions.INTEGRATION_READ,
    MerchantPermissions.PAYMENTS_REVIEW_READ,
    MerchantPermissions.RECEIVING_METHODS_READ,
    MerchantPermissions.SETTINGS_READ
  ]
};

const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  swimpay_admin: Object.values(AdminPermissions),
  support_operator: [
    AdminPermissions.MERCHANT_SUPPORT_READ,
    AdminPermissions.WEBHOOK_FAILURES_READ,
    AdminPermissions.AUDIT_READ
  ],
  risk_operator: [
    AdminPermissions.INTELLIGENCE_READ,
    AdminPermissions.UNKNOWN_SHAPES_READ,
    AdminPermissions.FEEDBACK_READ,
    AdminPermissions.AUDIT_READ
  ],
  developer_ops: [
    AdminPermissions.INTELLIGENCE_READ,
    AdminPermissions.UNKNOWN_SHAPES_READ,
    AdminPermissions.WEBHOOK_FAILURES_READ,
    AdminPermissions.AUDIT_READ
  ],
  readonly_auditor: [AdminPermissions.AUDIT_READ]
};

export interface BffUser {
  id: string;
  googleSub: string | null;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  status: 'active' | 'disabled';
  lastLoginAt: string | null;
}

export interface MerchantMembership {
  id: string;
  merchantId: string;
  userId: string;
  role: MerchantRole;
  status: 'active' | 'disabled';
}

export interface AdminRoleAssignment {
  id: string;
  userId: string;
  role: AdminRole;
  status: 'active' | 'disabled';
}

export interface BffSessionRecord {
  id: string;
  userId: string;
  activeMerchantId: string | null;
  expiresAt: string;
  revokedAt: string | null;
}

export interface BffSessionContext {
  user: BffUser;
  session: BffSessionRecord;
  activeMembership: MerchantMembership | null;
  memberships: MerchantMembership[];
  adminRoles: AdminRoleAssignment[];
}

export interface CreateBffSessionInput {
  sessionIdHash: string;
  csrfSecretHash: string;
  userId: string;
  activeMerchantId: string | null;
  expiresAt: string;
  now: string;
}

export interface DevBootstrapSessionInput {
  userId: string;
  merchantId: string;
  email: string;
  name?: string | null;
  role: MerchantRole;
  sessionIdHash: string;
  csrfSecretHash: string;
  expiresAt: string;
  now: string;
}

export interface AuthBffRepository {
  bootstrapDevSession(input: DevBootstrapSessionInput): Promise<BffSessionContext>;
  createSession(input: CreateBffSessionInput): Promise<BffSessionRecord>;
  getSessionByHash(sessionIdHash: string, now: string): Promise<BffSessionContext | null>;
  getCsrfSecretHash(sessionIdHash: string): Promise<string | null>;
  revokeSession(sessionIdHash: string, now: string): Promise<void>;
}

export interface MerchantApiKeyPrincipal {
  merchantId: string;
  apiKeyId: string;
  scopes: string[];
}

export interface MerchantApiKeyVerifier {
  verifyApiKey(rawApiKey: string): Promise<MerchantApiKeyPrincipal | null>;
}

export interface GoogleOAuthProviderSeam {
  configured: boolean;
  productionReady: boolean;
  authorizationEndpoint: string | null;
  callbackPath: '/auth/google/callback';
  reason: string | null;
}

export interface SessionCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'Lax' | 'Strict';
  path: '/';
  maxAgeSeconds: number;
}

export function hasMerchantPermission(role: MerchantRole, permission: MerchantPermission): boolean {
  return MERCHANT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function merchantPermissionsForRole(role: MerchantRole): readonly MerchantPermission[] {
  return MERCHANT_ROLE_PERMISSIONS[role] ?? [];
}

export function hasAdminPermission(role: AdminRole, permission: AdminPermission): boolean {
  return ADMIN_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function createOpaqueSessionToken(): string {
  return `bff_${randomBytes(32).toString('base64url')}`;
}

export function createCsrfToken(): string {
  return `csrf_${randomBytes(32).toString('base64url')}`;
}

export function hashBffSessionToken(token: string): string {
  return `bff_session_sha256:${sha256(token)}`;
}

export function hashCsrfToken(token: string): string {
  return `csrf_sha256:${sha256(token)}`;
}

export function verifyCsrfToken(candidate: string | undefined, storedHash: string): boolean {
  if (!candidate) {
    return false;
  }
  return timingSafeStringEqual(hashCsrfToken(candidate), storedHash);
}

export function buildSessionCookieOptions(environment: string, maxAgeSeconds = 60 * 60 * 24 * 7): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: environment === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAgeSeconds
  };
}

export function serializeSessionCookie(token: string, options: SessionCookieOptions): string {
  const attributes = [
    `${BFF_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Max-Age=${options.maxAgeSeconds}`,
    `Path=${options.path}`,
    'HttpOnly',
    `SameSite=${options.sameSite}`
  ];
  if (options.secure) {
    attributes.push('Secure');
  }
  return attributes.join('; ');
}

export function serializeExpiredSessionCookie(environment: string): string {
  return serializeSessionCookie('', { ...buildSessionCookieOptions(environment, 0), maxAgeSeconds: 0 });
}

export function parseCookieHeader(cookieHeader: string | undefined, name = BFF_SESSION_COOKIE_NAME): string | null {
  if (!cookieHeader) {
    return null;
  }
  for (const pair of cookieHeader.split(';')) {
    const [rawKey, ...rawValue] = pair.trim().split('=');
    if (rawKey === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }
  return null;
}

export function createGoogleOAuthProviderSeam(env: NodeJS.ProcessEnv, environment: string): GoogleOAuthProviderSeam {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  const configured = Boolean(clientId && clientSecret && redirectUri);
  return {
    configured,
    productionReady: environment === 'production' ? configured : true,
    authorizationEndpoint: configured ? 'https://accounts.google.com/o/oauth2/v2/auth' : null,
    callbackPath: '/auth/google/callback',
    reason: configured ? null : 'google_oauth_not_configured'
  };
}

export function parseBearerToken(authorization: string | undefined): string | null {
  const match = authorization?.match(/^Bearer\s+(.+)$/);
  return match?.[1]?.trim() || null;
}

export async function verifyMerchantApiKeyAuthorization(
  authorization: string | undefined,
  verifier: MerchantApiKeyVerifier | null | undefined
): Promise<MerchantApiKeyPrincipal | null> {
  const token = parseBearerToken(authorization);
  if (!token || !token.startsWith('sk_') || !verifier) {
    return null;
  }
  return verifier.verifyApiKey(token);
}

export class InMemoryAuthBffRepository implements AuthBffRepository {
  public readonly users = new Map<string, BffUser>();
  public readonly memberships = new Map<string, MerchantMembership>();
  public readonly adminRoles = new Map<string, AdminRoleAssignment>();
  public readonly sessions = new Map<string, BffSessionRecord & { csrfSecretHash: string }>();

  async bootstrapDevSession(input: DevBootstrapSessionInput): Promise<BffSessionContext> {
    const user: BffUser = {
      id: input.userId,
      googleSub: `dev:${input.userId}`,
      email: input.email,
      name: input.name ?? 'Development Merchant',
      avatarUrl: null,
      status: 'active',
      lastLoginAt: input.now
    };
    this.users.set(user.id, user);

    const membership: MerchantMembership = {
      id: `mem_${input.userId}_${input.merchantId}`,
      merchantId: input.merchantId,
      userId: input.userId,
      role: input.role,
      status: 'active'
    };
    this.memberships.set(membership.id, membership);
    const session = await this.createSession({
      sessionIdHash: input.sessionIdHash,
      csrfSecretHash: input.csrfSecretHash,
      userId: input.userId,
      activeMerchantId: input.merchantId,
      expiresAt: input.expiresAt,
      now: input.now
    });
    return {
      user,
      session,
      activeMembership: membership,
      memberships: [membership],
      adminRoles: this.listAdminRolesForUser(user.id)
    };
  }

  async createSession(input: CreateBffSessionInput): Promise<BffSessionRecord> {
    const session: BffSessionRecord & { csrfSecretHash: string } = {
      id: `sess_${this.sessions.size + 1}`,
      userId: input.userId,
      activeMerchantId: input.activeMerchantId,
      expiresAt: input.expiresAt,
      revokedAt: null,
      csrfSecretHash: input.csrfSecretHash
    };
    this.sessions.set(input.sessionIdHash, session);
    return withoutCsrf(session);
  }

  async getSessionByHash(sessionIdHash: string, now: string): Promise<BffSessionContext | null> {
    const session = this.sessions.get(sessionIdHash);
    if (!session || session.revokedAt || session.expiresAt <= now) {
      return null;
    }
    const user = this.users.get(session.userId);
    if (!user || user.status !== 'active') {
      return null;
    }
    const memberships = [...this.memberships.values()].filter(
      (membership) => membership.userId === user.id && membership.status === 'active'
    );
    const activeMembership = memberships.find((membership) => membership.merchantId === session.activeMerchantId) ?? null;
    return {
      user,
      session: withoutCsrf(session),
      activeMembership,
      memberships,
      adminRoles: this.listAdminRolesForUser(user.id)
    };
  }

  async revokeSession(sessionIdHash: string, now: string): Promise<void> {
    const session = this.sessions.get(sessionIdHash);
    if (session) {
      session.revokedAt = now;
    }
  }

  async getCsrfSecretHash(sessionIdHash: string): Promise<string | null> {
    return this.sessions.get(sessionIdHash)?.csrfSecretHash ?? null;
  }

  seedUser(user: BffUser): void {
    this.users.set(user.id, user);
  }

  seedMembership(membership: MerchantMembership): void {
    this.memberships.set(membership.id, membership);
  }

  seedAdminRole(role: AdminRoleAssignment): void {
    this.adminRoles.set(role.id, role);
  }

  private listAdminRolesForUser(userId: string): AdminRoleAssignment[] {
    return [...this.adminRoles.values()].filter((role) => role.userId === userId && role.status === 'active');
  }
}

export class InMemoryMerchantApiKeyVerifier implements MerchantApiKeyVerifier {
  private readonly keys = new Map<string, MerchantApiKeyPrincipal>();

  seedRawKey(rawApiKey: string, principal: MerchantApiKeyPrincipal): void {
    this.keys.set(hashApiKey(rawApiKey), principal);
  }

  async verifyApiKey(rawApiKey: string): Promise<MerchantApiKeyPrincipal | null> {
    return this.keys.get(hashApiKey(rawApiKey)) ?? null;
  }
}

export class PgAuthBffRepository implements AuthBffRepository {
  private readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async bootstrapDevSession(input: DevBootstrapSessionInput): Promise<BffSessionContext> {
    await this.pool.query(
      `INSERT INTO users (id, google_sub, email, name, status, last_login_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', $5, $5, $5)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, last_login_at = EXCLUDED.last_login_at, updated_at = EXCLUDED.updated_at`,
      [input.userId, `dev:${input.userId}`, input.email, input.name ?? 'Development Merchant', input.now]
    );
    await this.pool.query(
      `INSERT INTO merchants (id, name, business_name, status, owner_user_id, created_at, updated_at)
       VALUES ($1, $2, $2, 'active', $3, $4, $4)
       ON CONFLICT (id) DO UPDATE SET owner_user_id = EXCLUDED.owner_user_id, updated_at = EXCLUDED.updated_at`,
      [input.merchantId, 'Development Merchant', input.userId, input.now]
    );
    await this.pool.query(
      `INSERT INTO merchant_memberships (merchant_id, user_id, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'active', $4, $4)
       ON CONFLICT (merchant_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active', updated_at = EXCLUDED.updated_at`,
      [input.merchantId, input.userId, input.role, input.now]
    );
    await this.createSession({
      sessionIdHash: input.sessionIdHash,
      csrfSecretHash: input.csrfSecretHash,
      userId: input.userId,
      activeMerchantId: input.merchantId,
      expiresAt: input.expiresAt,
      now: input.now
    });
    const context = await this.getSessionByHash(input.sessionIdHash, input.now);
    if (!context) {
      throw new Error('Failed to create BFF dev session.');
    }
    return context;
  }

  async createSession(input: CreateBffSessionInput): Promise<BffSessionRecord> {
    const result = await this.pool.query(
      `INSERT INTO bff_sessions (session_hash, csrf_secret_hash, user_id, active_merchant_id, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6)
       RETURNING id, user_id, active_merchant_id, expires_at, revoked_at`,
      [input.sessionIdHash, input.csrfSecretHash, input.userId, input.activeMerchantId, input.expiresAt, input.now]
    );
    return mapSessionRow(result.rows[0]);
  }

  async getSessionByHash(sessionIdHash: string, now: string): Promise<BffSessionContext | null> {
    const sessionResult = await this.pool.query(
      `SELECT s.id, s.user_id, s.active_merchant_id, s.expires_at, s.revoked_at,
              u.google_sub, u.email, u.name, u.avatar_url, u.status AS user_status, u.last_login_at
       FROM bff_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.session_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > $2`,
      [sessionIdHash, now]
    );
    const row = sessionResult.rows[0];
    if (!row || row.user_status !== 'active') {
      return null;
    }
    const memberships = await this.pool.query(
      `SELECT id, merchant_id, user_id, role, status
       FROM merchant_memberships
       WHERE user_id = $1 AND status = 'active'`,
      [row.user_id]
    );
    const adminRoles = await this.pool.query(
      `SELECT id, user_id, role, status
       FROM admin_roles
       WHERE user_id = $1 AND status = 'active'`,
      [row.user_id]
    );
    const mappedMemberships = memberships.rows.map(mapMembershipRow);
    const activeMembership = mappedMemberships.find((membership) => membership.merchantId === String(row.active_merchant_id)) ?? null;
    return {
      user: {
        id: String(row.user_id),
        googleSub: row.google_sub ? String(row.google_sub) : null,
        email: String(row.email),
        name: row.name ? String(row.name) : null,
        avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
        status: 'active',
        lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null
      },
      session: mapSessionRow(row),
      activeMembership,
      memberships: mappedMemberships,
      adminRoles: adminRoles.rows.map(mapAdminRoleRow)
    };
  }

  async revokeSession(sessionIdHash: string, now: string): Promise<void> {
    await this.pool.query(
      `UPDATE bff_sessions SET revoked_at = $2, updated_at = $2 WHERE session_hash = $1 AND revoked_at IS NULL`,
      [sessionIdHash, now]
    );
  }

  async getCsrfSecretHash(sessionIdHash: string): Promise<string | null> {
    const result = await this.pool.query(
      `SELECT csrf_secret_hash FROM bff_sessions WHERE session_hash = $1 AND revoked_at IS NULL`,
      [sessionIdHash]
    );
    return result.rows[0]?.csrf_secret_hash ? String(result.rows[0].csrf_secret_hash) : null;
  }
}

export class PgMerchantApiKeyVerifier implements MerchantApiKeyVerifier {
  private readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async verifyApiKey(rawApiKey: string): Promise<MerchantApiKeyPrincipal | null> {
    const result = await this.pool.query(
      `SELECT id, merchant_id, scopes
       FROM api_keys
       WHERE key_hash = $1 AND status = 'active' AND revoked_at IS NULL`,
      [hashApiKey(rawApiKey)]
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      apiKeyId: String(row.id),
      merchantId: String(row.merchant_id),
      scopes: Array.isArray(row.scopes) ? row.scopes.map(String) : []
    };
  }
}

export function createDefaultAuthBffRepository(env: NodeJS.ProcessEnv): AuthBffRepository | null {
  return env.DATABASE_URL ? new PgAuthBffRepository(env.DATABASE_URL) : null;
}

export function createDefaultMerchantApiKeyVerifier(env: NodeJS.ProcessEnv): MerchantApiKeyVerifier | null {
  return env.DATABASE_URL ? new PgMerchantApiKeyVerifier(env.DATABASE_URL) : null;
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function timingSafeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function withoutCsrf(session: BffSessionRecord & { csrfSecretHash: string }): BffSessionRecord {
  return {
    id: session.id,
    userId: session.userId,
    activeMerchantId: session.activeMerchantId,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt
  };
}

function mapSessionRow(row: Record<string, unknown>): BffSessionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    activeMerchantId: row.active_merchant_id ? String(row.active_merchant_id) : null,
    expiresAt: new Date(String(row.expires_at)).toISOString(),
    revokedAt: row.revoked_at ? new Date(String(row.revoked_at)).toISOString() : null
  };
}

function mapMembershipRow(row: Record<string, unknown>): MerchantMembership {
  return {
    id: String(row.id),
    merchantId: String(row.merchant_id),
    userId: String(row.user_id),
    role: String(row.role) as MerchantRole,
    status: String(row.status) as 'active' | 'disabled'
  };
}

function mapAdminRoleRow(row: Record<string, unknown>): AdminRoleAssignment {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    role: String(row.role) as AdminRole,
    status: String(row.status) as 'active' | 'disabled'
  };
}
