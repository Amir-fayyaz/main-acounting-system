import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  moduleNameMapper: {
    '^@accounting-saas/ddd-core$': '<rootDir>/../packages/ddd-core/src/index.ts',
    '^@app/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@infra/(.*)$': '<rootDir>/src/infrastructure/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.module.ts', '!src/**/index.ts'],
  coverageDirectory: './coverage',
};

export default config;
