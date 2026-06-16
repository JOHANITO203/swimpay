import { describe, expect, it } from 'vitest';
import {
  applyTransition,
  canTransition,
  channelFor,
  createOrder,
  IllegalTransitionError,
  isTerminal,
  OrderError,
  stateAfterFunded,
  type Beneficiary,
  type CreateOrderInput,
} from './payment-order.js';

const beneficiary: Beneficiary = { id: 'b1', method: 'mobile_money', shareBps: 10_000 };

function baseInput(overrides: Partial<CreateOrderInput> = {}): CreateOrderInput {
  return {
    id: 'order1',
    idempotencyKey: 'order1',
    createdAt: '2026-06-16T10:00:00.000Z',
    payer: { id: 'agent1', type: 'agent_ai' },
    amountInMinor: 10_000,
    currencyIn: 'USD',
    currencyOut: 'XOF',
    beneficiaries: [beneficiary],
    ...overrides,
  };
}

describe('createOrder', () => {
  it('creates a QUOTED order and derives the bridge channel for cross-currency', () => {
    const o = createOrder(baseInput());
    expect(o.state).toBe('QUOTED');
    expect(o.channel).toBe('bridge');
    expect(o.currencyIn).toBe('USD');
  });

  it('derives the direct channel for same-currency', () => {
    expect(channelFor('XOF', 'XOF')).toBe('direct');
    expect(createOrder(baseInput({ currencyIn: 'XOF', currencyOut: 'XOF' })).channel).toBe('direct');
  });

  it('rejects a non-positive amount', () => {
    expect(() => createOrder(baseInput({ amountInMinor: 0 }))).toThrow(OrderError);
  });

  it('rejects an order with no beneficiaries', () => {
    expect(() => createOrder(baseInput({ beneficiaries: [] }))).toThrow(OrderError);
  });

  it('rejects a beneficiary with both or neither share specifier', () => {
    expect(() => createOrder(baseInput({ beneficiaries: [{ id: 'b', method: 'bank', shareBps: 5000, fixedMinor: 1 }] }))).toThrow(OrderError);
    expect(() => createOrder(baseInput({ beneficiaries: [{ id: 'b', method: 'bank' }] }))).toThrow(OrderError);
  });

  it('payer type does not change the order shape (human, agent, peer are equal)', () => {
    const human = createOrder(baseInput({ payer: { id: 'p', type: 'human' } }));
    const agent = createOrder(baseInput({ payer: { id: 'p', type: 'agent_ai' } }));
    expect({ ...human, payer: null }).toEqual({ ...agent, payer: null });
  });
});

describe('state machine', () => {
  it('allows legal transitions and rejects illegal ones', () => {
    expect(canTransition('QUOTED', 'AUTHORIZED')).toBe(true);
    expect(canTransition('QUOTED', 'SETTLED')).toBe(false);
    expect(canTransition('RELEASING', 'SETTLED')).toBe(true);
  });

  it('applyTransition advances state or throws on an illegal move', () => {
    const o = createOrder(baseInput());
    const authorized = applyTransition(o, 'AUTHORIZED');
    expect(authorized.state).toBe('AUTHORIZED');
    expect(o.state).toBe('QUOTED'); // original is immutable
    expect(() => applyTransition(o, 'RECONCILED')).toThrow(IllegalTransitionError);
  });

  it('treats RECONCILED and other terminals as final', () => {
    expect(isTerminal('RECONCILED')).toBe(true);
    expect(isTerminal('REFUNDED')).toBe(true);
    expect(isTerminal('FUNDED')).toBe(false);
    const reconciled = { ...createOrder(baseInput()), state: 'RECONCILED' as const };
    expect(() => applyTransition(reconciled, 'SETTLED')).toThrow(IllegalTransitionError);
  });

  it('routes FUNDED → HELD when a release condition exists, else → RELEASING', () => {
    const withCond = createOrder(baseInput({ rules: { releaseCondition: 'delivery_confirmed' } }));
    const without = createOrder(baseInput());
    expect(stateAfterFunded(withCond)).toBe('HELD');
    expect(stateAfterFunded(without)).toBe('RELEASING');
  });

  it('walks the full happy path QUOTED → … → RECONCILED', () => {
    let o = createOrder(baseInput({ rules: { releaseCondition: 'delivery_confirmed' } }));
    for (const next of ['AUTHORIZED', 'FUNDED', 'HELD', 'RELEASING', 'SETTLED', 'RECONCILED'] as const) {
      o = applyTransition(o, next);
    }
    expect(o.state).toBe('RECONCILED');
  });

  it('walks the refund path HELD → REFUNDING → REFUNDED', () => {
    let o = createOrder(baseInput({ rules: { releaseCondition: 'delivery_confirmed' } }));
    for (const next of ['AUTHORIZED', 'FUNDED', 'HELD', 'REFUNDING', 'REFUNDED'] as const) {
      o = applyTransition(o, next);
    }
    expect(o.state).toBe('REFUNDED');
  });
});
