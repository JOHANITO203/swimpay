import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

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

export type PublicWebhookUrlValidationResult =
  | { valid: true; value: string }
  | { valid: false; message: string };

export function validatePublicWebhookUrlSyntax(input: unknown): PublicWebhookUrlValidationResult {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return { valid: false, message: 'Webhook URL is required.' };
  }
  const value = input.trim();
  if (value.length > 2048) {
    return { valid: false, message: 'Webhook URL is too long.' };
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { valid: false, message: 'Webhook URL must be a valid URL.' };
  }
  if (parsed.protocol !== 'https:') {
    return { valid: false, message: 'Webhook URL must use HTTPS.' };
  }
  if (parsed.username || parsed.password) {
    return { valid: false, message: 'Webhook URL must not include credentials.' };
  }
  if (!isAllowedPublicWebhookHost(parsed.hostname)) {
    return { valid: false, message: 'Webhook URL host is not allowed.' };
  }
  return { valid: true, value };
}

export async function assertPublicWebhookUrlEgressAllowed(input: string): Promise<void> {
  const syntax = validatePublicWebhookUrlSyntax(input);
  if (!syntax.valid) {
    throw new Error('webhook_url_not_public');
  }
  const parsed = new URL(syntax.value);
  const hostname = normalizePublicWebhookHostname(parsed.hostname);
  const literalIpVersion = isIP(hostname);
  if (literalIpVersion !== 0) {
    if (!isAllowedPublicWebhookIp(hostname)) {
      throw new Error('webhook_url_not_public');
    }
    return;
  }

  const addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((address) => !isAllowedPublicWebhookIp(address.address))) {
    throw new Error('webhook_url_not_public');
  }
}

function isAllowedPublicWebhookHost(hostname: string): boolean {
  const host = normalizePublicWebhookHostname(hostname);
  if (!host || host.includes('%')) {
    return false;
  }
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return false;
  }
  const ipVersion = isIP(host);
  if (ipVersion !== 0) {
    return isAllowedPublicWebhookIp(host);
  }
  if (!host.includes('.')) {
    return false;
  }
  return !(
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan') ||
    host.endsWith('.home.arpa')
  );
}

function normalizePublicWebhookHostname(hostname: string): string {
  const lower = hostname.trim().toLowerCase();
  const withoutBrackets = lower.startsWith('[') && lower.endsWith(']') ? lower.slice(1, -1) : lower;
  return withoutBrackets.replace(/\.+$/u, '');
}

function isAllowedPublicWebhookIp(host: string): boolean {
  const ipVersion = isIP(host);
  if (ipVersion === 4) {
    return !isUnsafeIpv4(host);
  }
  if (ipVersion === 6) {
    return !isUnsafeIpv6(host);
  }
  return false;
}

function isUnsafeIpv4(host: string): boolean {
  const parts = host.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a = 0, b = 0, c = 0] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isUnsafeIpv6(host: string): boolean {
  const groups = expandIpv6(host);
  if (!groups) {
    return true;
  }
  const [g0 = 0, g1 = 0, g2 = 0, g3 = 0, g4 = 0, g5 = 0, g6 = 0, g7 = 0] = groups;
  if (groups.every((group) => group === 0)) {
    return true;
  }
  if ([g0, g1, g2, g3, g4, g5, g6].every((group) => group === 0) && g7 === 1) {
    return true;
  }
  if ((g0 & 0xfe00) === 0xfc00 || (g0 & 0xffc0) === 0xfe80 || (g0 & 0xff00) === 0xff00) {
    return true;
  }
  if (g0 === 0x2001 && g1 === 0x0db8) {
    return true;
  }
  if ([g0, g1, g2, g3, g4].every((group) => group === 0) && g5 === 0xffff) {
    const ipv4 = `${g6 >> 8}.${g6 & 0xff}.${g7 >> 8}.${g7 & 0xff}`;
    return isUnsafeIpv4(ipv4);
  }
  return false;
}

function expandIpv6(host: string): number[] | null {
  if (host.includes('%')) {
    return null;
  }
  const compactParts = host.split('::');
  if (compactParts.length > 2) {
    return null;
  }
  const head = parseIpv6Part(compactParts[0] ?? '');
  const tail = compactParts.length === 2 ? parseIpv6Part(compactParts[1] ?? '') : [];
  if (!head || !tail) {
    return null;
  }
  const missingGroups = 8 - head.length - tail.length;
  if (compactParts.length === 1) {
    return missingGroups === 0 ? head : null;
  }
  if (missingGroups < 1) {
    return null;
  }
  return [...head, ...Array.from({ length: missingGroups }, () => 0), ...tail];
}

function parseIpv6Part(part: string): number[] | null {
  if (!part) {
    return [];
  }
  const groups: number[] = [];
  for (const rawGroup of part.split(':')) {
    if (!rawGroup) {
      return null;
    }
    if (rawGroup.includes('.')) {
      if (isIP(rawGroup) !== 4 || isUnsafeIpv4(rawGroup)) {
        return null;
      }
      const [a = 0, b = 0, c = 0, d = 0] = rawGroup.split('.').map((value) => Number.parseInt(value, 10));
      groups.push((a << 8) + b, (c << 8) + d);
      continue;
    }
    if (!/^[0-9a-f]{1,4}$/iu.test(rawGroup)) {
      return null;
    }
    groups.push(Number.parseInt(rawGroup, 16));
  }
  return groups;
}

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

export function encryptSecret(secret: string, encryptionKey: string): string {
  const key = deriveEncryptionKey(encryptionKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `enc_v1:${iv.toString('base64url')}:${authTag.toString('base64url')}:${ciphertext.toString('base64url')}`;
}

export function decryptSecret(encryptedSecret: string, encryptionKey: string): string {
  const [version, iv, authTag, ciphertext] = encryptedSecret.split(':');
  if (version !== 'enc_v1' || !iv || !authTag || !ciphertext) {
    throw new Error('Unsupported encrypted secret format.');
  }
  const decipher = createDecipheriv('aes-256-gcm', deriveEncryptionKey(encryptionKey), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final()
  ]).toString('utf8');
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
  'req.body.sender_card_number',
  'req.body.buyer_source_card_number',
  'req.body.card_number',
  'req.body.cardNumber',
  'req.body.cardPan',
  'req.body.full_card',
  'req.body.pan',
  'req.body.cvv',
  'req.body.cvc',
  'req.body.expiry',
  'req.body.expiration',
  'req.body.pin',
  'req.body.sms_code',
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

function deriveEncryptionKey(encryptionKey: string): Buffer {
  return createHash('sha256').update(encryptionKey, 'utf8').digest();
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
  return /authorization|cookie|api[_-]?key|secret|signature|token|password|cvv|cvc|expiry|expiration|pin|sms[_-]?code|raw[_-]?(notification|text|phone|body|title)|receiver[_-]?identifier|destination[_-]?value|card[_-]?number|cardnumber|card[_-]?pan|cardpan|full[_-]?card|(^|_)pan$|phone_raw|raw_phone|(^|_)phone$|buyer_phone|sender_phone|normalized_phone|sender[_-]?card[_-]?number|buyer[_-]?source[_-]?card[_-]?number|notification_text/iu.test(
    key
  );
}
