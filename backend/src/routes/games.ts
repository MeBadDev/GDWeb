import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import path from 'path';
import { ensureDir, saveBuffer, serveFile, exists } from '../services/storage.js';

export default async function games(app: FastifyInstance) {
  const baseDir = path.join(app.config.STORAGE_DIR, 'games');

  app.post('/upload', {
    schema: {
      tags: ['games'],
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: { file: { type: 'string', format: 'binary' } },
        required: ['file'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            gameId: { type: 'string' },
            metadata: { type: 'object' },
          },
        },
        400: { type: 'object', properties: { message: { type: 'string' } } },
        401: { type: 'object', properties: { message: { type: 'string' } } },
        413: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
    preHandler: app.requireAuth as any,
  }, async (req: any, reply: any) => {
    const parts = (req as any).parts?.() || (app as any).multipart?.iterator?.call(req);
    if (!parts) return reply.code(400).send({ message: 'invalid file' });
    const gameId = nanoid(10);
    const gameDir = path.join(baseDir, gameId);
  await ensureDir(gameDir);

    for await (const part of parts as any) {
      if (part.type === 'file') {
        const buf = await part.toBuffer?.() ?? await streamToBuffer(part.file);
        if (!part.filename.endsWith('.pck')) return reply.code(400).send({ message: 'invalid file' });
        await saveBuffer(gameDir, 'game.pck', buf);
      }
    }

    // Save metadata in Firestore
    let metadata: any = { createdAt: Date.now(), ownerId: req.user?.uid };
    try {
      const { getFirestore } = await import('../services/firebase');
      const db = getFirestore();
      await db.collection('games').doc(gameId).set(metadata);
    } catch {
      // proceed without DB
    }
    return reply.code(201).send({ gameId, metadata });
  });

  app.get('/:id', {
    schema: {
      tags: ['games'],
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      response: {
        200: { type: 'object', properties: { metadata: { type: 'object' } } },
        404: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
  }, async (req: any, reply: any) => {
    const { id } = req.params as any;
    const gameDir = path.join(baseDir, id);
    const ok = await exists(path.join(gameDir, 'game.pck'));
    if (!ok) return reply.code(404).send({ message: 'not found' });
    try {
      const { getFirestore } = await import('../services/firebase');
      const db = getFirestore();
      const snap = await db.collection('games').doc(id).get();
      if (snap.exists) return reply.send({ metadata: snap.data() });
    } catch {}
    return reply.send({ metadata: { id, createdAt: null } });
  });

  app.get('/:id/play', {
    schema: {
      tags: ['games'],
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      response: {
        404: { type: 'object', properties: { message: { type: 'string' } } },
        500: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
  }, async (req: any, reply: any) => {
    const { id } = req.params as any;
    const gameDir = path.join(baseDir, id);
    const filePath = path.join(gameDir, 'game.pck');
    if (!(await exists(filePath))) return reply.code(404).send({ message: 'not found' });
    const { stream, type } = serveFile(filePath);
    reply.header('Content-Type', type);
    return reply.send(stream);
  });
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (c) => chunks.push(Buffer.from(c)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
