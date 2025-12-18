@echo off
echo ============================================
echo   INICIANDO SISTEMA TORNEOGOLF
echo ============================================
echo.

echo Matando procesos anteriores...
taskkill /f /im node.exe 2>nul

timeout /t 2 /nobreak >nul

echo.
echo Iniciando Backend...
start "Backend TeeTracker" cmd /k "cd backend && node src\server.js"

timeout /t 5 /nobreak

echo.
echo Iniciando Frontend...
start "Frontend TeeTracker" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak

echo.
echo ============================================
echo   SISTEMA INICIADO
echo ============================================
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo ============================================
echo.
echo Presiona cualquier tecla para verificar puertos...
pause >nul

netstat -ano | findstr ":8000 :5173"

echo.
echo ============================================
pause


