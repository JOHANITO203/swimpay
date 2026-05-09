import { describe, expect, it } from 'vitest';
import { InMemoryWorkerIdempotencyLedger, runWithWorkerIdempotency } from './idempotency-ledger.js';

const now = '2026-05-02T10:00:00.000Z';

describe('worker idempotency ledger', () => {
  it('claims once and skips duplicate processing attempts', async () => {
    const ledger = new InMemoryWorkerIdempotencyLedger();
    let sideEffects = 0;

    const first = await runWithWorkerIdempotency(
      ledger,
      {
        serviceName: 'swimpay-job-worker',
        idempotencyKey: 'webhook_delivery:del_01:attempt:1',
        eventType: 'payment.confirmed',
        eventId: 'evt_01',
        now
      },
      async () => {
        sideEffects += 1;
        return 'delivered' as const;
      }
    );
    const duplicate = await runWithWorkerIdempotency(
      ledger,
      {
        serviceName: 'swimpay-job-worker',
        idempotencyKey: 'webhook_delivery:del_01:attempt:1',
        eventType: 'payment.confirmed',
        eventId: 'evt_01',
        now
      },
      async () => {
        sideEffects += 1;
        return 'delivered' as const;
      }
    );

    expect(first).toEqual({ kind: 'processed', value: 'delivered' });
    expect(duplicate).toEqual({ kind: 'skipped' });
    expect(sideEffects).toBe(1);
  });

  it('lets stale processing claims be reclaimed before side effects run again', async () => {
    const ledger = new InMemoryWorkerIdempotencyLedger({ staleAfterMs: 60_000 });

    await ledger.claim({
      serviceName: 'swimpay-job-worker',
      idempotencyKey: 'no_notification_manual_check:ps_01',
      eventType: 'no_notification_manual_check_requested',
      eventId: 'ps_01',
      now
    });

    const freshDuplicate = await ledger.claim({
      serviceName: 'swimpay-job-worker',
      idempotencyKey: 'no_notification_manual_check:ps_01',
      eventType: 'no_notification_manual_check_requested',
      eventId: 'ps_01',
      now: '2026-05-02T10:00:30.000Z'
    });
    const staleRetry = await ledger.claim({
      serviceName: 'swimpay-job-worker',
      idempotencyKey: 'no_notification_manual_check:ps_01',
      eventType: 'no_notification_manual_check_requested',
      eventId: 'ps_01',
      now: '2026-05-02T10:02:00.000Z'
    });

    expect(freshDuplicate.kind).toBe('duplicate');
    expect(staleRetry.kind).toBe('claimed');
  });
});
