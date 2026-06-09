import { db } from "@/lib/db";
import crypto from "crypto";

export async function authenticateApiRequest(
  request: Request
): Promise<{ userId: string; scope: string } | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const apiToken = await db.apiToken.findUnique({
    where: { tokenHash },
  });

  if (!apiToken) return null;
  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) return null;

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

export function jsonError(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export function jsonSuccess<T>(data: T, meta?: Record<string, unknown>) {
  return Response.json({ data, ...(meta ? { meta } : {}) });
}
