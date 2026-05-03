#!/usr/bin/env node

import { createHmac } from 'node:crypto';

const allowedRoles = new Set(['owner', 'admin', 'operator', 'support', 'read_only']);
const defaultRequesterId = 'ops_requester';
const defaultApproverId = 'ops_approver';
const defaultRevokerId = 'ops_revoker';
const localDevSecretFallback = 'change_me_only_for_signed_admin_tokens';

export function signLocalOperatorToken(input) {
  const operatorId = validateOperatorId(input.operatorId);
  const role = validateRole(input.role);
  const secret = validateSecret(input.secret);
  const signature = createHmac('sha256', secret).update(`${operatorId}.${role}`).digest('base64url');
  return `op_${operatorId}.${role}.${signature}`;
}

export function buildLocalOperatorTokenSet(input) {
  const secret = validateSecret(input.secret);
  const requesterRole = input.requesterRole ?? 'admin';
  const approverRole = input.approverRole ?? 'owner';
  const revokerRole = input.revokerRole ?? approverRole;

  return {
    mode: 'local_development_only',
    requester: {
      operator_id: validateOperatorId(input.requesterId ?? defaultRequesterId),
      role: validateRole(requesterRole),
      token: signLocalOperatorToken({
        operatorId: input.requesterId ?? defaultRequesterId,
        role: requesterRole,
        secret
      })
    },
    approver: {
      operator_id: validateOperatorId(input.approverId ?? defaultApproverId),
      role: validateRole(approverRole),
      token: signLocalOperatorToken({
        operatorId: input.approverId ?? defaultApproverId,
        role: approverRole,
        secret
      })
    },
    revoker: {
      operator_id: validateOperatorId(input.revokerId ?? defaultRevokerId),
      role: validateRole(revokerRole),
      token: signLocalOperatorToken({
        operatorId: input.revokerId ?? defaultRevokerId,
        role: revokerRole,
        secret
      })
    },
    safety: {
      production_use: false,
      modifies_rbac: false,
      enables_auto_confirm: false,
      processes_real_notifications: false
    }
  };
}

export function renderLocalOperatorTokenSet(tokenSet, options = {}) {
  const masked = options.masked === true;
  return {
    ...tokenSet,
    requester: renderTokenEntry(tokenSet.requester, masked),
    approver: renderTokenEntry(tokenSet.approver, masked),
    revoker: renderTokenEntry(tokenSet.revoker, masked),
    usage: {
      auth_mode: 'signed_token',
      base_url: process.env.SWIMPAY_BASE_URL ?? 'http://localhost:8080',
      handoff_command:
        'set SWIMPAY_REQUESTER_TOKEN and SWIMPAY_APPROVER_TOKEN, then run npm run handoff:evidence-trust with an explicit local evidence id'
    }
  };
}

function renderTokenEntry(entry, masked) {
  return {
    ...entry,
    token: masked ? maskOperatorToken(entry.token) : entry.token
  };
}

function maskOperatorToken(token) {
  const match = token.match(/^(op_[A-Za-z0-9_-]+\.[a-z_]+\.)([A-Za-z0-9_-]+)$/u);
  if (!match) {
    return '<INVALID_OPERATOR_TOKEN>';
  }

  const [, prefix, signature] = match;
  return `${prefix}${signature.slice(0, 8)}...${signature.slice(-6)}`;
}

function validateOperatorId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{3,64}$/u.test(value)) {
    throw new Error('operator id must be 3-64 characters and contain only letters, numbers, underscore or dash');
  }

  return value;
}

function validateRole(value) {
  if (typeof value !== 'string' || !allowedRoles.has(value)) {
    throw new Error(`operator role must be one of: ${Array.from(allowedRoles).join(', ')}`);
  }

  return value;
}

function validateSecret(value) {
  if (typeof value !== 'string' || value.length < 16) {
    throw new Error('operator token HMAC secret must be at least 16 characters for local rehearsal');
  }

  return value;
}

function readArgValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function main() {
  const args = process.argv.slice(2);
  const secret = readArgValue(args, '--secret') ?? process.env.ADMIN_TOKEN_HMAC_SECRET ?? localDevSecretFallback;
  const tokenSet = buildLocalOperatorTokenSet({
    secret,
    requesterId: readArgValue(args, '--requester-id') ?? process.env.SWIMPAY_REQUESTER_OPERATOR_ID ?? defaultRequesterId,
    requesterRole: readArgValue(args, '--requester-role') ?? process.env.SWIMPAY_REQUESTER_ROLE ?? 'admin',
    approverId: readArgValue(args, '--approver-id') ?? process.env.SWIMPAY_APPROVER_OPERATOR_ID ?? defaultApproverId,
    approverRole: readArgValue(args, '--approver-role') ?? process.env.SWIMPAY_APPROVER_ROLE ?? 'owner',
    revokerId: readArgValue(args, '--revoker-id') ?? process.env.SWIMPAY_REVOKER_OPERATOR_ID ?? defaultRevokerId,
    revokerRole: readArgValue(args, '--revoker-role') ?? process.env.SWIMPAY_REVOKER_ROLE ?? process.env.SWIMPAY_APPROVER_ROLE ?? 'owner'
  });

  const rendered = renderLocalOperatorTokenSet(tokenSet, {
    masked: args.includes('--masked')
  });
  console.log(JSON.stringify(rendered, null, 2));
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}` || process.argv[1]?.endsWith('operator-token-helper.mjs')) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
