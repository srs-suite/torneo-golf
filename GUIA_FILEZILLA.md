# 📁 GUÍA FILEZILLA - Actualizar Producción

## 🎯 Archivos CRÍTICOS que DEBES subir

### 📂 **Conexión FileZilla**
```
Host: Tu servidor (ejemplo: torneogolf.retailsolutionstimetracker.com)
Usuario: retailso
Puerto: 22 (SFTP) o 21 (FTP)
Directorio remoto: /home/retailso/torneogolf-source/
```

---

## 📦 **ARCHIVOS A SUBIR (en orden de importancia)**

### 🔴 **CRÍTICO - Backend (Arregla el error principal)**

| Archivo Local | Ruta en Servidor |
|---------------|------------------|
| `backend/src/server.js` | `/home/retailso/torneogolf-source/backend/src/server.js` |
| `backend/src/services/database.js` | `/home/retailso/torneogolf-source/backend/src/services/database.js` |

**⚠️ IMPORTANTE:** Estos dos archivos arreglan el error de producción.

---

### 🟡 **IMPORTANTE - Scripts de utilidad**

| Archivo Local | Ruta en Servidor |
|---------------|------------------|
| `backend/reset_admin.js` | `/home/retailso/torneogolf-source/backend/reset_admin.js` |
| `backend/show_admins.js` | `/home/retailso/torneogolf-source/backend/show_admins.js` |
| `ecosystem.config.cjs` | `/home/retailso/torneogolf-source/ecosystem.config.cjs` |

---

### 🟢 **OPCIONAL - Nueva funcionalidad (Dashboard Finanzas)**

| Archivo Local | Ruta en Servidor |
|---------------|------------------|
| `frontend/src/pages/PublicFinance.tsx` | `/home/retailso/torneogolf-source/frontend/src/pages/PublicFinance.tsx` |
| `frontend/src/App.tsx` | `/home/retailso/torneogolf-source/frontend/src/App.tsx` |
| `docs/TRANSPARENCIA_FINANCIERA.md` | `/home/retailso/torneogolf-source/docs/TRANSPARENCIA_FINANCIERA.md` |

**Nota:** Estos archivos agregan la nueva funcionalidad de transparencia financiera para socios.

---

### 📘 **DOCUMENTACIÓN (Opcional pero recomendada)**

| Archivo Local | Ruta en Servidor |
|---------------|------------------|
| `EXPLICACION_ERROR_PRODUCCION.md` | `/home/retailso/torneogolf-source/` |
| `COMANDOS_PRODUCCION.sh` | `/home/retailso/torneogolf-source/` |

---

## 🚀 **PASOS DETALLADOS**

### **1. Abrir FileZilla**
   - Conectarse al servidor
   - Panel izquierdo: Tu carpeta local (`C:\Documents\proyectos\Torneogolf`)
   - Panel derecho: Servidor remoto (`/home/retailso/torneogolf-source/`)

### **2. Subir archivos del BACKEND** ⭐ **LO MÁS IMPORTANTE**
   
   **a) Archivo server.js:**
   ```
   Local:   C:\Documents\proyectos\Torneogolf\backend\src\server.js
   Remoto:  /home/retailso/torneogolf-source/backend/src/server.js
   ```
   - Navegar en panel izquierdo: `backend/src/`
   - Navegar en panel derecho: `/home/retailso/torneogolf-source/backend/src/`
   - Arrastrar `server.js` del panel izquierdo al derecho
   - Confirmar sobrescribir

   **b) Archivo database.js:**
   ```
   Local:   C:\Documents\proyectos\Torneogolf\backend\src\services\database.js
   Remoto:  /home/retailso/torneogolf-source/backend/src/services/database.js
   ```
   - Navegar a `backend/src/services/`
   - Arrastrar `database.js`
   - Confirmar sobrescribir

### **3. Subir ecosystem.config.cjs** (Si lo modificaste)
   ```
   Local:   C:\Documents\proyectos\Torneogolf\ecosystem.config.cjs
   Remoto:  /home/retailso/torneogolf-source/ecosystem.config.cjs
   ```

### **4. (OPCIONAL) Subir nueva funcionalidad de finanzas**
   
   Si quieres la funcionalidad del dashboard público de finanzas:
   ```
   Local:   C:\Documents\proyectos\Torneogolf\frontend\src\pages\PublicFinance.tsx
   Remoto:  /home/retailso/torneogolf-source/frontend/src/pages/PublicFinance.tsx
   
   Local:   C:\Documents\proyectos\Torneogolf\frontend\src\App.tsx
   Remoto:  /home/retailso/torneogolf-source/frontend/src/App.tsx
   ```
   
   **IMPORTANTE:** Si subes estos archivos del frontend, después deberás reconstruir:
   ```bash
   cd /home/retailso/torneogolf-source/frontend
   npm run build
   cp -r dist/* /home/retailso/torneogolf.retailsolutionstimetracker.com/
   ```

---

## 🖥️ **COMANDOS EN EL SERVIDOR (Después de subir archivos)**

Una vez que hayas subido los archivos con FileZilla, conectarte por SSH y ejecutar:

```bash
# 1. Ir al directorio del proyecto
cd /home/retailso/torneogolf-source/

# 2. Verificar que los archivos se subieron correctamente
ls -lh backend/src/server.js
ls -lh backend/src/services/database.js

# 3. Verificar que el código está correcto (debe mostrar 'club_name' NO 'course_name')
grep "gc.club_name" backend/src/services/database.js

# 4. Reiniciar el backend
pm2 restart teetracker-backend

# 5. Ver los logs para verificar que no hay errores
pm2 logs teetracker-backend --lines 30 --nostream

# 6. Probar la API
curl http://localhost:8000/api/system/clubs

# 7. Ver estado
pm2 status
```

---

## ✅ **VERIFICACIÓN FINAL**

### En el Servidor:
```bash
# Ver logs en tiempo real
pm2 logs teetracker-backend

# No debería ver el error:
# ❌ "Unknown column 'gc.course_name'"
```

### En el Navegador:
1. Abrir: `https://torneogolf.retailsolutionstimetracker.com`
2. Debería cargar sin errores
3. Login debería funcionar

---

## 📋 **CHECKLIST**

- [ ] ✅ Conectado a FileZilla
- [ ] ✅ Subido `backend/src/server.js`
- [ ] ✅ Subido `backend/src/services/database.js`
- [ ] ✅ (Opcional) Subido `ecosystem.config.cjs`
- [ ] ✅ (Opcional) Subidos archivos de frontend
- [ ] ✅ Conectado por SSH al servidor
- [ ] ✅ Ejecutado `pm2 restart teetracker-backend`
- [ ] ✅ Verificado logs: `pm2 logs teetracker-backend`
- [ ] ✅ Probado API: `curl http://localhost:8000/api/system/clubs`
- [ ] ✅ Abierto sitio web en navegador
- [ ] ✅ No hay errores

---

## 🆘 **Si algo sale mal**

### Error: No puedo conectarme con FileZilla
```bash
# Verificar que el servidor SFTP/FTP está activo
ssh retailso@tu-servidor
# Si SSH funciona, SFTP también debería funcionar
```

### Error: No tengo permisos para sobrescribir archivos
```bash
# En el servidor, cambiar permisos
sudo chown -R retailso:retailso /home/retailso/torneogolf-source/
chmod -R 755 /home/retailso/torneogolf-source/
```

### Error: PM2 no reinicia correctamente
```bash
# Parar y volver a iniciar
pm2 delete teetracker-backend
pm2 start ecosystem.config.cjs --env production --only teetracker-backend
pm2 save
```

### Error persiste después de actualizar
```bash
# Ver logs completos
pm2 logs teetracker-backend --lines 100

# Verificar que el archivo se actualizó
cat backend/src/services/database.js | grep "club_name"
```

---

## 🎯 **Resultado Esperado**

✅ Backend reiniciado correctamente  
✅ No hay error "Unknown column 'gc.course_name'"  
✅ API responde en `http://localhost:8000/api/system/clubs`  
✅ Sitio web carga en `https://torneogolf.retailsolutionstimetracker.com`  
✅ Login funciona correctamente  

---

**Última actualización:** 2025-12-18  
**Git Commit:** 64137da - "Fix: Correcciones para producción y nueva funcionalidad"

