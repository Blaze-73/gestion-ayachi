# 📚 Gestion Papa — Suivi des élèves (cours particuliers)

Application **100 % hors-ligne** pour gérer les élèves de papa : inscription avec photo,
groupes & emploi du temps, présences, paiements mensuels, notes, et **fiche élève imprimable (PDF)**.

## Stack
- **Vite + React + TypeScript** (interface en français, gros boutons)
- **SQLite via sql.js** en mode web/offline — même schéma repris sous **Tauri v2** (`src-tauri/`, `tauri-plugin-sql`, base `gestion.db`)
- Photos compressées (JPEG 400px) stockées dans la base → **un seul fichier**, sauvegarde en 1 clic

## 🖥️ Pour papa (sans terminal, sans internet)

1. Copier **`Gestion-Papa-Portable.exe`** sur son PC (clé USB) — aucune installation.
2. Double-cliquer → l'appli s'ouvre. C'est tout.
3. (Option) Installer avec **`Gestion Papa Setup 0.1.0.exe`** → crée une icône sur le Bureau.

Quotidien : ouvrir, travailler, fermer — **tout s'enregistre tout seul**.
Bouton **💾 Sauvegarde** en haut = copie de sécurité à garder sur clé USB.

## 🗄️ Où est la base de données ?

- **Version appli (.exe)** : fichier `gestion.db` dans
  `C:\Users\<Nom>\AppData\Roaming\Gestion Papa\gestion.db`
  (tout dedans : élèves, photos, présences, paiements, notes).
- **Version navigateur (dev)** : stockage local du navigateur + export `.db` via Sauvegarde.

## Démarrer en dev
```bash
npm install
npm run dev      # http://localhost:1420
```

## Construire l'appli Windows (.exe)
```bash
npm run build                       # site statique -> dist/
npx electron-builder --win portable nsis   # Gestion-Papa-Portable.exe + Setup
```
`Lancer-Gestion-Papa.bat` ouvre le portable d'un double-clic.

## Passer sous Tauri (.exe Windows)
1. Installer Rust + MSVC Build Tools + WebView2
2. `npm install @tauri-apps/cli tauri-plugin-sql`
3. `npm run tauri dev` / `npm run tauri build` → installeur NSIS

## Sauvegarde
Bouton **💾 Sauvegarde** (export `.db`) / **📥 Restaurer** dans la barre du haut.
Les données web persistent aussi automatiquement dans le navigateur (localStorage).

## Schéma SQLite
`groups • students (photo base64) • attendance • payments • grades` — voir `src/lib/db.ts`.
