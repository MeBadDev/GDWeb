import 'dotenv/config';
import Fastify from 'fastify';
import compress from '@fastify/compress';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import path from 'path';
import multipart from '@fastify/multipart';
import { registerRoutes } from './routes/index.js';
import { registerWs } from './ws/index.js';
import { buildOpenApi } from './plugins/openapi.js';
import { env } from './plugins/env.js';
import { authPlugin } from './plugins/auth.js';
import { initFirebase } from './services/firebase.js';

async function start() {
  const app = Fastify({ 
    logger: {
      level: 'info'
    }, 
    trustProxy: true 
  });

  // Plugins
  await app.register(env);
  
  // Initialize Firebase early to catch configuration issues
  try {
    initFirebase({
      projectId: app.config.FIREBASE_PROJECT_ID,
      clientEmail: app.config.FIREBASE_CLIENT_EMAIL,
      privateKey: app.config.FIREBASE_PRIVATE_KEY,
    });
    app.log.info('Firebase initialized successfully');
  } catch (err) {
    app.log.warn({ error: err }, 'Firebase initialization failed - auth features will be disabled');
  }
  
  // Log Firebase configuration status for debugging
  app.log.info({
    firebaseProjectId: app.config.FIREBASE_PROJECT_ID ? 'set' : 'missing',
    firebaseClientEmail: app.config.FIREBASE_CLIENT_EMAIL ? 'set' : 'missing',
    firebasePrivateKey: app.config.FIREBASE_PRIVATE_KEY ? 'set' : 'missing'
  }, 'Firebase configuration status');
  await app.register(compress, { global: true, encodings: ['br', 'gzip'] });
  await app.register(multipart, { limits: { fileSize: 1024 * 1024 * 200 } }); // 200MB
  await app.register(websocket);
  await app.register(authPlugin);

  // External runtime assets redirect (e.g., Godot WASM/JS hosted elsewhere)
  app.get('/runtime/*', {
    schema: { tags: ['system'] },
  }, async (req, reply) => {
    const suffix = (req.params as any)['*'] as string;
    const base = app.config.RUNTIME_BASE_URL;
    if (!base) return reply.code(404).send({ message: 'runtime not configured' });
    const url = base.replace(/\/$/, '') + '/' + suffix.replace(/^\//, '');
  return reply.redirect(url, 302);
  });

  // Swagger/OpenAPI
  if (process.env.ENABLE_DOCS !== 'false') {
    await app.register(swagger, buildOpenApi());
    await app.register(swaggerUI, { routePrefix: '/docs' });
  }

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
