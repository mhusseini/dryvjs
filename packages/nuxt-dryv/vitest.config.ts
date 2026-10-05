import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@softwareproduction/dryvue': path.resolve(__dirname, '../dryvue/src/index.ts')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/**/*.test.ts']
  }
})
