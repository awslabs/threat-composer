import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    clearMocks: true,
    include: [
      'src/**/__tests__/**/*.{ts,tsx}',
      'src/**/*.{spec,test}.{ts,tsx}',
      'test/**/*.{spec,test}.{ts,tsx}',
    ],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: 'test-reports/junit.xml',
    },
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['json', 'lcov', 'clover', 'cobertura', 'text'],
      exclude: ['node_modules/**', 'lib/**', 'storybook.out/**', '**/*.stories.tsx'],
    },
  },
});
