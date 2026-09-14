# AGENTS.md — Gestion Ayachi (mémoire du projet)

Lire ce fichier en début de chaque session. Il remplace l'historique des conversations
précédentes : tout le contexte utile est ici.

## C'est quoi

Application Windows 100 % hors-ligne pour M. Ayachi : gestion de ses élèves de cours
particuliers (fiches + photos, groupes, présences, paiements, notes, fiche A4 imprimable).
Interface en français, gros boutons, pensée pour quelqu'un qui ne touche jamais au terminal.

- Repo GitHub : `Blaze-73/gestion-papa` (renommage en `gestion-ayachi` prévu, pas encore fait)
- Dossier local actuel : `C:\Users\hp\Desktop\gestion-papa` (nom de dossier conservé tel quel)
- Commits signés : `Blaze-73 <kachkachmouataz@gmail.com>` — le push passe par le credential
  Windows déjà enregistré (Git Credential Manager), aucun token à demander.

## Stack

Vite + React 19 + TypeScript, SQLite via sql.js, empaqueté avec Electron + electron-builder
(cibles : portable + nsis). Config Tauri v2 présente dans `src-tauri/` mais inactive :
pas de Rust/MSVC sur la machine de dev, donc l'exe se fait avec Electron.

## Commandes

```bash
npm run dev        # http://localhost:1420
npm run build      # site statique -> dist/
npx electron-builder --dir            # iteration rapide -> release/win-unpacked/
npx electron-builder --win portable   # Gestion-Ayachi-Portable.exe (le seul dont papa a besoin)
```

L'exe que papa utilise : `release/win-unpacked/Gestion Ayachi.exe` (prendre tout le dossier).
Double-clic, rien d'autre. Données : `%AppData%/Gestion Ayachi/gestion.db` (un seul fichier
SQLite : élèves, photos compressées, présences, paiements, notes).

## Architecture (fichiers qui comptent)

- `src/lib/db.ts` — toute la donnée. sql.js + schéma `groups/students/attendance/payments/grades`.
  Sous Electron la base vit en fichier via `window.papaAPI` (`electron/preload.cjs` +
  `electron/main.cjs`) ; dans le navigateur, repli sur localStorage (clé historique conservée).
- `src/components/` — Students (CRUD + photo compressée + overlay fiche), Groups,
  Attendance (appel), Payments (mensuel), Grades (moyenne auto), FicheEleve (A4 imprimable).
- `src/App.tsx` — onglets + tableau de bord + Sauvegarde/Restaurer.

## Règles UI

Français partout. Icônes **Lucide** (`lucide-react`), jamais d'emojis dans l'interface
(l'utilisateur les trouve cheap). Classe `.btn-ico` pour aligner icône + texte.

## Pièges déjà payés (ne pas les revivre)

1. **Écran blanc du .exe** : Vite doit émettre des chemins relatifs (`base: './'` dans
   `vite.config.ts`), sinon `/assets/...` pointe vers la racine du disque en `file://`.
2. **WASM en file://** : `fetch()` est bloqué dans le renderer. Le main lit `sql-wasm.wasm`
   avec Node fs et envoie les octets via IPC ; le renderer passe `wasmBinary` à sql.js.
3. **`dist/` vs `release/`** : `dist/` appartient à Vite, builder output dans `release/`
   (`directories.output` dans package.json). Ne jamais les mélanger.
4. **EBUSY / builds qui n'en finissent pas** : c'est un vieux process builder (7za) resté
   coincé qui verrouille les dossiers. Tuer **uniquement** le process `7za` ciblé.
   Ne JAMAIS tuer en masse les process `node` : ça coupe la session agent elle-même.
5. NSIS prend 10+ minutes (compression 200 Mo). Pour itérer : `--dir`, et pour papa le
   dossier `win-unpacked` suffit (même app que le portable).
6. Vérifier avant d'annoncer : `npm run build`, lancer l'exe, screenshot, regarder l'image.

## Habitudes de travail avec l'utilisateur

- Il veut qu'on **commit + push chaque morceau de travail**, sans qu'on le rappelle.
- Il teste lui-même l'exe et rapporte les bugs (ex : bouton Fiche invisible car la fiche
  s'ouvrait hors écran → corrigé en popup overlay + Echap + print CSS dédié).
- Réponses courtes, directes. Quand un outil traîne, le dire au lieu de relancer en boucle.
- Reste à faire : renommer le repo GitHub en `gestion-ayachi`, publier la Release v0.2.0
  avec le portable (nécessite un token avec scope repo pour l'API Releases).
