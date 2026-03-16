import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    force: true, // Fuerza la reoptimización de dependencias
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true, // Permite acceso desde cualquier host
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'torneogolf.retailsolutionstimetracker.com',
      '.retailsolutionstimetracker.com' // Permite todos los subdominios
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  preview: {
    port: 4173,
    host: true, // Permite acceso desde cualquier host en preview también
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'torneogolf.retailsolutionstimetracker.com',
      '.retailsolutionstimetracker.com'
    ]
  }
})
