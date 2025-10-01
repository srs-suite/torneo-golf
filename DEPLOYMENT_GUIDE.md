# 🚀 Guía de Despliegue - TeeTracker Pro

## ✅ Estado del Proyecto

### **Sistema Listo para Producción:**
- ✅ Backend funcionando correctamente (puerto 8000)
- ✅ Frontend optimizado (puerto 5173)
- ✅ Base de datos configurada y poblada
- ✅ Importación de Excel con reporte inteligente
- ✅ Todos los endpoints críticos funcionando
- ✅ Estructura de proyecto organizada

---

## 📁 Estructura del Proyecto

```
Torneogolf/
├── backend/                 # Backend Node.js
│   ├── src/
│   │   ├── server.js       # Servidor principal
│   │   ├── config/         # Configuración BD
│   │   └── services/       # Lógica de negocio
│   ├── package.json
│   └── node_modules/
├── frontend/               # Frontend React + TypeScript
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/         # Páginas principales
│   │   └── services/      # Servicios API
│   ├── package.json
│   └── node_modules/
├── scripts/               # Scripts de inicio
│   ├── INICIAR_TODO.bat   # Script Windows
│   └── INICIAR_SISTEMA_PS5.ps1
├── docs/                  # Documentación
├── .env                   # Variables desarrollo
├── .env.production        # Variables producción
├── ecosystem.config.cjs   # Configuración PM2
└── package.json          # Configuración raíz
```

---

## 🔧 Configuración para Producción

### **1. Variables de Entorno (.env.production)**

```bash
# Base de Datos
DB_HOST=tu_servidor_mysql
DB_PORT=3306
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=tu_base_datos

# Servidor
PORT=8000
NODE_ENV=production

# JWT
JWT_SECRET=tu_jwt_secreto_super_seguro
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=https://tu-dominio.com

# Uploads
UPLOAD_PATH=uploads
MAX_FILE_SIZE=2097152
```

### **2. Configuración del Frontend (vite.config.ts)**

Para producción, actualizar el proxy:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8000', // O tu servidor de producción
    changeOrigin: true
  }
}
```

---

## 🚀 Pasos de Despliegue

### **Opción A: Despliegue Manual**

1. **Subir archivos al servidor:**
   ```bash
   # Subir toda la carpeta Torneogolf/ al servidor
   scp -r Torneogolf/ usuario@servidor:/var/www/
   ```

2. **Instalar dependencias:**
   ```bash
   cd /var/www/Torneogolf
   
   # Backend
   cd backend && npm install
   
   # Frontend
   cd ../frontend && npm install && npm run build
   ```

3. **Configurar base de datos:**
   ```bash
   # Importar esquema
   mysql -u usuario -p base_datos < backend/database/database_schema.sql
   ```

4. **Iniciar servicios:**
   ```bash
   # Con PM2 (recomendado)
   pm2 start ecosystem.config.cjs --env production
   
   # O manualmente
   cd backend/src && node server.js
   ```

### **Opción B: Despliegue con PM2 (Recomendado)**

1. **Instalar PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Configurar y ejecutar:**
   ```bash
   pm2 start ecosystem.config.cjs --env production
   pm2 save
   pm2 startup
   ```

---

## 🔍 Verificación Post-Despliegue

### **Endpoints a Probar:**

```bash
# Estadísticas del sistema
curl https://tu-dominio.com/api/system/stats

# Lista de clubs
curl https://tu-dominio.com/api/system/clubs

# Actividad reciente
curl https://tu-dominio.com/api/system/recent
```

### **Funcionalidades Críticas:**
- ✅ Login de administradores
- ✅ Gestión de socios
- ✅ Importación de Excel con reporte
- ✅ Creación de torneos
- ✅ Gestión de scorecards

---

## 🛡️ Seguridad

### **Configuraciones Importantes:**

1. **Cambiar credenciales por defecto**
2. **Configurar HTTPS**
3. **Actualizar JWT_SECRET**
4. **Configurar firewall**
5. **Backup automático de BD**

---

## 📊 Monitoreo

### **Logs importantes:**
```bash
# PM2 logs
pm2 logs

# Logs específicos
tail -f logs/backend-combined.log
```

### **Métricas a monitorear:**
- Uso de memoria
- Tiempo de respuesta API
- Errores de base de datos
- Conexiones activas

---

## 🆘 Troubleshooting

### **Problemas Comunes:**

1. **Puerto 8000 ocupado:**
   ```bash
   sudo lsof -i :8000
   sudo kill -9 PID
   ```

2. **Error de conexión BD:**
   - Verificar credenciales en .env.production
   - Comprobar que MySQL esté ejecutándose

3. **Frontend no carga:**
   - Verificar proxy en vite.config.ts
   - Comprobar CORS en backend

4. **Importación Excel falla:**
   - Verificar permisos de escritura
   - Comprobar formato de archivo

---

## 📞 Soporte

Para problemas técnicos:
1. Revisar logs de PM2
2. Verificar configuración de .env
3. Comprobar estado de servicios
4. Revisar documentación en /docs/

---

**✅ Sistema listo para producción con todas las funcionalidades implementadas y probadas.**
