# 🚀 GUÍA DE DEPLOYMENT A PRODUCCIÓN - TeeTracker Pro

## 📋 **PRE-REQUISITOS**

### Servidor
- ✅ Ubuntu 20.04+ / Linux
- ✅ Node.js 18+ instalado
- ✅ MySQL 8.0+ instalado
- ✅ PM2 instalado (para gestión de procesos)
- ✅ Nginx instalado (como proxy reverso)
- ✅ Dominio configurado (ejemplo: `teetracker.com`)
- ✅ Certificado SSL (Let's Encrypt recomendado)

### Accesos
- ✅ SSH al servidor
- ✅ Credenciales de base de datos
- ✅ Permisos de sudo

---

## 🔧 **PASO 1: PREPARAR EL CÓDIGO**

### 1.1 Build del Frontend

```bash
cd frontend
npm run build
```

Esto genera la carpeta `frontend/dist` con los archivos estáticos optimizados.

### 1.2 Verificar que no haya errores

```bash
# Backend
cd backend
npm run dev

# Verificar que inicia sin errores
# Ctrl+C para detener
```

---

## 📦 **PASO 2: CONFIGURAR EL SERVIDOR**

### 2.1 Conectar al Servidor

```bash
ssh usuario@tu-servidor.com
```

### 2.2 Instalar Dependencias

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2
sudo npm install -g pm2

# Instalar Nginx
sudo apt install -y nginx

# Instalar MySQL
sudo apt install -y mysql-server
```

### 2.3 Configurar MySQL

```bash
# Configurar MySQL
sudo mysql_secure_installation

# Crear base de datos
sudo mysql -u root -p
```

```sql
CREATE DATABASE teetracker_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'teetracker'@'localhost' IDENTIFIED BY 'TU_PASSWORD_SEGURA';
GRANT ALL PRIVILEGES ON teetracker_pro.* TO 'teetracker'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 📂 **PASO 3: SUBIR EL CÓDIGO**

### Opción A: Con Git (Recomendado)

```bash
# En el servidor
cd /var/www
sudo git clone https://github.com/tu-usuario/teetracker-pro.git
sudo chown -R $USER:$USER teetracker-pro
cd teetracker-pro
```

### Opción B: Con SCP/SFTP

```bash
# Desde tu computadora local
cd C:\Documents\proyectos\Torneogolf

# Comprimir el proyecto (excluyendo node_modules)
tar -czf teetracker.tar.gz --exclude=node_modules --exclude=.git .

# Subir al servidor
scp teetracker.tar.gz usuario@tu-servidor.com:/var/www/

# En el servidor
cd /var/www
tar -xzf teetracker.tar.gz -C teetracker-pro
cd teetracker-pro
```

---

## ⚙️ **PASO 4: CONFIGURAR VARIABLES DE ENTORNO**

### 4.1 Backend (.env de producción)

```bash
cd /var/www/teetracker-pro/backend
nano .env
```

```env
# Base de datos
DB_HOST=localhost
DB_USER=teetracker
DB_PASSWORD=TU_PASSWORD_SEGURA
DB_NAME=teetracker_pro
DB_PORT=3306

# Servidor
NODE_ENV=production
PORT=8000

# Seguridad (generar claves aleatorias)
JWT_SECRET=tu_jwt_secret_super_seguro_aqui_64_caracteres_minimo
SESSION_SECRET=tu_session_secret_super_seguro_aqui_64_caracteres

# CORS (tu dominio)
ALLOWED_ORIGINS=https://teetracker.com,https://www.teetracker.com
```

### 4.2 Instalar Dependencias

```bash
# Backend
cd /var/www/teetracker-pro/backend
npm install --production

# Frontend (solo si no hiciste build local)
cd /var/www/teetracker-pro/frontend
npm install
npm run build
```

---

## 🗄️ **PASO 5: IMPORTAR BASE DE DATOS**

```bash
# Si tienes un dump de tu base de datos local
mysql -u teetracker -p teetracker_pro < /ruta/al/dump.sql

# O ejecutar los scripts de inicialización
mysql -u teetracker -p teetracker_pro < /var/www/teetracker-pro/backend/database/database_schema.sql
```

---

## 🔄 **PASO 6: CONFIGURAR PM2**

### 6.1 Crear archivo de configuración PM2

```bash
cd /var/www/teetracker-pro
nano ecosystem.config.cjs
```

```javascript
module.exports = {
  apps: [{
    name: 'teetracker-backend',
    script: './backend/src/server.js',
    cwd: '/var/www/teetracker-pro/backend',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    max_memory_restart: '500M'
  }]
};
```

### 6.2 Iniciar con PM2

```bash
# Crear carpeta de logs
mkdir -p /var/www/teetracker-pro/backend/logs

# Iniciar aplicación
pm2 start ecosystem.config.cjs

# Verificar estado
pm2 status

# Ver logs
pm2 logs teetracker-backend

# Configurar para que inicie al arrancar el servidor
pm2 startup
pm2 save
```

---

## 🌐 **PASO 7: CONFIGURAR NGINX**

### 7.1 Crear configuración de Nginx

```bash
sudo nano /etc/nginx/sites-available/teetracker
```

```nginx
# Redirigir HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name teetracker.com www.teetracker.com;
    return 301 https://$server_name$request_uri;
}

# Servidor HTTPS principal
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name teetracker.com www.teetracker.com;

    # Certificados SSL (configurar después con Certbot)
    ssl_certificate /etc/letsencrypt/live/teetracker.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/teetracker.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Logs
    access_log /var/log/nginx/teetracker_access.log;
    error_log /var/log/nginx/teetracker_error.log;

    # Configuración de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend - Archivos estáticos
    location / {
        root /var/www/teetracker-pro/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Backend API - Proxy reverso
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Archivos estáticos del frontend (CSS, JS, imágenes)
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/teetracker-pro/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 7.2 Activar configuración

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/teetracker /etc/nginx/sites-enabled/

# Probar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 🔐 **PASO 8: CONFIGURAR SSL (HTTPS)**

### 8.1 Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2 Obtener Certificado SSL

```bash
sudo certbot --nginx -d teetracker.com -d www.teetracker.com
```

Sigue las instrucciones interactivas.

### 8.3 Renovación Automática

```bash
# Probar renovación
sudo certbot renew --dry-run

# Certbot configura automáticamente un cron job para renovación
```

---

## 🔥 **PASO 9: CONFIGURAR FIREWALL**

```bash
# Permitir SSH, HTTP y HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verificar estado
sudo ufw status
```

---

## ✅ **PASO 10: VERIFICAR DEPLOYMENT**

### 10.1 Verificar Backend

```bash
# Estado de PM2
pm2 status

# Logs del backend
pm2 logs teetracker-backend --lines 50

# Probar API directamente
curl http://localhost:8000/api/system/clubs
```

### 10.2 Verificar Frontend

```bash
# Probar desde el navegador
https://teetracker.com

# Verificar que los archivos estáticos se sirvan correctamente
curl -I https://teetracker.com
```

### 10.3 Verificar Base de Datos

```bash
mysql -u teetracker -p teetracker_pro -e "SHOW TABLES;"
```

---

## 🔄 **PASO 11: ACTUALIZACIONES FUTURAS**

### Script de Deployment

```bash
# Crear script de actualización
nano /var/www/teetracker-pro/deploy.sh
```

```bash
#!/bin/bash
set -e

echo "🚀 Iniciando deployment..."

# Ir al directorio del proyecto
cd /var/www/teetracker-pro

# Hacer backup de la base de datos
echo "📦 Haciendo backup de la base de datos..."
mysqldump -u teetracker -p teetracker_pro > backup_$(date +%Y%m%d_%H%M%S).sql

# Pull latest code (si usas Git)
echo "📥 Descargando código nuevo..."
git pull origin main

# Backend
echo "🔧 Actualizando backend..."
cd backend
npm install --production

# Frontend
echo "🎨 Construyendo frontend..."
cd ../frontend
npm install
npm run build

# Reiniciar backend
echo "🔄 Reiniciando backend..."
pm2 restart teetracker-backend

# Recargar Nginx
echo "🌐 Recargando Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment completado!"
```

```bash
# Dar permisos de ejecución
chmod +x /var/www/teetracker-pro/deploy.sh
```

### Para actualizar:

```bash
cd /var/www/teetracker-pro
./deploy.sh
```

---

## 📊 **PASO 12: MONITOREO**

### 12.1 Logs

```bash
# Logs de PM2
pm2 logs

# Logs de Nginx
sudo tail -f /var/log/nginx/teetracker_access.log
sudo tail -f /var/log/nginx/teetracker_error.log

# Logs de MySQL
sudo tail -f /var/log/mysql/error.log
```

### 12.2 Monitoreo de PM2

```bash
# Dashboard web de PM2 (opcional)
pm2 install pm2-server-monit
```

---

## 🔒 **PASO 13: BACKUPS AUTOMÁTICOS**

### 13.1 Script de Backup

```bash
sudo nano /usr/local/bin/backup-teetracker.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/teetracker"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup de base de datos
mysqldump -u teetracker -pTU_PASSWORD teetracker_pro | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Mantener solo los últimos 7 backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completado: db_$DATE.sql.gz"
```

### 13.2 Cron Job para Backups

```bash
sudo chmod +x /usr/local/bin/backup-teetracker.sh
sudo crontab -e
```

Agregar:
```
# Backup diario a las 2:00 AM
0 2 * * * /usr/local/bin/backup-teetracker.sh
```

---

## 🎯 **CHECKLIST FINAL**

Antes de marcar como completado, verificar:

- [ ] ✅ Base de datos configurada y funcionando
- [ ] ✅ Backend corriendo en PM2
- [ ] ✅ Frontend servido por Nginx
- [ ] ✅ SSL/HTTPS configurado
- [ ] ✅ Firewall configurado
- [ ] ✅ Backups automáticos configurados
- [ ] ✅ Variables de entorno de producción configuradas
- [ ] ✅ Dominio apuntando al servidor
- [ ] ✅ Todas las funcionalidades probadas
- [ ] ✅ WhatsApp funcionando correctamente
- [ ] ✅ Logs monitoreándose

---

## 📞 **COMANDOS ÚTILES**

```bash
# Estado del sistema
pm2 status
sudo systemctl status nginx
sudo systemctl status mysql

# Reiniciar servicios
pm2 restart all
sudo systemctl restart nginx
sudo systemctl restart mysql

# Ver logs en tiempo real
pm2 logs --lines 50
sudo tail -f /var/log/nginx/teetracker_error.log

# Verificar uso de recursos
pm2 monit
htop

# Backup manual de base de datos
mysqldump -u teetracker -p teetracker_pro > backup.sql
```

---

## 🆘 **TROUBLESHOOTING**

### Backend no inicia
```bash
pm2 logs teetracker-backend --lines 100
# Verificar .env
# Verificar conexión a base de datos
```

### Frontend no se ve
```bash
# Verificar archivos en dist
ls -la /var/www/teetracker-pro/frontend/dist

# Verificar configuración de Nginx
sudo nginx -t

# Ver logs de Nginx
sudo tail -f /var/log/nginx/teetracker_error.log
```

### Base de datos no conecta
```bash
# Verificar que MySQL esté corriendo
sudo systemctl status mysql

# Probar conexión manual
mysql -u teetracker -p -h localhost teetracker_pro
```

---

**🎉 ¡Tu sistema estará en producción!** 🎉

Para cualquier duda durante el proceso, consulta los logs o contacta al equipo de soporte.

