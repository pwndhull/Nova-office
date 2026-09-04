import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['integration/**/*.test.{ts,tsx}', 'benchmarks/**/*.test.ts'],
    benchmark: { include: ['benchmarks/**/*.bench.ts'] },
  },
});
