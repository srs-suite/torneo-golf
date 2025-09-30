# TeeTracker Pro - Deployment en Linux

## Configuración PM2 para Producción

### Archivos Creados:
- `ecosystem.config.cjs` - Configuración PM2
- `start-frontend.sh` - Script para iniciar frontend
- `start-system.sh` - Script para iniciar sistema completo
- `logs/` - Directorio para logs

### Instalación en Linux:

1. **Instalar Node.js y PM2:**
```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 globalmente
sudo npm install -g pm2
```

2. **Configurar el proyecto:**
```bash
# Clonar el repositorio
git clone <tu-repo>
cd torneo-golf

# Instalar dependencias
npm install
cd backend && npm install
cd ../frontend && npm install
```

3. **Configurar variables de entorno:**
```bash
# El archivo .env ya está configurado en backend/.env
# Verificar que tenga las variables correctas:
cat backend/.env
```

### Comandos de Producción:

**Iniciar Backend con PM2:**
```bash
pm2 start ecosystem.config.cjs
```

**Iniciar Frontend (manual):**
```bash
./start-frontend.sh
# o
cd frontend && npm run dev
```

**Iniciar Sistema Completo:**
```bash
./start-system.sh
```

**Comandos PM2:**
```bash
pm2 status              # Ver estado
pm2 logs                # Ver logs
pm2 restart 0           # Reiniciar backend
pm2 stop 0              # Detener backend
pm2 delete 0            # Eliminar proceso
pm2 save                # Guardar configuración
pm2 startup             # Configurar inicio automático
```

### URLs del Sistema:
- **Backend API**: `http://localhost:3005`
- **Frontend**: `http://localhost:5173`

### Deployment Automático:
```bash
# Configurar deployment
pm2 deploy production setup

# Deploy
pm2 deploy production
```

### Configuración de Firewall (Ubuntu):
```bash
sudo ufw allow 3005  # Backend
sudo ufw allow 5173  # Frontend
sudo ufw allow 22    # SSH
sudo ufw enable
```

### Logs:
- Backend: `logs/backend-*.log`
- PM2: `~/.pm2/logs/`

### Monitoreo:
```bash
pm2 monit              # Monitor en tiempo real
pm2 logs --lines 100   # Ver últimas 100 líneas
```

