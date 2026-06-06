import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: 'dist',
  },
  server: {
    port: 7777,
    strictPort: true,
    watch: {
      ignored: ['**/dist-electron/**', '**/dist/**'],
    },
  },
})
