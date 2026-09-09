@echo off
REM Gestion Papa — lanceur sans terminal pour papa : double-cliquer, c'est tout.
setlocal
cd /d "%~dp0"
if exist "Gestion-Papa-Portable.exe" (
  start "" "Gestion-Papa-Portable.exe"
  exit /b 0
)
if exist "dist\Gestion-Papa-Portable.exe" (
  start "" "dist\Gestion-Papa-Portable.exe"
  exit /b 0
)
echo [Gestion Papa] Fichier Gestion-Papa-Portable.exe introuvable.
echo Copiez-le a cote de ce fichier, puis double-cliquez a nouveau.
pause
