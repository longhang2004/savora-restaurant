import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    setupFiles: ['./tests/setup-env.ts'],
    globalSetup: ['./tests/integration/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: 'forks',
    // Integration tests share one PostgreSQL database — files must run
    // sequentially for deterministic table-level locking tests.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Node test context has no RSC boundary — neutralize the guard.
      'server-only': path.resolve(__dirname, 'tests/mocks/server-only.ts'),
    },
  },
});
