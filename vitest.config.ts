import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const packageAlias = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@swimpay/events': packageAlias('./packages/events/src/index.ts'),
      '@swimpay/contracts': packageAlias('./packages/contracts/src/index.ts'),
      '@swimpay/bank-templates': packageAlias('./packages/bank-templates/src/index.ts'),
      '@swimpay/security': packageAlias('./packages/security/src/index.ts'),
      '@swimpay/observability': packageAlias('./packages/observability/src/index.ts')
    }
  },
  test: {
    include: ['tests/**/*.test.ts', 'apps/**/*.test.ts', 'packages/**/*.test.ts'],
    environment: 'node'
  }
});
