import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-rosa.png', 'vite.svg'],
      manifest: {
        name: 'Iris Nutrición CRM',
        short_name: 'Nutri CRM',
        description: 'Gestor de Dietética y Pacientes',
        theme_color: '#f43f5e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'logo-rosa.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo-rosa.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
