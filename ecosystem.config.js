/**
 * PM2 production process file.
 *
 * Prerequisites:
 *   cd frontend && npm ci && npm run build
 *
 * Start:
 *   pm2 start ecosystem.config.js
 *
 * Persist across reboots:
 *   pm2 save && pm2 startup
 */
module.exports = {
  apps: [
    {
      name: "dependency-intelligence-api",
      script: "index.js",
      cwd: "./backend",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      min_uptime: "10s",
      max_restarts: 10,
      kill_timeout: 5_000,
      merge_logs: true,
      time: true,
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      env: {
        NODE_ENV: "production",
        // Override on the host or via `pm2 start ... --update-env` if needed
        PORT: 4012,
      },
    },
    {
      name: "dependency-intelligence-web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./frontend",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      min_uptime: "10s",
      max_restarts: 10,
      kill_timeout: 10_000,
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
