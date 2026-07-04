import {
  authenticateApiRequest,
  hasScope,
  jsonError,
  jsonSuccess,
} from "@/lib/api/middleware";
import { db } from "@/lib/db";
import { updatePortfolioSchema } from "@/lib/validators/portfolio";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request);
  if (auth instanceof Response) return auth;
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
  if (auth instanceof Response) return auth;
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "write"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { id } = await params;
  const body = await request.json().catch(() => null);

  // Allow-list updatable fields — never pass the raw body to Prisma.
  const parsed = updatePortfolioSchema.safeParse(body);
  if (!parsed.success)
    return jsonError("bad_request", "Invalid portfolio data", 400);

  const updated = await db.portfolio.updateMany({
    where: { id, userId: auth.userId },
    data: parsed.data,
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
  if (auth instanceof Response) return auth;
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
