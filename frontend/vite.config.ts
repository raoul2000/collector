import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// Fuseau fixe pour les tests : les tests de dates ne dépendent pas de la machine
if (process.env.VITEST) {
  process.env.TZ = 'Europe/Paris'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // L'utilisateur est invité à recharger quand une nouvelle version est disponible (cf. UpdatePrompt)
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Collector – Collecte alimentaire',
        short_name: 'Collector',
        description: 'Saisie des dons de la collecte alimentaire',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f4f3f1',
        theme_color: '#b0001a',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Toute l'application est mise en cache : elle démarre sans réseau
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Les bilans des responsables (avec Recharts) nécessitent le réseau : inutile de les télécharger
        // d'avance sur les téléphones des bénévoles
        globIgnores: ['**/BilansPage-*'],
        navigateFallback: 'index.html',
        // Les appels à l'API ne passent jamais par le cache (les données hors ligne sont dans IndexedDB)
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    // En développement, l'API PHP tourne sur le serveur intégré (composer serve)
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // theme.css est lu par le test des contrastes
    css: { include: [/theme.css/], modules: { classNameStrategy: 'non-scoped' } },
  },
})
