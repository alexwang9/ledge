import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

let authRatelimit: Ratelimit | null = null;

if (redisUrl && redisToken) {
  authRatelimit = new Ratelimit({
    redis: new Redis({ url: redisUrl, token: redisToken }),
    limiter: Ratelimit.slidingWindow(5, '60s'),
    prefix: 'ledge:auth',
  });
}

export async function checkRateLimit(ip: string): Promise<{ limited: boolean }> {
  if (!authRatelimit) return { limited: false };
  const { success } = await authRatelimit.limit(ip);
  return { limited: !success };
}
