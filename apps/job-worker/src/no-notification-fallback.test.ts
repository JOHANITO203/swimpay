import { describe, expect, it } from 'vitest';
import {
  NoNotificationFallbackPollingLoop,
  parseNoNotificationFallbackConfig,
  type NoNotificationFallbackProcessor
} from './no-notification-fallback.js';

describe('no-notification fallback worker', () => {
  it('keeps the fallback disabled unless explicitly enabled', () => {
    expect(parseNoNotificationFallbackConfig({})).toEqual({
      enabled: false,
      pollIntervalMs: 30_000,
      batchSize: 25,
      minimumElapsedSeconds: 120
    });
  });

  it('schedules due manual-check scans after receiver_armed without confirming or emitting webhooks', async () => {
    const processor = new FakeNoNotificationFallbackProcessor();
    const loop = new NoNotificationFallbackPollingLoop({
      processor,
      config: {
        enabled: true,
        pollIntervalMs: 30_000,
        batchSize: 7,
        minimumElapsedSeconds: 120
      },
      now: () => '2026-05-02T10:02:00.000Z'
    });

    await loop.runOnce();

    expect(processor.calls).toEqual([
      {
        now: '2026-05-02T10:02:00.000Z',
        limit: 7,
        minimumElapsedSeconds: 120
      }
    ]);
    expect(processor.publicWebhookEvents).toEqual([]);
    expect(processor.confirmedPayments).toBe(0);
  });

  it('does not scan when disabled', async () => {
    const processor = new FakeNoNotificationFallbackProcessor();
    const loop = new NoNotificationFallbackPollingLoop({
      processor,
      config: {
        enabled: false,
        pollIntervalMs: 30_000,
        batchSize: 7,
        minimumElapsedSeconds: 120
      },
      now: () => '2026-05-02T10:02:00.000Z'
    });

    await loop.runOnce();

    expect(processor.calls).toEqual([]);
  });
});

class FakeNoNotificationFallbackProcessor implements NoNotificationFallbackProcessor {
  public readonly calls: Array<{ now: string; limit: number; minimumElapsedSeconds: number }> = [];
  public readonly publicWebhookEvents: string[] = [];
  public confirmedPayments = 0;

  public async processDueManualChecks(now: string, limit: number, minimumElapsedSeconds: number) {
    this.calls.push({ now, limit, minimumElapsedSeconds });
    return { requested: 1, skipped: 0 };
  }
}
