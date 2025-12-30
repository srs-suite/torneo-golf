#!/bin/bash
# Script para arreglar SociosPortal.tsx y compilar el frontend

cd /home/retailso/torneogolf-source/frontend

# Arreglar los imports
sed -i "s/import { DollarSign, Trophy, Users, Smartphone, FileText, Eye, Lock } from 'lucide-react';/import { DollarSign, Trophy, Users, Smartphone } from 'lucide-react';/" src/pages/SociosPortal.tsx

# Compilar
npm run build

# Reiniciar PM2
pm2 restart teetracker-frontend

