import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom gives tests a fake browser (document, window) so React components can render.
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
