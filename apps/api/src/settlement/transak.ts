/**
 * Transak on-ramp — builds the embedded widget URL for the fiat ENTRY (Path D).
 *
 * The buyer pays fiat (EUR via SEPA) in Transak; Transak delivers the crypto (USDC)
 * to the destination address we lock. SwimPay never touches the fiat — the licensed
 * on-ramp does it, with the buyer's KYC. Confirmation stays our on-chain chain-reader
 * (authoritative); Transak's webhook is only optional corroboration.
 *
 * We lock the CRYPTO amount (the USDC owed), not the fiat: the merchant receives
 * exactly what's due; the buyer pays that amount + Transak's fees on top. Locking the
 * crypto amount keeps it consistent with the chain-reader's `minAmountMinor` check.
 *
 * Param names follow Transak's widget query API; verify against current Transak docs
 * before production. NB: no API secret is in the URL — only the public `apiKey`.
 */

export interface TransakConfig {
  /** Public Transak API key (partner dashboard). */
  apiKey: string;
  environment: 'STAGING' | 'PRODUCTION';
  /** Transak network code for the chain, e.g. 'base'. */
  network: string;
  /** Default payment method, e.g. 'sepa_bank_transfer' (cheapest). */
  defaultPaymentMethod?: string;
  /** Where Transak redirects the buyer after completion. */
  redirectUrl?: string;
}

export interface TransakOnrampParams {
  /** Fiat the buyer pays in, e.g. 'EUR'. */
  fiatCurrency: string;
  /** Crypto delivered, e.g. 'USDC'. */
  cryptoCurrencyCode: string;
  /** Destination address (merchant / escrow) — locked. */
  walletAddress: string;
  /** Exact crypto amount to deliver, in HUMAN units (e.g. 100 = 100 USDC). */
  cryptoAmount: string | number;
  /** Our intent id, for cross-reference / reconciliation. */
  partnerOrderId: string;
  /** Override the payment method for this order. */
  paymentMethod?: string;
}

const BASE_URLS: Readonly<Record<TransakConfig['environment'], string>> = {
  STAGING: 'https://global-stg.transak.com',
  PRODUCTION: 'https://global.transak.com',
};

/** Convert token base units → human units string without floating error. */
export function baseUnitsToAmount(baseUnits: number, decimals: number): string {
  if (decimals <= 0) return String(baseUnits);
  const s = Math.trunc(baseUnits).toString().padStart(decimals + 1, '0');
  const whole = s.slice(0, -decimals);
  const frac = s.slice(-decimals).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

export function buildTransakOnrampUrl(params: TransakOnrampParams, config: TransakConfig): string {
  const q = new URLSearchParams();
  q.set('apiKey', config.apiKey);
  q.set('productsAvailed', 'BUY');
  q.set('fiatCurrency', params.fiatCurrency.toUpperCase());
  q.set('cryptoCurrencyCode', params.cryptoCurrencyCode.toUpperCase());
  q.set('network', config.network);
  q.set('walletAddress', params.walletAddress);
  q.set('disableWalletAddressForm', 'true'); // lock the destination — buyer cannot change it
  q.set('cryptoAmount', String(params.cryptoAmount));
  q.set('partnerOrderId', params.partnerOrderId);
  const paymentMethod = params.paymentMethod ?? config.defaultPaymentMethod;
  if (paymentMethod) q.set('paymentMethod', paymentMethod);
  if (config.redirectUrl) q.set('redirectURL', config.redirectUrl);
  return `${BASE_URLS[config.environment]}/?${q.toString()}`;
}
