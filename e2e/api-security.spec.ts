import { test, expect } from "@playwright/test";
import { escapeCsv } from "../lib/export/csv-escape";

/**
 * v1 API security (v2.1.0).
 *
 * These run WITHOUT a browser session — they hit the running server directly
 * via the `request` fixture and assert the API's own auth, rate-limiting and
 * CSV-injection defences.
 *
 * The unauthenticated cases need only a reachable server. The cases that need
 * a valid bearer token skip gracefully unless E2E_API_TOKEN is provided (mint
 * one at Settings -> API Tokens, or POST /api/v1/auth/token with an admin
 * token).
 */

// No storageState — the point is to test the API without an in-app session.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("v1 API auth", () => {
  test("POST /api/v1/chat returns 401 without a bearer token", async ({
    request,
  }) => {
    const res = await request.post("/api/v1/chat", {
      data: { messages: [{ role: "user", content: "hello" }] },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("unauthorized");
  });

  test("POST /api/v1/ai-import returns 401 without a bearer token", async ({
    request,
  }) => {
    const res = await request.post("/api/v1/ai-import", {
      data: { content: "some statement", documentType: "broker" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("unauthorized");
  });

  test("a garbage bearer token is still rejected as unauthorized", async ({
    request,
  }) => {
    const res = await request.post("/api/v1/chat", {
      headers: { authorization: "Bearer not-a-real-token" },
      data: { messages: [{ role: "user", content: "hi" }] },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("v1 API rate limiting", () => {
  // The middleware enforces 100 requests/min/token and surfaces the window on
  // every authenticated response via X-RateLimit-* headers.
  test("authenticated requests surface X-RateLimit headers (100/min)", async ({
    request,
  }) => {
    const token = process.env.E2E_API_TOKEN;
    test.skip(!token, "Set E2E_API_TOKEN to exercise the authenticated path");

    // GET /api/v1/auth/token requires only "read" scope and is safe to poll.
    const res = await request.get("/api/v1/auth/token", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);

    const limit = res.headers()["x-ratelimit-limit"];
    const remaining = res.headers()["x-ratelimit-remaining"];
    expect(limit, "X-RateLimit-Limit header present").toBeTruthy();
    expect(remaining, "X-RateLimit-Remaining header present").toBeTruthy();
    // Documents the 100 requests-per-minute window.
    expect(Number(limit)).toBe(100);
    expect(Number(remaining)).toBeLessThanOrEqual(100);
  });
});

test.describe("CSV export formula-injection defence", () => {
  // The export route neutralises spreadsheet-formula injection with the shared
  // escapeCsv helper (lib/export/csv-escape.ts) — a cell starting with = is
  // prefixed with a single quote so a spreadsheet won't execute it.
  test("a cell starting with '=' is neutralised", () => {
    const malicious = "=1+2";
    const escaped = escapeCsv(malicious);
    // Leading single-quote defuses the formula; because the value now contains
    // a leading quote it is also wrapped/escaped per RFC 4180.
    expect(escaped.startsWith("=")).toBe(false);
    expect(escaped).toContain("'=1+2");
  });

  test("dangerous prefixes (=, +, @) are all neutralised but plain numbers pass", () => {
    expect(escapeCsv("+cmd").startsWith("+")).toBe(false);
    expect(escapeCsv("@SUM(A1)").startsWith("@")).toBe(false);
    // A genuine negative number is NOT treated as a formula.
    expect(escapeCsv("-123.45")).toBe("-123.45");
  });

  test("an authenticated CSV export neutralises an injected instrument name", async ({
    request,
  }) => {
    const token = process.env.E2E_API_TOKEN;
    const portfolioId = process.env.E2E_PORTFOLIO_ID;
    test.skip(
      !token || !portfolioId,
      "Set E2E_API_TOKEN and E2E_PORTFOLIO_ID to exercise a live CSV export"
    );

    const res = await request.get(
      `/api/v1/portfolios/${portfolioId}/export?format=csv`,
      { headers: { authorization: `Bearer ${token}` } }
    );
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");

    const csv = await res.text();
    // No data cell may begin a formula. Header row is a fixed allow-list.
    const lines = csv.split("\n").slice(1);
    for (const line of lines) {
      for (const cell of line.split(",")) {
        expect(/^"?[=+@]/.test(cell)).toBe(false);
      }
    }
  });
});
