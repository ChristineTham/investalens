"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface FrontierPoint {
  return: number;
  risk: number;
  sharpe: number;
  weights: Record<string, number>;
}

interface AssetPoint {
  name: string;
  return: number;
  risk: number;
}

interface EfficientFrontierChartProps {
  frontier: FrontierPoint[];
  assets: AssetPoint[];
  maxSharpe?: FrontierPoint | null;
  minRisk?: FrontierPoint | null;
  currentPortfolio?: { return: number; risk: number } | null;
  /** Selected model portfolios plotted as labelled points. */
  modelPoints?: { name: string; return: number; risk: number }[];
}

export function EfficientFrontierChart({
  frontier,
  assets,
  maxSharpe,
  minRisk,
  currentPortfolio,
  modelPoints,
}: EfficientFrontierChartProps) {
  const frontierData = frontier.map((p) => ({
    risk: p.risk * 100,
    return: p.return * 100,
    sharpe: p.sharpe,
  }));

  const assetData = assets.map((a) => ({
    risk: a.risk * 100,
    return: a.return * 100,
    name: a.name,
  }));

  const specialPoints = [];
  if (maxSharpe) {
    specialPoints.push({
      risk: maxSharpe.risk * 100,
      return: maxSharpe.return * 100,
      name: "Max Sharpe",
    });
  }
  if (minRisk) {
    specialPoints.push({
      risk: minRisk.risk * 100,
      return: minRisk.return * 100,
      name: "Min Risk",
    });
  }
  if (currentPortfolio) {
    specialPoints.push({
      risk: currentPortfolio.risk * 100,
      return: currentPortfolio.return * 100,
      name: "Current",
    });
  }

  const modelData = (modelPoints ?? []).map((m) => ({
    risk: m.risk * 100,
    return: m.return * 100,
    name: m.name,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="risk"
          name="Risk"
          unit="%"
          type="number"
          className="text-xs"
          label={{ value: "Annualised Volatility (%)", position: "bottom", offset: 0 }}
        />
        <YAxis
          dataKey="return"
          name="Return"
          unit="%"
          type="number"
          className="text-xs"
          label={{ value: "Annualised Return (%)", angle: -90, position: "left" }}
        />
        <Tooltip
          formatter={(v) => [`${Number(v).toFixed(2)}%`]}
          labelFormatter={() => ""}
        />
        <Legend />
        <Scatter
          name="Frontier"
          data={frontierData}
          fill="hsl(var(--primary))"
          line={{ strokeWidth: 2 }}
          lineType="fitting"
          shape="circle"
          legendType="line"
        />
        <Scatter
          name="Assets"
          data={assetData}
          fill="hsl(var(--muted-foreground))"
          shape="diamond"
        />
        {specialPoints.length > 0 && (
          <Scatter
            name="Key Points"
            data={specialPoints}
            fill="hsl(var(--destructive))"
            shape="star"
          />
        )}
        {modelData.length > 0 && (
          <Scatter
            name="Models"
            data={modelData}
            fill="var(--rosely11)"
            shape="triangle"
          />
        )}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
