import { spawnSync } from 'node:child_process';

const suites = [
  'packages/bank-templates/src/parser.test.ts',
  'packages/matching-core/src/payment-intent-gate.test.ts',
  'apps/job-worker/src/webhooks.test.ts',
  'packages/contracts/src/payment-intent.test.ts',
  'packages/contracts/src/android-receiver.test.ts'
];

const result = spawnSync('npx', ['vitest', 'run', ...suites], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

process.exit(result.status ?? 1);
