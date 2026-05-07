import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EventTypes } from '@swimpay/events';
import { OrderStatuses, PaymentSessionStatuses } from '@swimpay/contracts';
import { TemplateStatuses, BankTemplateReasonCodes } from '@swimpay/bank-templates';

const root = process.cwd();

describe('foundation packages', () => {
  test('defines required event constants', () => {
    expect(EventTypes.ORDER_CREATED).toBe('order.created');
    expect(EventTypes.SIGNAL_RECEIVED).toBe('signal.received');
    expect(EventTypes.DECISION_NEEDS_REVIEW).toBe('decision.needs_review');
    expect(EventTypes).not.toHaveProperty('DECISION_AUTO_CONFIRMED');
    expect(EventTypes.WEBHOOK_FAILED).toBe('webhook.failed');
  });

  test('defines order and payment session statuses from the docs', () => {
    expect(OrderStatuses).toContain('created');
    expect(OrderStatuses).not.toContain('auto_confirmed');
    expect(OrderStatuses).toContain('fulfilled');
    expect(PaymentSessionStatuses).toContain('receiver_armed');
    expect(PaymentSessionStatuses).toContain('needs_review');
  });

  test('imports bank template package stubs', () => {
    expect(TemplateStatuses).toContain('learning');
    expect(BankTemplateReasonCodes.TEMPLATE_MATCHED).toBe('template_matched');
  });

  test('database migration exists and enforces critical privacy and uniqueness constraints', () => {
    const migrationPath = join(root, 'packages/database/migrations/001_initial_schema.sql');
    expect(existsSync(migrationPath)).toBe(true);

    const migration = readFileSync(migrationPath, 'utf8');
    expect(migration).toContain('UNIQUE (event_id)');
    expect(migration).toContain('UNIQUE (notification_hash)');
    expect(migration).toContain('CREATE UNIQUE INDEX unique_confirmed_order');
    expect(migration).toContain('key_hash TEXT NOT NULL UNIQUE');
    expect(migration).not.toContain('raw_notification_text');
    expect(migration).not.toContain('phone_raw');
  });
});
