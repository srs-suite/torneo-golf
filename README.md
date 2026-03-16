# 🏌️ TeeTracker Pro - Sistema de Gestión de Torneos

## 📁 Estructura del proyecto

```
Torneogolf/
├── backend/          # API Node.js
│   ├── src/         # Servidor y lógica
│   ├── database/    # Esquemas y migraciones SQL
│   └── migrations/   # Migraciones adicionales
├── frontend/        # App React (src/, public/, dist al hacer build)
├── docs/            # Documentación (flujos, arquitectura)
├── config/          # Configuración (ej. nginx-production.conf)
├── ecosystem.config.cjs   # PM2
├── package.json     # npm run build, start, etc.
├── env.example      # Plantilla de variables de entorno
└── README.md
```

## 📋 Requisitos

- Node.js v18+
- MySQL v8.0+
- PM2 (`npm install -g pm2`)

## ⚙️ Configuración - Archivos .env

En la **raíz del proyecto**:

- **`.env`** – Configuración por defecto (producción o la que uses al desplegar).
- **`.env.development`** – Solo para desarrollo local. Si existe y no estás en producción, el backend usa este archivo y se conecta a una **base local** (no a la de producción).

```
Torneogolf/
├── .env                  ← Producción / por defecto
├── .env.development      ← Opcional: dev con BD local (copia env.development.example)
├── backend/
├── frontend/
└── ecosystem.config.cjs
```

**Para desarrollo con MySQL local:** copiá `env.development.example` a `.env.development` y poné tu usuario/contraseña de MySQL local. El backend usará esa base cuando ejecutes `npm run dev` (NODE_ENV no es production).

**Contenido típico del .env (producción o por defecto):**

```bash
# Base de Datos
DB_HOST=tu_host_mysql
DB_PORT=3306
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=nombre_base_datos

# JWT
JWT_SECRET=tu_secret_super_seguro_cambiar_en_produccion
JWT_EXPIRES_IN=7d

# Servidor
PORT=3005
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:5173

# Uploads
UPLOAD_PATH=uploads
MAX_FILE_SIZE=2097152

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🪟 DESARROLLO (Windows)

### Instalación (solo primera vez):
```bash
cd backend
npm install
cd ../frontend
npm install
cd ..
```

### Levantar el sistema:
```bash
# Terminal 1 - Backend con PM2
pm2 start ecosystem.config.cjs
pm2 status

# Terminal 2 - Frontend manual
cd frontend
npm run dev
```

### URLs:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3005

### Comandos útiles:
```bash
# Ver logs
pm2 logs

# Reiniciar backend
pm2 restart teetracker-backend

# Detener todo
pm2 stop all
```

---

## 🐧 PRODUCCIÓN (Linux)

### Instalación (solo primera vez):
```bash
# Instalar dependencias
cd backend && npm install --production && cd ..
cd frontend && npm install && cd ..
```

### Construir el frontend:
```bash
cd frontend
npm run build
cd ..
```

### Levantar el sistema:
```bash
# Iniciar backend + frontend
pm2 start ecosystem.config.cjs --env production

# Guardar configuración
pm2 save

# Configurar inicio automático
pm2 startup
```

### URLs:
- **Frontend**: http://tu-servidor:4173
- **Backend**: http://tu-servidor:3005

### Comandos útiles:
```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs

# Reiniciar todo
pm2 restart all

# Detener todo
pm2 stop all

# Ver logs del backend
pm2 logs teetracker-backend

# Ver logs del frontend
pm2 logs teetracker-frontend
```

---

## 🔄 Actualizar el Sistema (Linux)

```bash
# 1. Detener servicios
pm2 stop all

# 2. Actualizar código
git pull

# 3. Actualizar dependencias
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 4. Reconstruir frontend
cd frontend && npm run build && cd ..

# 5. Reiniciar servicios
pm2 restart all
```

---

## 🔧 Troubleshooting

### Backend no conecta a la base de datos
```bash
# Verificar variables de entorno
cat .env | grep DB_

# Verificar que MySQL esté corriendo
sudo systemctl status mysql
```

### Puerto ya en uso
```bash
# Ver qué proceso usa el puerto
sudo netstat -tulpn | grep :3005
sudo netstat -tulpn | grep :4173

# Matar proceso
sudo kill -9 PID_DEL_PROCESO
```

### PM2 no encuentra los procesos
```bash
# Limpiar PM2 y reiniciar
pm2 kill
pm2 start ecosystem.config.cjs --env production
pm2 save
```

---

## 📊 Puertos del Sistema

| Ambiente | Backend | Frontend |
|----------|---------|----------|
| **Desarrollo (Windows)** | 3005 | 5173 |
| **Producción (Linux)** | 3005 | 4173 |

---

**TeeTracker Pro** v1.0.0