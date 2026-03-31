# Dependency Intelligence

A full-stack application for tracking npm and PyPI dependencies, scanning them against public vulnerability sources (OSV, npm audit, optional Snyk), and managing alerts. It consists of a **Node.js / Express** API with **MongoDB**, and a **Next.js** web UI.

## Repository layout

| Path | Role |
|------|------|
| `backend/` | REST API, schedulers, email alerts, MongoDB models |
| `frontend/` | Next.js App Router UI (MUI) |

Generated artifacts **`node_modules/`** and **`.next/`** live under `backend/` and `frontend/` and are ignored by Git—install and build locally or on your server.

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **MongoDB** reachable from the API (local or hosted)

## Configuration

Copy the examples and set values for your environment:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

| Variable | Location | Purpose |
|----------|----------|---------|
| `PORT` | `backend/.env` | API listen port (default in code: `5000`; example uses `4010`) |
| `MONGO_URI` | `backend/.env` | MongoDB connection string |
| `NEXT_PUBLIC_API_URL` | `frontend/.env` | Browser-visible API base URL (e.g. `http://localhost:4010` in dev, your public API URL in production) |

## Local development

**API**

```bash
cd backend
npm install
npm start
```

**Web**

```bash
cd frontend
npm install
npm run dev
```

Run the frontend dev server and point `NEXT_PUBLIC_API_URL` at your API. For production-like checks, use `npm run build` and `npm run start` in `frontend/`.

## Production deployment (PM2)

1. Install dependencies and build the frontend (required before `next start`):

   ```bash
   cd backend && npm ci
   cd ../frontend && npm ci && npm run build
   ```

2. Set `backend/.env` and `frontend/.env` on the server (including `NEXT_PUBLIC_API_URL` for the URL users use to reach the API).

3. From the **repository root**:

   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

The ecosystem file runs the API with `NODE_ENV=production` and the Next.js app with `next start` (not `next dev`). Adjust `PORT` in the config or via environment variables on the host as needed. Place a reverse proxy (nginx, Caddy, etc.) in front of both services and terminate TLS there if exposing to the internet.

## License

ISC (see `backend/package.json`). Add or change a root license file if you standardize on a different license.
