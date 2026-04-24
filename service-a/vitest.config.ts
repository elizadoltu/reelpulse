import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    pool: 'forks',
    deps: {
      interopDefault: true,
    },
    coverage: {
      enabled: false,
      include: ['src/**/*.ts'],
      reportsDirectory: './coverage',
      provider: 'v8',
    },
    include: ['src/**/*.test.ts'],
    exclude: [
      'src/test/routes/**/*.test.ts',
      'src/test/utils/test-utils.test.ts',
    ],
    environment: 'node'
  },
});
