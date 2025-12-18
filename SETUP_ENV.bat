@echo off
echo ============================================
echo CONFIGURACION DE VARIABLES DE ENTORNO
echo ============================================
echo.

set /p DB_PASSWORD="Ingresa tu password de MySQL (Enter si no tiene): "

echo # ============================================ > backend\.env
echo # TeeTracker Pro - Variables de Entorno >> backend\.env
echo # ============================================ >> backend\.env
echo. >> backend\.env
echo # ============================================ >> backend\.env
echo # BASE DE DATOS >> backend\.env
echo # ============================================ >> backend\.env
echo DB_HOST=localhost >> backend\.env
echo DB_PORT=3306 >> backend\.env
echo DB_USER=root >> backend\.env
echo DB_PASSWORD=%DB_PASSWORD% >> backend\.env
echo DB_NAME=teetracker_pro >> backend\.env
echo. >> backend\.env
echo # ============================================ >> backend\.env
echo # SERVIDOR >> backend\.env
echo # ============================================ >> backend\.env
echo PORT=8000 >> backend\.env
echo NODE_ENV=development >> backend\.env
echo. >> backend\.env
echo # ============================================ >> backend\.env
echo # AUTENTICACION JWT >> backend\.env
echo # ============================================ >> backend\.env
echo JWT_SECRET=desarrollo_secreto_2025_teetracker >> backend\.env
echo JWT_EXPIRES_IN=7d >> backend\.env
echo. >> backend\.env
echo # ============================================ >> backend\.env
echo # CORS Y FRONTEND >> backend\.env
echo # ============================================ >> backend\.env
echo FRONTEND_URL=http://localhost:5173 >> backend\.env
echo. >> backend\.env
echo # ============================================ >> backend\.env
echo # ARCHIVOS Y UPLOADS >> backend\.env
echo # ============================================ >> backend\.env
echo UPLOAD_PATH=uploads >> backend\.env
echo MAX_FILE_SIZE=2097152 >> backend\.env
echo. >> backend\.env

echo.
echo ✅ Archivo backend\.env creado exitosamente
echo.
pause


