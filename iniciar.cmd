@echo off
cd /d "%~dp0"
if exist "%~dp0bin\lembretes.exe" (
  start "" "%~dp0bin\lembretes.exe"
  exit /b 0
)
echo Iniciando Lembretes em modo de desenvolvimento...
call npm run tauri:dev
