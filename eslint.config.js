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
      'apps/android-receiver/android/app/build/**',
      'swimpay_bank_templates_pack/**',
      'tools/apk-discovery/input/**',
      'tools/apk-discovery/output/**',
      'tools/apk-discovery/reports/**'
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
