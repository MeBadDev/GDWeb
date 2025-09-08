import fp from 'fastify-plugin';
import { verifyIdToken, isFirebaseConfigured } from '../services/firebase.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { uid: string; [k: string]: any };
  }
  interface FastifyInstance {
    requireAuth: (req: any, reply: any) => Promise<void>;
  }
}

export const authPlugin = fp(async (app) => {
  app.decorate('requireAuth', async (req, reply) => {
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) {
      req.log.warn('Missing or invalid Authorization header');
      return reply.code(401).send({ message: 'unauthorized' });
    }
    const token = auth.slice('Bearer '.length);
    try {
      if (!isFirebaseConfigured()) {
        req.log.error('Firebase not configured for authentication');
        throw new Error('auth-disabled');
      }
      const decoded: any = await verifyIdToken(token);
      const { uid, ...rest } = decoded;
      (req as any).user = { uid, ...rest };
      req.log.info({ userId: uid }, 'Authentication successful');
    } catch (err) {
      req.log.warn({ error: err, token: token.substring(0, 10) + '...' }, 'Authentication failed');
      return reply.code(401).send({ message: 'unauthorized' });
    }
  });
});
