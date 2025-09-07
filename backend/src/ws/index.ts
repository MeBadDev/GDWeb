import { FastifyInstance } from 'fastify';

export async function registerWs(app: FastifyInstance) {
  app.get('/chat/:gameId', { websocket: true, schema: { tags: ['ws'] } }, (connection, req) => {
    // TODO: Auth and rate limiting via Redis
    const { gameId } = req.params as any;
    connection.socket.send(JSON.stringify({ type: 'message:history', data: [] }));
  connection.socket.on('message', (raw: any) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'message:new') {
          // fanout to room (placeholder: echo)
          connection.socket.send(JSON.stringify({ type: 'message:new', data: msg.data }));
        }
      } catch {
        connection.socket.send(JSON.stringify({ type: 'error', code: 400, message: 'malformed message' }));
      }
    });
  });

  app.get('/multiplayer/signaling', { websocket: true, schema: { tags: ['ws'] } }, (connection) => {
    connection.socket.on('message', (raw: any) => {
      try {
        const msg = JSON.parse(String(raw));
        if (['signal:offer', 'signal:answer', 'signal:ice'].includes(msg.type)) {
          // In MVP we echo back; real impl routes to peer via room
          connection.socket.send(JSON.stringify(msg));
        }
      } catch {
        connection.socket.send(JSON.stringify({ type: 'error', code: 400 }));
      }
    });
  });
}
