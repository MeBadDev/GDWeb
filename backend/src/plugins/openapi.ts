import { FastifyDynamicSwaggerOptions } from '@fastify/swagger';

export function buildOpenApi(): FastifyDynamicSwaggerOptions {
  return {
    openapi: {
      info: {
        title: 'GDWeb Backend API',
        description: 'OpenAPI documentation for GDWeb backend services',
        version: '0.1.0',
      },
      tags: [
        { name: 'auth', description: 'Authentication and users' },
        { name: 'games', description: 'Game upload and hosting' },
        { name: 'reports', description: 'Reporting service' },
        { name: 'preview', description: 'Live preview service' },
        { name: 'ws', description: 'WebSocket services' },
        { name: 'system', description: 'System endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  };
}
