import { Request, Response, NextFunction } from 'express';
import { getRedis } from '../config/redis';

type RateLimitOptions = {
  /** Namespace for the counter, so separate limiters never share a bucket. */
  name: string;
  windowMs: number;
  max: number;
  message?: string;
};

type Bucket = { count: number; resetAt: number };

const SWEEP_INTERVAL_MS = 60_000;

function clientKey(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

function reject(res: Response, retryAfterMs: number, message?: string): void {
  res.setHeader('Retry-After', String(Math.max(1, Math.ceil(retryAfterMs / 1000))));
  res.status(429).json({
    message: message ?? 'Too many requests. Please try again shortly.',
  });
}

/**
 * Fixed-window limiter. Uses Redis when available so the limit holds across
 * instances; otherwise it counts in process memory, which means the effective
 * limit is multiplied by the number of instances running.
 */
export function rateLimit({ name, windowMs, max, message }: RateLimitOptions) {
  const redis = getRedis();

  if (redis) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = `sm:rl:${name}:${clientKey(req)}`;

      void redis
        .multi()
        .incr(key)
        .pttl(key)
        .exec()
        .then(async (results) => {
          const rows = results as Array<[Error | null, unknown]> | null;
          const count = typeof rows?.[0]?.[1] === 'number' ? (rows[0][1] as number) : 0;
          const ttl = typeof rows?.[1]?.[1] === 'number' ? (rows[1][1] as number) : -1;

          // First hit in this window (or a key with no expiry): start the clock.
          if (ttl < 0) {
            await redis.pexpire(key, windowMs);
          }

          if (count > max) {
            reject(res, ttl > 0 ? ttl : windowMs, message);
            return;
          }
          next();
        })
        .catch((error: Error) => {
          // Fail open. A Redis blip must not lock an audience out of the quiz.
          console.error('Rate limit check failed, allowing request:', error.message);
          next();
        });
    };
  }

  const buckets = new Map<string, Bucket>();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, SWEEP_INTERVAL_MS);
  sweep.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = clientKey(req);
    const now = Date.now();

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      reject(res, bucket.resetAt - now, message);
      return;
    }

    next();
  };
}
