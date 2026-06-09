import { NextResponse } from "next/server";
import { authenticateApiRequest, hasScope, jsonError, jsonSuccess } from "@/lib/api/middleware";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "read")) return jsonError("forbidden", "Insufficient scope", 403);

  const portfolios = await db.portfolio.findMany({
    where: { userId: auth.userId },
    include: { _count: { select: { holdings: true } } },
  });

  return jsonSuccess(portfolios);
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return jsonError("unauthorized", "Invalid or missing API token", 401);
  if (!hasScope(auth.scope, "write")) return jsonError("forbidden", "Insufficient scope", 403);

  const body = await request.json();

  const portfolio = await db.portfolio.create({
    data: {
      userId: auth.userId,
      name: body.name || "New Portfolio",
      taxResidency: body.taxResidency || "AU",
      baseCurrency: body.baseCurrency || "AUD",
    },
  });

  return jsonSuccess(portfolio, undefined);
}
