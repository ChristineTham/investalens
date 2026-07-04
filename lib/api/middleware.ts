import { db } from "@/lib/db";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function authenticateApiRequest(
  request: Request
): Promise<{ userId: string; scope: string } | Response | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const apiToken = await db.apiToken.findUnique({
    where: { tokenHash },
  });

  if (!apiToken) return null;
  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) return null;

  // Rate limit per token. The counter is an in-memory Map, so it is enforced
  // per server instance only (known limitation on serverless).
  const rateLimit = checkRateLimit(tokenHash);
  if (!rateLimit.allowed) {
    return jsonError(
      "RATE_LIMITED",
      "Rate limit exceeded, try again later",
      429,
      {
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetAt / 1000)),
        ...(rateLimit.retryAfter
          ? { "Retry-After": String(rateLimit.retryAfter) }
          : {}),
      }
    );
  }

  await db.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsed: new Date() },
  });

  return { userId: apiToken.userId, scope: apiToken.scope };
}

export function hasScope(
  userScope: string,
  required: "read" | "write" | "admin"
): boolean {
  const levels = ["read", "write", "admin"];
  return levels.indexOf(userScope) >= levels.indexOf(required);
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  headers?: HeadersInit
) {
  return Response.json(
    { error: { code, message } },
    { status, ...(headers ? { headers } : {}) }
  );
}

export function jsonSuccess<T>(data: T, meta?: Record<string, unknown>) {
  return Response.json({ data, ...(meta ? { meta } : {}) });
}
