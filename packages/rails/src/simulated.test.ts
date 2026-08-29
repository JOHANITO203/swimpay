import { describe, expect, it } from 'vitest';
import { SimulatedRail } from './simulated.js';
import { RailRejectedError, RailUnavailableError } from './types.js';

const horloge = () => new Date('2026-08-29T10:00:00.000Z');

const rail = () => new SimulatedRail({ now: horloge });

describe('SimulatedRail — ce qu un rail doit garantir', () => {
  it('rejoue la meme cle d idempotence sans creer une seconde operation', async () => {
    const r = rail();
    const a = await r.createPayin({
      amountMinor: 50_000,
      reference: 'VTE-1',
      idempotencyKey: 'k-1',
    });
    const b = await r.createPayin({
      amountMinor: 50_000,
      reference: 'VTE-1',
      idempotencyKey: 'k-1',
    });
    expect(b.railRef).toBe(a.railRef);
  });

  it('ne verse jamais deux fois sur la meme cle, meme apres un timeout reseau', async () => {
    const r = rail();
    const premier = await r.createPayout({
      amountMinor: 120_000,
      destination: { kind: 'msisdn', value: '+2250707123456', operator: 'orange-money-ci' },
      idempotencyKey: 'paie-aout-employe-7',
    });
    // Le client a cru a un echec et rejoue. C'est le cas nominal, pas l'exception.
    const rejeu = await r.createPayout({
      amountMinor: 120_000,
      destination: { kind: 'msisdn', value: '+2250707123456', operator: 'orange-money-ci' },
      idempotencyKey: 'paie-aout-employe-7',
    });
    expect(rejeu.railRef).toBe(premier.railRef);
  });

  it('refuse proprement quand le rail est en panne, sans exploser', async () => {
    const r = rail();
    r.setDown(true);
    await expect(
      r.createPayin({ amountMinor: 1_000, reference: 'VTE-2', idempotencyKey: 'k-2' }),
    ).rejects.toBeInstanceOf(RailUnavailableError);
  });

  it('refuse une demande invalide sans la mettre en attente', async () => {
    const r = rail();
    await expect(
      r.createPayin({ amountMinor: 0, reference: 'VTE-3', idempotencyKey: 'k-3' }),
    ).rejects.toBeInstanceOf(RailRejectedError);
    await expect(
      r.createPayout({
        amountMinor: 1_000,
        destination: { kind: 'msisdn', value: '' },
        idempotencyKey: 'k-4',
      }),
    ).rejects.toBeInstanceOf(RailRejectedError);
  });

  it('donne la meme cle de dedup a deux livraisons du meme evenement', async () => {
    const r = rail();
    const { railRef } = await r.createPayin({
      amountMinor: 50_000,
      reference: 'VTE-4',
      idempotencyKey: 'k-5',
    });
    const un = r.verifyWebhook({ 'x-sim-signature': 'sim' }, r.webhookFor(railRef, { attempt: 1 }));
    const deux = r.verifyWebhook({ 'x-sim-signature': 'sim' }, r.webhookFor(railRef, { attempt: 4 }));
    expect(un.valid).toBe(true);
    expect(deux.valid).toBe(true);
    expect(deux.event?.dedupeKey).toBe(un.event?.dedupeKey);
  });

  it('rejette un webhook non signe', () => {
    const r = rail();
    expect(r.verifyWebhook({}, { rail_ref: 'sim-in-000001' }).valid).toBe(false);
  });

  it('laisse un timeout en attente, car l operation est peut-etre passee', async () => {
    const r = rail();
    r.program('VTE-5', { outcome: 'timeout' });
    const { railRef } = await r.createPayin({
      amountMinor: 30_000,
      reference: 'VTE-5',
      idempotencyKey: 'k-6',
    });
    expect(await r.getStatus(railRef)).toBe('pending');
  });

  it('sait perdre la reference et regler un autre montant, comme un vrai rail', async () => {
    const r = rail();
    r.program('VTE-6', { dropReference: true, settledAmountMinor: 49_750 });
    const { railRef } = await r.createPayin({
      amountMinor: 50_000,
      reference: 'VTE-6',
      idempotencyKey: 'k-7',
    });
    const v = r.verifyWebhook({ 'x-sim-signature': 'sim' }, r.webhookFor(railRef));
    expect(v.event?.reference).toBeUndefined();
    expect(v.event?.amountMinor).toBe(49_750);
  });
});
