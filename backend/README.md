# GDWeb Backend

Fastify-based backend for GDWeb. Implements auth (Firebase), game upload/hosting, reports, preview, and WebSocket services (chat + signaling). Swagger docs at /docs.

## Quick start

- Node 18+ required
- Env vars: see below

Run locally:

```bash
npm install
npm run dev
```

Open http://localhost:3000/docs

## Environment variables

- PORT, HOST
- STORAGE_DIR (default /data/storage)
- REDIS_URL
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY (escape newlines as \n)
- PREVIEW_TTL_SECONDS

## Docker

```bash
docker compose up --build
```

## Notes

- Endpoints are OpenAPI-annotated via fastify-swagger.
- File storage uses local volume; hook into Binaryen optimization in CI.
- WebSockets are basic placeholders ready for Redis pub/sub.
- I'm an idiot who have no idea what I'm doing.