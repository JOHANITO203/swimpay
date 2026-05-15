import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.gradle/**',
      '.external-skills/**',
      'apps/android-receiver/android/app/build/**',
      'swimpay_bank_templates_pack/**'
    ]
  },
  {
    files: ['**/*.ts']
  },
  {
    files: ['scripts/**/*.mjs', 'examples/**/*.mjs'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        console: 'readonly',
        process: 'readonly'
      }
    }
  }
);
