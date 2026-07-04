import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit } from "@/lib/api/rate-limit";

const WINDOW_MS = 60_000;
const LIMIT = 100;

// The rate limiter keeps state in a module-level Map keyed by tokenHash, so
// every test uses a DISTINCT tokenHash to avoid cross-test leakage.
let seq = 0;
function uniqueToken(label: string): string {
  return `token-${label}-${seq++}`;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-04T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit — first call", () => {
  it("allows the first call with remaining = limit - 1", () => {
    const token = uniqueToken("first");
    const r = checkRateLimit(token);
    expect(r.allowed).toBe(true);
    expect(r.limit).toBe(LIMIT);
    expect(r.remaining).toBe(LIMIT - 1);
    expect(r.retryAfter).toBeUndefined();
    expect(r.resetAt).toBe(Date.now() + WINDOW_MS);
  });
});

describe("checkRateLimit — hitting the cap within a window", () => {
  it("allows calls 1..100 then blocks the 101st with retryAfter and remaining 0", () => {
    const token = uniqueToken("cap");

    // Calls 1..99 should be allowed with descending remaining.
    for (let i = 1; i <= LIMIT - 1; i++) {
      const r = checkRateLimit(token);
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(LIMIT - i);
    }

    // Call 100: last allowed call, remaining hits 0.
    const hundredth = checkRateLimit(token);
    expect(hundredth.allowed).toBe(true);
    expect(hundredth.remaining).toBe(0);

    // Call 101: blocked.
    const overLimit = checkRateLimit(token);
    expect(overLimit.allowed).toBe(false);
    expect(overLimit.remaining).toBe(0);
    expect(overLimit.retryAfter).toBeGreaterThan(0);
    expect(overLimit.retryAfter).toBeLessThanOrEqual(60);
  });

  it("computes retryAfter from the remaining window time", () => {
    const token = uniqueToken("retry");
    for (let i = 0; i < LIMIT; i++) checkRateLimit(token);

    // Advance 30s inside the window, then trip the limit.
    vi.advanceTimersByTime(30_000);
    const blocked = checkRateLimit(token);
    expect(blocked.allowed).toBe(false);
    // ~30s left in the 60s window.
    expect(blocked.retryAfter).toBe(30);
  });
});

describe("checkRateLimit — window reset", () => {
  it("resets to a fresh window after resetAt passes", () => {
    const token = uniqueToken("reset");

    // Exhaust the window.
    for (let i = 0; i < LIMIT; i++) checkRateLimit(token);
    expect(checkRateLimit(token).allowed).toBe(false);

    // Advance past the window boundary (resetAt = start + 60s; go beyond).
    vi.advanceTimersByTime(WINDOW_MS + 1);

    const fresh = checkRateLimit(token);
    expect(fresh.allowed).toBe(true);
    expect(fresh.remaining).toBe(LIMIT - 1);
    expect(fresh.resetAt).toBe(Date.now() + WINDOW_MS);
  });

  it("does NOT reset while still inside the window boundary", () => {
    const token = uniqueToken("inside");
    for (let i = 0; i < LIMIT; i++) checkRateLimit(token);

    // Advance to just before the boundary.
    vi.advanceTimersByTime(WINDOW_MS - 1);
    expect(checkRateLimit(token).allowed).toBe(false);
  });
});

describe("checkRateLimit — independent tokens", () => {
  it("tracks separate counters per tokenHash", () => {
    const a = uniqueToken("iso-a");
    const b = uniqueToken("iso-b");

    for (let i = 0; i < LIMIT; i++) checkRateLimit(a);
    expect(checkRateLimit(a).allowed).toBe(false);

    // b is untouched — its first call is still allowed.
    const first = checkRateLimit(b);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(LIMIT - 1);
  });
});
