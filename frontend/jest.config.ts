/** @jest-config-loader ts-node */

import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  modulePathIgnorePatterns: ['[.]next'],
  moduleNameMapper: {
    '^@ant-design/colors/es/(.*)$': '<rootDir>/node_modules/@ant-design/colors/lib/$1',
  },
  coverageDirectory: 'coverage',
};

export default createJestConfig(config);
