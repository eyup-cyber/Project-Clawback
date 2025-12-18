/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  maxWorkers: 2, // Limit workers to prevent heap exhaustion
  workerIdleMemoryLimit: '512MB', // Force worker restart when memory exceeds limit
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
        isolatedModules: true, // Faster compilation, less memory
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(parse5|isomorphic-dompurify|@supabase|jsdom)/)'],
  collectCoverageFrom: [
    'app/api/**/*.ts',
    'lib/**/*.ts',
    '!lib/**/*.test.ts',
    '!lib/**/*.spec.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/lib/test/setup.ts'],
  testTimeout: 10000,
  extensionsToTreatAsEsm: ['.ts'],
  // Memory optimization
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  forceExit: true, // Force exit after tests complete
};

module.exports = config;
