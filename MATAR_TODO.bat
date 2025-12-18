@echo off
echo ============================================
echo   MATANDO TODOS LOS PROCESOS
echo ============================================
echo.

echo Matando Node.js...
taskkill /F /IM node.exe 2>nul

echo Matando CMD...
taskkill /F /FI "WINDOWTITLE eq Backend*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Frontend*" 2>nul

echo Matando PowerShell que ejecuta scripts...
wmic process where "name='powershell.exe' and commandline like '%%npm run%%'" delete 2>nul
wmic process where "name='powershell.exe' and commandline like '%%node%%'" delete 2>nul

echo.
echo ============================================
echo   LIMPIEZA COMPLETADA
echo ============================================
echo.
echo Verificando si quedan procesos Node...
timeout /t 2 /nobreak >nul
tasklist | findstr node.exe

echo.
echo Si NO aparece nada arriba, esta limpio.
echo Si aparecen Node, presiona Ctrl+C y dimelo.
echo.
pause


