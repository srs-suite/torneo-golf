import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    /** Marca cada build en dist/index.html (comentario HTML) para comparar con “ver código fuente” en producción. */
    {
      name: 'inject-build-stamp',
      transformIndexHtml(html) {
        const stamp = new Date().toISOString()
        return html.replace(
          '<head>',
          `<head>\n    <!-- teebuild:${stamp} -->\n    <meta name="tee-build-stamp" content="${stamp}" />`
        )
      },
    },
  ],
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
