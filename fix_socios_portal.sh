#!/bin/bash
# Script para arreglar los imports no usados en SociosPortal.tsx

FRONTEND_DIR="/home/retailso/torneogolf-source/frontend"
FILE="$FRONTEND_DIR/src/pages/SociosPortal.tsx"

if [ ! -f "$FILE" ]; then
    echo "❌ Error: No se encontró el archivo $FILE"
    exit 1
fi

echo "🔧 Arreglando imports en SociosPortal.tsx..."

# Crear backup
cp "$FILE" "$FILE.backup"

# Reemplazar la línea de imports
sed -i "s/import { DollarSign, Trophy, Users, Smartphone, FileText, Eye, Lock } from 'lucide-react';/import { DollarSign, Trophy, Users, Smartphone } from 'lucide-react';/" "$FILE"

echo "✅ Imports corregidos"
echo "📦 Compilando frontend..."

cd "$FRONTEND_DIR"
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend compilado exitosamente"
    echo "🔄 Reiniciando servicios PM2..."
    pm2 restart teetracker-frontend
    echo "✅ Proceso completado"
else
    echo "❌ Error al compilar. Restaurando backup..."
    mv "$FILE.backup" "$FILE"
    exit 1
fi

