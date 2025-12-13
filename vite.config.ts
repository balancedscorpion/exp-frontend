import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isMock = mode === 'mock'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: isMock
        ? undefined
        : {
            '/api': {
              target: 'http://localhost:8000',
              changeOrigin: true,
            },
            '/health': {
              target: 'http://localhost:8000',
              changeOrigin: true,
            },
          },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  }
})
