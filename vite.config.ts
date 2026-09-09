import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Tauri-ready : port fixe 1420 (exige par Tauri), build ES2021.
// La persistance SQLite passe par sql.js en mode web/offline ;
// sous Tauri, la meme couche SQL basculera sur tauri-plugin-sql sans changer les requetes.
export default defineConfig({
  // Chemins relatifs : obligatoire pour le mode fichier (Electron loadFile -> file://).
  // Sans ca, /assets/... pointe vers la racine du disque et l'appli reste blanche.
  base: './',
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: 'es2021',
  },
})
