// Minimal ESLint flat config. Note: typescript-eslint is not included because
// it does not yet support TypeScript 7; we add it back when support lands.
// Run with: npm run lint
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', '.ssr', 'node_modules', 'supabase/functions/_vendor', 'public', 'supabase/functions/**/*.ts'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser, sourceType: 'module' },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // Supabase Edge Functions — Deno environment, no DOM globals
  {
    files: ['supabase/functions/**/*.ts'],
    languageOptions: { globals: { ...globals.deno, ...globals.es2022 } },
  },
];
