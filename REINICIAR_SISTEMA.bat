@echo off
echo ============================================
echo   REINICIANDO SISTEMA TORNEOGOLF
echo ============================================
echo.

echo Cerrando todos los procesos Node.js...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Iniciando Backend con codigo actualizado...
start "Backend TeeTracker" cmd /k "cd /d %~dp0backend && node src\server.js"

timeout /t 5 /nobreak >nul

echo.
echo Iniciando Frontend...
start "Frontend TeeTracker" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo   SISTEMA REINICIADO
echo ============================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5174 o http://localhost:5173
echo.
echo Verificando puertos...
netstat -ano | findstr ":8000 :5173 :5174"
echo.
echo ============================================
echo Presiona cualquier tecla para cerrar...
pause >nul


