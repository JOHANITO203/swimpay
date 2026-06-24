/**
 * Coinbase Onramp — fiat ENTRY (USD/EUR/GBP… → USDC). Chosen over Transak: 0% USDC fees
 * + developer-account-only (no KYB) for the integration.
 *
 * It accepts a SUPPORTED fiat (USD/EUR/GBP…), NOT XOF — the buyer pays normal money, it is
 * delivered as USDC. XOF is the OUTPUT (merchant side, off-ramp), never the input.
 *
 * Two-step flow (unlike Transak's single signed URL):
 *   1. Server mints a single-use `sessionToken` via CDP (POST, signed with your CDP secret
 *      key). `buildSessionTokenRequest()` returns the request body; the signed call itself
 *      needs the CDP account → plugs in like the off-ramp's real API.
 *   2. `buildOnrampUrl(sessionToken)` returns the hosted widget URL.
 *
 * Param shapes follow CDP's onramp token API; confirm exact field names against current CDP
 * docs before production. No secret ever appears in the URL — only the single-use token.
 */

export class CoinbaseOnrampError extends Error {}

export interface CoinbaseOnrampConfig {
  /** CDP project / app id. */
  appId: string;
  /** Network code, e.g. 'base'. */
  network: string;
  /** Asset delivered, e.g. 'USDC'. */
  asset: string;
  /** Default fiat the buyer pays (never 'XOF'). */
  defaultFiatCurrency?: string;
}

export interface CoinbaseSessionTokenRequestParams {
  /** Destination address (merchant / escrow) — where the USDC lands. */
  walletAddress: string;
  /** Exact crypto to deliver, HUMAN units (merchant gets this; buyer pays it + fees). */
  cryptoAmount: string | number;
  /** Fiat the buyer pays — must NOT be XOF (Coinbase does not accept it as input). */
  fiatCurrency?: string;
  /** Our intent id, for cross-reference / reconciliation. */
  partnerOrderId: string;
}

const ONRAMP_BASE_URL = 'https://pay.coinbase.com/buy';

/**
 * Body to POST to CDP's onramp session-token endpoint (auth = your CDP JWT, server-side).
 * Pure & testable. The merchant gets exactly `cryptoAmount` of `asset`; the buyer pays the
 * equivalent fiat + Coinbase fees (0% on USDC for eligible partners).
 */
export function buildCoinbaseSessionTokenRequest(
  params: CoinbaseSessionTokenRequestParams,
  config: CoinbaseOnrampConfig,
): Record<string, unknown> {
  const fiat = (params.fiatCurrency ?? config.defaultFiatCurrency ?? 'EUR').toUpperCase();
  if (fiat === 'XOF') {
    throw new CoinbaseOnrampError('XOF is not a valid on-ramp input — it is the output (off-ramp) currency');
  }
  return {
    appId: config.appId,
    addresses: [{ address: params.walletAddress, blockchains: [config.network] }],
    assets: [config.asset],
    defaultAsset: config.asset,
    defaultNetwork: config.network,
    defaultPaymentMethod: 'CRYPTO_ACCOUNT',
    presetCryptoAmount: Number(params.cryptoAmount),
    fiatCurrency: fiat,
    partnerUserId: params.partnerOrderId,
  };
}

/** The hosted Onramp URL, once you hold a single-use sessionToken from CDP. Pure. */
export function buildCoinbaseOnrampUrl(sessionToken: string): string {
  if (!sessionToken) throw new CoinbaseOnrampError('sessionToken is required');
  return `${ONRAMP_BASE_URL}?${new URLSearchParams({ sessionToken }).toString()}`;
}
