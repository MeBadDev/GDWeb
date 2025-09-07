import { FastifyInstance } from 'fastify';
import auth from './auth.js';
import games from './games.js';
import reports from './reports.js';
import preview from './preview.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(auth, { prefix: '/auth' });
  await app.register(games, { prefix: '/games' });
  await app.register(reports, { prefix: '/reports' });
  await app.register(preview, { prefix: '/preview' });
}
