"use client";

import { useRouter } from "next/navigation";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";

interface HoldingNode {
  name: string;
  size: number;
  portfolioId: string;
  holdingId: string;
}

interface PortfolioNode {
  name: string;
  children: HoldingNode[];
}

export interface PortfolioTreemapData {
  portfolioId: string;
  portfolioName: string;
  holdings: { id: string; code: string; marketValue: number }[];
}

interface PortfolioValueTreemapProps {
  data: PortfolioTreemapData[];
}

const COLORS = [
  "var(--rosely2)",
  "var(--rosely7)",
  "var(--rosely8)",
  "var(--rosely14)",
  "var(--rosely15)",
  "var(--rosely10)",
  "var(--rosely9)",
  "var(--rosely12)",
  "var(--rosely13)",
  "var(--rosely3)",
];

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
}) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, name = "", value = 0, root, depth = 0 } = props;

  if (depth === 1) {
    // Portfolio level - just draw the rect, children will be drawn on top
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={COLORS[index % COLORS.length]}
          fillOpacity={0.2}
          stroke="var(--border)"
          strokeWidth={2}
        />
        {width > 60 && height > 20 && (
          <text
            x={x + 4}
            y={y + 14}
            fill="var(--muted-foreground)"
            fontSize={10}
            fontWeight="bold"
          >
            {name}
          </text>
        )}
      </g>
    );
  }

  // Holding level
  const total = root?.children?.reduce((s, c) => s + c.value, 0) || 1;
  const percent = ((value / total) * 100).toFixed(1);

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={COLORS[index % COLORS.length]}
        fillOpacity={0.85}
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
    .map((p) => ({
      name: p.portfolioName,
      children: p.holdings.map((h) => ({
        name: h.code,
        size: h.marketValue,
        portfolioId: p.portfolioId,
        holdingId: h.id,
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
