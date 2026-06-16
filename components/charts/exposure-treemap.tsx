"use client";

import {
  Treemap,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface ExposureData {
  name: string;
  size: number;
  color?: string;
  children?: ExposureData[];
  [key: string]: unknown;
}

interface ExposureTreemapProps {
  data: ExposureData[];
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

function CustomTreemapContent(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
  value?: number;
  root?: { children?: { value: number }[] };
}) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, name = "", value = 0, root } = props;
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
        strokeWidth={2}
      />
      {width > 50 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="white"
            fontSize={12}
            fontWeight="bold"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="white"
            fontSize={10}
            opacity={0.8}
          >
            {percent}%
          </text>
        </>
      )}
    </g>
  );
}

export function ExposureTreemap({ data }: ExposureTreemapProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <Treemap
        data={data}
        dataKey="size"
        nameKey="name"
        aspectRatio={4 / 3}
        stroke="var(--background)"
        content={<CustomTreemapContent />}
      >
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: "12px",
          }}
          formatter={(value) => [`$${Number(value).toLocaleString()}`, "Value"]}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
