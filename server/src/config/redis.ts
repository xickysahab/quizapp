import Redis, { RedisOptions } from 'ioredis';

const url = process.env.REDIS_URL;

/** Redis is optional: without REDIS_URL the server runs single-instance on in-process state. */
export const redisEnabled = Boolean(url);

const options: RedisOptions = {
  // Keep retrying rather than giving up: a brief Redis blip during a live event
  // should recover on its own instead of taking the process down.
  retryStrategy: (times: number) => Math.min(times * 200, 5000),
  maxRetriesPerRequest: 3,
};

const clients: Redis[] = [];

export function createRedisClient(): Redis {
  if (!url) {
    throw new Error('REDIS_URL is not set.');
  }
  const client = new Redis(url, options);
  client.on('error', (error: Error) => {
    console.error('Redis connection error:', error.message);
  });
  clients.push(client);
  return client;
}

let shared: Redis | null = null;

/** Shared client for ordinary commands. The pub/sub adapter gets its own pair. */
export function getRedis(): Redis | null {
  if (!url) return null;
  if (!shared) shared = createRedisClient();
  return shared;
}

export async function closeRedis(): Promise<void> {
  await Promise.all(
    clients.map((client) =>
      client.quit().catch(() => {
        client.disconnect();
      })
    )
  );
  clients.length = 0;
  shared = null;
}
