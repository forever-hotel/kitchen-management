module.exports = {
  root: true,

  parser: '@typescript-eslint/parser',

  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },

  plugins: ['@typescript-eslint'],

  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],

  env: {
    node: true,
    es2022: true,
  },

  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
      node: true,
    },
  },

  ignorePatterns: [
    'dist/',
    'coverage/',
    'node_modules/',
  ],

  rules: {
  /*
   * TypeScript resolves project modules without requiring the
   * `.ts` extension in import statements.
   */
  'import/extensions': [
    'error',
    'ignorePackages',
    {
      js: 'never',
      ts: 'never',
    },
  ],

  /*
   * NestJS modules, controllers, providers, and services
   * commonly use named exports.
   */
  'import/prefer-default-export': 'off',

  /*
   * Disable JavaScript implementations in favor of the
   * TypeScript-aware rules.
   */
  'no-use-before-define': 'off',
  '@typescript-eslint/no-use-before-define': 'error',

  /*
   * NestJS commonly uses constructor parameter properties for
   * dependency injection.
   */
  'no-useless-constructor': 'off',
  '@typescript-eslint/no-useless-constructor': 'error',

  'no-empty-function': 'off',
  '@typescript-eslint/no-empty-function': 'error',

  /*
   * NestJS classes may contain framework methods that do not
   * directly reference `this`.
   */
  'class-methods-use-this': 'off',
  },

  overrides: [
    {
      files: ['**/*.spec.ts', 'test/**/*.ts'],
      rules: {
        /*
         * Test-only packages are correctly stored in devDependencies.
         */
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
};