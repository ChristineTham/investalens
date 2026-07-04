import {
  authenticateApiRequest,
  hasScope,
  jsonError,
} from "@/lib/api/middleware";
import { db } from "@/lib/db";
import { calculatePosition } from "@/lib/calculations/position";
import { getLatestPrices } from "@/lib/services/latest-prices";
import { escapeCsv } from "@/lib/export/csv-escape";

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
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";

  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: auth.userId },
    include: {
      holdings: {
        include: {
          instrument: true,
          transactions: { orderBy: { tradeDate: "asc" } },
        },
      },
    },
  });

  if (!portfolio) return jsonError("not_found", "Portfolio not found", 404);

  if (format === "csv") {
    const headers = [
      "Date",
      "Code",
      "Market",
      "Type",
      "Quantity",
      "Price",
      "Brokerage",
      "Currency",
      "Exchange Rate",
      "Comments",
    ];

    const rows: string[][] = [];
    for (const holding of portfolio.holdings) {
      for (const tx of holding.transactions) {
        rows.push([
          tx.tradeDate.toISOString().split("T")[0],
          holding.instrument.code,
          holding.instrument.marketCode,
          tx.transactionType,
          String(tx.quantity),
          String(tx.price),
          String(tx.brokerage),
          tx.currency,
          String(tx.exchangeRate),
          tx.comments || "",
        ]);
      }
    }

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map(escapeCsv).join(",")),
    ].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${portfolio.name}-export.csv"`,
      },
    });
  }

  // JSON format — include holdings with positions
  const latestPrices = await getLatestPrices(
    portfolio.holdings.map((h) => h.instrumentId)
  );
  const holdingsWithPositions = await Promise.all(
    portfolio.holdings.map(async (holding) => {
      const currentPrice = latestPrices.get(holding.instrumentId)?.close ?? 0;
      const txData = holding.transactions.map((tx) => ({
        id: tx.id,
        transactionType: tx.transactionType,
        tradeDate: tx.tradeDate,
        quantity: tx.quantity,
        price: tx.price,
        brokerage: tx.brokerage,
        exchangeRate: tx.exchangeRate,
        currency: tx.currency,
      }));

      const position = calculatePosition(txData, currentPrice);

      return {
        instrument: holding.instrument,
        position,
        transactions: holding.transactions,
      };
    })
  );

  return Response.json({
    data: {
      portfolio: {
        id: portfolio.id,
        name: portfolio.name,
        baseCurrency: portfolio.baseCurrency,
        taxResidency: portfolio.taxResidency,
      },
      holdings: holdingsWithPositions,
      exportedAt: new Date().toISOString(),
    },
  });
}
