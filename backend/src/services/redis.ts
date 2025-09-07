import Redis from 'ioredis';

let client: Redis | undefined;

export function getRedis(url?: string) {
  if (!client) {
  const u = url || process.env.REDIS_URL || '';
  client = u ? new Redis(u) : new Redis();
  }
  return client;
}
