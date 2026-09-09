# Gestion Ayachi

Petite application de gestion pour les cours particuliers de M. Ayachi.
Elle tourne entièrement hors-ligne sur son PC Windows : pas de compte, pas d'internet,
pas d'abonnement. On ouvre, on travaille, on ferme, tout est enregistré.

## Ce qu'elle fait

- **Élèves** : fiche par élève avec photo, téléphone, parent, groupe, remarques. Recherche instantanée.
- **Groupes** : les groupes de cours avec matière, jour et heure.
- **Présences** : l'appel en deux clics (groupe + date), avec compteurs présents/absents.
- **Paiements** : suivi mois par mois, montants, payé/impayé, et la liste des relances sur l'accueil.
- **Notes** : évaluations et moyenne automatique par élève.
- **Fiche élève** : une page A4 propre par élève (infos + photo + résumé + signatures) à imprimer ou garder en PDF.
- **Sauvegarde** : un bouton pour exporter toute la base, un autre pour la restaurer.

## Installer sur le PC de M. Ayachi

Le plus simple : aller dans **Releases** (colonne de droite sur GitHub), télécharger
`Gestion-Ayachi-Portable.exe`, le poser où on veut (Bureau, Documents, clé USB) et double-cliquer.
Aucune installation demandée.

Il existe aussi `Gestion Ayachi Setup 0.2.0.exe` qui installe proprement le programme
avec une icône sur le Bureau.

Au quotidien il n'y a rien à retenir : les données s'enregistrent toutes seules à chaque
modification. De temps en temps, un clic sur **Sauvegarde** en haut de l'écran pour mettre
une copie de côté (clé USB conseillée).

## Où sont les données

Tout est dans un seul fichier SQLite :

```
C:\Users\<Nom>\AppData\Roaming\Gestion Ayachi\gestion.db
```

Élèves, photos (compressées automatiquement), présences, paiements, notes : tout est dedans.
Copier ce fichier, c'est sauvegarder l'année entière.

## Pour développer

```bash
npm install
npm run dev        # http://localhost:1420
```

Construire l'exécutable Windows :

```bash
npm run build
npx electron-builder --win portable nsis
```

Technique : React + TypeScript + Vite, SQLite via sql.js (même schéma prévu pour
tauri-plugin-sql, voir `src-tauri/`), empaqueté avec Electron. Icônes Lucide.
