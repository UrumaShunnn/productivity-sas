# ZENITH Productivity Suite

A full-stack productivity app — task management, goals, workout tracking, and sales finance — built with React + TypeScript (Vite) on the frontend and Express + PostgreSQL on the backend. Ships as both a web app (Vercel + Railway) and an Electron desktop app.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, Framer Motion |
| Backend | Express, TypeScript, PostgreSQL (`pg`), JWT auth, bcryptjs |
| Desktop | Electron 42 |
| Deploy | Vercel (frontend) · Railway (backend) |

---

## Prerequisites

- **Node.js** ≥ 20
- **PostgreSQL** ≥ 14 (local dev or Railway-provisioned)
- **npm** ≥ 10

---

## Local Development

### 1. Clone and install

```bash
git clone <repo-url>
cd productivity-sas

# Frontend deps
npm install

# Backend deps
cd server && npm install && cd ..
```

### 2. Configure environment variables

**Backend** — copy and fill in `server/.env.example`:

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/zenith
JWT_SECRET=<random-32-char-string>
REFRESH_SECRET=<different-random-32-char-string>
PORT=3001
FRONTEND_URL=http://localhost:7777
NODE_ENV=development
```

**Frontend** — `.env` is already configured for local dev:

```env
VITE_API_URL=http://localhost:3001/api
```

### 3. Run the database migrations

```bash
cd server && npm run migrate
```

### 4. Start both servers

In two terminals:

```bash
# Terminal 1 — backend (http://localhost:3001)
cd server && npm run dev

# Terminal 2 — frontend (http://localhost:7777)
npm run dev
```

---

## Environment Variables

### Backend (`server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Access token signing secret (≥ 32 chars) |
| `REFRESH_SECRET` | Yes | — | Refresh token signing secret (≥ 32 chars, different from JWT_SECRET) |
| `PORT` | No | `3001` | HTTP port |
| `FRONTEND_URL` | No | `http://localhost:7777` | Allowed CORS origin |
| `NODE_ENV` | No | `development` | `development` or `production` |

### Frontend (`.env` / `.env.production`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:3001/api` | Backend API base URL |

---

## npm Scripts

### Frontend (root)

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server on port 7777 |
| `npm run build` | TypeScript check + Vite production build → `dist/` |
| `npm run preview` | Serve the `dist/` build locally |
| `npm run lint` | ESLint check |
| `npm run electron:dev` | Vite dev server + Electron (desktop preview) |
| `npm run electron:build` | Build desktop installer → `dist-electron/` |

### Backend (`server/`)

| Script | Description |
|---|---|
| `npm run dev` | Nodemon + ts-node hot-reload |
| `npm run build` | TypeScript compile → `server/dist/` |
| `npm start` | Start compiled server (`node dist/index.js`) |
| `npm run migrate` | Run database migrations (idempotent) |

---

## API Overview

All data routes require `Authorization: Bearer <accessToken>`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `POST` | `/api/auth/logout` | Invalidate refresh token |
| `GET` | `/api/auth/me` | Current user profile |
| `GET` | `/api/tasks?date=YYYY-MM-DD` | Tasks for a day |
| `POST` | `/api/tasks` | Create task |
| `PATCH` | `/api/tasks/:id` | Update task |
| `DELETE` | `/api/tasks/:id` | Delete task |
| `GET` | `/api/goals` | All goals |
| `POST` | `/api/goals` | Create goal |
| `PATCH` | `/api/goals/:id` | Update goal |
| `DELETE` | `/api/goals/:id` | Delete goal |
| `GET` | `/api/training` | Sessions (last 30 days) |
| `POST` | `/api/training` | Create session with exercises |
| `PATCH` | `/api/training/exercises/:id` | Update exercise |
| `GET` | `/api/training/pr/:name` | Personal record for exercise |
| `GET` | `/api/finance?month=YYYY-MM` | Sales for a month |
| `POST` | `/api/finance` | Add sale |
| `DELETE` | `/api/finance/:id` | Delete sale |
| `GET` | `/api/finance/stats` | Monthly totals (12 months) |
| `PATCH` | `/api/users/settings` | Update user settings |
| `GET` | `/api/users/history` | Daily history (30 days) |
| `POST` | `/api/users/history` | Upsert today's stats |
| `GET` | `/health` | Health check (Railway probe) |

---

## Deployment

### Backend → Railway

1. **Create a Railway project** and add a **PostgreSQL** plugin — Railway injects `DATABASE_URL` automatically.

2. **Add a new service** from your GitHub repo. In service settings, set:
   - **Root Directory**: `server`
   - **Build Command**: `npm run build`
   - **Start Command**: `node dist/index.js` *(Procfile handles this automatically)*

3. **Set environment variables** in the Railway dashboard:

   ```
   JWT_SECRET=<generate with: openssl rand -hex 32>
   REFRESH_SECRET=<generate with: openssl rand -hex 32>
   FRONTEND_URL=https://your-vercel-app.vercel.app
   NODE_ENV=production
   ```
   `DATABASE_URL` and `PORT` are injected by Railway automatically.

4. **Deploy** — Railway will build TypeScript, run the server, and expose a public URL like `https://zenith-api.up.railway.app`.

5. Note your Railway URL for the next step.

---

### Frontend → Vercel

1. **Import your repo** at [vercel.com/new](https://vercel.com/new).

2. Vercel detects `vercel.json` automatically — the build command (`tsc -b && vite build --base=/`) and output directory (`dist`) are pre-configured. No changes needed in the dashboard.

3. **Set the production environment variable** in Vercel dashboard → Settings → Environment Variables:

   ```
   VITE_API_URL=https://your-railway-app.up.railway.app/api
   ```
   
   > Alternatively, update `.env.production` with your Railway URL before pushing.

4. **Redeploy** — Vercel will build and publish the frontend.

5. **Update CORS on Railway**: go back to Railway and set `FRONTEND_URL` to your Vercel URL (e.g. `https://zenith.vercel.app`), then redeploy the backend.

---

## Desktop App (Electron)

Build a platform installer from the compiled frontend:

```bash
npm run electron:build
```

Output is in `dist-electron/`. The app connects to `http://localhost:3001` by default — point it at your Railway backend by setting `VITE_API_URL` before building.

---

## Health Check

The backend exposes `GET /health` for uptime monitoring:

```json
{ "status": "ok", "version": "1.0.0" }
```

Railway and external monitors (UptimeRobot, etc.) can probe this endpoint.
