module.exports = {
  apps: [{
    name: 'teetracker-backend',
    script: './backend/src/server.js',
    cwd: process.env.PWD || '/home/retailso/torneogolf-source',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8001
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
