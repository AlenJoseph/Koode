import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'ai-gateway',
    include: ['src/**/*.test.ts'],
  },
});
