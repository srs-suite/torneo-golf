#!/bin/bash
# COMANDOS PARA ARREGLAR PRODUCCIÓN - TeeTracker Pro
# Ejecutar estos comandos en el servidor de producción

echo "=================================================="
echo "  SOLUCIÓN DE ERRORES EN PRODUCCIÓN"
echo "=================================================="

# 1. UBICAR EL PROYECTO
echo ""
echo "1️⃣ Ir al directorio del proyecto..."
cd /home/retailso/torneogolf-source/
pwd

# 2. VERIFICAR ESTADO ACTUAL
echo ""
echo "2️⃣ Verificar estado de PM2..."
pm2 status

# 3. VERIFICAR SCHEMA DE LA BASE DE DATOS
echo ""
echo "3️⃣ Verificar estructura de tabla clubs..."
mysql -u root -p -e "USE teetracker_pro; DESCRIBE clubs;"
mysql -u root -p -e "USE teetracker_pro; SHOW COLUMNS FROM clubs LIKE '%name%';"

# 4. RESPALDAR EL ARCHIVO ACTUAL
echo ""
echo "4️⃣ Hacer backup del archivo actual..."
cp backend/src/services/database.js backend/src/services/database.js.backup.$(date +%Y%m%d_%H%M%S)

# 5. ACTUALIZAR EL CÓDIGO (subir el archivo nuevo desde local)
echo ""
echo "5️⃣ IMPORTANTE: Necesitas subir el archivo actualizado desde tu máquina local"
echo "   Archivo: backend/src/services/database.js"
echo ""
echo "   Opciones:"
echo "   A) Usar SCP:"
echo "      scp backend/src/services/database.js usuario@servidor:/home/retailso/torneogolf-source/backend/src/services/"
echo ""
echo "   B) Usar WinSCP o FileZilla"
echo ""
echo "   C) Usar Git (si tienes repositorio):"
echo "      cd /home/retailso/torneogolf-source/"
echo "      git pull origin main"
echo ""

# 6. VERIFICAR QUE EL ARCHIVO SE ACTUALIZÓ
echo ""
echo "6️⃣ Después de subir el archivo, verificar que está correcto..."
grep "gc.club_name as club_name" backend/src/services/database.js
echo "   ⬆️ Debe mostrar líneas con 'gc.club_name' (NO 'gc.course_name')"

# 7. REINICIAR EL BACKEND
echo ""
echo "7️⃣ Reiniciar el backend..."
pm2 restart teetracker-backend
pm2 save

# 8. VERIFICAR LOGS
echo ""
echo "8️⃣ Verificar que no hay errores..."
pm2 logs teetracker-backend --lines 30 --nostream

# 9. PROBAR LA API
echo ""
echo "9️⃣ Probar que la API funciona..."
curl http://localhost:8000/api/system/clubs

# 10. VERIFICAR EN EL NAVEGADOR
echo ""
echo "🔟 Abrir en el navegador:"
echo "    https://torneogolf.retailsolutionstimetracker.com"

echo ""
echo "=================================================="
echo "  ✅ PROCESO COMPLETADO"
echo "=================================================="

