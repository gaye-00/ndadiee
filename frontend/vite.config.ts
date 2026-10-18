import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      // Même alias que dans tsconfig : `@/…` désigne `src/…`
      { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
      // `motion/react` ne fait que réexporter framer-motion, mais en recopiant `motion` dans une constante :
      // dès qu'un module utilise `motion` (la corde du thème), le build ne peut plus laisser les animations
      // hors du fichier principal (lib/motion.ts). Même code, importé à la source.
      { find: /^motion\/react$/, replacement: 'framer-motion' },
    ],
  },
  optimizeDeps: {
    // Chargées seulement par les pages du forum (coloration du code) : découvertes en cours de route, elles
    // forceraient Vite à tout ré-optimiser et à recharger la page à la première visite d'un sujet
    include: ['lowlight', 'react-markdown', 'remark-gfm'],
  },
  server: {
    port: 5173,
    // Fichiers transformés dès le démarrage du serveur : premier affichage plus rapide en développement
    warmup: { clientFiles: ['./src/main.tsx', './src/router/index.tsx'] },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              // Bibliothèques chargées sur toutes les pages (React, router, données, i18n) : à part, elles
              // restent dans le cache du navigateur d'un déploiement à l'autre tant que leur version ne change pas.
              // Ne pas y mettre une bibliothèque utilisée par une seule page : elle serait chargée partout.
              name: 'vendor',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@tanstack|axios|zustand|i18next|react-i18next|i18next-resources-to-backend)[\\/]/,
            },
          ],
        },
      },
    },
  },
})
