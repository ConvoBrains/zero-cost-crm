import { defineConfig } from 'vitest/config'

// Needs prepared DB: make test-up && npm run test:api:prep
export default defineConfig({
  test: {
    environment: 'node',
    include: ['testing/functional/api/**/*.test.ts'],
    setupFiles: [
      'testing/functional/api/preload-env.ts',
      'testing/functional/api/boot-server.ts',
    ],
    globalTeardown: ['testing/functional/api/globalTeardown.ts'],
    fileParallelism: false,
    isolate: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
