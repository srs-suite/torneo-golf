# 🏌️ TeeTracker Pro - Sistema de Gestión de Torneos de Golf

Sistema completo para la gestión de torneos de golf con funcionalidades avanzadas de tee times, scorecards y administración multi-club.

## 📋 Tabla de Contenidos

- [Requisitos del Sistema](#requisitos-del-sistema)
- [Configuración del Entorno](#configuración-del-entorno)
- [Desarrollo](#desarrollo)
- [Producción](#producción)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Comandos Útiles](#comandos-útiles)
- [Troubleshooting](#troubleshooting)

## 🔧 Requisitos del Sistema

### Desarrollo
- **Node.js**: v18+ 
- **npm**: v8+
- **PM2**: Para gestión de procesos
- **MySQL**: v8.0+

### Producción (Linux)
- **Ubuntu/Debian**: 20.04+
- **Node.js**: v18+
- **npm**: v8+
- **PM2**: Para gestión de procesos
- **MySQL**: v8.0+
- **Nginx**: Para proxy reverso (opcional)

## ⚙️ Configuración del Entorno

### 1. Archivo .env

Crea un archivo `.env` en el **directorio raíz del proyecto** con las siguientes variables:

```bash
# Database Configuration
DB_HOST=tu_host_de_mysql
DB_PORT=3306
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_password_mysql
DB_NAME=nombre_de_tu_base_de_datos

# JWT Configuration
JWT_SECRET=tu_jwt_secret_super_seguro_aqui
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3005
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:5173

# Upload Configuration
UPLOAD_PATH=uploads
MAX_FILE_SIZE=2097152

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Variables de Entorno por Ambiente

#### Desarrollo
```bash
NODE_ENV=development
PORT=3005
FRONTEND_URL=http://localhost:5173
```

#### Producción
```bash
NODE_ENV=production
PORT=3005
FRONTEND_URL=http://tu-dominio.com
```

## 🚀 Desarrollo

### Instalación Inicial

```bash
# Clonar el repositorio
git clone <tu-repositorio>
cd torneo-golf

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install

# Volver al directorio raíz
cd ..
```

### Levantar el Sistema en Desarrollo

#### Opción 1: Script Automático (Recomendado)

**Windows:**
```bash
# Usar el script existente
start-system.sh
```

**Linux:**
```bash
# Hacer ejecutable y ejecutar
chmod +x start-dev-linux.sh
./start-dev-linux.sh
```

#### Opción 2: PM2 (Multiplataforma)

```bash
# Iniciar todos los servicios
pm2 start ecosystem.config.cjs

# Ver estado
pm2 status

# Ver logs
pm2 logs
```

#### Opción 3: Manual

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### URLs de Desarrollo

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3005
- **API Docs**: http://localhost:3005/api-docs (si está configurado)

## 🏭 Producción

### Preparación del Servidor Linux

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js (usando NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar MySQL
sudo apt install mysql-server -y

# Configurar MySQL
sudo mysql_secure_installation
```

### Deployment en Producción

#### Opción 1: Script Automático (Recomendado)

```bash
# Hacer ejecutable el script de deployment
chmod +x deploy-linux.sh

# Ejecutar deployment completo
./deploy-linux.sh
```

#### Opción 2: Pasos Manuales

```bash
# 1. Detener procesos existentes
pm2 stop all

# 2. Instalar dependencias del backend
cd backend
npm install --production

# 3. Instalar dependencias del frontend
cd ../frontend
npm install

# 4. Construir el frontend para producción
npm run build

# 5. Volver al directorio raíz
cd ..

# 6. Configurar permisos de scripts
chmod +x start-frontend.sh
chmod +x serve-frontend-prod.sh

# 7. Iniciar servicios en producción
pm2 start ecosystem.config.cjs --env production

# 8. Guardar configuración de PM2
pm2 save

# 9. Configurar PM2 para inicio automático
pm2 startup
```

### URLs de Producción

- **Frontend**: http://tu-servidor:4173
- **Backend**: http://tu-servidor:3005

### Configuración de Nginx (Opcional)

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend
    location / {
        proxy_pass http://localhost:4173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3005;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📁 Estructura del Proyecto

```
torneo-golf/
├── backend/                 # API Node.js/Express
│   ├── src/
│   │   ├── config/         # Configuración de base de datos
│   │   ├── services/       # Servicios de negocio
│   │   └── server.js       # Servidor principal
│   ├── database/           # Scripts SQL
│   └── package.json
├── frontend/               # Aplicación React/Vite
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/         # Páginas de la aplicación
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # Servicios de API
│   │   └── types/         # Tipos TypeScript
│   └── package.json
├── logs/                  # Logs de PM2
├── ecosystem.config.cjs   # Configuración de PM2
├── .env                   # Variables de entorno
└── README.md
```

## 🛠️ Comandos Útiles

### PM2 - Gestión de Procesos

```bash
# Ver estado de todos los servicios
pm2 status

# Ver logs en tiempo real
pm2 logs

# Ver logs de un servicio específico
pm2 logs teetracker-backend
pm2 logs teetracker-frontend

# Reiniciar servicios
pm2 restart all
pm2 restart teetracker-backend

# Detener servicios
pm2 stop all
pm2 stop teetracker-frontend

# Eliminar servicios
pm2 delete all
pm2 delete teetracker-backend

# Monitoreo en tiempo real
pm2 monit

# Guardar configuración actual
pm2 save

# Configurar inicio automático
pm2 startup
```

### Desarrollo

```bash
# Backend
cd backend
npm start          # Iniciar servidor
npm run dev        # Modo desarrollo con nodemon
npm test           # Ejecutar tests

# Frontend
cd frontend
npm run dev        # Servidor de desarrollo
npm run build      # Construir para producción
npm run preview    # Preview de producción
npm run lint       # Linter
```

### Base de Datos

```bash
# Importar esquema inicial
mysql -u usuario -p nombre_db < backend/database/database_schema.sql

# Importar datos básicos
mysql -u usuario -p nombre_db < backend/database/setup_basic_tables.sql
```

## 🔍 Troubleshooting

### Problemas Comunes

#### 1. Error de conexión a base de datos
```bash
# Verificar que MySQL esté corriendo
sudo systemctl status mysql

# Verificar variables de entorno
cat .env | grep DB_
```

#### 2. Puerto ya en uso
```bash
# Verificar qué proceso usa el puerto
sudo netstat -tulpn | grep :3005
sudo netstat -tulpn | grep :5173

# Matar proceso si es necesario
sudo kill -9 PID_DEL_PROCESO
```

#### 3. PM2 no inicia servicios
```bash
# Limpiar PM2
pm2 kill
pm2 start ecosystem.config.cjs

# Verificar logs
pm2 logs --err
```

#### 4. Frontend no compila
```bash
# Limpiar node_modules y reinstalar
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 5. Permisos en Linux
```bash
# Dar permisos a scripts
chmod +x *.sh
chmod +x scripts/*.sh

# Verificar permisos
ls -la *.sh
```

### Logs Importantes

- **Backend**: `./logs/backend-combined.log`
- **Frontend**: `./logs/frontend-combined.log`
- **PM2**: `~/.pm2/logs/`

### Verificación del Sistema

```bash
# Verificar que todos los servicios estén corriendo
pm2 status

# Verificar conectividad
curl http://localhost:3005/health
curl http://localhost:5173

# Verificar base de datos
mysql -u $DB_USER -p$DB_PASSWORD -h $DB_HOST $DB_NAME -e "SHOW TABLES;"
```

## 📞 Soporte

Para problemas o dudas:

1. Revisar los logs en `./logs/`
2. Verificar la configuración del archivo `.env`
3. Consultar la documentación en `./docs/`
4. Verificar que todos los requisitos estén instalados

## 🔄 Actualizaciones

Para actualizar el sistema:

```bash
# Desarrollo
git pull origin main
cd backend && npm install
cd ../frontend && npm install
pm2 restart all

# Producción
git pull origin main
./deploy-linux.sh
```

---

**TeeTracker Pro** - Sistema de Gestión de Torneos de Golf v1.0.0