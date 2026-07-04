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

  const holdings = await db.holding.findMany({
    where: { portfolioId: id },
    include: {
      instrument: true,
      _count: { select: { transactions: true } },
    },
  });

  return jsonSuccess(holdings);
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

  if (!body.instrumentCode || !body.marketCode) {
    return jsonError(
      "bad_request",
      "instrumentCode and marketCode are required",
      400
    );
  }

  // Find or create instrument
  let instrument = await db.instrument.findFirst({
    where: { code: body.instrumentCode, marketCode: body.marketCode },
  });

  if (!instrument) {
    instrument = await db.instrument.create({
      data: {
        code: body.instrumentCode,
        marketCode: body.marketCode,
        name: body.instrumentName || body.instrumentCode,
        type: body.instrumentType || "EQUITY",
        currency: body.currency || "AUD",
      },
    });
  }

  const holding = await db.holding.create({
    data: {
      portfolioId: id,
      instrumentId: instrument.id,
    },
    include: { instrument: true },
  });

  return jsonSuccess(holding, { status: 201 });
}
