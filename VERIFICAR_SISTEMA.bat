@echo off
chcp 65001 >nul
color 0A

echo.
echo ╔════════════════════════════════════════════════╗
echo ║   VERIFICACIÓN DEL SISTEMA TEETRACKER PRO      ║
echo ╚════════════════════════════════════════════════╝
echo.

echo 📋 Verificando estructura del proyecto...
echo.

REM Verificar backend
if exist "backend\package.json" (
    echo ✅ Backend encontrado
) else (
    echo ❌ Backend NO encontrado
    goto :error
)

REM Verificar frontend
if exist "frontend\package.json" (
    echo ✅ Frontend encontrado
) else (
    echo ❌ Frontend NO encontrado
    goto :error
)

REM Verificar archivo .env
if exist "backend\.env" (
    echo ✅ Archivo .env configurado
) else (
    echo ⚠️  Archivo .env NO encontrado - Necesitas crearlo
    echo    Copia env.example a backend\.env y configura tus credenciales
)

echo.
echo 📦 Verificando dependencias...
echo.

cd backend
if exist "node_modules" (
    echo ✅ Dependencias del backend instaladas
) else (
    echo ⚠️  Dependencias del backend NO instaladas
    echo    Ejecuta: cd backend ^&^& npm install
)

cd ..\frontend
if exist "node_modules" (
    echo ✅ Dependencias del frontend instaladas
) else (
    echo ⚠️  Dependencias del frontend NO instaladas
    echo    Ejecuta: cd frontend ^&^& npm install
)

cd ..

echo.
echo 🔍 Verificando procesos en ejecución...
echo.

tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✅ Node.js está en ejecución
    echo.
    echo    Procesos Node activos:
    tasklist /FI "IMAGENAME eq node.exe" /FO TABLE
) else (
    echo ⚠️  Node.js NO está en ejecución
    echo    El sistema necesita ser iniciado
)

echo.
echo 🌐 Verificando puertos...
echo.

netstat -ano | findstr :8000 >nul
if %ERRORLEVEL%==0 (
    echo ✅ Puerto 8000 ^(Backend^) está en uso
) else (
    echo ⚠️  Puerto 8000 ^(Backend^) está libre - Backend NO está corriendo
)

netstat -ano | findstr :5174 >nul
if %ERRORLEVEL%==0 (
    echo ✅ Puerto 5174 ^(Frontend^) está en uso
) else (
    echo ⚠️  Puerto 5174 ^(Frontend^) está libre - Frontend NO está corriendo
)

echo.
echo ════════════════════════════════════════════════
echo.
echo 📱 FUNCIONALIDADES PRINCIPALES:
echo.
echo    ✅ Gestión de Clubes
echo    ✅ Gestión de Socios
echo    ✅ Gestión de Torneos
echo    ✅ Gestión de Contabilidad
echo    ✅ WhatsApp Internacional ^(🇦🇷 Argentina / 🇺🇸 USA^)
echo.
echo ════════════════════════════════════════════════
echo.
echo 🚀 Para iniciar el sistema:
echo.
echo    Opción 1: INICIAR_RAPIDO.bat
echo    Opción 2: Manualmente en 2 terminales:
echo              Terminal 1: cd backend ^&^& npm run dev
echo              Terminal 2: cd frontend ^&^& npm run dev
echo.
echo 📚 Documentación: FUNCIONALIDADES_SISTEMA.md
echo.
echo ════════════════════════════════════════════════
echo.
pause
goto :end

:error
echo.
echo ❌ ERROR: Estructura del proyecto incompleta
echo.
pause
exit /b 1

:end
exit /b 0

