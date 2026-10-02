module.exports = {
  apps: [{
    name: 'teetracker-backend',
    script: './backend/src/server.js',
    cwd: process.env.PWD || '/var/www/teetracker-pro',
    // 1 instancia: los Bearer de admin viven en memoria (Map). Con cluster se pierden entre workers.
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    error_file: './backend/logs/err.log',
    out_file: './backend/logs/out.log',
    log_file: './backend/logs/combined.log',
    time: true,
    autorestart: true,
    max_memory_restart: '500M',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
