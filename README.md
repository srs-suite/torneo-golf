# 🏌️ TeeTracker Pro - Golf Tournament Management System

Sistema profesional de gestión de torneos de golf con interfaz moderna y base de datos MySQL.

## 🚀 Inicio Rápido

```bash
# 1. Ejecutar el sistema
.\INICIAR_SISTEMA.bat

# 2. Esperar 30 segundos

# 3. Abrir navegador en:
http://localhost:5173
```

## 📁 Estructura del Proyecto

```
📁 TeeTracker Pro/
├── 🌐 frontend/           # Cliente React + TypeScript
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Páginas principales
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # APIs y servicios
│   │   ├── types/         # Tipos TypeScript
│   │   └── utils/         # Utilidades
│   ├── public/            # Archivos estáticos
│   └── package.json       # Dependencias frontend
│
├── 🔧 backend/            # Servidor Node.js (archivos organizados)
├── 🗄️ database/           # Scripts SQL y migraciones
├── 📊 data_files/         # Archivos Excel e imágenes del usuario
├── 📚 docs/               # Documentación técnica
├── 📄 legacy_files/       # Código anterior archivado
│
├── server_mysql.js        # 🚀 Servidor principal
├── database_functions.js  # Funciones de base de datos
├── database_config.js     # Configuración MySQL
└── INICIAR_SISTEMA.bat    # 🎯 Script de inicio
```

## 🛠️ Tecnologías

### Frontend
- **React 18** - UI Library
- **TypeScript** - Tipado estático
- **Vite** - Build tool moderno
- **Tailwind CSS** - Framework CSS
- **React Query** - Gestión de estado servidor
- **React Router** - Navegación

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **MySQL2** - Driver de base de datos
- **ES Modules** - Módulos modernos

### Base de Datos
- **MySQL 8.0+** - Base de datos relacional
- **Migraciones** - Scripts de actualización
- **Datos reales** - No JSON, persistente

## 🔧 Configuración de Desarrollo

### Requisitos
- Node.js 18+
- MySQL 8.0+
- npm o yarn

### Instalación Manual

1. **Backend:**
```bash
npm install
node server_mysql.js
```

2. **Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Variables de Entorno
```javascript
// database_config.js
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: 'juanmacv',
  database: 'teetracker_pro'
}
```

## 📊 Funcionalidades

### 🏌️ Gestión de Clubes
- Administración multi-club
- Gestión de campos y hoyos
- Configuración de tees y distancias

### 👥 Gestión de Miembros
- Registro de socios
- Gestión de handicaps
- Importación Excel

### 🏆 Gestión de Torneos
- Creación de torneos
- Inscripción de participantes
- Configuración de grupos

### 📋 Tarjetas de Score
- Entrada manual de scores
- Validación automática
- Cálculo de handicaps
- Impresión de tarjetas

### 📈 Reportes
- Resultados por categorías
- Estadísticas de jugadores
- Historial de torneos

### 📱 Notificaciones WhatsApp
- Confirmación automática de inscripción
- Envío de tarjetas completadas
- Notificaciones personalizadas

## 🗂️ Arquitectura

### Frontend (SPA)
```
Usuario -> React App -> API Calls -> Backend
```

### Backend (REST API)
```
Frontend -> Express Routes -> Business Logic -> MySQL
```

### Base de Datos
```
MySQL -> Tablas normalizadas -> Relaciones FK
```

## 🔐 Seguridad

- Validación de datos en frontend y backend
- Sanitización de inputs SQL
- Manejo de errores centralizado
- CORS configurado

## 📝 Logs y Debug

- **Backend:** Logs en consola con timestamps
- **Frontend:** React DevTools y Console
- **Base de datos:** Query logging habilitado

## 🚀 Despliegue

### Desarrollo
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- Base de datos: `localhost:3306`

### Producción
- Compilar frontend: `npm run build`
- Servir estáticos desde backend
- Configurar variables de entorno

## 👥 Equipo

- **Desarrollo:** Sistema desarrollado por AI Assistant
- **Cliente:** Torneo de Golf Management
- **Mantenimiento:** En curso

## 📞 Soporte

Para soporte técnico, revisar:
1. Logs de consola (F12)
2. Estado de servidores (`netstat -ano`)
3. Conexión MySQL
4. Archivos de configuración

---

**¡Sistema TeeTracker Pro listo para producción!** 🏆