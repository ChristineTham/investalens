// NOTE: this counter is held in an in-memory Map, so limits are enforced
// per server instance only — on serverless deployments each instance keeps
// its own window (known limitation, documented separately).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100;

export function checkRateLimit(tokenHash: string): {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(tokenHash);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + WINDOW_MS;
    rateLimitMap.set(tokenHash, { count: 1, resetAt });
    return {
      allowed: true,
      limit: MAX_REQUESTS,
      remaining: MAX_REQUESTS - 1,
      resetAt,
    };
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      limit: MAX_REQUESTS,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  entry.count++;
  return {
    allowed: true,
    limit: MAX_REQUESTS,
    remaining: MAX_REQUESTS - entry.count,
    resetAt: entry.resetAt,
  };
}
