@echo off
echo ============================================
echo   INICIANDO SISTEMA DE GOLF COMPLETO
echo ============================================
echo.

echo Matando procesos anteriores...
taskkill /f /im node.exe 2>nul

echo.
echo Iniciando Backend (server.js)...
start "Backend Golf" cmd /k "cd /d "%~dp0..\backend\src" && node server.js"

echo.
echo Esperando 3 segundos...
timeout /t 3 /nobreak >nul

echo.
echo Iniciando Frontend (Vite)...
start "Frontend Golf" cmd /k "cd /d "%~dp0..\frontend" && npx vite --port 5174"

echo.
echo ============================================
echo  SISTEMA INICIADO COMPLETAMENTE
echo ============================================
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5174
echo ============================================
echo.
echo Presiona cualquier tecla para salir...
pause >nul