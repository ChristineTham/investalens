import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getPortfolioReturnsMatrix,
  getBenchmarkTimeSeries,
} from "@/lib/services/analytics-data";

type DateRange = "1Y" | "3Y" | "5Y" | "10Y" | "MAX";
const RANGES: DateRange[] = ["1Y", "3Y", "5Y", "10Y", "MAX"];

/**
 * Shared returns-matrix endpoint consumed by every analytics client
 * (optimize / backtest / frontier / correlations / factors / stress /
 * black-litterman). Supports two sources:
 *   - portfolio (default): ?portfolio=<id>&range=<r>
 *   - model:               ?source=model&model=<id>&range=<r>
 *
 * Both return the byte-compatible shape { dates, assets, returns, weights,
 * prices } so the Python compute layer is unchanged.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rangeParam = (searchParams.get("range") || "3Y") as DateRange;
  const range = RANGES.includes(rangeParam) ? rangeParam : "3Y";
  const source = searchParams.get("source");

  if (source === "model") {
    const modelId = searchParams.get("model");
    if (!modelId) {
      return NextResponse.json({ error: "Missing model id" }, { status: 400 });
    }
    // Ownership: own model or a system default (userId null).
    const model = await db.modelPortfolio.findFirst({
      where: { id: modelId, OR: [{ userId: session.user.id }, { userId: null }] },
      select: { id: true },
    });
    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }
    const { getModelReturnsMatrix } = await import(
      "@/lib/services/model-analytics"
    );
    return NextResponse.json(await getModelReturnsMatrix(modelId, range));
  }

  if (source === "benchmark") {
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "Missing benchmark code" }, {
        status: 400,
      });
    }
    // Single-asset matrix shape so it can be collapsed like any portfolio.
    const ts = await getBenchmarkTimeSeries(code, range);
    return NextResponse.json({
      dates: ts.dates,
      assets: [code],
      returns: ts.returns.map((r) => [r]),
      weights: { [code]: 1 },
      prices: { [code]: ts.values },
    });
  }

  const portfolioId = searchParams.get("portfolio");
  if (!portfolioId) {
    return NextResponse.json(
      { error: "Missing portfolio id" },
      { status: 400 }
    );
  }
  // Ownership: own portfolio or one shared with this user.
  const portfolio = await db.portfolio.findFirst({
    where: {
      id: portfolioId,
      OR: [
        { userId: session.user.id },
        { shares: { some: { email: session.user.email! } } },
      ],
    },
    select: { id: true },
  });
  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  return NextResponse.json(
    await getPortfolioReturnsMatrix(portfolioId, range)
  );
}
