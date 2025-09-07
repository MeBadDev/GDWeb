import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';

export default async function reports(app: FastifyInstance) {
  const reports: any[] = [];

  app.post('/', {
    schema: {
      tags: ['reports'],
      body: {
        type: 'object',
        required: ['gameId', 'reason'],
        properties: {
          gameId: { type: 'string' },
          reason: { type: 'string' },
          details: { type: 'string' },
        },
      },
      response: {
        201: { type: 'object', properties: { reportId: { type: 'string' } } },
        400: { type: 'object', properties: { message: { type: 'string' } } },
        401: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
    preHandler: app.requireAuth as any,
  }, async (req: any, reply: any) => {
    const body = req.body as any;
    const id = nanoid(10);
    reports.push({ id, status: 'pending', reporterId: req.user?.uid, ...body });
    return reply.code(201).send({ reportId: id });
  });

  app.get('/pending', {
    schema: {
      tags: ['reports'],
      response: {
        200: {
          type: 'array',
          items: { type: 'object' },
        },
        403: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
    preHandler: app.requireAuth as any,
  }, async (req: any, reply: any) => {
    // TODO: check admin via Firebase custom claims
    const isAdmin = false;
    if (!isAdmin) return reply.code(403).send({ message: 'forbidden' });
    return reply.send(reports.filter((r) => r.status === 'pending'));
  });
}
