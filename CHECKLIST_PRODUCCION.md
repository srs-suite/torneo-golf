# ✅ CHECKLIST DE DEPLOYMENT A PRODUCCIÓN

## 📋 **ANTES DE EMPEZAR**

### Preparación Local
- [ ] ✅ Sistema funcionando 100% en local
- [ ] ✅ Todos los archivos de test eliminados
- [ ] ✅ Código limpio sin logs de debug
- [ ] ✅ Base de datos local funcionando
- [ ] ✅ Frontend compilando sin errores (`npm run build`)
- [ ] ✅ Backend iniciando sin errores
- [ ] ✅ Funcionalidad de WhatsApp probada

### Servidor
- [ ] Servidor Linux (Ubuntu 20.04+) disponible
- [ ] Acceso SSH configurado
- [ ] Dominio registrado y configurado
- [ ] IP del servidor conocida

---

## 🔧 **CONFIGURACIÓN DEL SERVIDOR**

### Instalación de Software Base
- [ ] Node.js 18+ instalado
- [ ] npm actualizado
- [ ] PM2 instalado globalmente
- [ ] MySQL 8.0+ instalado y configurado
- [ ] Nginx instalado
- [ ] Git instalado (opcional pero recomendado)

### Base de Datos
- [ ] Base de datos `teetracker_pro` creada
- [ ] Usuario de base de datos creado
- [ ] Permisos otorgados al usuario
- [ ] Charset UTF-8 configurado
- [ ] Schema importado
- [ ] Datos de prueba/producción importados
- [ ] Backup inicial creado

### Seguridad
- [ ] Firewall (ufw) configurado
- [ ] Puerto 22 (SSH) abierto
- [ ] Puerto 80 (HTTP) abierto
- [ ] Puerto 443 (HTTPS) abierto
- [ ] Puerto 3306 (MySQL) cerrado para conexiones externas
- [ ] Puerto 8000 (Backend) cerrado para conexiones externas

---

## 📦 **DEPLOYMENT DEL CÓDIGO**

### Subida de Archivos
- [ ] Código subido al servidor (Git o SCP)
- [ ] Ubicado en `/var/www/teetracker-pro`
- [ ] Permisos correctos asignados

### Backend
- [ ] Archivo `.env` creado con valores de producción
- [ ] Variables de entorno configuradas
- [ ] Dependencias instaladas (`npm install --production`)
- [ ] Carpeta `logs` creada
- [ ] Conexión a base de datos verificada

### Frontend
- [ ] Dependencias instaladas
- [ ] Build ejecutado (`npm run build`)
- [ ] Carpeta `dist` generada
- [ ] Archivos estáticos verificados

---

## ⚙️ **CONFIGURACIÓN DE SERVICIOS**

### PM2
- [ ] Archivo `ecosystem.config.cjs` configurado
- [ ] Backend iniciado con PM2
- [ ] Estado verificado (`pm2 status`)
- [ ] Logs funcionando (`pm2 logs`)
- [ ] Auto-restart configurado
- [ ] Startup configurado (`pm2 startup` y `pm2 save`)

### Nginx
- [ ] Archivo de configuración creado en `/etc/nginx/sites-available/`
- [ ] Enlace simbólico creado en `/etc/nginx/sites-enabled/`
- [ ] Configuración probada (`sudo nginx -t`)
- [ ] Nginx reiniciado
- [ ] Logs de acceso funcionando
- [ ] Logs de errores funcionando

### SSL/HTTPS
- [ ] Certbot instalado
- [ ] Certificado SSL obtenido
- [ ] Renovación automática configurada
- [ ] HTTPS funcionando
- [ ] Redirección HTTP → HTTPS configurada

---

## 🧪 **PRUEBAS DE FUNCIONAMIENTO**

### Backend API
- [ ] API responde en `http://localhost:8000`
- [ ] Endpoint `/api/system/clubs` funciona
- [ ] Conexión a base de datos OK
- [ ] Logs sin errores

### Frontend
- [ ] Sitio carga en `https://tu-dominio.com`
- [ ] Archivos CSS/JS se cargan correctamente
- [ ] Sin errores en consola del navegador
- [ ] Rutas del router funcionan

### Funcionalidades Críticas
- [ ] Login funciona
- [ ] Gestión de clubes funciona
- [ ] Gestión de socios funciona
- [ ] Gestión de torneos funciona
- [ ] Gestión de contabilidad funciona
- [ ] **WhatsApp funciona (números Argentina)**
- [ ] **WhatsApp funciona (números USA)**
- [ ] Modal de detalles de socio funciona
- [ ] Pestaña de pagos en modal funciona

### Performance
- [ ] Tiempos de carga < 3 segundos
- [ ] Sin memory leaks en PM2
- [ ] CPU usage < 50% en idle
- [ ] RAM usage < 500MB por instancia

---

## 🔒 **SEGURIDAD**

### Configuración
- [ ] Passwords fuertes configurados
- [ ] JWT secrets generados aleatoriamente
- [ ] CORS configurado correctamente
- [ ] Rate limiting configurado
- [ ] Headers de seguridad en Nginx
- [ ] No hay archivos `.env` en Git

### Base de Datos
- [ ] Usuario root de MySQL con password fuerte
- [ ] Usuario de aplicación con permisos mínimos
- [ ] Acceso remoto deshabilitado

---

## 📊 **MONITOREO Y BACKUPS**

### Logs
- [ ] Logs de PM2 configurados
- [ ] Logs de Nginx configurados
- [ ] Logs de MySQL configurados
- [ ] Rotación de logs configurada

### Backups
- [ ] Script de backup de base de datos creado
- [ ] Cron job para backups automáticos configurado
- [ ] Directorio de backups creado
- [ ] Retención de backups configurada (7 días)
- [ ] Backup inicial manual creado

### Monitoreo
- [ ] PM2 monit funcionando
- [ ] Alertas configuradas (opcional)
- [ ] Uptime monitoring configurado (opcional)

---

## 📱 **CONFIGURACIONES ESPECÍFICAS**

### WhatsApp
- [ ] Números de teléfono en formato correcto en DB
- [ ] Encoding UTF-8 verificado (San Jerónimo)
- [ ] Función de validación de números probada
- [ ] Mensajes generándose correctamente
- [ ] URLs de WhatsApp funcionando

### Multi-moneda
- [ ] Monedas ARS y USD funcionando
- [ ] Conversiones correctas
- [ ] Formato de números correcto

---

## 🚀 **POST-DEPLOYMENT**

### Verificación Final
- [ ] Sistema accesible públicamente
- [ ] Todas las funcionalidades probadas en producción
- [ ] Performance aceptable
- [ ] Sin errores en logs
- [ ] SSL válido y funcionando

### Documentación
- [ ] Credenciales guardadas en lugar seguro
- [ ] IPs y dominios documentados
- [ ] Comandos útiles documentados
- [ ] Contactos de soporte actualizados

### Comunicación
- [ ] Usuarios notificados del nuevo sistema
- [ ] Capacitación realizada (si aplica)
- [ ] Documentación de usuario entregada

---

## 🔄 **MANTENIMIENTO CONTINUO**

### Tareas Regulares
- [ ] Verificar backups semanalmente
- [ ] Revisar logs de errores
- [ ] Actualizar dependencias mensualmente
- [ ] Renovar certificados SSL (automático con Certbot)
- [ ] Revisar uso de recursos del servidor

### Plan de Contingencia
- [ ] Procedimiento de rollback documentado
- [ ] Backup de emergencia disponible
- [ ] Contacto de soporte técnico
- [ ] Plan B en caso de caída del servidor

---

## 📞 **INFORMACIÓN DE CONTACTO**

```
Servidor: 
IP: ___________________
Dominio: ___________________
SSH User: ___________________

Base de Datos:
Host: localhost
Puerto: 3306
DB Name: teetracker_pro
User: teetracker

Servicios:
PM2: teetracker-backend
Nginx: /etc/nginx/sites-available/teetracker

Logs:
Backend: /var/www/teetracker-pro/backend/logs/
Nginx: /var/log/nginx/
```

---

## ✅ **DEPLOYMENT COMPLETADO**

Fecha de deployment: _______________
Versión deployada: _______________
Deployado por: _______________

**Firma:** _______________

---

**🎉 ¡Sistema en producción y funcionando!** 🎉

