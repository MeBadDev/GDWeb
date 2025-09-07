import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import path from 'path';
import { ensureDir, saveBuffer, serveFile, exists } from '../services/storage.js';

type Preview = { id: string; file: string; expiresAt: number };

export default async function preview(app: FastifyInstance) {
  const baseDir = path.join(app.config.STORAGE_DIR, 'previews');

  const previews = new Map<string, Preview>();
  const ttl = Number(app.config.PREVIEW_TTL_SECONDS || '3600');

  app.post('/upload', {
    schema: {
      tags: ['preview'],
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: { file: { type: 'string', format: 'binary' } },
        required: ['file'],
      },
      response: {
        201: { type: 'object', properties: { previewId: { type: 'string' } } },
        400: { type: 'object', properties: { message: { type: 'string' } } },
        401: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const parts = (req as any).parts?.();
    if (!parts) return reply.code(400).send({ message: 'invalid file' });
    const id = nanoid(8);
    const dir = path.join(baseDir, id);
    await ensureDir(dir);
    for await (const part of parts as any) {
      if (part.type === 'file') {
        const buf = await part.toBuffer?.() ?? await streamToBuffer(part.file);
        if (!part.filename.endsWith('.pck')) return reply.code(400).send({ message: 'invalid file' });
        const fp = await saveBuffer(dir, 'preview.pck', buf);
        previews.set(id, { id, file: fp, expiresAt: Date.now() + ttl * 1000 });
      }
    }
    return reply.code(201).send({ previewId: id });
  });

  app.get('/:id/play', {
    schema: {
      tags: ['preview'],
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      response: {
        404: { type: 'object', properties: { message: { type: 'string' } } },
        410: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params as any;
    const p = previews.get(id);
    if (!p) return reply.code(404).send({ message: 'not found' });
    if (Date.now() > p.expiresAt) return reply.code(410).send({ message: 'expired' });
    if (!(await exists(p.file))) return reply.code(404).send({ message: 'not found' });
    const { stream, type } = serveFile(p.file);
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
