import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

/**
 * Per-scope limits so one flow can't lock a user out of another (e.g. a
 * legitimate signup burns register + code sends + a mistyped code without
 * hitting a shared window).
 */
export type RateLimitScope = 'login' | 'code-send' | 'code-verify';

const limiters: Record<RateLimitScope, Ratelimit> | null =
  redisUrl && redisToken
    ? (() => {
        const redis = new Redis({ url: redisUrl, token: redisToken });
        return {
          login: new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(5, '60s'),
            prefix: 'ledge:auth:login',
          }),
          'code-send': new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(3, '60s'),
            prefix: 'ledge:auth:send',
          }),
          'code-verify': new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(10, '60s'),
            prefix: 'ledge:auth:verify',
          }),
        };
      })()
    : null;

export async function checkRateLimit(
  ip: string,
  scope: RateLimitScope = 'login'
): Promise<{ limited: boolean }> {
  if (!limiters) return { limited: false };
  const { success } = await limiters[scope].limit(ip);
  return { limited: !success };
}
