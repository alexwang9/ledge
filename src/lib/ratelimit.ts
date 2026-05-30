import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let authRatelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  authRatelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '60s'),
    prefix: 'ledge:auth',
  });
}

export async function checkRateLimit(ip: string): Promise<{ limited: boolean }> {
  if (!authRatelimit) return { limited: false };
  const { success } = await authRatelimit.limit(ip);
  return { limited: !success };
}
