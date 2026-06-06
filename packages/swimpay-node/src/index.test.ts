import { createHmac } from 'node:crypto';
import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  SwimPay,
  SwimPayApiError,
  SwimPayTimeoutError,
  SwimPayValidationError,
  SwimPayWebhookSignatureError,
  SwimPayWebhookTimestampError,
  type SwimPayPublicWebhookEvent
} from './index.js';

describe('@swimpay/node orders.create', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates an order with a safe server-side payload and idempotency header', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        checkout_url: 'https://pay.swimpay.test/checkout/ps_01',
        status: 'payment_session_created',
        expires_at: '2026-05-06T10:15:00.000Z'
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const swimpay = new SwimPay({
      secretKey: 'sk_test_server_only',
      apiBaseUrl: 'https://api.swimpay.test'
    });

    const checkout = await swimpay.orders.create(
      {
        externalOrderId: 'ORDER_1048',
        amountMinor: 139000,
        currency: 'RUB',
        description: 'VPN subscription',
        returnUrl: 'https://merchant.test/orders/1048',
        customer: {
          firstName: 'Ivan',
          lastName: 'Ivanov',
          phone: '+79991234567'
        },
        metadata: {
          product: 'vpn_monthly'
        }
      },
      {
        idempotencyKey: 'ORDER_1048'
      }
    );

    expect(checkout).toEqual({
      orderId: 'ord_01',
      paymentSessionId: 'ps_01',
      checkoutUrl: 'https://pay.swimpay.test/checkout/ps_01',
      status: 'payment_session_created',
      expiresAt: '2026-05-06T10:15:00.000Z'
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.swimpay.test/v1/orders');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer sk_test_server_only',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'ORDER_1048'
    });
    expect(JSON.parse(String(init.body))).toEqual({
      external_id: 'ORDER_1048',
      amount: {
        value: '1390.00',
        currency: 'RUB'
      },
      description: 'VPN subscription',
      return_url: 'https://merchant.test/orders/1048',
      customer: {
        first_name: 'Ivan',
        last_name: 'Ivanov',
        phone: '+79991234567'
      },
      metadata: {
        product: 'vpn_monthly'
      }
    });
    expect(String(init.body)).not.toMatch(/cvv|expiry|expiration|auto_confirm|autoConfirm|card_number|source_card/iu);
  });

  it.each([
    ['autoConfirm', { autoConfirm: true }],
    ['auto_confirm', { auto_confirm: true }],
    ['cvv', { customer: { cvv: '123' } }],
    ['expiration date', { customer: { expirationDate: '12/29' } }],
    ['source card', { sourceCardNumber: '2202123412344821' }],
    ['pan', { metadata: { pan: '2202123412344821' } }],
    ['cardPan', { metadata: { cardPan: '2202123412344821' } }],
    ['full_card', { metadata: { full_card: '2202123412344821' } }],
    ['sms_code', { metadata: { sms_code: '111111' } }],
    ['pin', { metadata: { pin: '0000' } }]
  ])('rejects dangerous create-order field %s', async (_label, dangerousFields) => {
    const swimpay = new SwimPay({ secretKey: 'sk_test' });

    await expect(
      swimpay.orders.create({
        externalOrderId: 'ORDER_1048',
        amountMinor: 139000,
        currency: 'RUB',
        ...dangerousFields
      } as Parameters<typeof swimpay.orders.create>[0])
    ).rejects.toBeInstanceOf(SwimPayValidationError);
  });

  it.each([
    ['zero amount', { amountMinor: 0, currency: 'RUB' }],
    ['fractional amount', { amountMinor: 1.5, currency: 'RUB' }],
    ['lowercase currency', { amountMinor: 100, currency: 'rub' }],
    ['non-currency', { amountMinor: 100, currency: 'RUBLE' }]
  ])('validates %s before sending a request', async (_label, patch) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const swimpay = new SwimPay({ secretKey: 'sk_test' });

    await expect(
      swimpay.orders.create({
        externalOrderId: 'ORDER_1048',
        amountMinor: patch.amountMinor,
        currency: patch.currency
      })
    ).rejects.toBeInstanceOf(SwimPayValidationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sanitizes API errors without leaking Authorization headers or secret keys', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          {
            error: {
              code: 'invalid_request',
              message: 'Invalid amount',
              details: {
                authorization: 'Bearer sk_test_secret',
                safe_field: 'kept'
              }
            }
          },
          {
            status: 400,
            headers: {
              'x-request-id': 'req_01'
            }
          }
        )
      )
    );
    const swimpay = new SwimPay({ secretKey: 'sk_test_secret', apiBaseUrl: 'https://api.swimpay.test' });

    await expect(
      swimpay.orders.create({
        externalOrderId: 'ORDER_1048',
        amountMinor: 100,
        currency: 'RUB'
      })
    ).rejects.toMatchObject({
      code: 'invalid_request',
      statusCode: 400,
      requestId: 'req_01',
      details: {
        safe_field: 'kept'
      }
    } satisfies Partial<SwimPayApiError>);
  });

  it('surfaces merchant setup readiness errors without hiding the action required', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          {
            error: {
              code: 'merchant_payment_setup_required',
              message: 'Merchant must add an active receiving method before accepting payments.',
              details: {
                merchant_setup_status: 'receiving_method_required',
                payment_ready: false,
                unavailable_reason: 'merchant_no_active_receiving_method',
                setup_actions: ['add_receiving_method']
              }
            },
            official_bank_confirmation: false
          },
          { status: 409 }
        )
      )
    );
    const swimpay = new SwimPay({ secretKey: 'sk_test_secret', apiBaseUrl: 'https://api.swimpay.test' });

    await expect(
      swimpay.orders.create({
        externalOrderId: 'ORDER_SETUP_REQUIRED',
        amountMinor: 100,
        currency: 'RUB'
      })
    ).rejects.toMatchObject({
      code: 'merchant_payment_setup_required',
      statusCode: 409,
      details: {
        merchant_setup_status: 'receiving_method_required',
        payment_ready: false,
        setup_actions: ['add_receiving_method']
      }
    } satisfies Partial<SwimPayApiError>);
  });

  it('turns aborted requests into typed timeout errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        init?.signal?.throwIfAborted();
        await new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        });
      })
    );
    const swimpay = new SwimPay({ secretKey: 'sk_test', apiBaseUrl: 'https://api.swimpay.test' });

    await expect(
      swimpay.orders.create(
        {
          externalOrderId: 'ORDER_1048',
          amountMinor: 100,
          currency: 'RUB'
        },
        { requestTimeoutMs: 1 }
      )
    ).rejects.toBeInstanceOf(SwimPayTimeoutError);
  });
});

describe('@swimpay/node webhook verification', () => {
  it('verifies a valid raw-body signature and returns a typed payment.confirmed event', () => {
    const rawBody = Buffer.from(
      JSON.stringify({
        id: 'evt_01',
        type: 'payment.confirmed',
        created_at: '2026-05-06T10:00:00.000Z',
        data: {
          external_id: 'ORDER_1048',
          order_id: 'ord_01',
          payment_session_id: 'ps_01',
          amount: {
            value: '1390.35',
            currency: 'RUB'
          },
          confirmation_type: 'notification_signal',
          official_bank_confirmation: false,
          decision: 'manual_confirmed'
        }
      })
    );
    const timestamp = new Date().toISOString();
    const signature = signWebhook('whsec_test', timestamp, rawBody);
    const swimpay = new SwimPay({ secretKey: 'sk_test' });

    const event = swimpay.webhooks.verify(rawBody, {
      'swimpay-event-id': 'evt_01',
      'swimpay-timestamp': timestamp,
      'swimpay-signature': signature
    }, 'whsec_test');

    expect(event).toEqual({
      id: 'evt_01',
      type: 'payment.confirmed',
      createdAt: '2026-05-06T10:00:00.000Z',
      data: {
        externalOrderId: 'ORDER_1048',
        orderId: 'ord_01',
        paymentSessionId: 'ps_01',
        amountMinor: 139035,
        currency: 'RUB',
        confirmationType: 'notification_signal',
        officialBankConfirmation: false,
        decision: 'manual_confirmed'
      }
    } satisfies SwimPayPublicWebhookEvent);
  });

  it('verifies a valid raw-body signature and returns a typed payment.currency_mismatch event', () => {
    const rawBody = Buffer.from(
      JSON.stringify({
        id: 'evt_cm_01',
        type: 'payment.currency_mismatch',
        created_at: '2026-06-06T10:00:00.000Z',
        data: {
          order_id: 'ord_01',
          external_id: 'ORDER_8888',
          payment_session_id: 'ps_01',
          expected_currency: 'XOF',
          signal_currency: 'RUB',
          expected_amount_minor: 1000,
          signal_amount_minor: 13700,
          matched_on: 'reference',
          official_bank_confirmation: false
        }
      })
    );
    const timestamp = new Date().toISOString();
    const signature = signWebhook('whsec_test', timestamp, rawBody);
    const swimpay = new SwimPay({ secretKey: 'sk_test' });

    const event = swimpay.webhooks.verify(rawBody, {
      'swimpay-event-id': 'evt_cm_01',
      'swimpay-timestamp': timestamp,
      'swimpay-signature': signature
    }, 'whsec_test');

    expect(event).toEqual({
      id: 'evt_cm_01',
      type: 'payment.currency_mismatch',
      createdAt: '2026-06-06T10:00:00.000Z',
      data: {
        orderId: 'ord_01',
        externalOrderId: 'ORDER_8888',
        paymentSessionId: 'ps_01',
        expectedCurrency: 'XOF',
        signalCurrency: 'RUB',
        expectedAmountMinor: 1000,
        signalAmountMinor: 13700,
        matchedOn: 'reference',
        officialBankConfirmation: false
      }
    } satisfies SwimPayPublicWebhookEvent);
  });

  it.each([
    ['payment.rejected', 'manual_rejected'],
    ['payment.expired', 'expired']
  ] as const)('parses %s as a safe public webhook event', (type, decision) => {
    const event = SwimPay.parseWebhookEvent({
      id: 'evt_01',
      type,
      created_at: '2026-05-06T10:00:00.000Z',
      data: {
        order_id: 'ord_01',
        payment_session_id: 'ps_01',
        amount_minor: 100,
        currency: 'RUB',
        official_bank_confirmation: false,
        decision
      }
    });

    expect(event.type).toBe(type);
    expect(event.data.officialBankConfirmation).toBe(false);
    expect(JSON.stringify(event)).not.toMatch(/raw|notification_text|card_number|source_card|buyer_source_card|phone_raw/iu);
  });

  it.each([
    ['missing signature', {}],
    ['invalid signature', { 'SwimPay-Signature': 'sha256=bad' }]
  ])('rejects %s', (_label, headers) => {
    const swimpay = new SwimPay({ secretKey: 'sk_test' });
    const rawBody = Buffer.from(JSON.stringify(validPublicPayload()));
    const timestamp = new Date().toISOString();

    expect(() =>
      swimpay.webhooks.verify(rawBody, {
        'SwimPay-Event-Id': 'evt_01',
        'SwimPay-Timestamp': timestamp,
        ...headers
      }, 'whsec_test')
    ).toThrow(SwimPayWebhookSignatureError);
  });

  it('rejects stale timestamps', () => {
    const swimpay = new SwimPay({ secretKey: 'sk_test' });
    const rawBody = Buffer.from(JSON.stringify(validPublicPayload()));
    const timestamp = '2020-01-01T00:00:00.000Z';
    const signature = signWebhook('whsec_test', timestamp, rawBody);

    expect(() =>
      swimpay.webhooks.verify(rawBody, {
        'SwimPay-Event-Id': 'evt_01',
        'SwimPay-Timestamp': timestamp,
        'SwimPay-Signature': signature
      }, 'whsec_test')
    ).toThrow(SwimPayWebhookTimestampError);
  });

  it.each(['payment.signal_detected', 'payment.needs_review', 'payment.unknown'])(
    'rejects non-public fulfillment event %s',
    (type) => {
      expect(() =>
        SwimPay.parseWebhookEvent({
          id: 'evt_01',
          type,
          created_at: '2026-05-06T10:00:00.000Z',
          data: {
            order_id: 'ord_01',
            payment_session_id: 'ps_01',
            amount_minor: 100,
            currency: 'RUB',
            official_bank_confirmation: false
          }
        })
      ).toThrow(SwimPayValidationError);
    }
  );

  it('rejects public webhook events that claim official bank confirmation', () => {
    expect(() =>
      SwimPay.parseWebhookEvent({
        ...validPublicPayload(),
        data: {
          ...validPublicPayload().data,
          official_bank_confirmation: true
        }
      })
    ).toThrow(SwimPayValidationError);
  });

  it.each(['pan', 'cardPan', 'full_card', 'sms_code', 'pin'] as const)(
    'rejects public webhook events that expose unsafe field %s',
    (field) => {
      expect(() =>
        SwimPay.parseWebhookEvent({
          ...validPublicPayload(),
          data: {
            ...validPublicPayload().data,
            [field]: field === 'sms_code' ? '111111' : '2202123412344821'
          }
        })
      ).toThrow(SwimPayValidationError);
    }
  );
});

function signWebhook(secret: string, timestamp: string, rawBody: Buffer): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex')}`;
}

function validPublicPayload() {
  return {
    id: 'evt_01',
    type: 'payment.confirmed',
    created_at: '2026-05-06T10:00:00.000Z',
    data: {
      order_id: 'ord_01',
      payment_session_id: 'ps_01',
      amount_minor: 100,
      currency: 'RUB',
      confirmation_type: 'notification_signal',
      official_bank_confirmation: false,
      decision: 'manual_confirmed'
    }
  };
}
