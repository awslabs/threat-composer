import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    clearMocks: true,
    setupFiles: ['./vitest.setup.ts'],
    // Restores Node's TextEncoder (jsdom's breaks esbuild) and stubs the bare
    // `browser` global the extension source expects WXT to provide.
    include: [
      // NOTE: this first pattern runs EVERY file under a __tests__ directory as a
      // suite, so shared fixtures must not live there.
      'src/**/__tests__/**/*.{ts,tsx}',
      'src/**/*.{spec,test}.{ts,tsx}',
    ],
  },
});
