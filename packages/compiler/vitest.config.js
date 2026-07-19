import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/blocks/**/*.test.{js,mjs}', 'test/functions/**/*.test.{js,mjs}'],
    testTimeout: 20000,
    hookTimeout: 180000,
  },
});
