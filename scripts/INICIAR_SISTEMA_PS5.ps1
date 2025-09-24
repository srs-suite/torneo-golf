Write-Host "============================================" -ForegroundColor Green
Write-Host "  INICIANDO SISTEMA DE GOLF COMPLETO" -ForegroundColor Green  
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

Write-Host "Matando procesos anteriores..." -ForegroundColor Yellow
try {
    taskkill /f /im node.exe 2>$null
} catch {
    Write-Host "No hay procesos Node anteriores" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Iniciando Backend (server_real.js)..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$PWD`" & node server_real.js" -WindowStyle Normal

Write-Host ""
Write-Host "Esperando 5 segundos para que el backend se inicie..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Iniciando Frontend (Vite)..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$PWD\frontend`" & npx vite --port 5173" -WindowStyle Normal

Write-Host ""
Write-Host "Esperando 3 segundos para verificar..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  SISTEMA INICIADO COMPLETAMENTE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Móvil:    http://192.168.1.24:8000/mobile/auth" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Green

Write-Host ""
Write-Host "Verificando puertos..." -ForegroundColor Yellow
netstat -ano | findstr ":8000 :5173"

Write-Host ""
Write-Host "¡LISTO! Usa Ctrl+C para salir" -ForegroundColor Green



