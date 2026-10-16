import { defineConfig } from 'vitest/config';
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    include: [
      'calc-core/__tests__/**/*.spec.ts',
      'lib/**/__tests__/**/*.spec.ts',
      'components/**/__tests__/**/*.spec.{ts,tsx}',
      'i18n/**/__tests__/**/*.spec.{ts,tsx}',
    ],
    environment: 'node',
    testTimeout: 30000,
  },
});
