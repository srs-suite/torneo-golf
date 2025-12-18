# 🚨 RESUMEN DEL PROBLEMA EN PRODUCCIÓN

## ❌ El Problema

El sistema en producción está mostrando errores de conexión:
```
Error: connect ECONNREFUSED 127.0.0.1:3005
```

**Causa raíz:** El sistema está intentando conectarse al puerto **3005** en lugar del puerto **8000** correcto.

---

## 🔍 Análisis

### Configuración Incorrecta Encontrada:

1. **`DEPLOYMENT_LINUX.md`** (línea 73)
   - ❌ Decía: Backend API en `http://localhost:3005`
   - ✅ Corregido a: `http://localhost:8000`

2. **Posible configuración incorrecta en el servidor:**
   - El backend puede estar configurado para puerto 3005
   - Nginx puede estar haciendo proxy al puerto incorrecto
   - Variables de entorno incorrectas en producción

---

## ✅ Soluciones Implementadas Localmente

### 1. Archivos Corregidos:
- ✅ `backend/src/server.js` - Ruta del .env corregida
- ✅ `frontend/vite.config.ts` - Puerto cambiado a 5173
- ✅ `DEPLOYMENT_LINUX.md` - Puerto corregido a 8000

### 2. Archivos Nuevos Creados:
- 📄 `nginx-production.conf` - Configuración completa de Nginx
- 📄 `SOLUCION_PRODUCCION.md` - Guía paso a paso para el servidor
- 📄 `RESUMEN_PROBLEMA_PRODUCCION.md` - Este archivo

---

## 🛠️ Qué Hacer Ahora

### Opción A: Solución Rápida en el Servidor

**Conectarse al servidor y ejecutar:**

```bash
# 1. Conectar al servidor
ssh usuario@servidor

# 2. Ir al directorio del proyecto
cd /var/www/torneogolf

# 3. Verificar y corregir el puerto en backend/.env
nano backend/.env
# Cambiar PORT=3005 por PORT=8000 (si está mal)

# 4. Verificar configuración de Nginx
sudo nano /etc/nginx/sites-available/torneogolf
# Asegurarse de que proxy_pass sea http://localhost:8000

# 5. Reiniciar servicios
pm2 restart all
sudo systemctl reload nginx

# 6. Verificar
curl http://localhost:8000/api/system/clubs
```

### Opción B: Deployment Completo

Seguir la guía completa en `SOLUCION_PRODUCCION.md` con todos los pasos de verificación.

---

## 📋 Checklist Rápido

```bash
# En el servidor, verificar estos 3 puntos críticos:

✅ 1. Backend .env tiene PORT=8000
cat backend/.env | grep PORT

✅ 2. Nginx redirige a puerto 8000
sudo cat /etc/nginx/sites-available/torneogolf | grep proxy_pass

✅ 3. PM2 muestra el backend corriendo
pm2 status
```

---

## 📂 Archivos para Subir al Servidor

Si necesitas actualizar la configuración completa:

1. **`nginx-production.conf`** → Copiar a `/etc/nginx/sites-available/torneogolf`
2. **Rebuild del frontend:**
   ```bash
   cd frontend
   npm run build
   # Subir carpeta frontend/dist al servidor
   ```

---

## 🎯 Resultado Esperado

Después de aplicar las correcciones:

| Componente | Puerto | URL |
|------------|--------|-----|
| Backend (interno) | 8000 | http://localhost:8000 |
| Frontend | - | https://torneogolf.retailsolutionstimetracker.com |
| API (externa) | - | https://torneogolf.retailsolutionstimetracker.com/api/* |

**No más errores de puerto 3005** ✅

---

## 📞 Siguientes Pasos

1. **Revisar `SOLUCION_PRODUCCION.md`** para la guía detallada paso a paso
2. **Conectarse al servidor** de producción
3. **Aplicar las correcciones** según la guía
4. **Verificar** que todo funcione correctamente
5. **Monitorear logs** para asegurarse de que no hay errores

---

## 🆘 Si Necesitas Ayuda

**Comandos de diagnóstico:**
```bash
# Ver qué puerto está usando el backend
sudo netstat -tulpn | grep node

# Ver logs del backend
pm2 logs teetracker-backend --lines 50

# Ver logs de Nginx
sudo tail -f /var/log/nginx/torneogolf_error.log

# Ver estado general
pm2 status
sudo systemctl status nginx
```

---

**Fecha de generación:** $(date)  
**Problema:** Puerto incorrecto (3005 → 8000)  
**Estado:** Soluciones preparadas, listas para aplicar en servidor

