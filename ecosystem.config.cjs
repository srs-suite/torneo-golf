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
    PORT: 3005,
    // Variables de entorno para el backend
    DB_HOST: 'vps123353.inmotionhosting.com',
    DB_PORT: 3306,
    DB_USER: 'retailso_torneo',
    DB_PASSWORD: 'QKVdSfd4RuHr',
    DB_NAME: 'retailso_torneog',
    JWT_SECRET: 'your_super_secret_jwt_key_here',
    JWT_EXPIRES_IN: '7d',
    FRONTEND_URL: 'http://localhost:5173',
    UPLOAD_PATH: 'uploads',
    MAX_FILE_SIZE: 2097152,
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_MAX_REQUESTS: 100
  },
  env_production: {
    NODE_ENV: 'production',
    PORT: 3005,
    // Variables de entorno para producción
    DB_HOST: 'vps123353.inmotionhosting.com',
    DB_PORT: 3306,
    DB_USER: 'retailso_torneo',
    DB_PASSWORD: 'QKVdSfd4RuHr',
    DB_NAME: 'retailso_torneog',
    JWT_SECRET: 'your_production_jwt_secret_key_here',
    JWT_EXPIRES_IN: '7d',
    FRONTEND_URL: 'http://localhost:4173',
    UPLOAD_PATH: 'uploads',
    MAX_FILE_SIZE: 2097152,
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_MAX_REQUESTS: 100
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
  script: './node_modules/vite/bin/vite.js',
  args: 'preview',
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