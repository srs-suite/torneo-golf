@echo off
chcp 65001 >nul
cls
echo ╔════════════════════════════════════════════════════════════╗
echo ║     CONFIGURACIÓN DE TORNEOGOLF - TEETRACKER PRO          ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Este script te ayudará a configurar el sistema paso a paso.
echo.
echo ────────────────────────────────────────────────────────────
echo   PASO 1: Configuración de Base de Datos
echo ────────────────────────────────────────────────────────────
echo.
echo Por favor, ingresa tus credenciales de MySQL:
echo.
set /p DB_USER="Usuario de MySQL (por defecto 'root'): "
if "%DB_USER%"=="" set DB_USER=root

set /p DB_PASSWORD="Contraseña de MySQL: "

set /p DB_NAME="Nombre de la base de datos (por defecto 'teetracker_pro'): "
if "%DB_NAME%"=="" set DB_NAME=teetracker_pro

echo.
echo Creando archivo de configuración backend\.env...
(
echo DB_HOST=localhost
echo DB_PORT=3306
echo DB_USER=%DB_USER%
echo DB_PASSWORD=%DB_PASSWORD%
echo DB_NAME=%DB_NAME%
echo.
echo PORT=8000
echo NODE_ENV=development
echo.
echo JWT_SECRET=desarrollo_secreto_2025_teetracker_%RANDOM%
echo JWT_EXPIRES_IN=7d
echo.
echo FRONTEND_URL=http://localhost:5173
echo.
echo UPLOAD_PATH=uploads
echo MAX_FILE_SIZE=2097152
) > backend\.env

echo ✅ Archivo backend\.env creado exitosamente
echo.
echo ────────────────────────────────────────────────────────────
echo   PASO 2: Verificando Base de Datos
echo ────────────────────────────────────────────────────────────
echo.

cd backend
node check_data.js
cd ..

echo.
echo ────────────────────────────────────────────────────────────
echo   PASO 3: Estado del Sistema
echo ────────────────────────────────────────────────────────────
echo.
echo Verificando servicios...
netstat -ano | findstr ":8000" > nul
if %errorlevel%==0 (
    echo ✅ Backend corriendo en http://localhost:8000
) else (
    echo ❌ Backend NO está corriendo
)

netstat -ano | findstr ":5173" > nul
if %errorlevel%==0 (
    echo ✅ Frontend corriendo en http://localhost:5173
) else (
    echo ❌ Frontend NO está corriendo
)

echo.
echo ────────────────────────────────────────────────────────────
echo   RESUMEN
echo ────────────────────────────────────────────────────────────
echo.
echo Para acceder al sistema:
echo   🌐 Abre tu navegador en: http://localhost:5173
echo.
echo Si el frontend no está corriendo, ejecuta:
echo   npm run system
echo.
echo ────────────────────────────────────────────────────────────
pause


