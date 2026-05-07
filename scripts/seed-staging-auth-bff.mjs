import { createHash, randomBytes } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;

const confirmValue = 'seed-local-staging-auth';
const allowProductionValue = 'yes-i-understand-this-is-staging';

if (process.env.SWIMPAY_STAGING_SEED_CONFIRM !== confirmValue) {
  console.error(`Refusing to seed. Set SWIMPAY_STAGING_SEED_CONFIRM=${confirmValue}.`);
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && process.env.SWIMPAY_STAGING_SEED_ALLOW_PRODUCTION !== allowProductionValue) {
  console.error('Refusing to seed production-mode database without explicit staging override.');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const now = new Date().toISOString();
const userId = process.env.SWIMPAY_STAGING_USER_ID ?? '10000000-0000-4000-8000-000000000001';
const merchantId = process.env.SWIMPAY_STAGING_MERCHANT_ID ?? '20000000-0000-4000-8000-000000000001';
const email = process.env.SWIMPAY_STAGING_USER_EMAIL ?? 'staging-merchant@example.test';
const name = process.env.SWIMPAY_STAGING_USER_NAME ?? 'Staging Merchant';
const rawApiKey = process.env.SWIMPAY_STAGING_API_KEY ?? `sk_staging_${randomBytes(24).toString('base64url')}`;
const sessionToken = process.env.SWIMPAY_STAGING_BFF_SESSION_TOKEN ?? `bff_${randomBytes(32).toString('base64url')}`;
const csrfToken = process.env.SWIMPAY_STAGING_CSRF_TOKEN ?? `csrf_${randomBytes(32).toString('base64url')}`;
const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

try {
  await pool.query('BEGIN');
  await pool.query(
    `INSERT INTO users (id, google_sub, email, name, status, last_login_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'active', $5, $5, $5)
     ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email,
           name = EXCLUDED.name,
           status = 'active',
           last_login_at = EXCLUDED.last_login_at,
           updated_at = EXCLUDED.updated_at`,
    [userId, `staging:${userId}`, email, name, now]
  );
  await pool.query(
    `INSERT INTO merchants (id, name, business_name, status, owner_user_id, created_at, updated_at)
     VALUES ($1, $2, $2, 'active', $3, $4, $4)
     ON CONFLICT (id) DO UPDATE
       SET status = 'active',
           owner_user_id = EXCLUDED.owner_user_id,
           business_name = COALESCE(merchants.business_name, EXCLUDED.business_name),
           updated_at = EXCLUDED.updated_at`,
    [merchantId, 'SwimPay Staging Merchant', userId, now]
  );
  await pool.query(
    `INSERT INTO merchant_memberships (merchant_id, user_id, role, status, created_at, updated_at)
     VALUES ($1, $2, 'owner', 'active', $3, $3)
     ON CONFLICT (merchant_id, user_id) DO UPDATE
       SET role = 'owner',
           status = 'active',
           updated_at = EXCLUDED.updated_at`,
    [merchantId, userId, now]
  );
  await pool.query(
    `INSERT INTO api_keys (merchant_id, key_hash, scopes, status, created_at)
     VALUES ($1, $2, $3::jsonb, 'active', $4)
     ON CONFLICT (key_hash) DO UPDATE
       SET status = 'active',
           revoked_at = NULL`,
    [merchantId, hashApiKey(rawApiKey), JSON.stringify(['orders.write']), now]
  );
  await pool.query(
    `INSERT INTO bff_sessions (session_hash, csrf_secret_hash, user_id, active_merchant_id, expires_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     ON CONFLICT (session_hash) DO UPDATE
       SET csrf_secret_hash = EXCLUDED.csrf_secret_hash,
           active_merchant_id = EXCLUDED.active_merchant_id,
           expires_at = EXCLUDED.expires_at,
           revoked_at = NULL,
           updated_at = EXCLUDED.updated_at`,
    [hashBffSessionToken(sessionToken), hashCsrfToken(csrfToken), userId, merchantId, expiresAt, now]
  );
  await pool.query('COMMIT');

  console.log(JSON.stringify({
    seeded: true,
    user_id: userId,
    merchant_id: merchantId,
    api_key: rawApiKey,
    bff_session_cookie_name: 'swimpay_bff_session',
    bff_session_token: sessionToken,
    csrf_header_name: 'x-csrf-token',
    csrf_token: csrfToken,
    expires_at: expiresAt,
    note: 'Store these staging-only values securely. Do not commit them.'
  }, null, 2));
} catch (error) {
  await pool.query('ROLLBACK');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}

function hashApiKey(value) {
  return `api_key_sha256:${sha256(`swimpay_api_key_v1:${value}`)}`;
}

function hashBffSessionToken(value) {
  return `bff_session_sha256:${sha256(value)}`;
}

function hashCsrfToken(value) {
  return `csrf_sha256:${sha256(value)}`;
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

