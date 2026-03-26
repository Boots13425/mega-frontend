import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/

export default defineConfig({
  // Serve app at root when running Vite dev server (http://localhost:5000/)
  base: "/",
  plugins: [react()],
  server: {
    // Listen on all network interfaces so other devices can access
    host: true,
    // Proxy API calls to the Django backend (avoids needing port 8000 open on LAN)
    proxy: {
      '/api': {
        target: 'https://mega-backend-5pw9.onrender.com',
        changeOrigin: true,
      },
    },
    port: 5000,
  },
})

