/**
 * Token-bucket rate limiter for external API calls.
 * Ensures requests stay within provider limits (Yahoo Finance: ~2000/hour).
 */

interface RateLimiterOptions {
  /** Max tokens (requests) in the bucket */
  maxTokens: number;
  /** Tokens refilled per second */
  refillRate: number;
  /** Minimum delay between requests in ms */
  minDelayMs: number;
}

class TokenBucketRateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private minDelayMs: number;
  private lastRefill: number;
  private lastRequest: number;

  constructor(options: RateLimiterOptions) {
    this.maxTokens = options.maxTokens;
    this.tokens = options.maxTokens;
    this.refillRate = options.refillRate;
    this.minDelayMs = options.minDelayMs;
    this.lastRefill = Date.now();
    this.lastRequest = 0;
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refill();

    // Enforce minimum delay between requests
    const timeSinceLast = Date.now() - this.lastRequest;
    if (timeSinceLast < this.minDelayMs) {
      await new Promise((r) => setTimeout(r, this.minDelayMs - timeSinceLast));
    }

    // Wait for a token to become available
    while (this.tokens < 1) {
      const waitTime = Math.ceil((1 - this.tokens) / this.refillRate * 1000);
      await new Promise((r) => setTimeout(r, waitTime));
      this.refill();
    }

    this.tokens -= 1;
    this.lastRequest = Date.now();
  }

  get available(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

/**
 * Yahoo Finance rate limiter:
 * - Max 30 requests in burst (bucket size)
 * - Refills at 0.5 req/sec (~1800/hour, well under 2000 limit)
 * - Minimum 500ms between requests
 */
export const yahooRateLimiter = new TokenBucketRateLimiter({
  maxTokens: 30,
  refillRate: 0.5,
  minDelayMs: 500,
});

/**
 * Per-user cooldown to prevent abuse.
 * Each user can only trigger a full fetch once every 5 minutes.
 */
const userCooldowns = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export function checkUserCooldown(userId: string): {
  allowed: boolean;
  remainingSeconds: number;
} {
  const lastRun = userCooldowns.get(userId);
  if (!lastRun) return { allowed: true, remainingSeconds: 0 };

  const elapsed = Date.now() - lastRun;
  if (elapsed >= COOLDOWN_MS) return { allowed: true, remainingSeconds: 0 };

  return {
    allowed: false,
    remainingSeconds: Math.ceil((COOLDOWN_MS - elapsed) / 1000),
  };
}

export function setUserCooldown(userId: string): void {
  userCooldowns.set(userId, Date.now());
}
