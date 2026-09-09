@echo off
REM Gestion Papa — lanceur offline Windows (dossier dist/ construit via "npm run build")
setlocal
cd /d "%~dp0"
if not exist "dist\index.html" (
  echo [Gestion Papa] dist\ introuvable. Lancez d'abord : npm run build
  pause
  exit /b 1
)
echo [Gestion Papa] Ouverture de l'application...
start "" "dist\index.html"
