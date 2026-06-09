import {
  authenticateApiRequest,
  hasScope,
  jsonError,
  jsonSuccess,
} from "@/lib/api/middleware";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "read"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { id } = await params;

  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: auth.userId },
    include: { holdings: { include: { instrument: true } } },
  });

  if (!portfolio) return jsonError("not_found", "Portfolio not found", 404);
  return jsonSuccess(portfolio);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "write"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { id } = await params;
  const body = await request.json();

  const updated = await db.portfolio.updateMany({
    where: { id, userId: auth.userId },
    data: body,
  });

  if (updated.count === 0)
    return jsonError("not_found", "Portfolio not found", 404);
  return jsonSuccess({ updated: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "admin"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { id } = await params;

  const deleted = await db.portfolio.deleteMany({
    where: { id, userId: auth.userId },
  });

  if (deleted.count === 0)
    return jsonError("not_found", "Portfolio not found", 404);
  return jsonSuccess({ deleted: true });
}
