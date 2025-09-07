import 'dotenv/config';
import Fastify from 'fastify';
import compress from '@fastify/compress';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import multipart from '@fastify/multipart';
import { registerRoutes } from './routes/index.js';
import { registerWs } from './ws/index.js';
import { buildOpenApi } from './plugins/openapi.js';
import { env } from './plugins/env.js';
import { authPlugin } from './plugins/auth.js';

async function start() {
  const app = Fastify({ logger: true });

  // Plugins
  await app.register(env);
  await app.register(compress, { global: true, encodings: ['br', 'gzip'] });
  await app.register(multipart, { limits: { fileSize: 1024 * 1024 * 200 } }); // 200MB
  await app.register(websocket);
  await app.register(authPlugin);

  // Static runtime assets (e.g., Godot WASM/JS)
  const publicDir = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    await app.register(fastifyStatic, {
      root: publicDir,
      prefix: '/runtime/',
      decorateReply: false,
    });
  } else {
    app.log.warn(`public dir not found at ${publicDir}; static runtime disabled`);
  }

  // Swagger/OpenAPI
  await app.register(swagger, buildOpenApi());
  await app.register(swaggerUI, { routePrefix: '/docs', staticCSP: true });

  // Health
  app.get('/health', {
    schema: {
      tags: ['system'],
      response: {
        200: {
          type: 'object',
          properties: { status: { type: 'string' } },
        },
      },
    },
  }, async () => ({ status: 'ok' }));

  // Routes
  await registerRoutes(app);
  await registerWs(app);

  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  await app.listen({ port, host });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
