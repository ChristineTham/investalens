"use client";

import { useRouter } from "next/navigation";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";

interface HoldingNode {
  name: string;
  size: number;
  portfolioId: string;
  holdingId: string;
  portfolioIndex: number;
  holdingIndex: number;
  holdingCount: number;
  [key: string]: string | number;
}

interface PortfolioNode {
  name: string;
  portfolioIndex: number;
  children: HoldingNode[];
  [key: string]: string | number | HoldingNode[];
}

export interface PortfolioTreemapData {
  portfolioId: string;
  portfolioName: string;
  holdings: { id: string; code: string; marketValue: number }[];
}

interface PortfolioValueTreemapProps {
  data: PortfolioTreemapData[];
}

// Base hues for portfolios (HSL hue values)
const PORTFOLIO_HUES = [210, 150, 340, 30, 270, 180, 60, 300, 120, 0];

function getPortfolioColor(portfolioIndex: number, opacity: number = 1): string {
  const hue = PORTFOLIO_HUES[portfolioIndex % PORTFOLIO_HUES.length];
  return `hsla(${hue}, 65%, 45%, ${opacity})`;
}

function getHoldingColor(portfolioIndex: number, holdingIndex: number, holdingCount: number): string {
  const hue = PORTFOLIO_HUES[portfolioIndex % PORTFOLIO_HUES.length];
  // Vary lightness from 35% to 60% based on position within portfolio
  const lightness = holdingCount > 1
    ? 35 + (holdingIndex / (holdingCount - 1)) * 25
    : 45;
  return `hsl(${hue}, 65%, ${lightness}%)`;
}

function CustomContent(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
  value?: number;
  root?: { children?: { value: number }[] };
  depth?: number;
  portfolioIndex?: number;
  holdingIndex?: number;
  holdingCount?: number;
}) {
  const {
    x = 0, y = 0, width = 0, height = 0,
    name = "", value = 0, root, depth = 0,
    portfolioIndex = 0, holdingIndex = 0, holdingCount = 1,
  } = props;

  if (depth === 1) {
    // Portfolio level - border and label
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={getPortfolioColor(portfolioIndex, 0.15)}
          stroke={getPortfolioColor(portfolioIndex)}
          strokeWidth={2}
        />
        {width > 60 && height > 20 && (
          <text
            x={x + 4}
            y={y + 14}
            fill={getPortfolioColor(portfolioIndex)}
            fontSize={10}
            fontWeight="bold"
          >
            {name}
          </text>
        )}
      </g>
    );
  }

  // Holding level - colored by portfolio with shade variation
  const total = root?.children?.reduce((s, c) => s + c.value, 0) || 1;
  const percent = ((value / total) * 100).toFixed(1);
  const fillColor = getHoldingColor(portfolioIndex, holdingIndex, holdingCount);

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fillColor}
        stroke="var(--background)"
        strokeWidth={1.5}
        className="cursor-pointer"
      />
      {width > 40 && height > 28 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="white"
            fontSize={11}
            fontWeight="bold"
            className="pointer-events-none"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 8}
            textAnchor="middle"
            fill="white"
            fontSize={9}
            opacity={0.8}
            className="pointer-events-none"
          >
            {percent}%
          </text>
        </>
      )}
    </g>
  );
}

export function PortfolioValueTreemap({ data }: PortfolioValueTreemapProps) {
  const router = useRouter();

  // Build hierarchical data for recharts Treemap
  const treemapData: PortfolioNode[] = data
    .filter((p) => p.holdings.length > 0)
    .map((p, pIdx) => ({
      name: p.portfolioName,
      portfolioIndex: pIdx,
      children: p.holdings.map((h, hIdx) => ({
        name: h.code,
        size: h.marketValue,
        portfolioId: p.portfolioId,
        holdingId: h.id,
        portfolioIndex: pIdx,
        holdingIndex: hIdx,
        holdingCount: p.holdings.length,
      })),
    }));

  const handleClick = (node: unknown) => {
    const n = node as { portfolioId?: string; holdingId?: string };
    if (n.portfolioId && n.holdingId) {
      router.push(`/portfolio/${n.portfolioId}/holdings/${n.holdingId}`);
    }
  };

  if (treemapData.length === 0) return null;

  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border p-4">
        <h2 className="font-medium">Portfolio Allocation</h2>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={350}>
          <Treemap
            data={treemapData}
            dataKey="size"
            nameKey="name"
            aspectRatio={4 / 3}
            stroke="var(--background)"
            content={<CustomContent />}
            onClick={handleClick}
          >
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value) => [
                `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                "Value",
              ]}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
