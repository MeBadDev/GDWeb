import { FastifyInstance, FastifyPluginOptions } from 'fastify';
// Firebase utilities used lazily within handlers
import { request } from 'undici';

const bodySchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 6 },
  },
} as const;

export default async function auth(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Firebase is initialized lazily; if not configured, certain endpoints will error appropriately

  app.post('/register', {
    schema: {
      tags: ['auth'],
      body: bodySchema,
      response: {
        201: {
          type: 'object',
          properties: { userId: { type: 'string' }, token: { type: 'string' } },
        },
        400: { type: 'object', properties: { message: { type: 'string' } } },
        409: { type: 'object', properties: { message: { type: 'string' } } },
        500: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const { email, password } = req.body as any;
    try {
      const admin = (await import('firebase-admin')).default;
      if (!admin.apps.length) {
        req.log.error('Firebase not initialized');
        return reply.code(500).send({ message: 'server auth not configured' });
      }
      const user = await admin.auth().createUser({ email, password });
      // In a backend-only flow, typically client signs in to get ID token.
      // Here we mint a custom token for immediate use.
      const token = await admin.auth().createCustomToken(user.uid);
      req.log.info({ userId: user.uid }, 'User registered successfully');
      return reply.code(201).send({ userId: user.uid, token });
    } catch (err: any) {
      req.log.error({ error: err, email }, 'Registration failed');
      if (err?.code === 'auth/email-already-exists') {
        return reply.code(409).send({ message: 'email exists' });
      }
      if (err?.code === 'app/no-app') {
        return reply.code(500).send({ message: 'server auth not configured' });
      }
      return reply.code(400).send({ message: 'invalid input' });
    }
  });

  app.post('/login', {
    schema: {
      tags: ['auth'],
      body: bodySchema,
      response: {
        200: {
          type: 'object',
          properties: { userId: { type: 'string' }, token: { type: 'string' } },
        },
        401: { type: 'object', properties: { message: { type: 'string' } } },
        500: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const { email, password } = req.body as any;
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) {
      req.log.error('Firebase Web API key not configured');
      return reply.code(500).send({ message: 'server auth not configured' });
    }
    try {
      const res = await request(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: 'POST',
          body: JSON.stringify({ email, password, returnSecureToken: true }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (res.statusCode !== 200) {
        const errorBody = await res.body.json().catch(() => ({}));
        req.log.warn({ statusCode: res.statusCode, error: errorBody, email }, 'Login failed - invalid credentials');
        return reply.code(401).send({ message: 'invalid credentials' });
      }
      const json = (await res.body.json()) as any;
      req.log.info({ userId: json.localId }, 'User logged in successfully');
      return reply.send({ userId: json.localId, token: json.idToken });
    } catch (e) {
      req.log.error({ error: e, email }, 'Login failed with exception');
      return reply.code(401).send({ message: 'invalid credentials' });
    }
  });

  app.get('/users/:id', {
    schema: {
      tags: ['auth'],
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      response: {
        200: {
          type: 'object',
          properties: {
            profile: {
              type: 'object',
              properties: {
                uid: { type: 'string' },
                email: { type: 'string' },
                displayName: { type: 'string' },
                photoURL: { type: 'string' },
              },
            },
          },
        },
        404: { type: 'object', properties: { message: { type: 'string' } } },
        500: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params as any;
    try {
      const admin = (await import('firebase-admin')).default;
      if (!admin.apps.length) {
        req.log.error('Firebase not initialized');
        return reply.code(500).send({ message: 'server auth not configured' });
      }
      const user = await admin.auth().getUser(id);
      req.log.info({ userId: id }, 'User profile retrieved successfully');
      return reply.send({ profile: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
      }});
    } catch (err: any) {
      req.log.warn({ userId: id, error: err }, 'User profile retrieval failed');
      if (err?.code === 'app/no-app') {
        return reply.code(500).send({ message: 'server auth not configured' });
      }
      return reply.code(404).send({ message: 'not found' });
    }
  });
}
