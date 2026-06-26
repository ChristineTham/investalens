import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMarketSentiment } from "@/lib/services/market-sentiment";
import { RadialGauge } from "@/components/charts/radial-bar";
import { SignedBarChart } from "@/components/charts/signed-bar-chart";
import { ChartCard } from "@/components/charts/chart-card";

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

  const fgVar =
    sentiment.fearGreedIndex >= 55 ? "var(--gain)" :
    sentiment.fearGreedIndex >= 45 ? "var(--warning)" : "var(--loss)";

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
          <div className="h-44 w-full max-w-xs">
            <RadialGauge
              value={sentiment.fearGreedIndex}
              height={176}
              colorVar={fgVar}
              caption={fgLabel}
            />
          </div>
          {sentiment.vixLevel != null && (
            <p className="mt-1 text-xs text-muted-foreground">VIX: {sentiment.vixLevel.toFixed(1)}</p>
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
        <ChartCard
          title="Sector performance (today)"
          description="Daily change by sector"
          height={Math.max(240, Object.keys(sentiment.sectorPerformance).length * 28)}
        >
          {(h) => (
            <SignedBarChart
              height={h}
              unit="percent"
              data={Object.entries(sentiment.sectorPerformance).map(
                ([name, value]) => ({ name, value })
              )}
            />
          )}
        </ChartCard>
      )}
    </div>
  );
}
