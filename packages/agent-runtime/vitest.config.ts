import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'agent-runtime',
    include: ['src/**/*.test.ts'],
  },
});
