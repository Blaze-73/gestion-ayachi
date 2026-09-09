@echo off
REM Gestion Ayachi — double-cliquer pour ouvrir l'application, rien d'autre a faire.
setlocal
cd /d "%~dp0"
if exist "Gestion-Ayachi-Portable.exe" (
  start "" "Gestion-Ayachi-Portable.exe"
  exit /b 0
)
if exist "release\win-unpacked\Gestion Ayachi.exe" (
  start "" "release\win-unpacked\Gestion Ayachi.exe"
  exit /b 0
)
echo [Gestion Ayachi] Application introuvable.
echo Copiez-le a cote de ce fichier, puis double-cliquez a nouveau.
pause
