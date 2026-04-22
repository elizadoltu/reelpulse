import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    deps: {
      interopDefault: true
    },
    typecheck: {
      enabled: true,
    },
    coverage: {
      enabled: true,
      include: ['src/**/*.ts'],
      reportsDirectory: './coverage',
      thresholds: {
        branches: 50,
        functions: 90,
        lines: 90,
        statements: 90,
      },
      provider: 'v8', 
    },
    environment: 'node',
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});