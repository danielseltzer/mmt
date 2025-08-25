import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default [
  // Ignore patterns
  {
    ignores: ['dist/**', 'build/**', '**/*.d.ts']
  },

  // Base JavaScript configuration for all files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ...js.configs.recommended,
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // React hooks rules
      ...reactHooks.configs['recommended-latest'].rules,

      // React refresh rules
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Basic unused vars rule for JS files
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_'
      }],

      // React prop-types not needed
      'react/prop-types': 'off',
    },
  },

  // TypeScript-specific configuration
  {
    files: ['**/*.{ts,tsx}'],
    ...tseslint.configs.recommended[0],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript-aware unused vars rule (override the base one)
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_'
      }],
      'no-unused-vars': 'off', // Disable base rule in favor of TypeScript version

      // Allow any for now (can be tightened later)
      '@typescript-eslint/no-explicit-any': 'warn',

      // Allow empty interfaces for now
      '@typescript-eslint/no-empty-object-type': 'warn',
    },
  },

  // Configuration files (Node.js environment)
  {
    files: ['*.config.{js,ts}', 'playwright.config.ts', 'vite.config.ts', 'vitest*.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]
