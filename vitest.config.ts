import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/features/**/*.test.{ts,tsx}'],
    exclude: ['src/features/**/*.test.ts'],
  },
});
