import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    include: ['test/**/*.{spec,test}.ts', 'src/**/*.{spec,test}.ts'],
    // CDK template snapshots are large; the default 5s timeout is not enough
    // for a full pipeline synth on a cold start.
    testTimeout: 60000,
  },
});
