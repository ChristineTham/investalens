import {
  authenticateApiRequest,
  hasScope,
  jsonError,
  jsonSuccess,
} from "@/lib/api/middleware";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof Response) return auth;
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "read"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const tokens = await db.apiToken.findMany({
    where: { userId: auth.userId },
    select: {
      id: true,
      name: true,
      scope: true,
      expiresAt: true,
      lastUsed: true,
      createdAt: true,
    },
  });

  return jsonSuccess(tokens);
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof Response) return auth;
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "admin"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const body = await request.json();

  if (!body.name) {
    return jsonError("bad_request", "name is required", 400);
  }

  const scope = body.scope || "read";
  if (!["read", "write", "admin"].includes(scope)) {
    return jsonError("bad_request", "scope must be read, write, or admin", 400);
  }

  // Generate a secure random token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const expiresAt = body.expiresInDays
    ? new Date(Date.now() + body.expiresInDays * 86400000)
    : null;

  const apiToken = await db.apiToken.create({
    data: {
      userId: auth.userId,
      name: body.name,
      tokenHash,
      scope,
      expiresAt,
    },
  });

  // Return the raw token ONCE — it cannot be retrieved again
  return jsonSuccess({
    id: apiToken.id,
    name: apiToken.name,
    token: rawToken,
    scope: apiToken.scope,
    expiresAt: apiToken.expiresAt,
    createdAt: apiToken.createdAt,
  });
}

export async function DELETE(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof Response) return auth;
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "admin"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get("id");

  if (!tokenId) {
    return jsonError("bad_request", "Token id is required", 400);
  }

  const deleted = await db.apiToken.deleteMany({
    where: { id: tokenId, userId: auth.userId },
  });

  if (deleted.count === 0)
    return jsonError("not_found", "Token not found", 404);
  return jsonSuccess({ deleted: true });
}
