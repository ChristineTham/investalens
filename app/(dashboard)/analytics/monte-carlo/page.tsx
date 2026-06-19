"use client";

import { useState } from "react";
import { runMonteCarloSimulation } from "@/lib/calculations/monte-carlo";
import { MonteCarloChart } from "@/components/charts/monte-carlo-chart";
import { formatCurrency } from "@/lib/utils";

export default function MonteCarloPage() {
  const [currentValue, setCurrentValue] = useState("100000");
  const [annualReturn, setAnnualReturn] = useState("8");
  const [annualVol, setAnnualVol] = useState("15");
  const [years, setYears] = useState("10");
  const [monthlyContrib, setMonthlyContrib] = useState("1000");
  const [numSims] = useState("1000");
  const [result, setResult] = useState<ReturnType<
    typeof runMonteCarloSimulation
  > | null>(null);
  const [running, setRunning] = useState(false);

  function handleRun() {
    setRunning(true);
    // Use setTimeout to let UI update
    setTimeout(() => {
      const sim = runMonteCarloSimulation({
        currentValue: Number(currentValue),
        annualisedReturn: Number(annualReturn) / 100,
        annualisedVolatility: Number(annualVol) / 100,
        yearsToProject: Number(years),
        numSimulations: Number(numSims),
        monthlyContribution: Number(monthlyContrib),
      });
      setResult(sim);
      setRunning(false);
    }, 50);
  }

  // Prepare chart data
  const chartData = result
    ? result.percentile50.map((_, i) => ({
        month: i,
        p5: result.percentile5[i],
        p25: result.percentile25[i],
        p50: result.percentile50[i],
        p75: result.percentile75[i],
        p95: result.percentile95[i],
        mean: result.mean[i],
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">
          Monte Carlo Simulation
        </h1>
        <p className="text-sm text-muted-foreground">
          Project portfolio growth using probabilistic modelling with{" "}
          {numSims} randomised simulations.
        </p>
      </div>

      {/* Input Parameters */}
      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-4 text-sm font-medium">Simulation Parameters</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-1">
            <label
              htmlFor="currentValue"
              className="text-xs font-medium text-muted-foreground"
            >
              Current Value ($)
            </label>
            <input
              id="currentValue"
              type="number"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="annualReturn"
              className="text-xs font-medium text-muted-foreground"
            >
              Expected Return (%)
            </label>
            <input
              id="annualReturn"
              type="number"
              step="0.1"
              value={annualReturn}
              onChange={(e) => setAnnualReturn(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="annualVol"
              className="text-xs font-medium text-muted-foreground"
            >
              Volatility (%)
            </label>
            <input
              id="annualVol"
              type="number"
              step="0.1"
              value={annualVol}
              onChange={(e) => setAnnualVol(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="years"
              className="text-xs font-medium text-muted-foreground"
            >
              Years to Project
            </label>
            <input
              id="years"
              type="number"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="monthlyContrib"
              className="text-xs font-medium text-muted-foreground"
            >
              Monthly Contribution ($)
            </label>
            <input
              id="monthlyContrib"
              type="number"
              value={monthlyContrib}
              onChange={(e) => setMonthlyContrib(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleRun}
              disabled={running}
              className="h-9 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {running ? "Running..." : "Run Simulation"}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Expected Value</p>
              <p className="text-lg font-bold">
                {formatCurrency(result.expectedValue)}
              </p>
              <p className="text-xs text-muted-foreground">mean outcome</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Median Value</p>
              <p className="text-lg font-bold">
                {formatCurrency(result.medianValue)}
              </p>
              <p className="text-xs text-muted-foreground">50th percentile</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                Probability of Loss
              </p>
              <p className="text-lg font-bold">
                {(result.probabilityOfLoss * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                ending below starting value
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">
                Probability of 2x
              </p>
              <p className="text-lg font-bold text-success">
                {(result.probabilityOfDoubling * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                doubling initial value
              </p>
            </div>
          </div>

          {/* Projection chart */}
          <div className="rounded-lg border border-border p-4">
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">
              Portfolio Value Projection ({years} years, {numSims} simulations)
            </h2>
            <MonteCarloChart data={chartData} />
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>
                <strong>Purple line:</strong> Median (50th percentile)
              </span>
              <span>
                <strong>Dashed line:</strong> Mean
              </span>
              <span>
                <strong>Blue band:</strong> 25th–75th percentile
              </span>
              <span>
                <strong>Light band:</strong> 5th–95th percentile
              </span>
            </div>
          </div>

          {/* Outcome distribution */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="text-sm font-medium">Outcome Distribution</h3>
            <div className="mt-2 grid grid-cols-5 gap-4 text-center text-xs">
              <div>
                <p className="text-muted-foreground">5th %ile (worst)</p>
                <p className="font-bold">
                  {formatCurrency(result.percentile5[result.percentile5.length - 1])}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">25th %ile</p>
                <p className="font-bold">
                  {formatCurrency(result.percentile25[result.percentile25.length - 1])}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Median</p>
                <p className="font-bold">
                  {formatCurrency(result.medianValue)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">75th %ile</p>
                <p className="font-bold">
                  {formatCurrency(result.percentile75[result.percentile75.length - 1])}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">95th %ile (best)</p>
                <p className="font-bold">
                  {formatCurrency(result.percentile95[result.percentile95.length - 1])}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
