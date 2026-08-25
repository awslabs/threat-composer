import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    clearMocks: true,
    setupFiles: ['./src/setupTests.ts'],
    include: [
      'src/**/__tests__/**/*.{ts,tsx}',
      'src/**/*.{spec,test}.{ts,tsx}',
    ],
  },
});
