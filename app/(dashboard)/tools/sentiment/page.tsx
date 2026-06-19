import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMarketSentiment } from "@/lib/services/market-sentiment";

export default async function SentimentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let sentiment;
  try {
    sentiment = await getMarketSentiment();
  } catch {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold">Market Sentiment</h1>
        <p className="text-muted-foreground">Unable to fetch market data. Please try again later.</p>
      </div>
    );
  }

  const fgLabel =
    sentiment.fearGreedIndex >= 75 ? "Extreme Greed" :
    sentiment.fearGreedIndex >= 55 ? "Greed" :
    sentiment.fearGreedIndex >= 45 ? "Neutral" :
    sentiment.fearGreedIndex >= 25 ? "Fear" : "Extreme Fear";

  const fgColor =
    sentiment.fearGreedIndex >= 75 ? "text-gain" :
    sentiment.fearGreedIndex >= 55 ? "text-gain" :
    sentiment.fearGreedIndex >= 45 ? "text-warning" :
    sentiment.fearGreedIndex >= 25 ? "text-warning" : "text-loss";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Market Sentiment</h1>
        <p className="text-sm text-muted-foreground">Real-time market indicators and sector performance</p>
      </div>

      {/* Fear & Greed + ASX Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col items-center justify-center rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Fear & Greed Index</p>
          <p className={`text-5xl font-bold ${fgColor}`}>{sentiment.fearGreedIndex}</p>
          <p className={`text-sm font-medium ${fgColor}`}>{fgLabel}</p>
          {sentiment.vixLevel != null && (
            <p className="mt-2 text-xs text-muted-foreground">VIX: {sentiment.vixLevel.toFixed(1)}</p>
          )}
        </div>

        {sentiment.asxSummary && (
          <div className="rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">S&P/ASX 200</p>
            <p className="text-3xl font-bold">{sentiment.asxSummary.close.toFixed(1)}</p>
            <p className={`text-sm font-medium ${sentiment.asxSummary.change >= 0 ? "text-gain" : "text-loss"}`}>
              {sentiment.asxSummary.change >= 0 ? "+" : ""}{sentiment.asxSummary.change.toFixed(1)} ({sentiment.asxSummary.changePercent.toFixed(2)}%)
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Volume: {(sentiment.asxSummary.volume / 1e6).toFixed(1)}M
            </p>
          </div>
        )}
      </div>

      {/* Sector Heatmap */}
      {Object.keys(sentiment.sectorPerformance).length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium">Sector Performance (Today)</h2>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
            {Object.entries(sentiment.sectorPerformance)
              .sort(([, a], [, b]) => b - a)
              .map(([sector, change]) => (
                <div
                  key={sector}
                  className={`rounded-lg p-3 text-center ${
                    change >= 0
                      ? "bg-gain/10"
                      : "bg-loss/10"
                  }`}
                >
                  <p className="text-xs font-medium">{sector}</p>
                  <p className={`text-sm font-bold ${change >= 0 ? "text-gain" : "text-loss"}`}>
                    {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
