# 🚨 SOLUCIÓN DE ERRORES EN PRODUCCIÓN - TeeTracker Pro

## Problema Detectado

El sistema en producción está intentando conectarse al puerto **3005** en lugar del puerto **8000** correcto.

**Errores vistos:**
```
Error: connect ECONNREFUSED 127.0.0.1:3005
at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1636:16)
http proxy error at /api/system/clubs
```

---

## 🔧 SOLUCIÓN PASO A PASO

### **PASO 1: Conectarse al servidor de producción**

```bash
ssh usuario@tu-servidor
cd /var/www/torneogolf  # O la ruta donde esté instalado el proyecto
```

---

### **PASO 2: Verificar el archivo .env del backend**

```bash
cat backend/.env
```

**Debe contener:**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=teetracker_pro

PORT=8000              # ← IMPORTANTE: Debe ser 8000, NO 3005
NODE_ENV=production

JWT_SECRET=tu_jwt_secreto_super_seguro
JWT_EXPIRES_IN=7d

FRONTEND_URL=https://torneogolf.retailsolutionstimetracker.com
```

**Si el PORT está en 3005, cambiarlo:**
```bash
nano backend/.env
# Cambiar PORT=3005 por PORT=8000
# Guardar: Ctrl+O, Enter, Ctrl+X
```

---

### **PASO 3: Verificar configuración de Nginx**

```bash
# Ver configuración actual
sudo cat /etc/nginx/sites-available/torneogolf
# O puede estar en otro nombre como: teetracker, default, etc.

# Listar todas las configuraciones
ls -la /etc/nginx/sites-available/
```

**La sección del proxy API debe verse así:**
```nginx
location /api/ {
    proxy_pass http://localhost:8000;   # ← IMPORTANTE: Debe ser 8000
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

**Si está en 3005, editar:**
```bash
sudo nano /etc/nginx/sites-available/torneogolf
# Cambiar proxy_pass http://localhost:3005 por http://localhost:8000
# Guardar: Ctrl+O, Enter, Ctrl+X
```

**Probar configuración de Nginx:**
```bash
sudo nginx -t
```

Si dice "syntax is okay" y "test is successful", continuar. Si hay errores, corregirlos antes de continuar.

---

### **PASO 4: Verificar proceso del backend**

```bash
# Ver procesos de PM2
pm2 status
```

**Buscar el proceso del backend (puede llamarse `teetracker-backend` o similar)**

```bash
# Ver en qué puerto está escuchando realmente
pm2 logs teetracker-backend --lines 20

# También puedes verificar con:
sudo netstat -tulpn | grep node
# O
sudo ss -tulpn | grep node
```

**Deberías ver algo como:**
```
tcp  0  0  0.0.0.0:8000  0.0.0.0:*  LISTEN  12345/node
```

Si ves puerto 3005, el backend está mal configurado.

---

### **PASO 5: Verificar el archivo ecosystem.config.cjs**

```bash
cat ecosystem.config.cjs
```

**Debe tener:**
```javascript
module.exports = {
  apps: [{
    name: 'teetracker-backend',
    script: './backend/src/server.js',
    env_production: {
      NODE_ENV: 'production',
      PORT: 8000    // ← IMPORTANTE: Debe ser 8000
    }
  }]
};
```

**Si dice PORT: 3005, corregir:**
```bash
nano ecosystem.config.cjs
# Cambiar PORT: 3005 por PORT: 8000
# Guardar: Ctrl+O, Enter, Ctrl+X
```

---

### **PASO 6: Reconstruir el frontend**

El frontend necesita ser reconstruido para asegurarse de que use las configuraciones correctas.

```bash
cd frontend

# Instalar dependencias (por si acaso)
npm install

# Construir para producción
npm run build
```

Esto generará la carpeta `frontend/dist` con los archivos optimizados.

---

### **PASO 7: Reiniciar todos los servicios**

```bash
# Reiniciar backend con PM2
pm2 restart teetracker-backend
# O si prefieres parar y volver a iniciar:
pm2 delete teetracker-backend
pm2 start ecosystem.config.cjs --env production

# Guardar configuración de PM2
pm2 save

# Recargar Nginx
sudo systemctl reload nginx
# O reiniciar si hubo cambios mayores:
sudo systemctl restart nginx
```

---

### **PASO 8: Verificar que todo funciona**

**8.1 Verificar backend directamente:**
```bash
curl http://localhost:8000/api/system/clubs
```

Deberías ver una respuesta JSON con datos de clubs (o un array vacío si no hay clubs).

**8.2 Verificar desde el exterior:**
```bash
curl https://torneogolf.retailsolutionstimetracker.com/api/system/clubs
```

**8.3 Ver logs en tiempo real:**
```bash
pm2 logs teetracker-backend
```

**8.4 Ver logs de Nginx:**
```bash
sudo tail -f /var/log/nginx/torneogolf_error.log
```

**8.5 Abrir en el navegador:**
```
https://torneogolf.retailsolutionstimetracker.com
```

---

## 📋 CHECKLIST DE VERIFICACIÓN

Marca cada paso completado:

- [ ] ✅ Backend `.env` tiene `PORT=8000`
- [ ] ✅ Nginx config tiene `proxy_pass http://localhost:8000`
- [ ] ✅ `ecosystem.config.cjs` tiene `PORT: 8000`
- [ ] ✅ Frontend reconstruido con `npm run build`
- [ ] ✅ PM2 muestra proceso corriendo correctamente
- [ ] ✅ `curl http://localhost:8000/api/system/clubs` funciona
- [ ] ✅ Sitio web carga correctamente en el navegador
- [ ] ✅ No hay errores en `pm2 logs`
- [ ] ✅ No hay errores en logs de Nginx

---

## 🔍 DIAGNÓSTICO ADICIONAL

Si después de los pasos anteriores sigues teniendo problemas:

### Verificar puertos en uso:
```bash
sudo netstat -tulpn | grep :8000
sudo netstat -tulpn | grep :3005
```

### Verificar firewall:
```bash
sudo ufw status
# Debe permitir puerto 80, 443, y opcionalmente 8000 si necesitas acceso directo
```

### Ver todos los procesos de Node:
```bash
ps aux | grep node
```

### Matar procesos antiguos si es necesario:
```bash
# Si encuentras procesos viejos en puerto 3005
sudo kill -9 [PID]
```

### Verificar variables de entorno del proceso:
```bash
pm2 env 0  # Donde 0 es el ID del proceso
```

---

## 📞 COMANDOS ÚTILES POST-DEPLOYMENT

```bash
# Estado del sistema
pm2 status
sudo systemctl status nginx

# Logs en tiempo real
pm2 logs --lines 50
sudo tail -f /var/log/nginx/torneogolf_error.log

# Reiniciar servicios
pm2 restart all
sudo systemctl restart nginx

# Backup de base de datos antes de cambios
mysqldump -u usuario -p teetracker_pro > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🎯 RESULTADO ESPERADO

Después de aplicar estos cambios:

✅ El backend escucha en el puerto **8000**  
✅ Nginx redirige `/api/*` a `http://localhost:8000`  
✅ El frontend (React) se sirve desde `frontend/dist`  
✅ Todas las peticiones API funcionan correctamente  
✅ No hay errores de conexión ECONNREFUSED  

**URLs finales:**
- **Frontend**: https://torneogolf.retailsolutionstimetracker.com
- **API Backend**: https://torneogolf.retailsolutionstimetracker.com/api/*
- **Backend interno**: http://localhost:8000

---

## 📝 NOTAS IMPORTANTES

1. **Nunca exponer el puerto 8000 externamente** - Solo Nginx debe acceder al backend
2. **Siempre hacer backup** de la base de datos antes de cambios grandes
3. **Verificar logs** después de cada cambio
4. **Usar HTTPS** en producción (Let's Encrypt configurado correctamente)

---

Si después de seguir todos estos pasos el problema persiste, revisar:
- Logs completos de PM2: `pm2 logs --lines 200`
- Logs completos de Nginx: `sudo tail -100 /var/log/nginx/torneogolf_error.log`
- Estado de MySQL: `sudo systemctl status mysql`

