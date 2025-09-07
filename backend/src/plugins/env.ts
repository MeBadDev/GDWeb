import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      FIREBASE_PROJECT_ID?: string;
      FIREBASE_CLIENT_EMAIL?: string;
      FIREBASE_PRIVATE_KEY?: string;
      REDIS_URL?: string;
      STORAGE_DIR: string;
  RUNTIME_BASE_URL?: string;
      JWT_AUDIENCE?: string;
      JWT_ISSUER?: string;
      PREVIEW_TTL_SECONDS?: string;
    };
  }
}

export const env = fp(async (app) => {
  const STORAGE_DIR = process.env.STORAGE_DIR || (process.cwd() + '/data/storage');
  app.decorate('config', {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    REDIS_URL: process.env.REDIS_URL,
    STORAGE_DIR,
  RUNTIME_BASE_URL: process.env.RUNTIME_BASE_URL,
    JWT_AUDIENCE: process.env.JWT_AUDIENCE,
    JWT_ISSUER: process.env.JWT_ISSUER,
    PREVIEW_TTL_SECONDS: process.env.PREVIEW_TTL_SECONDS || '3600',
  });
});
