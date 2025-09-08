# GDWeb

Game-sharing platform for hosting and running Godot games in the browser. Developers upload `.pck` builds, and the platform serves a WebAssembly runtime, manages accounts, chat, reports, multiplayer signaling, and live previews.

## Monorepo layout

- `backend/` — Fastify-based Node.js API + WebSockets (implemented)
- `frontend/` — Web app (placeholder)
- `shared/` — Shared types/utilities (placeholder)

## Tech stack

- Runtime: Node.js (LTS), TypeScript, ESM
- Framework: Fastify
- Auth/DB/Config: Firebase (Auth, Firestore, Remote Config)
- Cache/Rate limits: Redis
- Storage: Docker volume (for `.pck`, runtime assets, screenshots)
- Docs: Swagger/OpenAPI at `/docs`
- Optional: Coturn for WebRTC NAT traversal

## Quick start (local)

Prereqs: Node 18+, npm, optional Docker.

1) Install and run backend

```bash
cd backend
npm install
npm run dev
```

2) Open API docs: http://localhost:3000/docs

Health check: http://localhost:3000/health

## Environment configuration

Create `backend/.env` (see `backend/.env.example`). Important vars:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (escape newlines as `\n`)
- `FIREBASE_WEB_API_KEY` (used by password login)
- `REDIS_URL` (e.g. `redis://localhost:6379`)
- `STORAGE_DIR` (default `./data/storage` inside `backend`)

Firebase tips:
- Service Account (Admin SDK): Project Settings → Service Accounts → Generate key → use its `project_id`, `client_email`, `private_key`.
- Web API Key: Project Settings → General → Web API Key.

The server starts even without Firebase; protected routes will return 401 until configured.

## Docker Compose

```bash
docker compose up --build
```

This launches:
- `backend` on port `${BACKEND_HOST_PORT}` (default 3000)
- `cache` (Redis) on `${REDIS_HOST_PORT}` (default 6379)

Volume `storage` persists uploaded files. Put Godot runtime assets (wasm/js) under `backend/public` to serve at `/runtime/`.

## API overview

- Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/users/:id`
- Games: `POST /games/upload`, `GET /games/:id`, `GET /games/:id/play`
- Reports: `POST /reports`, `GET /reports/pending`
- Preview: `POST /preview/upload`, `GET /preview/:id/play`
- WebSockets: `WS /chat/:gameId`, `WS /multiplayer/signaling`

See full schemas and error codes at `/docs`.

## Development scripts

From `backend/`:

- `npm run dev` — watch mode
- `npm run typecheck` — TypeScript check
- `npm run build` — build to `dist/`

CI builds live in `.github/workflows/backend.yml` and include an optional `wasm-opt` step.

## Deployment notes

- Run behind a reverse proxy (Caddy/Nginx) for HTTPS.
- Mount a persistent volume for `STORAGE_DIR`.
- Provide Firebase credentials as env vars or secrets.
- Optional Coturn for WebRTC if you enable peer connections beyond local networks.

## More docs

See `backend/README.md` for service-specific notes and troubleshooting.
