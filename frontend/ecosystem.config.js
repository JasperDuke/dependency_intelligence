module.exports = {
  apps: [
    {
      name: "dependency-intelligence-web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      min_uptime: "10s",
      max_restarts: 10,
      kill_timeout: 10000,
      merge_logs: true,
      time: true,
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      env: {
        NODE_ENV: "production",
        PORT: 3015,
      },
    },
  ],
};