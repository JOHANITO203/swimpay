import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const packageAlias = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@swimpay/events': packageAlias('./packages/events/src/index.ts'),
      '@swimpay/contracts': packageAlias('./packages/contracts/src/index.ts'),
      '@swimpay/bank-templates': packageAlias('./packages/bank-templates/src/index.ts'),
      '@swimpay/matching-core': packageAlias('./packages/matching-core/src/index.ts'),
      '@swimpay/security': packageAlias('./packages/security/src/index.ts'),
      '@swimpay/observability': packageAlias('./packages/observability/src/index.ts'),
      '@swimpay/rails': packageAlias('./packages/rails/src/index.ts'),
      '@swimpay/brain': packageAlias('./packages/brain/src/index.ts')
    }
  },
  test: {
    // Les trois premiers motifs servent depuis la RACINE. Le quatrieme sert
    // depuis l'INTERIEUR d'un paquet : vitest remonte bien jusqu'a ce fichier,
    // mais garde le dossier courant comme racine — « packages/**/*.test.ts »
    // n'y matche donc rien. Sans « src/**/*.test.ts », le script `npm test`
    // de CHAQUE paquet repondait « No test files found » et sortait en 1,
    // alors que les tests existent et passent depuis la racine.
    include: [
      'tests/**/*.test.ts',
      'apps/**/*.test.ts',
      'packages/**/*.test.ts',
      'src/**/*.test.ts'
    ],
    environment: 'node'
  }
});
