import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.turbo/**',
      'build/**',
      '**/*.d.ts',
      'packages/*/dist/**',
      'apps/*/dist/**',
      'scripts/*.mjs',
      'scripts/*.js',
      'tools/*.js',
      '*.config.js',
      '*.config.mjs',
      '*.config.cjs'
    ]
  },
  
  // Base configuration for all files
  js.configs.recommended,
  
  // TypeScript configuration
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  
  // Language options
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      }
    }
  },
  
  // Custom rules for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true
      }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/strict-boolean-expressions': ['error', {
        allowNullableObject: true,
        allowNullableBoolean: true,
        allowNullableString: true,
        allowNullableNumber: true,
        allowAny: false
      }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase']
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase']
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow'
        },
        {
          selector: 'typeLike',
          format: ['PascalCase']
        },
        {
          selector: 'enumMember',
          format: ['PascalCase']
        },
        {
          selector: 'property',
          format: null
        }
      ],
      '@typescript-eslint/no-shadow': 'error',
      
      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-implicit-coercion': 'error',
      'no-implicit-globals': 'error',
      'no-invalid-this': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-loop-func': 'error',
      'no-new': 'error',
      'no-new-func': 'error',
      'no-new-wrappers': 'error',
      'no-return-assign': 'error',
      '@typescript-eslint/return-await': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'no-void': 'error',
      'no-with': 'error',
      'prefer-promise-reject-errors': 'error',
      'radix': 'error',
      'wrap-iife': ['error', 'inside'],
      'yoda': 'error',
      'no-label-var': 'error',
      'no-undef-init': 'error',
      'array-callback-return': 'error',
      'block-scoped-var': 'error',
      'consistent-return': 'error',
      'curly': ['error', 'all'],
      'default-case': 'error',
      'default-case-last': 'error',
      'default-param-last': 'error',
      'dot-notation': 'error',
      'eqeqeq': ['error', 'always'],
      'grouped-accessor-pairs': 'error',
      'guard-for-in': 'error',
      'no-alert': 'error',
      'no-caller': 'error',
      'no-constructor-return': 'error',
      'no-div-regex': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-empty-function': 'error',
      'no-eq-null': 'error',
      'no-extra-label': 'error',
      'no-param-reassign': 'error',
      'no-proto': 'error',
      'no-restricted-properties': 'error',
      'no-script-url': 'error',
      'no-multi-spaces': 'error',
      'no-multi-str': 'error',
      'no-new-object': 'error',
      'no-octal-escape': 'error',
      'no-redeclare': 'error',
      'no-regex-spaces': 'error',
      'no-template-curly-in-string': 'error',
      'no-useless-backreference': 'error',
      'prefer-const': 'error',
      'prefer-destructuring': ['error', {
        array: true,
        object: true
      }],
      'prefer-numeric-literals': 'error',
      'prefer-object-spread': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'require-unicode-regexp': 'error'
    }
  },
  
  // Test file overrides
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off'
    }
  },
  
  // JavaScript file overrides
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off'
    }
  },
  
  // Node.js environment for packages
  {
    files: ['packages/**/*.js', 'packages/**/*.ts', 'apps/api-server/**/*.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        module: 'writable',
        require: 'readonly',
        global: 'readonly'
      }
    }
  }
);