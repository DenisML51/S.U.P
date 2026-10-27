import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', 'apps/api/drizzle/**', 'backend/**', 'frontend/**', 'data/**', '.claude/**', 'archive/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },

  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts', '**/*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },

  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Rules systems load on demand (see packages/game-logic/src/systems). A static import of one from
  // shared code would put its whole engine and content back into the first download.
  {
    files: ['packages/game-logic/src/{rules,content,systems}/**/*.ts', 'packages/game-logic/src/index.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ regex: '/(dnd|coc)(/(?!meta$).*)?$', message: 'Rules systems load on demand: use loadRuleSystem / rulesOf.' }] }],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/screens/create/**', 'apps/web/src/screens/progression/**', 'apps/web/src/screens/coc/**', 'apps/web/src/dev/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ regex: '^@itd/game-logic/', message: 'Only the screens of a system import it; the rest use rulesOf from @itd/game-logic.' }] }],
    },
  },

  // UI components predate the linter and get their own clean-up pass with the frontend work;
  // until then their typing debt is reported, not enforced.
  {
    files: ['apps/web/src/components/**/*.{ts,tsx}', 'apps/web/src/utils/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  },
);
