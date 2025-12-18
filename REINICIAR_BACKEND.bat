@echo off
echo ====================================
echo REINICIANDO BACKEND
echo ====================================
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
cd backend
echo.
echo Iniciando backend con soporte internacional...
echo.
node src\server.js

