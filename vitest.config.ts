import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts — Vitest’s Vite types clash with Vite 8 plugins in tsc.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['testing/unit/**/*.test.ts'],
  },
})
