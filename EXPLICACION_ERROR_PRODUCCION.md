# 🔍 EXPLICACIÓN DEL ERROR EN PRODUCCIÓN

## ❌ El Error

```
Unknown column 'gc.course_name' in 'SELECT'
```

---

## 🕵️ ¿Qué está pasando?

### En PRODUCCIÓN (código viejo):
```sql
SELECT 
    ca.*,
    gc.course_name as club_name,  ← ❌ INCORRECTO: busca 'course_name'
    gc.club_code
FROM club_administrators ca
LEFT JOIN clubs gc ON ca.course_id = gc.club_id
```

### En LOCAL (código actual/correcto):
```sql
SELECT 
    ca.*,
    gc.club_name as club_name,  ← ✅ CORRECTO: busca 'club_name'
    gc.club_code
FROM club_administrators ca
LEFT JOIN clubs gc ON ca.course_id = gc.club_id
```

---

## 📊 Estructura de la Tabla `clubs`

La tabla `clubs` en la base de datos tiene estas columnas:
- ✅ `club_id` (INT)
- ✅ `club_name` (VARCHAR)  ← Esta existe
- ❌ `course_name` ← Esta NO existe en la tabla `clubs`
- ✅ `club_code` (VARCHAR)
- ✅ `address`, `phone`, `email`, etc.

---

## 🔧 La Solución

**El código en producción está desactualizado.**

Necesitas actualizar el archivo:
```
backend/src/services/database.js
```

### Cambios Específicos:

**Línea 221** - Cambiar de:
```javascript
gc.course_name as club_name,  // ❌ INCORRECTO
```

A:
```javascript
gc.club_name as club_name,    // ✅ CORRECTO
```

---

## 📝 Funciones Afectadas

En el archivo `backend/src/services/database.js`:

1. **`getAllAdministrators()`** - Línea ~221
2. **`getAdministratorById()`** - Línea ~248
3. **`getAdministratorByUsername()`** - Línea ~266

Todas estas funciones tienen el mismo problema:
- Usan `gc.course_name` en producción (INCORRECTO)
- Deben usar `gc.club_name` (CORRECTO)

---

## 🚀 Pasos para Solucionar

### Opción A: Subir el archivo actualizado (RECOMENDADO)

1. **Desde tu máquina Windows:**
   ```powershell
   # Usar WinSCP, FileZilla, o SCP
   scp backend/src/services/database.js usuario@servidor:/home/retailso/torneogolf-source/backend/src/services/
   ```

2. **En el servidor:**
   ```bash
   cd /home/retailso/torneogolf-source/
   pm2 restart teetracker-backend
   pm2 logs teetracker-backend --lines 20
   ```

### Opción B: Usar Git

1. **En tu máquina local:**
   ```bash
   git add backend/src/services/database.js
   git commit -m "Fix: Corregir consulta SQL - usar club_name en lugar de course_name"
   git push origin main
   ```

2. **En el servidor:**
   ```bash
   cd /home/retailso/torneogolf-source/
   git pull origin main
   pm2 restart teetracker-backend
   ```

### Opción C: Editar directamente en el servidor (NO RECOMENDADO)

```bash
cd /home/retailso/torneogolf-source/
nano backend/src/services/database.js

# Buscar (Ctrl+W): gc.course_name
# Reemplazar por: gc.club_name
# Guardar: Ctrl+O, Enter, Ctrl+X

pm2 restart teetracker-backend
```

---

## ✅ Verificación

Después de aplicar el cambio:

```bash
# 1. Verificar que el backend inició sin errores
pm2 logs teetracker-backend --lines 30 --nostream

# 2. Probar la API
curl http://localhost:8000/api/system/clubs

# 3. Abrir en el navegador
# https://torneogolf.retailsolutionstimetracker.com
```

---

## 🎯 Resultado Esperado

✅ No más error "Unknown column 'gc.course_name'"  
✅ API responde correctamente  
✅ El sistema carga sin problemas  
✅ Los logs no muestran errores SQL  

---

## 📌 Nota Importante

Este error **NO afecta** el entorno local porque el código local ya está corregido.

Solo necesitas actualizar el código en el servidor de producción.

---

## 🆘 Si el Error Persiste

Si después de actualizar el archivo el error continúa:

1. **Verificar que el archivo se subió correctamente:**
   ```bash
   cat backend/src/services/database.js | grep "gc.club_name"
   ```

2. **Verificar el schema de la base de datos:**
   ```bash
   mysql -u root -p -e "USE teetracker_pro; DESCRIBE clubs;"
   ```

3. **Verificar que PM2 reinició correctamente:**
   ```bash
   pm2 restart teetracker-backend
   pm2 status
   ```

4. **Ver logs completos:**
   ```bash
   pm2 logs teetracker-backend --lines 100
   ```

---

**Fecha:** 2025-12-18  
**Error:** `Unknown column 'gc.course_name' in 'SELECT'`  
**Solución:** Cambiar `gc.course_name` por `gc.club_name` en 3 funciones  
**Archivo:** `backend/src/services/database.js`  
**Estado:** Código local ya corregido ✅ | Falta actualizar producción ⏳

