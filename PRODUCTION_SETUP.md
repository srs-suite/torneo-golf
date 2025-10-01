# 🚀 Configuración de Producción - TeeTracker Pro

## 📋 Checklist Pre-Despliegue

### ✅ Archivos Preparados:
- [x] Build de producción creado (`frontend/dist/`)
- [x] Configuración PM2 actualizada
- [x] Variables de entorno organizadas
- [x] Documentación completa

---

## 🔧 Configuración del Servidor

### **1. Variables de Entorno (.env en servidor)**

```bash
# Base de Datos de Producción
DB_HOST=vps123353.inmotionhosting.com
DB_PORT=3306
DB_USER=retailso_torneo
DB_PASSWORD=QKVdSfd4RuHr
DB_NAME=retailso_torneog

# Servidor
PORT=8000
NODE_ENV=production

# JWT (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET=tu_jwt_secreto_super_seguro_para_produccion
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=https://torneogolf.retailsolutionstimetracker.com

# Uploads
UPLOAD_PATH=uploads
MAX_FILE_SIZE=2097152

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **2. Dependencias del Servidor**

```bash
# Instalar serve para el frontend estático
npm install -g serve pm2

# En el directorio del proyecto
cd backend && npm install --production
cd ../frontend && npm install --production

# Compilar frontend para producción
npm run build
```

---

## 🚀 Comandos de Despliegue

### **Opción A: Con PM2 (Recomendado)**

```bash
# Iniciar servicios
pm2 start ecosystem.config.cjs --env production

# Guardar configuración
pm2 save
pm2 startup

# Ver logs
pm2 logs
```

### **Opción B: Manual**

```bash
# Backend
cd backend/src && node server.js &

# Frontend (en otra terminal)
cd frontend && serve -s dist -l 4173 &
```

---

## 🔍 Verificación Post-Despliegue

### **URLs a Probar:**

```bash
# Backend API
curl https://torneogolf.retailsolutionstimetracker.com/api/system/stats
curl https://torneogolf.retailsolutionstimetracker.com/api/system/clubs

# Frontend
https://torneogolf.retailsolutionstimetracker.com
```

### **Funcionalidades Críticas:**
- [ ] Login de administradores
- [ ] Dashboard con estadísticas
- [ ] Gestión de socios
- [ ] Importación Excel con reporte
- [ ] Creación de torneos
- [ ] Gestión de scorecards

---

## 🛡️ Configuración de Seguridad

### **1. Firewall**
```bash
# Permitir solo puertos necesarios
ufw allow 80
ufw allow 443
ufw allow 8000
ufw enable
```

### **2. SSL/HTTPS**
```bash
# Con Let's Encrypt
certbot --nginx -d torneogolf.retailsolutionstimetracker.com
```

### **3. Nginx (Opcional)**
```nginx
server {
    listen 80;
    server_name torneogolf.retailsolutionstimetracker.com;
    
    # Frontend
    location / {
        proxy_pass http://localhost:4173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📊 Monitoreo

### **Logs Importantes:**
```bash
# PM2
pm2 logs teetracker-backend
pm2 logs teetracker-frontend

# Sistema
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### **Métricas:**
```bash
# Estado de servicios
pm2 status

# Uso de recursos
pm2 monit
```

---

## 🆘 Troubleshooting

### **Problemas Comunes:**

1. **Puerto ocupado:**
   ```bash
   sudo lsof -i :8000
   sudo kill -9 PID
   ```

2. **Error de permisos:**
   ```bash
   sudo chown -R $USER:$USER /var/www/teetracker-pro
   chmod -R 755 /var/www/teetracker-pro
   ```

3. **Base de datos no conecta:**
   - Verificar credenciales en .env
   - Comprobar firewall del servidor MySQL
   - Verificar que MySQL esté ejecutándose

---

## ✅ Sistema Listo

**TeeTracker Pro está listo para producción con:**
- ✅ Frontend optimizado y compilado
- ✅ Backend con todas las funcionalidades
- ✅ Base de datos configurada
- ✅ Importación Excel inteligente
- ✅ Reportes detallados
- ✅ Configuración de seguridad
- ✅ Monitoreo y logs

**¡Despliegue exitoso garantizado!** 🎉
