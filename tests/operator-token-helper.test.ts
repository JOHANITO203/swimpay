import { describe, expect, test } from 'vitest';
import { verifyOperatorAuthorization } from '@swimpay/security';
import {
  buildLocalOperatorTokenSet,
  renderLocalOperatorTokenSet,
  signLocalOperatorToken
} from '../scripts/operator-token-helper.mjs';

const localSecret = 'local_signed_operator_token_secret_for_tests';

describe('local signed operator token helper', () => {
  test('generates signed owner/admin tokens accepted by signed-token admin auth', () => {
    const tokenSet = buildLocalOperatorTokenSet({
      secret: localSecret,
      requesterId: 'ops_requester',
      requesterRole: 'admin',
      approverId: 'ops_approver',
      approverRole: 'owner',
      revokerId: 'ops_revoker',
      revokerRole: 'owner'
    });

    expect(tokenSet.requester.token).toMatch(/^op_ops_requester\.admin\./u);
    expect(tokenSet.approver.token).toMatch(/^op_ops_approver\.owner\./u);
    expect(tokenSet.revoker.token).toMatch(/^op_ops_revoker\.owner\./u);
    expect(tokenSet.requester.token).not.toBe(tokenSet.approver.token);
    expect(JSON.stringify(tokenSet)).not.toContain(localSecret);

    const requester = verifyOperatorAuthorization(`Bearer ${tokenSet.requester.token}`, {
      mode: 'signed_token',
      environment: 'test',
      tokenHmacSecret: localSecret
    });
    const approver = verifyOperatorAuthorization(`Bearer ${tokenSet.approver.token}`, {
      mode: 'signed_token',
      environment: 'test',
      tokenHmacSecret: localSecret
    });

    expect(requester).toMatchObject({
      kind: 'authenticated',
      operator: { operatorId: 'ops_requester', role: 'admin' }
    });
    expect(approver).toMatchObject({
      kind: 'authenticated',
      operator: { operatorId: 'ops_approver', role: 'owner' }
    });
  });

  test('rejects unsafe local helper inputs', () => {
    expect(() =>
      signLocalOperatorToken({
        operatorId: 'ops request',
        role: 'admin',
        secret: localSecret
      })
    ).toThrow(/operator id/iu);
    expect(() =>
      signLocalOperatorToken({
        operatorId: 'ops_requester',
        role: 'operator',
        secret: 'short'
      })
    ).toThrow(/secret/iu);
  });

  test('renders a masked report without leaking usable tokens', () => {
    const tokenSet = buildLocalOperatorTokenSet({
      secret: localSecret,
      requesterId: 'ops_requester',
      approverId: 'ops_approver'
    });

    const rendered = renderLocalOperatorTokenSet(tokenSet, { masked: true });

    expect(rendered.mode).toBe('local_development_only');
    expect(rendered.requester.token).toMatch(/^op_ops_requester\.admin\.[A-Za-z0-9_-]{8}\.\.\.[A-Za-z0-9_-]{6}$/u);
    expect(rendered.approver.token).toMatch(/^op_ops_approver\.owner\.[A-Za-z0-9_-]{8}\.\.\.[A-Za-z0-9_-]{6}$/u);
    expect(JSON.stringify(rendered)).not.toContain(localSecret);
    expect(JSON.stringify(rendered)).not.toContain(tokenSet.requester.token);
    expect(rendered.safety).toEqual({
      production_use: false,
      modifies_rbac: false,
      enables_auto_confirm: false,
      processes_real_notifications: false
    });
  });
});
