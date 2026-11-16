import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  /*
   * Next.js recommended rules for React, React Hooks,
   * accessibility, imports, and Core Web Vitals.
   */
  ...nextVitals,

  /*
   * TypeScript-specific rules supplied by Next.js.
   */
  ...nextTs,

  /*
   * Airbnb-style conventions that are compatible with
   * the current Next.js 16 / ESLint 9 flat-config stack.
   */
  {
    files: ['**/*.{js,jsx,ts,tsx}'],

    rules: {
      /*
       * Require strict equality comparisons.
       */
      eqeqeq: ['error', 'always'],

      /*
       * Require braces around control-flow blocks.
       */
      curly: ['error', 'all'],

      /*
       * Prefer modern JavaScript declarations.
       */
      'no-var': 'error',
      'prefer-const': 'error',

      /*
       * Prefer concise object syntax.
       */
      'object-shorthand': ['error', 'always'],

      /*
       * Prefer template literals instead of unnecessary
       * string concatenation.
       */
      'prefer-template': 'error',

      /*
       * Prefer concise arrow functions when the body only
       * returns a single expression.
       */
      'arrow-body-style': ['error', 'as-needed'],

      /*
       * Next.js with modern React does not require importing
       * React only to use JSX.
       */
      'react/react-in-jsx-scope': 'off',

      /*
       * Allow JSX in TypeScript React files.
       */
      'react/jsx-filename-extension': [
        'error',
        {
          extensions: ['.jsx', '.tsx'],
        },
      ],

      /*
       * Use function declarations for named React components,
       * following the project's Airbnb-style convention.
       */
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'function-declaration',
          unnamedComponents: 'arrow-function',
        },
      ],

      /*
       * Next.js and TypeScript projects commonly use named exports.
       */
      'import/prefer-default-export': 'off',
    },
  },

  /*
   * Keep Prettier last so ESLint formatting rules do not
   * conflict with Prettier.
   */
  prettier,

  /*
   * Ignore generated Next.js/build files.
   */
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;