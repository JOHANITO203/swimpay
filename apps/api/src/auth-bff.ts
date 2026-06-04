import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import pg from 'pg';
import {
  AndroidMerchantDeviceLookupIntents,
  AndroidMerchantDeviceLookupStatuses,
  AndroidMerchantDeviceStatuses,
  AndroidMerchantProfileTypes,
  type AndroidMerchantDeviceLookupIntent,
  type AndroidMerchantDeviceLookupStatus,
  type AndroidMerchantDeviceStatus,
  type AndroidMerchantProfileType
} from '@swimpay/contracts';
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
  INTEGRATION_SECRETS_REVEAL: 'integration.secrets.reveal',
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

export {
  AndroidMerchantDeviceLookupIntents,
  AndroidMerchantDeviceLookupStatuses,
  AndroidMerchantDeviceStatuses,
  AndroidMerchantProfileTypes
};

export type {
  AndroidMerchantDeviceLookupIntent,
  AndroidMerchantDeviceLookupStatus,
  AndroidMerchantDeviceStatus,
  AndroidMerchantProfileType
};

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

const ANDROID_MERCHANT_MOBILE_PERMISSIONS = [
  MerchantPermissions.PAYMENTS_REVIEW_READ,
  MerchantPermissions.PAYMENTS_REVIEW_CONFIRM,
  MerchantPermissions.PAYMENTS_REVIEW_REJECT,
  MerchantPermissions.RECEIVER_CONFIGURE,
  MerchantPermissions.RECEIVING_METHODS_READ,
  MerchantPermissions.RECEIVING_METHODS_WRITE,
  MerchantPermissions.INTEGRATION_READ,
  MerchantPermissions.INTEGRATION_KEYS_CREATE,
  MerchantPermissions.INTEGRATION_KEYS_ROTATE,
  MerchantPermissions.INTEGRATION_SECRETS_REVEAL,
  MerchantPermissions.INTEGRATION_WEBHOOK_UPDATE,
  MerchantPermissions.INTEGRATION_WEBHOOK_TEST,
  MerchantPermissions.INTEGRATION_DELIVERY_READ,
  MerchantPermissions.INTEGRATION_DELIVERY_RETRY,
  MerchantPermissions.SETTINGS_READ,
  MerchantPermissions.SETTINGS_WRITE
] as const;

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

export interface AndroidMerchantDeviceRecord {
  id: string;
  userId: string;
  merchantId: string;
  deviceProofHash: string;
  status: AndroidMerchantDeviceStatus;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
}

export interface AndroidMerchantMobileSessionRecord {
  id: string;
  userId: string;
  merchantId: string;
  deviceId: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface AndroidMerchantAccountRecord {
  userId: string;
  merchantId: string;
  deviceId: string;
  profileType: AndroidMerchantProfileType;
  displayHandle: string;
  permissions: readonly MerchantPermission[];
  mobileSession: AndroidMerchantMobileSessionRecord;
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

export interface AndroidMerchantDeviceLookupInput {
  deviceProofHash: string;
  lookupIntent: AndroidMerchantDeviceLookupIntent;
  now: string;
}

export interface AndroidMerchantDeviceLookupResult {
  deviceStatus: AndroidMerchantDeviceLookupStatus;
  device: AndroidMerchantDeviceRecord | null;
}

export interface CreateAndroidMerchantAccountInput {
  userId: string;
  merchantId: string;
  deviceId: string;
  mobileSessionId: string;
  mobileSessionHash: string;
  profileType: AndroidMerchantProfileType;
  businessLabel: string | null;
  displayHandle: string;
  deviceProofHash: string;
  expiresAt: string;
  now: string;
}

export type CreateAndroidMerchantAccountResult =
  | { kind: 'created'; account: AndroidMerchantAccountRecord }
  | { kind: 'device_already_registered'; device: AndroidMerchantDeviceRecord };

export type LinkAndroidMerchantGoogleSubResult = { kind: 'linked' } | { kind: 'google_sub_conflict' };

export interface RecoverAndroidMerchantAccountWithGoogleInput {
  googleSub: string;
  deviceProofHash: string;
  deviceId: string;
  mobileSessionId: string;
  mobileSessionHash: string;
  expiresAt: string;
  now: string;
}

export type RecoverAndroidMerchantAccountWithGoogleResult =
  | { kind: 'recovered'; account: AndroidMerchantAccountRecord }
  | { kind: 'google_sub_not_linked' }
  | { kind: 'device_already_registered'; device: AndroidMerchantDeviceRecord };

export interface RecoverAndroidMerchantKnownDeviceInput {
  deviceProofHash: string;
  mobileSessionId: string;
  mobileSessionHash: string;
  expiresAt: string;
  now: string;
}

export type RecoverAndroidMerchantKnownDeviceResult =
  | { kind: 'recovered'; account: AndroidMerchantAccountRecord }
  | { kind: 'device_not_found' }
  | { kind: 'recovery_required'; device: AndroidMerchantDeviceRecord };

export interface AuthBffRepository {
  bootstrapDevSession(input: DevBootstrapSessionInput): Promise<BffSessionContext>;
  createSession(input: CreateBffSessionInput): Promise<BffSessionRecord>;
  getSessionByHash(sessionIdHash: string, now: string): Promise<BffSessionContext | null>;
  getCsrfSecretHash(sessionIdHash: string): Promise<string | null>;
  revokeSession(sessionIdHash: string, now: string): Promise<void>;
  getAndroidMerchantMobileSessionByHash(
    mobileSessionHash: string,
    now: string
  ): Promise<AndroidMerchantMobileSessionRecord | null>;
  refreshAndroidMerchantMobileSession(input: {
    mobileSessionHash: string;
    expiresAt: string;
    now: string;
  }): Promise<AndroidMerchantMobileSessionRecord | null>;
  lookupAndroidMerchantDevice(input: AndroidMerchantDeviceLookupInput): Promise<AndroidMerchantDeviceLookupResult>;
  createAndroidMerchantAccount(input: CreateAndroidMerchantAccountInput): Promise<CreateAndroidMerchantAccountResult>;
  linkAndroidMerchantGoogleSub(input: {
    userId: string;
    googleSub: string;
    now: string;
  }): Promise<LinkAndroidMerchantGoogleSubResult>;
  recoverAndroidMerchantAccountWithGoogle(
    input: RecoverAndroidMerchantAccountWithGoogleInput
  ): Promise<RecoverAndroidMerchantAccountWithGoogleResult>;
  recoverAndroidMerchantKnownDevice(
    input: RecoverAndroidMerchantKnownDeviceInput
  ): Promise<RecoverAndroidMerchantKnownDeviceResult>;
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

export function createAndroidMerchantMobileSessionToken(): string {
  return `spm_${randomBytes(32).toString('base64url')}`;
}

export function hashBffSessionToken(token: string): string {
  return `bff_session_sha256:${sha256(token)}`;
}

export function hashCsrfToken(token: string): string {
  return `csrf_sha256:${sha256(token)}`;
}

export function hashAndroidMerchantMobileSessionToken(token: string): string {
  return `android_mobile_session_sha256:${sha256(token)}`;
}

export function hashAndroidMerchantDeviceProof(installPublicKey: string): string {
  return `android_device_proof_sha256:${sha256(installPublicKey)}`;
}

export function androidMerchantMobilePermissions(): readonly MerchantPermission[] {
  return ANDROID_MERCHANT_MOBILE_PERMISSIONS;
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
  public readonly androidMerchantDevices = new Map<string, AndroidMerchantDeviceRecord>();
  public readonly androidMerchantSessions = new Map<string, AndroidMerchantMobileSessionRecord>();
  public readonly androidMerchantAccounts = new Map<string, AndroidMerchantAccountRecord>();

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

  async getAndroidMerchantMobileSessionByHash(
    mobileSessionHash: string,
    now: string
  ): Promise<AndroidMerchantMobileSessionRecord | null> {
    const session = this.androidMerchantSessions.get(mobileSessionHash);
    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= new Date(now).getTime()) {
      return null;
    }
    const device = [...this.androidMerchantDevices.values()].find(
      (candidate) =>
        candidate.id === session.deviceId &&
        candidate.userId === session.userId &&
        candidate.merchantId === session.merchantId
    );
    if (!device || device.status !== AndroidMerchantDeviceStatuses.ACTIVE) {
      return null;
    }
    return session;
  }

  async refreshAndroidMerchantMobileSession(input: {
    mobileSessionHash: string;
    expiresAt: string;
    now: string;
  }): Promise<AndroidMerchantMobileSessionRecord | null> {
    const session = await this.getAndroidMerchantMobileSessionByHash(input.mobileSessionHash, input.now);
    if (!session) {
      return null;
    }
    const refreshed: AndroidMerchantMobileSessionRecord = { ...session, expiresAt: input.expiresAt };
    this.androidMerchantSessions.set(input.mobileSessionHash, refreshed);
    return refreshed;
  }

  async lookupAndroidMerchantDevice(input: AndroidMerchantDeviceLookupInput): Promise<AndroidMerchantDeviceLookupResult> {
    const device = this.androidMerchantDevices.get(input.deviceProofHash) ?? null;
    if (device?.status === AndroidMerchantDeviceStatuses.ACTIVE) {
      const updated: AndroidMerchantDeviceRecord = {
        ...device,
        updatedAt: input.now,
        lastSeenAt: input.now
      };
      this.androidMerchantDevices.set(input.deviceProofHash, updated);
      return {
        deviceStatus: AndroidMerchantDeviceLookupStatuses.KNOWN_DEVICE,
        device: updated
      };
    }
    if (device?.status === AndroidMerchantDeviceStatuses.RECOVERY_REQUIRED) {
      return {
        deviceStatus: AndroidMerchantDeviceLookupStatuses.RECOVERY_REQUIRED,
        device
      };
    }
    return {
      deviceStatus:
        input.lookupIntent === AndroidMerchantDeviceLookupIntents.RECOVER_ACCOUNT
          ? AndroidMerchantDeviceLookupStatuses.RECOVERY_REQUIRED
          : AndroidMerchantDeviceLookupStatuses.NEW_DEVICE,
      device: null
    };
  }

  async createAndroidMerchantAccount(input: CreateAndroidMerchantAccountInput): Promise<CreateAndroidMerchantAccountResult> {
    const existingDevice = this.androidMerchantDevices.get(input.deviceProofHash);
    if (existingDevice && existingDevice.status !== AndroidMerchantDeviceStatuses.REVOKED) {
      return { kind: 'device_already_registered', device: existingDevice };
    }

    const user: BffUser = {
      id: input.userId,
      googleSub: null,
      email: `mobile-${input.userId}@swimpay.local`,
      name: input.displayHandle,
      avatarUrl: null,
      status: 'active',
      lastLoginAt: input.now
    };
    this.users.set(user.id, user);

    const membership: MerchantMembership = {
      id: `mem_${input.userId}_${input.merchantId}`,
      merchantId: input.merchantId,
      userId: input.userId,
      role: MerchantRoles.OWNER,
      status: 'active'
    };
    this.memberships.set(membership.id, membership);

    const device: AndroidMerchantDeviceRecord = {
      id: input.deviceId,
      userId: input.userId,
      merchantId: input.merchantId,
      deviceProofHash: input.deviceProofHash,
      status: AndroidMerchantDeviceStatuses.ACTIVE,
      createdAt: input.now,
      updatedAt: input.now,
      lastSeenAt: input.now
    };
    this.androidMerchantDevices.set(input.deviceProofHash, device);

    const mobileSession: AndroidMerchantMobileSessionRecord = {
      id: input.mobileSessionId,
      userId: input.userId,
      merchantId: input.merchantId,
      deviceId: input.deviceId,
      expiresAt: input.expiresAt,
      revokedAt: null
    };
    this.androidMerchantSessions.set(input.mobileSessionHash, mobileSession);

    const account: AndroidMerchantAccountRecord = {
      userId: input.userId,
      merchantId: input.merchantId,
      deviceId: input.deviceId,
      profileType: input.profileType,
      displayHandle: input.displayHandle,
      permissions: androidMerchantMobilePermissions(),
      mobileSession
    };
    this.androidMerchantAccounts.set(input.userId, account);
    return { kind: 'created', account };
  }

  async linkAndroidMerchantGoogleSub(input: {
    userId: string;
    googleSub: string;
    now: string;
  }): Promise<LinkAndroidMerchantGoogleSubResult> {
    const existingUser = [...this.users.values()].find((user) => user.googleSub === input.googleSub && user.id !== input.userId);
    if (existingUser) {
      return { kind: 'google_sub_conflict' };
    }
    const user = this.users.get(input.userId);
    if (!user || user.status !== 'active') {
      return { kind: 'google_sub_conflict' };
    }
    this.users.set(input.userId, {
      ...user,
      googleSub: input.googleSub,
      lastLoginAt: input.now
    });
    return { kind: 'linked' };
  }

  async recoverAndroidMerchantAccountWithGoogle(
    input: RecoverAndroidMerchantAccountWithGoogleInput
  ): Promise<RecoverAndroidMerchantAccountWithGoogleResult> {
    const user = [...this.users.values()].find((candidate) => candidate.googleSub === input.googleSub && candidate.status === 'active');
    if (!user) {
      return { kind: 'google_sub_not_linked' };
    }
    const memberships = [...this.memberships.values()].filter(
      (membership) => membership.userId === user.id && membership.status === 'active'
    );
    const membership = memberships.find(
      (candidate) => candidate.role === MerchantRoles.OWNER || candidate.role === MerchantRoles.ADMIN
    );
    if (!membership) {
      return { kind: 'google_sub_not_linked' };
    }

    const existingDevice = this.androidMerchantDevices.get(input.deviceProofHash);
    let device: AndroidMerchantDeviceRecord;
    if (existingDevice && existingDevice.status !== AndroidMerchantDeviceStatuses.REVOKED) {
      if (
        existingDevice.status !== AndroidMerchantDeviceStatuses.ACTIVE ||
        existingDevice.userId !== user.id ||
        existingDevice.merchantId !== membership.merchantId
      ) {
        return { kind: 'device_already_registered', device: existingDevice };
      }
      device = {
        ...existingDevice,
        updatedAt: input.now,
        lastSeenAt: input.now
      };
    } else {
      device = {
        id: input.deviceId,
        userId: user.id,
        merchantId: membership.merchantId,
        deviceProofHash: input.deviceProofHash,
        status: AndroidMerchantDeviceStatuses.ACTIVE,
        createdAt: input.now,
        updatedAt: input.now,
        lastSeenAt: input.now
      };
    }
    this.androidMerchantDevices.set(input.deviceProofHash, device);

    const mobileSession: AndroidMerchantMobileSessionRecord = {
      id: input.mobileSessionId,
      userId: user.id,
      merchantId: membership.merchantId,
      deviceId: device.id,
      expiresAt: input.expiresAt,
      revokedAt: null
    };
    this.androidMerchantSessions.set(input.mobileSessionHash, mobileSession);

    const storedAccount = this.androidMerchantAccounts.get(user.id);
    const account: AndroidMerchantAccountRecord = {
      userId: user.id,
      merchantId: membership.merchantId,
      deviceId: device.id,
      profileType: storedAccount?.profileType ?? AndroidMerchantProfileTypes.PERSONAL,
      displayHandle: storedAccount?.displayHandle ?? user.name ?? `merchant-${user.id.replaceAll('-', '').slice(0, 8)}`,
      permissions: androidMerchantMobilePermissions(),
      mobileSession
    };
    this.androidMerchantAccounts.set(user.id, account);
    this.users.set(user.id, { ...user, lastLoginAt: input.now });
    return { kind: 'recovered', account };
  }

  async recoverAndroidMerchantKnownDevice(
    input: RecoverAndroidMerchantKnownDeviceInput
  ): Promise<RecoverAndroidMerchantKnownDeviceResult> {
    const device = this.androidMerchantDevices.get(input.deviceProofHash) ?? null;
    if (!device) {
      return { kind: 'device_not_found' };
    }
    if (device.status !== AndroidMerchantDeviceStatuses.ACTIVE) {
      return { kind: 'recovery_required', device };
    }
    const user = this.users.get(device.userId);
    if (!user || user.status !== 'active') {
      return { kind: 'device_not_found' };
    }
    const membership = [...this.memberships.values()].find(
      (candidate) =>
        candidate.userId === device.userId &&
        candidate.merchantId === device.merchantId &&
        candidate.status === 'active' &&
        (candidate.role === MerchantRoles.OWNER || candidate.role === MerchantRoles.ADMIN)
    );
    if (!membership) {
      return { kind: 'device_not_found' };
    }

    const updatedDevice = {
      ...device,
      updatedAt: input.now,
      lastSeenAt: input.now
    };
    this.androidMerchantDevices.set(input.deviceProofHash, updatedDevice);

    const mobileSession: AndroidMerchantMobileSessionRecord = {
      id: input.mobileSessionId,
      userId: device.userId,
      merchantId: device.merchantId,
      deviceId: device.id,
      expiresAt: input.expiresAt,
      revokedAt: null
    };
    this.androidMerchantSessions.set(input.mobileSessionHash, mobileSession);

    const storedAccount = this.androidMerchantAccounts.get(device.userId);
    const account: AndroidMerchantAccountRecord = {
      userId: device.userId,
      merchantId: device.merchantId,
      deviceId: device.id,
      profileType: storedAccount?.profileType ?? AndroidMerchantProfileTypes.PERSONAL,
      displayHandle: storedAccount?.displayHandle ?? user.name ?? `merchant-${device.userId.replaceAll('-', '').slice(0, 8)}`,
      permissions: androidMerchantMobilePermissions(),
      mobileSession
    };
    this.androidMerchantAccounts.set(device.userId, account);
    this.users.set(device.userId, { ...user, lastLoginAt: input.now });
    return { kind: 'recovered', account };
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

  async getAndroidMerchantMobileSessionByHash(
    mobileSessionHash: string,
    now: string
  ): Promise<AndroidMerchantMobileSessionRecord | null> {
    const result = await this.pool.query(
      `SELECT s.id, s.user_id, s.merchant_id, s.device_id, s.expires_at, s.revoked_at
       FROM android_merchant_sessions s
       INNER JOIN android_merchant_devices d ON d.id = s.device_id
        AND d.user_id = s.user_id
        AND d.merchant_id = s.merchant_id
       WHERE s.session_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > $2
        AND d.status = 'active'
       LIMIT 1`,
      [mobileSessionHash, now]
    );
    return result.rows[0] ? mapAndroidMerchantMobileSessionRow(result.rows[0]) : null;
  }

  async refreshAndroidMerchantMobileSession(input: {
    mobileSessionHash: string;
    expiresAt: string;
    now: string;
  }): Promise<AndroidMerchantMobileSessionRecord | null> {
    const result = await this.pool.query(
      `UPDATE android_merchant_sessions s
       SET expires_at = $2, updated_at = $3
       FROM android_merchant_devices d
       WHERE s.session_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > $3
        AND d.id = s.device_id
        AND d.user_id = s.user_id
        AND d.merchant_id = s.merchant_id
        AND d.status = 'active'
       RETURNING s.id, s.user_id, s.merchant_id, s.device_id, s.expires_at, s.revoked_at`,
      [input.mobileSessionHash, input.expiresAt, input.now]
    );
    return result.rows[0] ? mapAndroidMerchantMobileSessionRow(result.rows[0]) : null;
  }

  async lookupAndroidMerchantDevice(input: AndroidMerchantDeviceLookupInput): Promise<AndroidMerchantDeviceLookupResult> {
    const result = await this.pool.query(
      `SELECT id, user_id, merchant_id, device_proof_hash, status, created_at, updated_at, last_seen_at
       FROM android_merchant_devices
       WHERE device_proof_hash = $1 AND status <> 'revoked'`,
      [input.deviceProofHash]
    );
    const row = result.rows[0];
    if (!row) {
      return {
        deviceStatus:
          input.lookupIntent === AndroidMerchantDeviceLookupIntents.RECOVER_ACCOUNT
            ? AndroidMerchantDeviceLookupStatuses.RECOVERY_REQUIRED
            : AndroidMerchantDeviceLookupStatuses.NEW_DEVICE,
        device: null
      };
    }

    const device = mapAndroidMerchantDeviceRow(row);
    if (device.status === AndroidMerchantDeviceStatuses.ACTIVE) {
      const updated = await this.pool.query(
        `UPDATE android_merchant_devices
         SET last_seen_at = $2, updated_at = $2
         WHERE id = $1
         RETURNING id, user_id, merchant_id, device_proof_hash, status, created_at, updated_at, last_seen_at`,
        [device.id, input.now]
      );
      return {
        deviceStatus: AndroidMerchantDeviceLookupStatuses.KNOWN_DEVICE,
        device: mapAndroidMerchantDeviceRow(updated.rows[0])
      };
    }

    return {
      deviceStatus: AndroidMerchantDeviceLookupStatuses.RECOVERY_REQUIRED,
      device
    };
  }

  async createAndroidMerchantAccount(input: CreateAndroidMerchantAccountInput): Promise<CreateAndroidMerchantAccountResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const existingDevice = await client.query(
        `SELECT id, user_id, merchant_id, device_proof_hash, status, created_at, updated_at, last_seen_at
         FROM android_merchant_devices
         WHERE device_proof_hash = $1 AND status <> 'revoked'
         FOR UPDATE`,
        [input.deviceProofHash]
      );
      if (existingDevice.rows[0]) {
        await client.query('ROLLBACK');
        return {
          kind: 'device_already_registered',
          device: mapAndroidMerchantDeviceRow(existingDevice.rows[0])
        };
      }

      const merchantName =
        input.profileType === AndroidMerchantProfileTypes.BUSINESS && input.businessLabel
          ? input.businessLabel
          : input.displayHandle;
      await client.query(
        `INSERT INTO users (id, google_sub, email, name, display_handle, account_origin, status, last_login_at, created_at, updated_at)
         VALUES ($1, NULL, $2, $3, $3, 'android_mobile', 'active', $4, $4, $4)`,
        [input.userId, `mobile-${input.userId}@swimpay.local`, input.displayHandle, input.now]
      );
      await client.query(
        `INSERT INTO merchants (
           id, name, business_name, status, owner_user_id, android_profile_type, android_business_label, created_at, updated_at
         )
         VALUES ($1, $2, $2, 'active', $3, $4, $5, $6, $6)`,
        [input.merchantId, merchantName, input.userId, input.profileType, input.businessLabel, input.now]
      );
      await client.query(
        `INSERT INTO merchant_memberships (merchant_id, user_id, role, status, created_at, updated_at)
         VALUES ($1, $2, 'owner', 'active', $3, $3)`,
        [input.merchantId, input.userId, input.now]
      );
      const deviceResult = await client.query(
        `INSERT INTO android_merchant_devices (
           id, user_id, merchant_id, device_proof_hash, status, created_at, updated_at, last_seen_at
         )
         VALUES ($1, $2, $3, $4, 'active', $5, $5, $5)
         RETURNING id, user_id, merchant_id, device_proof_hash, status, created_at, updated_at, last_seen_at`,
        [input.deviceId, input.userId, input.merchantId, input.deviceProofHash, input.now]
      );
      const sessionResult = await client.query(
        `INSERT INTO android_merchant_sessions (
           id, session_hash, user_id, merchant_id, device_id, expires_at, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
         RETURNING id, user_id, merchant_id, device_id, expires_at, revoked_at`,
        [
          input.mobileSessionId,
          input.mobileSessionHash,
          input.userId,
          input.merchantId,
          input.deviceId,
          input.expiresAt,
          input.now
        ]
      );
      await client.query('COMMIT');
      return {
        kind: 'created',
        account: {
          userId: input.userId,
          merchantId: input.merchantId,
          deviceId: mapAndroidMerchantDeviceRow(deviceResult.rows[0]).id,
          profileType: input.profileType,
          displayHandle: input.displayHandle,
          permissions: androidMerchantMobilePermissions(),
          mobileSession: mapAndroidMerchantMobileSessionRow(sessionResult.rows[0])
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (isPgUniqueViolation(error)) {
        const existingDevice = await this.lookupAndroidMerchantDevice({
          deviceProofHash: input.deviceProofHash,
          lookupIntent: AndroidMerchantDeviceLookupIntents.CREATE_ACCOUNT,
          now: input.now
        });
        if (existingDevice.device) {
          return {
            kind: 'device_already_registered',
            device: existingDevice.device
          };
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async linkAndroidMerchantGoogleSub(input: {
    userId: string;
    googleSub: string;
    now: string;
  }): Promise<LinkAndroidMerchantGoogleSubResult> {
    try {
      const result = await this.pool.query(
        `UPDATE users
         SET google_sub = $2, last_login_at = $3, updated_at = $3
         WHERE id = $1
          AND status = 'active'
          AND (google_sub IS NULL OR google_sub = $2)`,
        [input.userId, input.googleSub, input.now]
      );
      if ((result.rowCount ?? 0) > 0) {
        return { kind: 'linked' };
      }
      return { kind: 'google_sub_conflict' };
    } catch (error) {
      if (isPgUniqueViolation(error)) {
        return { kind: 'google_sub_conflict' };
      }
      throw error;
    }
  }

  async recoverAndroidMerchantAccountWithGoogle(
    input: RecoverAndroidMerchantAccountWithGoogleInput
  ): Promise<RecoverAndroidMerchantAccountWithGoogleResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const userResult = await client.query(
        `SELECT id, name, display_handle
         FROM users
         WHERE google_sub = $1 AND status = 'active'
         FOR UPDATE`,
        [input.googleSub]
      );
      const user = userResult.rows[0];
      if (!user) {
        await client.query('ROLLBACK');
        return { kind: 'google_sub_not_linked' };
      }

      const membershipResult = await client.query(
        `SELECT mm.merchant_id, mm.user_id, mm.role, m.android_profile_type
         FROM merchant_memberships mm
         JOIN merchants m ON m.id = mm.merchant_id
         WHERE mm.user_id = $1
          AND mm.status = 'active'
          AND mm.role IN ('owner', 'admin')
          AND m.status = 'active'
         ORDER BY CASE WHEN mm.role = 'owner' THEN 0 ELSE 1 END, mm.created_at ASC
         LIMIT 1`,
        [user.id]
      );
      const membership = membershipResult.rows[0];
      if (!membership) {
        await client.query('ROLLBACK');
        return { kind: 'google_sub_not_linked' };
      }

      const existingDeviceResult = await client.query(
        `SELECT id, user_id, merchant_id, device_proof_hash, status, created_at, updated_at, last_seen_at
         FROM android_merchant_devices
         WHERE device_proof_hash = $1 AND status <> 'revoked'
         FOR UPDATE`,
        [input.deviceProofHash]
      );
      const existingDevice = existingDeviceResult.rows[0] ? mapAndroidMerchantDeviceRow(existingDeviceResult.rows[0]) : null;
      let device: AndroidMerchantDeviceRecord;
      if (existingDevice) {
        if (
          existingDevice.status !== AndroidMerchantDeviceStatuses.ACTIVE ||
          existingDevice.userId !== String(user.id) ||
          existingDevice.merchantId !== String(membership.merchant_id)
        ) {
          await client.query('ROLLBACK');
          return { kind: 'device_already_registered', device: existingDevice };
        }
        const updatedDevice = await client.query(
          `UPDATE android_merchant_devices
           SET last_seen_at = $2, updated_at = $2
           WHERE id = $1
           RETURNING id, user_id, merchant_id, device_proof_hash, status, created_at, updated_at, last_seen_at`,
          [existingDevice.id, input.now]
        );
        device = mapAndroidMerchantDeviceRow(updatedDevice.rows[0]);
      } else {
        const insertedDevice = await client.query(
          `INSERT INTO android_merchant_devices (
             id, user_id, merchant_id, device_proof_hash, status, created_at, updated_at, last_seen_at
           )
           VALUES ($1, $2, $3, $4, 'active', $5, $5, $5)
           RETURNING id, user_id, merchant_id, device_proof_hash, status, created_at, updated_at, last_seen_at`,
          [input.deviceId, user.id, membership.merchant_id, input.deviceProofHash, input.now]
        );
        device = mapAndroidMerchantDeviceRow(insertedDevice.rows[0]);
      }

      const sessionResult = await client.query(
        `INSERT INTO android_merchant_sessions (
           id, session_hash, user_id, merchant_id, device_id, expires_at, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
         RETURNING id, user_id, merchant_id, device_id, expires_at, revoked_at`,
        [
          input.mobileSessionId,
          input.mobileSessionHash,
          user.id,
          membership.merchant_id,
          device.id,
          input.expiresAt,
          input.now
        ]
      );
      await client.query(`UPDATE users SET last_login_at = $2, updated_at = $2 WHERE id = $1`, [user.id, input.now]);
      await client.query('COMMIT');
      return {
        kind: 'recovered',
        account: {
          userId: String(user.id),
          merchantId: String(membership.merchant_id),
          deviceId: device.id,
          profileType: parseAndroidMerchantProfileType(String(membership.android_profile_type)),
          displayHandle:
            (user.display_handle ? String(user.display_handle) : null) ??
            (user.name ? String(user.name) : null) ??
            `merchant-${String(user.id).replaceAll('-', '').slice(0, 8)}`,
          permissions: androidMerchantMobilePermissions(),
          mobileSession: mapAndroidMerchantMobileSessionRow(sessionResult.rows[0])
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (isPgUniqueViolation(error)) {
        const existingDevice = await this.lookupAndroidMerchantDevice({
          deviceProofHash: input.deviceProofHash,
          lookupIntent: AndroidMerchantDeviceLookupIntents.RECOVER_ACCOUNT,
          now: input.now
        });
        if (existingDevice.device) {
          return { kind: 'device_already_registered', device: existingDevice.device };
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async recoverAndroidMerchantKnownDevice(
    input: RecoverAndroidMerchantKnownDeviceInput
  ): Promise<RecoverAndroidMerchantKnownDeviceResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const deviceResult = await client.query(
        `SELECT id, user_id, merchant_id, device_proof_hash, status, created_at, updated_at, last_seen_at
         FROM android_merchant_devices
         WHERE device_proof_hash = $1 AND status <> 'revoked'
         FOR UPDATE`,
        [input.deviceProofHash]
      );
      const device = deviceResult.rows[0] ? mapAndroidMerchantDeviceRow(deviceResult.rows[0]) : null;
      if (!device) {
        await client.query('ROLLBACK');
        return { kind: 'device_not_found' };
      }
      if (device.status !== AndroidMerchantDeviceStatuses.ACTIVE) {
        await client.query('ROLLBACK');
        return { kind: 'recovery_required', device };
      }

      const membershipResult = await client.query(
        `SELECT u.id AS user_id, u.name, u.display_handle, mm.merchant_id, mm.role, m.android_profile_type
         FROM users u
         JOIN merchant_memberships mm ON mm.user_id = u.id
         JOIN merchants m ON m.id = mm.merchant_id
         WHERE u.id = $1
          AND u.status = 'active'
          AND mm.merchant_id = $2
          AND mm.status = 'active'
          AND mm.role IN ('owner', 'admin')
          AND m.status = 'active'
         ORDER BY CASE WHEN mm.role = 'owner' THEN 0 ELSE 1 END, mm.created_at ASC
         LIMIT 1
         FOR UPDATE OF u`,
        [device.userId, device.merchantId]
      );
      const membership = membershipResult.rows[0];
      if (!membership) {
        await client.query('ROLLBACK');
        return { kind: 'device_not_found' };
      }

      const updatedDevice = await client.query(
        `UPDATE android_merchant_devices
         SET last_seen_at = $2, updated_at = $2
         WHERE id = $1
         RETURNING id, user_id, merchant_id, device_proof_hash, status, created_at, updated_at, last_seen_at`,
        [device.id, input.now]
      );
      const sessionResult = await client.query(
        `INSERT INTO android_merchant_sessions (
           id, session_hash, user_id, merchant_id, device_id, expires_at, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
         RETURNING id, user_id, merchant_id, device_id, expires_at, revoked_at`,
        [
          input.mobileSessionId,
          input.mobileSessionHash,
          device.userId,
          device.merchantId,
          device.id,
          input.expiresAt,
          input.now
        ]
      );
      await client.query(`UPDATE users SET last_login_at = $2, updated_at = $2 WHERE id = $1`, [device.userId, input.now]);
      await client.query('COMMIT');
      return {
        kind: 'recovered',
        account: {
          userId: String(membership.user_id),
          merchantId: String(membership.merchant_id),
          deviceId: mapAndroidMerchantDeviceRow(updatedDevice.rows[0]).id,
          profileType: parseAndroidMerchantProfileType(String(membership.android_profile_type)),
          displayHandle:
            (membership.display_handle ? String(membership.display_handle) : null) ??
            (membership.name ? String(membership.name) : null) ??
            `merchant-${String(membership.user_id).replaceAll('-', '').slice(0, 8)}`,
          permissions: androidMerchantMobilePermissions(),
          mobileSession: mapAndroidMerchantMobileSessionRow(sessionResult.rows[0])
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

function mapAndroidMerchantDeviceRow(row: Record<string, unknown>): AndroidMerchantDeviceRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    merchantId: String(row.merchant_id),
    deviceProofHash: String(row.device_proof_hash),
    status: String(row.status) as AndroidMerchantDeviceStatus,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    lastSeenAt: row.last_seen_at ? new Date(String(row.last_seen_at)).toISOString() : null
  };
}

function mapAndroidMerchantMobileSessionRow(row: Record<string, unknown>): AndroidMerchantMobileSessionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    merchantId: String(row.merchant_id),
    deviceId: String(row.device_id),
    expiresAt: new Date(String(row.expires_at)).toISOString(),
    revokedAt: row.revoked_at ? new Date(String(row.revoked_at)).toISOString() : null
  };
}

function parseAndroidMerchantProfileType(value: string): AndroidMerchantProfileType {
  return value === AndroidMerchantProfileTypes.BUSINESS ? AndroidMerchantProfileTypes.BUSINESS : AndroidMerchantProfileTypes.PERSONAL;
}

function isPgUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === '23505');
}
