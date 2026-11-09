import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'functions/**/*.test.ts', 'scripts/**/*.test.mjs'],
    environment: 'node',
    passWithNoTests: true,
  },
});
