#!/bin/bash
set -e

echo "🚀 ====================================="
echo "   DEPLOYMENT TEETRACKER PRO"
echo "====================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Ir al directorio del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${YELLOW}📦 Haciendo backup de la base de datos...${NC}"
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mysqldump -u teetracker -p teetracker_pro > "$BACKUP_DIR/backup_$TIMESTAMP.sql" 2>/dev/null || echo "⚠️  No se pudo hacer backup (probablemente normal si es primera vez)"

echo -e "${YELLOW}📥 Descargando código nuevo (si hay)...${NC}"
if [ -d ".git" ]; then
    git pull origin main || echo "⚠️  No hay repositorio Git configurado"
else
    echo "ℹ️  No hay repositorio Git. Usando código local."
fi

echo -e "${YELLOW}🔧 Actualizando backend...${NC}"
cd backend
npm install --production
cd ..

echo -e "${YELLOW}🎨 Construyendo frontend...${NC}"
cd frontend
npm install
npm run build
cd ..

echo -e "${YELLOW}🔄 Reiniciando backend...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 restart teetracker-backend || pm2 start ecosystem.config.cjs
    pm2 save
else
    echo -e "${RED}❌ PM2 no está instalado. Instálalo con: npm install -g pm2${NC}"
    exit 1
fi

echo -e "${YELLOW}🌐 Recargando Nginx...${NC}"
if command -v nginx &> /dev/null; then
    sudo systemctl reload nginx || echo "⚠️  No se pudo recargar Nginx"
else
    echo "ℹ️  Nginx no detectado. Saltando..."
fi

echo ""
echo -e "${GREEN}✅ ====================================="
echo "   DEPLOYMENT COMPLETADO"
echo "=====================================${NC}"
echo ""
echo "📊 Estado del sistema:"
pm2 status

echo ""
echo "🌐 URLs:"
echo "   Backend API: http://localhost:8000"
echo "   Frontend: https://tu-dominio.com"
echo ""
echo "📋 Comandos útiles:"
echo "   Ver logs: pm2 logs teetracker-backend"
echo "   Estado: pm2 status"
echo "   Reiniciar: pm2 restart teetracker-backend"
echo ""

