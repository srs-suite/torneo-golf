// Detectar si estamos en Linux
const isLinux = process.platform === 'linux';

// Configuración base del backend (siempre se ejecuta)
const backendApp = {
  name: 'teetracker-backend',
  script: 'backend/src/server.js',
  cwd: '.',
  instances: 1,
  exec_mode: 'fork',
  watch: false,
  max_memory_restart: '1G',
  env: {
    NODE_ENV: 'development',
    PORT: 8000,
    // Variables de entorno para el backend (usar archivo .env en desarrollo)
    FRONTEND_URL: 'http://localhost:5173'
  },
  env_production: {
    NODE_ENV: 'production',
    PORT: 8000,
    // Variables de entorno para producción (usar archivo .env.production)
    FRONTEND_URL: 'https://torneogolf.retailsolutionstimetracker.com'
  },
  error_file: './logs/backend-err.log',
  out_file: './logs/backend-out.log',
  log_file: './logs/backend-combined.log',
  time: true,
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  merge_logs: true,
  min_uptime: '10s',
  max_restarts: 10,
  restart_delay: 4000,
  monitoring: false
};

// Configuración del frontend (solo en Linux)
const frontendApp = {
  name: 'teetracker-frontend',
  script: 'serve',
  args: '-s dist -l 4173',
  cwd: './frontend',
  instances: 1,
  exec_mode: 'fork',
  watch: false,
  interpreter: 'node',
  max_memory_restart: '512M',
  env: {
    NODE_ENV: 'development',
    PORT: 5173,
    VITE_API_URL: 'http://localhost:3005'
  },
  env_production: {
    NODE_ENV: 'production',
    PORT: 4173,
    VITE_API_URL: 'http://localhost:3005'
  },
  error_file: './logs/frontend-err.log',
  out_file: './logs/frontend-out.log',
  log_file: './logs/frontend-combined.log',
  time: true,
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  merge_logs: true,
  min_uptime: '10s',
  max_restarts: 10,
  restart_delay: 4000,
  monitoring: false
};

// Crear array de apps según el sistema operativo
const apps = [backendApp];
if (isLinux) {
  apps.push(frontendApp);
}

module.exports = {
  apps: apps,

  // Configuración de deployment para Linux
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/teetracker-pro.git',
      path: '/var/www/teetracker-pro',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm install && cd ../frontend && npm install && npm run build && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': 'sudo apt update && sudo apt install -y nodejs npm git'
    }
  }
};