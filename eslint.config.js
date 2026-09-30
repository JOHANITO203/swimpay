import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

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
  },
  {
    // Outils de developpement lances avec Node 22 : sondes de design et skills.
    // WebSocket est global depuis Node 22, mais absent de globals.node v14.
    files: ['design/**/*.mjs', '.claude/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        WebSocket: 'readonly'
      }
    },
    rules: {
      // Chaque sonde reprend le meme gabarit : nettoyage au mieux de Chrome et
      // de son profil, attente de son demarrage. Un catch vide y est voulu ;
      // les autres blocs vides restent interdits.
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },
  {
    // Les memes outils, ecrits en CommonJS (.cjs) : require et __dirname y
    // sont l'idiome normal, pas un import a moderniser.
    files: ['design/**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        WebSocket: 'readonly'
      }
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },
  {
    // Scripts executes dans une page web (injectes par design/pivot/sondes/site.py).
    files: ['design/**/*.js'],
    languageOptions: {
      globals: globals.browser
    }
  },
  {
    // Le Worker Cloudflare du site : environnement de type service worker
    // (fetch, Request, Response, Headers).
    files: ['deploy/**/*.js'],
    languageOptions: {
      globals: globals.serviceworker
    }
  }
);
