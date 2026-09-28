import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/**/*.spec.ts', '<rootDir>/**/*.spec.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'features/**/*.{ts,tsx}',
    'lib/**/*.ts',
    'shared/**/*.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
  ],
  clearMocks: true,
};

export default createJestConfig(config);
