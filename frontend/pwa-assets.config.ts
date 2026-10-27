import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Génération des icônes de l'application à partir de public/logo.svg : npx pwa-assets-generator
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#b0001a' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#b0001a' } },
  },
  images: ['public/logo.svg'],
})
