import js from '@eslint/js';
import nextConfig from 'eslint-config-next';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const BACKEND_FILES = ['apps/backend/**/*.ts'];
const FRONTEND_FILES = ['apps/frontend/**/*.{ts,tsx}'];
const SCRIPT_FILES = ['**/*.{js,mjs,cjs}'];

/**
 * Flat config is matched per file, so every preset is scoped to the files it
 * belongs to. This keeps the NestJS and Next.js rule sets apart and makes sure a
 * given parser/plugin is registered once per file.
 */
function scopeTo(configs, files) {
  return configs
    .filter((config) => !(config.ignores && !config.files))
    .map((config) => ({ ...config, files: [...files] }));
}

export default [
  {
    name: 'workspace/ignores',
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/next-env.d.ts',
    ],
  },
  {
    name: 'workspace/scripts',
    files: SCRIPT_FILES,
    ...js.configs.recommended,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: { ...globals.node },
    },
  },
  ...scopeTo([js.configs.recommended], BACKEND_FILES),
  ...scopeTo(tseslint.configs.recommended, BACKEND_FILES),
  ...scopeTo([js.configs.recommended], FRONTEND_FILES),
  ...scopeTo(nextConfig, FRONTEND_FILES),
  {
    name: 'workspace/typescript',
    files: [...BACKEND_FILES, ...FRONTEND_FILES],
    rules: {
      // TypeScript already resolves identifiers and JSX globals; the core rule only
      // produces false positives here (same reason typescript-eslint disables it).
      'no-undef': 'off',
    },
  },
  {
    name: 'workspace/frontend',
    files: FRONTEND_FILES,
    rules: {
      // Pages-Router rule: it resolves a `pages/` directory that does not exist in
      // this App Router application.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  {
    name: 'workspace/configuration-boundary',
    files: [...BACKEND_FILES, ...FRONTEND_FILES],
    rules: {
      // FND-003: the environment is read at exactly one place per application and
      // consumed as typed configuration everywhere else. Violations are a lint
      // error, so "no process.env outside the configuration layer" is enforced
      // mechanically instead of by review.
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Read configuration through the configuration layer: apps/backend/src/infrastructure/config or apps/frontend/lib/env.ts.',
        },
      ],
    },
  },
  {
    name: 'workspace/configuration-boundary-exceptions',
    files: ['apps/backend/src/infrastructure/config/**/*.ts', 'apps/frontend/lib/env.ts'],
    rules: {
      'no-restricted-properties': 'off',
    },
  },
  {
    name: 'workspace/prettier',
    rules: prettierConfig.rules,
  },
];
