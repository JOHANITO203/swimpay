import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const OperatorRoles = {
  OWNER: 'owner',
  ADMIN: 'admin',
  OPERATOR: 'operator',
  SUPPORT: 'support',
  READ_ONLY: 'read_only'
} as const;

export type OperatorRole = (typeof OperatorRoles)[keyof typeof OperatorRoles];

export const OperatorPermissions = {
  VIEW_ADMIN_DASHBOARD: 'view_admin_dashboard',
  VIEW_MERCHANTS: 'view_merchants',
  VIEW_ORDERS: 'view_orders',
  VIEW_SIGNALS: 'view_signals',
  VIEW_REVIEWS: 'view_reviews',
  ACT_ON_REVIEWS: 'act_on_reviews',
  VIEW_BANK_TEMPLATES: 'view_bank_templates',
  PROMOTE_BANK_TEMPLATES: 'promote_bank_templates',
  DEGRADE_BANK_TEMPLATES: 'degrade_bank_templates',
  DISABLE_BANK_TEMPLATES: 'disable_bank_templates',
  REQUEST_BANK_EVIDENCE_PRODUCTION_TRUST: 'request_bank_evidence_production_trust',
  APPROVE_BANK_EVIDENCE_PRODUCTION_TRUST: 'approve_bank_evidence_production_trust',
  REVOKE_BANK_EVIDENCE_PRODUCTION_TRUST: 'revoke_bank_evidence_production_trust',
  VIEW_WEBHOOKS: 'view_webhooks',
  REPLAY_WEBHOOKS: 'replay_webhooks',
  VIEW_AUDIT_LOGS: 'view_audit_logs'
} as const;

export type OperatorPermission = (typeof OperatorPermissions)[keyof typeof OperatorPermissions];

const ALL_OPERATOR_PERMISSIONS = Object.values(OperatorPermissions);

export const ROLE_PERMISSIONS = {
  owner: ALL_OPERATOR_PERMISSIONS,
  admin: ALL_OPERATOR_PERMISSIONS,
  operator: [
    OperatorPermissions.VIEW_ADMIN_DASHBOARD,
    OperatorPermissions.VIEW_ORDERS,
    OperatorPermissions.VIEW_SIGNALS,
    OperatorPermissions.VIEW_REVIEWS,
    OperatorPermissions.ACT_ON_REVIEWS,
    OperatorPermissions.VIEW_BANK_TEMPLATES,
    OperatorPermissions.DEGRADE_BANK_TEMPLATES,
    OperatorPermissions.VIEW_WEBHOOKS,
    OperatorPermissions.VIEW_AUDIT_LOGS
  ],
  support: [
    OperatorPermissions.VIEW_ADMIN_DASHBOARD,
    OperatorPermissions.VIEW_MERCHANTS,
    OperatorPermissions.VIEW_ORDERS,
    OperatorPermissions.VIEW_SIGNALS,
    OperatorPermissions.VIEW_REVIEWS,
    OperatorPermissions.VIEW_BANK_TEMPLATES,
    OperatorPermissions.VIEW_WEBHOOKS,
    OperatorPermissions.VIEW_AUDIT_LOGS
  ],
  read_only: [
    OperatorPermissions.VIEW_ADMIN_DASHBOARD,
    OperatorPermissions.VIEW_MERCHANTS,
    OperatorPermissions.VIEW_ORDERS,
    OperatorPermissions.VIEW_SIGNALS,
    OperatorPermissions.VIEW_REVIEWS,
    OperatorPermissions.VIEW_BANK_TEMPLATES,
    OperatorPermissions.VIEW_WEBHOOKS,
    OperatorPermissions.VIEW_AUDIT_LOGS
  ]
} satisfies Record<OperatorRole, readonly OperatorPermission[]>;

export type AdminAuthMode = 'dev_token' | 'signed_token';

export interface OperatorPrincipal {
  operatorId: string;
  role: OperatorRole;
  permissions: readonly OperatorPermission[];
}

export interface OperatorAuthConfig {
  mode: AdminAuthMode;
  environment: string;
  devToken?: string | undefined;
  devOperatorId?: string | undefined;
  devRole?: OperatorRole | undefined;
  tokenHmacSecret?: string | undefined;
}

export type OperatorAuthRejectionReason =
  | 'missing_bearer_token'
  | 'placeholder_admin_token_rejected'
  | 'production_dev_auth_disabled'
  | 'dev_admin_token_not_configured'
  | 'admin_token_hmac_secret_not_configured'
  | 'invalid_operator_token'
  | 'invalid_operator_role';

export type OperatorAuthResult =
  | { kind: 'authenticated'; operator: OperatorPrincipal }
  | { kind: 'rejected'; reason: OperatorAuthRejectionReason };

export function hasOperatorPermission(role: OperatorRole, permission: OperatorPermission): boolean {
  return (ROLE_PERMISSIONS[role] as readonly OperatorPermission[]).includes(permission);
}

export function signOperatorToken(input: { operatorId: string; role: OperatorRole; secret: string }): string {
  return `op_${input.operatorId}.${input.role}.${operatorTokenSignature(input.operatorId, input.role, input.secret)}`;
}

export function verifyOperatorAuthorization(authorization: string | undefined, config: OperatorAuthConfig): OperatorAuthResult {
  const token = parseBearerToken(authorization);
  if (!token) {
    return { kind: 'rejected', reason: 'missing_bearer_token' };
  }

  if (/^admin_[A-Za-z0-9_-]+$/.test(token)) {
    return { kind: 'rejected', reason: 'placeholder_admin_token_rejected' };
  }

  if (config.mode === 'dev_token') {
    return verifyDevOperatorToken(token, config);
  }

  return verifySignedOperatorToken(token, config);
}

export const SENSITIVE_STORAGE_RULES = {
  apiKeysStoredAs: 'hash',
  phoneMatchingStoredAs: 'hmac',
  phoneDisplayStoredAs: 'masked',
  rawNotificationStoredByDefault: false
} as const;

export function normalizeRussianPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');

  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  return null;
}

export function maskPhone(normalizedPhone: string): string {
  const lastTwo = normalizedPhone.slice(-2);
  return `+7 *** *** **${lastTwo}`;
}

export function hmacSha256(value: string, secret: string): string {
  return `hmac_sha256:${createHmac('sha256', secret).update(value).digest('hex')}`;
}

export function hashApiKey(apiKey: string, salt = 'swimpay_api_key_v1'): string {
  return hashSecret(apiKey, salt, 'api_key_sha256');
}

export function verifyApiKey(apiKey: string, storedHash: string, salt = 'swimpay_api_key_v1'): boolean {
  return timingSafeStringEqual(hashApiKey(apiKey, salt), storedHash);
}

export function hashWebhookSecret(secret: string, salt = 'swimpay_webhook_secret_v1'): string {
  return hashSecret(secret, salt, 'webhook_secret_sha256');
}

export function verifyWebhookSecret(secret: string, storedHash: string, salt = 'swimpay_webhook_secret_v1'): boolean {
  return timingSafeStringEqual(hashWebhookSecret(secret, salt), storedHash);
}

export const FASTIFY_REDACTION_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["swimpay-signature"]',
  'req.body.signature',
  'req.body.api_key',
  'req.body.apiKey',
  'req.body.secret',
  'req.body.token',
  'req.body.password',
  'req.body.webhook_secret',
  'req.body.phone',
  'req.body.buyer_phone',
  'req.body.sender_phone',
  'req.body.normalized_phone',
  'req.body.notification_text',
  'req.body.raw_notification_text',
  'req.body.raw_body',
  'req.body.raw_title',
  'req.body.payload.raw_notification_text',
  'req.body.payload.raw_text',
  'req.body.payload.title',
  'req.body.payload.body',
  'req.body.payload.big_text',
  'res.headers["set-cookie"]'
] as const;

export function createFastifyLoggerOptions() {
  return {
    redact: {
      paths: [...FASTIFY_REDACTION_PATHS],
      censor: '[REDACTED]'
    }
  };
}

export function redactLogValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactLogValue(item)) as T;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    output[key] = isSensitiveLogKey(key) ? '[REDACTED]' : redactLogValue(nestedValue);
  }

  return output as T;
}

function hashSecret(value: string, salt: string, prefix: string): string {
  const digest = createHash('sha256').update(`${salt}:${value}`, 'utf8').digest('hex');
  return `${prefix}:${digest}`;
}

function timingSafeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyDevOperatorToken(token: string, config: OperatorAuthConfig): OperatorAuthResult {
  if (config.environment === 'production') {
    return { kind: 'rejected', reason: 'production_dev_auth_disabled' };
  }

  if (!config.devToken) {
    return { kind: 'rejected', reason: 'dev_admin_token_not_configured' };
  }

  if (!timingSafeStringEqual(token, config.devToken)) {
    return { kind: 'rejected', reason: 'invalid_operator_token' };
  }

  return {
    kind: 'authenticated',
    operator: buildOperatorPrincipal(config.devOperatorId ?? 'dev_operator', config.devRole ?? OperatorRoles.ADMIN)
  };
}

function verifySignedOperatorToken(token: string, config: OperatorAuthConfig): OperatorAuthResult {
  if (!config.tokenHmacSecret) {
    return { kind: 'rejected', reason: 'admin_token_hmac_secret_not_configured' };
  }

  const match = token.match(/^op_([A-Za-z0-9_-]+)\.([a-z_]+)\.([A-Za-z0-9_-]+)$/);
  if (!match) {
    return { kind: 'rejected', reason: 'invalid_operator_token' };
  }

  const [, operatorId, role, signature] = match;
  if (!operatorId || !role || !signature || !isOperatorRole(role)) {
    return { kind: 'rejected', reason: 'invalid_operator_role' };
  }

  const expected = operatorTokenSignature(operatorId, role, config.tokenHmacSecret);
  if (!timingSafeStringEqual(signature, expected)) {
    return { kind: 'rejected', reason: 'invalid_operator_token' };
  }

  return {
    kind: 'authenticated',
    operator: buildOperatorPrincipal(operatorId, role)
  };
}

function buildOperatorPrincipal(operatorId: string, role: OperatorRole): OperatorPrincipal {
  return {
    operatorId,
    role,
    permissions: ROLE_PERMISSIONS[role]
  };
}

function parseBearerToken(authorization: string | undefined): string | null {
  const match = authorization?.match(/^Bearer\s+(.+)$/);
  return match?.[1]?.trim() || null;
}

function isOperatorRole(role: string): role is OperatorRole {
  return Object.values(OperatorRoles).includes(role as OperatorRole);
}

function operatorTokenSignature(operatorId: string, role: OperatorRole, secret: string): string {
  return createHmac('sha256', secret).update(`${operatorId}.${role}`).digest('base64url');
}

function isSensitiveLogKey(key: string): boolean {
  return /authorization|cookie|api[_-]?key|secret|signature|token|password|raw[_-]?(notification|text|phone|body|title)|phone_raw|raw_phone|(^|_)phone$|buyer_phone|sender_phone|normalized_phone|notification_text/iu.test(
    key
  );
}
