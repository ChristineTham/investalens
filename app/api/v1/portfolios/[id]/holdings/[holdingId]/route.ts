import {
  authenticateApiRequest,
  hasScope,
  jsonError,
  jsonSuccess,
} from "@/lib/api/middleware";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; holdingId: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "read"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { id, holdingId } = await params;

  const holding = await db.holding.findFirst({
    where: {
      id: holdingId,
      portfolioId: id,
      portfolio: { userId: auth.userId },
    },
    include: {
      instrument: true,
      transactions: { orderBy: { tradeDate: "desc" } },
    },
  });

  if (!holding) return jsonError("not_found", "Holding not found", 404);
  return jsonSuccess(holding);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; holdingId: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "admin"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { id, holdingId } = await params;

  const holding = await db.holding.findFirst({
    where: {
      id: holdingId,
      portfolioId: id,
      portfolio: { userId: auth.userId },
    },
  });

  if (!holding) return jsonError("not_found", "Holding not found", 404);

  await db.holding.delete({ where: { id: holdingId } });
  return jsonSuccess({ deleted: true });
}
