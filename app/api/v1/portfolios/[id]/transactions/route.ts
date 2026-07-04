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
  if (auth instanceof Response) return auth;
  if (!auth)
    return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "read"))
    return jsonError("forbidden", "Insufficient scope", 403);

  const { id } = await params;

  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: auth.userId },
  });
  if (!portfolio) return jsonError("not_found", "Portfolio not found", 404);

  const { searchParams } = new URL(request.url);
  const holdingId = searchParams.get("holdingId") || undefined;
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
  const offset = Number(searchParams.get("offset")) || 0;

  const where: Record<string, unknown> = {
    holding: { portfolioId: id },
  };
  if (holdingId) where.holdingId = holdingId;

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      include: { holding: { include: { instrument: true } } },
      orderBy: { tradeDate: "desc" },
      take: limit,
      skip: offset,
    }),
    db.transaction.count({ where }),
  ]);

  return jsonSuccess(transactions, { total, limit, offset });
}

export async function POST(
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

  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: auth.userId },
  });
  if (!portfolio) return jsonError("not_found", "Portfolio not found", 404);

  const body = await request.json();

  if (!body.holdingId || !body.transactionType || !body.tradeDate) {
    return jsonError(
      "bad_request",
      "holdingId, transactionType, and tradeDate are required",
      400
    );
  }

  // Verify holding belongs to this portfolio
  const holding = await db.holding.findFirst({
    where: { id: body.holdingId, portfolioId: id },
  });
  if (!holding)
    return jsonError("bad_request", "Holding does not belong to portfolio", 400);

  const transaction = await db.transaction.create({
    data: {
      holdingId: body.holdingId,
      transactionType: body.transactionType,
      tradeDate: new Date(body.tradeDate),
      quantity: body.quantity || 0,
      price: body.price || 0,
      brokerage: body.brokerage || 0,
      currency: body.currency || "AUD",
      exchangeRate: body.exchangeRate || 1,
      comments: body.comments || null,
    },
  });

  return jsonSuccess(transaction, { status: 201 });
}
