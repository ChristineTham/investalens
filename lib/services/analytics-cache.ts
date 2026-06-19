export const CACHE_TTL = {
  timeSeries: 3600, // 1 hour
  benchmark: 86400, // 24 hours
  riskMetrics: 3600, // 1 hour
  backtest: 604800, // 7 days
  optimization: 86400, // 24 hours
  monteCarlo: 0, // Session-only (parameter-dependent)
  factorData: 2592000, // 30 days
  frontier: 86400, // 24 hours
} as const;

const cache = new Map<string, { data: unknown; expires: number }>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlSeconds: number): void {
  if (ttlSeconds <= 0) return;
  cache.set(key, { data, expires: Date.now() + ttlSeconds * 1000 });
}

export function invalidateCache(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key);
    }
  }
}

export function cacheKey(...parts: string[]): string {
  return parts.join(":");
}
