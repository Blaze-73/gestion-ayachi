# 📚 Gestion Papa — Suivi des élèves (cours particuliers)

Application **100 % hors-ligne** pour gérer les élèves de papa : inscription avec photo,
groupes & emploi du temps, présences, paiements mensuels, notes, et **fiche élève imprimable (PDF)**.

## Stack
- **Vite + React + TypeScript** (interface en français, gros boutons)
- **SQLite via sql.js** en mode web/offline — même schéma repris sous **Tauri v2** (`src-tauri/`, `tauri-plugin-sql`, base `gestion.db`)
- Photos compressées (JPEG 400px) stockées dans la base → **un seul fichier**, sauvegarde en 1 clic

## Démarrer (sans Rust)
```bash
npm install
npm run dev      # http://localhost:1420
```

## Build / utiliser sur le PC de papa
```bash
npm run build     # dist/ statique → double-cliquer via gestion-papa.bat ou servir en local
```
`gestion-papa.bat` lance un aperçu local offline de `dist/`.

## Passer sous Tauri (.exe Windows)
1. Installer Rust + MSVC Build Tools + WebView2
2. `npm install @tauri-apps/cli tauri-plugin-sql`
3. `npm run tauri dev` / `npm run tauri build` → installeur NSIS

## Sauvegarde
Bouton **💾 Sauvegarde** (export `.db`) / **📥 Restaurer** dans la barre du haut.
Les données web persistent aussi automatiquement dans le navigateur (localStorage).

## Schéma SQLite
`groups • students (photo base64) • attendance • payments • grades` — voir `src/lib/db.ts`.
