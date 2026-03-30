import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'unit-integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/__tests__/unit/**/*.test.ts',
        '<rootDir>/__tests__/integration/**/*.test.ts',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
      },
    },
    {
      displayName: 'components',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/__tests__/component/**/*.test.tsx'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|scss)$': '<rootDir>/__mocks__/fileMock.ts',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    },
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/app/layout.tsx',
    '!src/app/page.tsx',
    '!src/config/env.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
  },
};

export default config;
