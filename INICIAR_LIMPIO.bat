@echo off
echo ============================================
echo   INICIANDO SISTEMA TORNEOGOLF LIMPIO
echo ============================================
echo.

echo Limpiando procesos anteriores...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo ============================================
echo   INICIANDO BACKEND
echo ============================================
cd backend
start "Backend TeeTracker" cmd /k "node src\server.js"

echo Esperando 5 segundos a que inicie el backend...
timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo   INICIANDO FRONTEND
echo ============================================
cd ..\frontend
start "Frontend TeeTracker" cmd /k "npm run dev"

echo Esperando 3 segundos a que inicie el frontend...
timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo   SISTEMA INICIADO
echo ============================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173 o 5174
echo.
echo Verificando puertos...
netstat -ano | findstr ":8000 :5173 :5174" | findstr "LISTENING"
echo.
echo ============================================
echo.
echo IMPORTANTE:
echo - Se abrieron 2 ventanas cmd (Backend y Frontend)
echo - NO las cierres
echo - Abre el navegador en http://localhost:5173 o 5174
echo.
pause

