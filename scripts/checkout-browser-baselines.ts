import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { get, request } from 'node:http';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import {
  PayerBankLauncherRegistry,
  V1ReceiverBankOptions,
  type BuyerSafeReceivingRoute
} from '@swimpay/contracts';
import { renderCheckoutPage } from '../apps/web/src/screens/CheckoutScreen.js';
import type { CheckoutRecipient, CheckoutSession } from '../apps/web/src/index.js';

type Mode = 'record' | 'verify';
type Viewport = { width: number; height: number; label: string };
type BaselineCase = {
  name: string;
  viewport: Viewport;
  session: CheckoutSession;
  displayStatus: string;
  htmlTransform?: (html: string) => string;
};

const mode = parseMode(process.argv[2]);
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baselineDir = resolve(rootDir, 'apps/web/visual-baselines/checkout');
const htmlDir = resolve(baselineDir, 'html');
const tempDir = resolve(rootDir, '.tmp/checkout-visual-baselines');
const chromePath = resolveChromePath();

const recipient: CheckoutRecipient = {
  name: 'Compte marchand',
  bank: 'Sberbank',
  accountMasked: '**** 4821'
};

const routes: readonly BuyerSafeReceivingRoute[] = [
  {
    route_id: 'route_sber_card',
    bank_profile_id: 'sber_ru',
    rail_type: 'card_transfer',
    receiver_identifier_type: 'card',
    receiver_identifier_masked: '2202 **** **** 4821',
    route_code: 'sber-card',
    display_label: 'Carte Sberbank',
    enabled: true,
    recommended: true,
    review_policy: 'manual_review_required',
    copy_action_available: true,
    buyer_status_label: 'available',
    official_bank_confirmation: false
  },
  {
    route_id: 'route_sber_phone',
    bank_profile_id: 'sber_ru',
    rail_type: 'phone_transfer',
    receiver_identifier_type: 'phone',
    receiver_identifier_masked: '+7 *** *** **67',
    route_code: 'sber-phone',
    display_label: 'Telephone Sberbank',
    enabled: true,
    recommended: false,
    review_policy: 'manual_review_required',
    copy_action_available: true,
    buyer_status_label: 'available',
    official_bank_confirmation: false
  }
];

const receiverBanks = V1ReceiverBankOptions.map((bank) => ({
  ...bank,
  available_route_count: bank.bank_profile_id === 'sber_ru' ? 2 : 0,
  rail_types: bank.bank_profile_id === 'sber_ru' ? (['card_transfer', 'phone_transfer'] as const) : ([] as const)
}));

const cases: BaselineCase[] = [
  {
    name: 'checkout_intro_mobile',
    viewport: { width: 390, height: 844, label: 'mobile' },
    session: baseSession(),
    displayStatus: 'En attente'
  },
  {
    name: 'checkout_buyer_info_mobile',
    viewport: { width: 390, height: 844, label: 'mobile' },
    session: baseSession(),
    displayStatus: 'En attente',
    htmlTransform: showBuyerIdentityPanel
  },
  {
    name: 'checkout_instructions_mobile',
    viewport: { width: 390, height: 844, label: 'mobile' },
    session: {
      ...baseSession(),
      status: 'payment_instructions_shown',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment',
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'sber_ru',
      receiver_method_type: 'card',
      sender_card_masked: '4242 **** **** 1881',
      payment_instructions_shown_at: '2026-05-12T10:00:00.000Z'
    },
    displayStatus: 'Paiement en attente'
  },
  {
    name: 'checkout_waiting_mobile',
    viewport: { width: 390, height: 844, label: 'mobile' },
    session: {
      ...baseSession(),
      status: 'buyer_claimed_paid',
      checkout_state: 'buyer_claimed_paid',
      buyer_safe_status: 'searching_signal',
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'sber_ru',
      receiver_method_type: 'card',
      buyer_claimed_paid_at: '2026-05-12T10:02:00.000Z'
    },
    displayStatus: 'Recherche du signal'
  },
  {
    name: 'checkout_instructions_desktop',
    viewport: { width: 1280, height: 900, label: 'desktop' },
    session: {
      ...baseSession(),
      status: 'payment_instructions_shown',
      checkout_state: 'payment_instructions',
      buyer_safe_status: 'awaiting_payment',
      payment_method: 'card',
      sender_bank_id: 'sber_ru',
      selected_receiver_bank_id: 'sber_ru',
      selected_receiver_bank_profile_id: 'sber_ru',
      selected_receiving_route_id: 'route_sber_card',
      selected_payer_bank_launcher_id: 'sber_ru',
      receiver_method_type: 'card',
      payment_instructions_shown_at: '2026-05-12T10:00:00.000Z'
    },
    displayStatus: 'Paiement en attente'
  }
];

mkdirSync(baselineDir, { recursive: true });
mkdirSync(htmlDir, { recursive: true });
mkdirSync(tempDir, { recursive: true });

async function run(): Promise<void> {
  const failures: string[] = [];

  for (const item of cases) {
    const html = freezeVisualMotion(item.htmlTransform?.(renderCase(item)) ?? renderCase(item));
    const htmlPath = resolve(htmlDir, `${item.name}.html`);
    const outputPath = mode === 'record'
      ? resolve(baselineDir, `${item.name}.png`)
      : resolve(tempDir, `${item.name}.png`);

    writeFileSync(htmlPath, html);
    await renderWithChrome(htmlPath, outputPath, item.viewport);

    if (mode === 'verify') {
      const baselinePath = resolve(baselineDir, `${item.name}.png`);
      if (!existsSync(baselinePath)) {
        failures.push(`${item.name}: missing baseline ${baselinePath}`);
        continue;
      }
      const expected = sha256(readFileSync(baselinePath));
      const actual = sha256(readFileSync(outputPath));
      if (expected !== actual) {
        failures.push(`${item.name}: screenshot hash mismatch expected=${expected} actual=${actual}`);
      }
    }
  }

  if (mode === 'verify') {
    await removeDirectoryWithRetry(tempDir);
  }

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log(`checkout visual ${mode} completed for ${cases.length} baselines`);
}

function parseMode(value: string | undefined): Mode {
  if (value === 'record' || value === 'verify') return value;
  throw new Error('Usage: tsx scripts/checkout-browser-baselines.ts <record|verify>');
}

function renderCase(item: BaselineCase): string {
  return renderCheckoutPage(
    item.session,
    recipient,
    receiverBanks,
    routes,
    PayerBankLauncherRegistry,
    item.displayStatus,
    { nativeBankLauncherScheme: 'swimpaymerchant' }
  );
}

function baseSession(): CheckoutSession {
  return {
    payment_session_id: 'ps_visual_01',
    order_id: 'order_visual_01',
    status: 'created',
    checkout_state: 'buyer_identity',
    buyer_safe_status: 'not_validated',
    available_payment_methods: { card: true, sbp: true },
    available_routes: [
      {
        route_id: 'route_sber_card',
        method_type: 'card',
        receiver_bank_id: 'sber_ru',
        bank_id: 'sber_ru',
        masked_value: '2202 **** **** 4821',
        certification_status: 'observed',
        status: 'active'
      },
      {
        route_id: 'route_sber_phone',
        method_type: 'sbp',
        receiver_bank_id: 'sber_ru',
        bank_id: 'sber_ru',
        masked_value: '+7 *** *** **67',
        certification_status: 'observed',
        status: 'active'
      }
    ],
    amount: { value: '299.00', currency: 'RUB' },
    display_amount: { value: '299.00', currency: 'RUB' },
    payable_amount: { value: '299.07', currency: 'RUB' },
    reconciliation_delta_minor: 7,
    reference: 'SWP-97DBEF3C',
    receiver_status: 'armed',
    expires_at: '2026-05-12T10:15:00.000Z',
    product_name: 'Abonnement SwimVPN+',
    official_bank_confirmation: false
  };
}

function showBuyerIdentityPanel(html: string): string {
  return html
    .replace('data-current-stage="intro"', 'data-current-stage="info"')
    .replace('data-active-step="1"', 'data-active-step="2"')
    .replace('checkout-progress-segment checkout-progress-pending" aria-label="Infos"', 'checkout-progress-segment checkout-progress-active" aria-label="Infos"')
    .replace('data-checkout-panel="intro" data-visual-stage="intro"', 'data-checkout-panel="intro" data-visual-stage="intro" hidden')
    .replace('data-checkout-panel="buyer-identity" hidden data-visual-stage="info"', 'data-checkout-panel="buyer-identity" data-visual-stage="info"');
}

function freezeVisualMotion(html: string): string {
  const freezeStyle = `<style data-visual-baseline-freeze>
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
      caret-color: transparent !important;
      scroll-behavior: auto !important;
    }
  </style>`;
  return html.replace('</head>', `${freezeStyle}</head>`);
}

async function renderWithChrome(htmlPath: string, outputPath: string, viewport: Viewport): Promise<void> {
  const port = await getFreePort();
  const userDataDir = resolve(tempDir, `chrome-${viewport.label}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(userDataDir, { recursive: true });
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--disable-font-subpixel-positioning',
      '--force-device-scale-factor=1',
      `--window-size=${viewport.width},${viewport.height}`,
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank'
    ],
    { stdio: 'ignore' }
  );

  try {
    const wsUrl = await waitForWebSocketUrl(port);
    const cdp = await CdpClient.connect(wsUrl);
    try {
      await cdp.send('Page.enable');
      await cdp.send('Runtime.enable');
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.label === 'mobile'
      });
      await cdp.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
      });
      const loadEvent = cdp.waitForEvent('Page.loadEventFired');
      await cdp.send('Page.navigate', { url: pathToFileURL(htmlPath).href });
      await loadEvent;
      await cdp.send('Runtime.evaluate', {
        expression: "document.fonts ? document.fonts.ready.then(() => 'ready') : 'ready'",
        awaitPromise: true
      });
      const screenshot = await cdp.send<{ data: string }>('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false
      });
      writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));
    } finally {
      cdp.close();
    }
  } finally {
    chrome.kill();
    await once(chrome, 'exit').catch(() => undefined);
    await removeDirectoryWithRetry(userDataDir);
  }
}

async function removeDirectoryWithRetry(path: string): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      rmSync(path, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EBUSY' && code !== 'ENOTEMPTY' && code !== 'EPERM') {
        throw error;
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 150 + attempt * 100));
    }
  }
  rmSync(path, { recursive: true, force: true });
}

async function getFreePort(): Promise<number> {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to allocate Chrome debugging port.');
  }
  const port = address.port;
  server.close();
  await once(server, 'close');
  return port;
}

async function waitForWebSocketUrl(port: number): Promise<string> {
  const deadline = Date.now() + 10_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await httpJson<{ webSocketDebuggerUrl: string }>(`http://127.0.0.1:${port}/json/version`);
      const payload = await httpJson<{ webSocketDebuggerUrl: string }>(`http://127.0.0.1:${port}/json/new?about:blank`, 'PUT');
      return payload.webSocketDebuggerUrl;
    } catch (error) {
      lastError = error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 120));
    }
  }
  throw new Error(`Chrome DevTools endpoint did not start: ${String(lastError)}`);
}

function httpJson<T>(url: string, method = 'GET'): Promise<T> {
  return new Promise((resolvePromise, rejectPromise) => {
    const invoke = method === 'GET' ? get : request;
    const req = invoke(url, { method }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        if ((response.statusCode ?? 500) >= 400) {
          rejectPromise(new Error(`HTTP ${response.statusCode}: ${body}`));
          return;
        }
        resolvePromise(JSON.parse(body) as T);
      });
    });
    req.on('error', rejectPromise);
    req.end();
  });
}

class CdpClient {
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }>();
  private readonly eventWaiters = new Map<string, Array<(params: unknown) => void>>();

  private constructor(private readonly ws: WebSocket) {
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as { id?: number; result?: unknown; error?: unknown; method?: string; params?: unknown };
      if (message.id !== undefined) {
        const waiter = this.pending.get(message.id);
        if (!waiter) return;
        this.pending.delete(message.id);
        if (message.error) waiter.reject(message.error);
        else waiter.resolve(message.result);
        return;
      }
      if (message.method) {
        const waiters = this.eventWaiters.get(message.method) ?? [];
        this.eventWaiters.delete(message.method);
        waiters.forEach((resolveWaiter) => resolveWaiter(message.params));
      }
    });
  }

  static async connect(url: string): Promise<CdpClient> {
    const ws = new WebSocket(url);
    await new Promise<void>((resolvePromise, rejectPromise) => {
      ws.addEventListener('open', () => resolvePromise(), { once: true });
      ws.addEventListener('error', (event) => rejectPromise(event), { once: true });
    });
    return new CdpClient(ws);
  }

  send<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise<T>((resolvePromise, rejectPromise) => {
      this.pending.set(id, {
        resolve: (value) => resolvePromise(value as T),
        reject: rejectPromise
      });
    });
  }

  waitForEvent(method: string): Promise<unknown> {
    return new Promise((resolvePromise) => {
      const waiters = this.eventWaiters.get(method) ?? [];
      waiters.push(resolvePromise);
      this.eventWaiters.set(method, waiters);
    });
  }

  close(): void {
    this.ws.close();
  }
}

await run();

function resolveChromePath(): string {
  const candidates = [
    process.env.CHROME_BIN,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].filter(Boolean) as string[];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error('Chrome or Edge executable not found. Set CHROME_BIN to enable checkout browser baselines.');
  }
  return found;
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
