import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@clerk/clerk-react': path.resolve(__dirname, 'src/__mocks__/@clerk/clerk-react.js'),
    },
  },
})
