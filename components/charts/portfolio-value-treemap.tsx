"use client";

import { useMemo } from "react";
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
  fullName: string;
  instrumentType: string;
  units: number;
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
  /** The portfolio's chosen identity colour (CSS var), used to tint its tiles. */
  color?: string;
  holdings: {
    id: string;
    code: string;
    name?: string;
    instrumentType?: string;
    quantity?: number;
    marketValue: number;
  }[];
}

interface PortfolioValueTreemapProps {
  data: PortfolioTreemapData[];
}

// Base hues for portfolios (HSL hue values), used when a portfolio has no
// chosen identity colour to derive a hue from.
const PORTFOLIO_HUES = [210, 150, 340, 30, 270, 180, 60, 300, 120, 0];
const SAT = 65;

/** Parse a hex or rgb() string to [r,g,b]. */
function toRgb(s: string): [number, number, number] | null {
  const t = s.trim();
  const hex = t.match(/^#?([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = t.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const [r, g, b] = rgb[1].split(",").map((x) => parseFloat(x));
    if ([r, g, b].every((v) => Number.isFinite(v))) return [r, g, b];
  }
  return null;
}

function rgbToHue(r: number, g: number, b: number): number {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d === 0) h = 0;
  else if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  return h < 0 ? h + 360 : h;
}

/** Resolve a CSS colour (incl. `var(--roselyN)`) to an HSL hue (client only). */
function cssColorToHue(color: string): number | null {
  if (typeof document === "undefined") return null;
  let resolved = color;
  const m = color.match(/var\((--[\w-]+)\)/);
  if (m) {
    resolved = getComputedStyle(document.documentElement)
      .getPropertyValue(m[1])
      .trim();
  }
  const rgb = toRgb(resolved);
  return rgb ? rgbToHue(rgb[0], rgb[1], rgb[2]) : null;
}

function getPortfolioColor(hue: number, opacity: number = 1): string {
  return `hsla(${hue}, ${SAT}%, 45%, ${opacity})`;
}

// Lightness for a holding tile (kept in a darker band so labels stay legible).
function holdingLightness(holdingIndex: number, holdingCount: number): number {
  return holdingCount > 1
    ? 34 + (holdingIndex / (holdingCount - 1)) * 20 // 34%–54%
    : 44;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4)),
  ];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// Choose a legible text colour (and halo) for a given tile lightness/hue.
function tileTextColor(hue: number, lightness: number): string {
  const [r, g, b] = hslToRgb(hue, SAT, lightness);
  return relativeLuminance(r, g, b) > 0.42 ? "#111111" : "#ffffff";
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
  hue?: number;
  portfolioId?: string;
  holdingId?: string;
  onNavigate?: (portfolioId: string, holdingId: string) => void;
}) {
  const {
    x = 0, y = 0, width = 0, height = 0,
    name = "", value = 0, root, depth = 0,
    portfolioIndex = 0, holdingIndex = 0, holdingCount = 1,
    hue, portfolioId, holdingId, onNavigate,
  } = props;

  const hueVal = hue ?? PORTFOLIO_HUES[portfolioIndex % PORTFOLIO_HUES.length];

  if (depth === 1) {
    // Portfolio level - border and label
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={getPortfolioColor(hueVal, 0.15)}
          stroke={getPortfolioColor(hueVal)}
          strokeWidth={2}
        />
        {width > 60 && height > 20 && (
          <text
            x={x + 5}
            y={y + 15}
            fill="var(--foreground)"
            stroke="var(--card)"
            strokeWidth={3}
            paintOrder="stroke"
            fontSize={11}
            fontWeight="bold"
          >
            {name}
          </text>
        )}
      </g>
    );
  }

  // Holding level - coloured by portfolio with shade variation
  const total = root?.children?.reduce((s, c) => s + c.value, 0) || 1;
  const percent = ((value / total) * 100).toFixed(1);
  const lightness = holdingLightness(holdingIndex, holdingCount);
  const fillColor = `hsl(${hueVal}, ${SAT}%, ${lightness}%)`;
  const textColor = tileTextColor(hueVal, lightness);
  const halo = textColor === "#ffffff" ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.7)";

  const navigate = () => {
    if (onNavigate && portfolioId && holdingId) onNavigate(portfolioId, holdingId);
  };

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${name}, ${percent}% of total holdings. Press Enter to open the holding detail page.`}
      onClick={navigate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate();
        }
      }}
      className="cursor-pointer"
    >
      <title>{`${name} — ${percent}%`}</title>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fillColor}
        stroke="var(--background)"
        strokeWidth={1.5}
      />
      {width > 40 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 5}
            textAnchor="middle"
            fill={textColor}
            stroke={halo}
            strokeWidth={2.5}
            paintOrder="stroke"
            fontSize={12}
            fontWeight="bold"
            className="pointer-events-none"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill={textColor}
            stroke={halo}
            strokeWidth={2}
            paintOrder="stroke"
            fontSize={10}
            className="pointer-events-none"
          >
            {percent}%
          </text>
        </>
      )}
    </g>
  );
}

function TreemapTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: Record<string, unknown> }[];
}) {
  if (!active || !payload?.length) return null;
  const node = payload[0]?.payload;
  // Only holding (leaf) nodes carry a holdingId.
  if (!node || typeof node.holdingId !== "string") return null;

  const code = String(node.name ?? "");
  const fullName = node.fullName ? String(node.fullName) : "";
  const type = node.instrumentType ? String(node.instrumentType) : "\u2014";
  const units = Number(node.units ?? 0);
  const value = Number(node.size ?? 0);

  return (
    <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-sm">
      <p className="font-medium text-foreground">
        {code}
        {fullName ? (
          <span className="font-normal text-muted-foreground"> — {fullName}</span>
        ) : null}
      </p>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
        <dt className="text-muted-foreground">Type</dt>
        <dd className="text-right">{type}</dd>
        <dt className="text-muted-foreground">Units</dt>
        <dd className="text-right">
          {units.toLocaleString(undefined, { maximumFractionDigits: 4 })}
        </dd>
        <dt className="text-muted-foreground">Value</dt>
        <dd className="text-right">
          ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </dd>
      </dl>
    </div>
  );
}

export function PortfolioValueTreemap({ data }: PortfolioValueTreemapProps) {
  const router = useRouter();

  // Resolve each portfolio's chosen colour to an HSL hue. `cssColorToHue`
  // returns null during SSR; the treemap only renders once ResponsiveContainer
  // has a measured width on the client, so no hydration mismatch occurs.
  const hues = useMemo(
    () => data.map((p) => (p.color ? cssColorToHue(p.color) : null)),
    [data]
  );

  const visible = useMemo(() => data.filter((p) => p.holdings.length > 0), [data]);

  // Build hierarchical data for recharts Treemap
  const treemapData: PortfolioNode[] = visible.map((p, pIdx) => {
    const hue = hues[data.indexOf(p)] ?? PORTFOLIO_HUES[pIdx % PORTFOLIO_HUES.length];
    return {
      name: p.portfolioName,
      portfolioIndex: pIdx,
      hue,
      children: p.holdings.map((h, hIdx) => ({
        name: h.code,
        size: h.marketValue,
        portfolioId: p.portfolioId,
        holdingId: h.id,
        portfolioIndex: pIdx,
        holdingIndex: hIdx,
        holdingCount: p.holdings.length,
        hue,
        fullName: h.name ?? "",
        instrumentType: h.instrumentType ?? "",
        units: h.quantity ?? 0,
      })),
    };
  });

  const navigate = (portfolioId: string, holdingId: string) => {
    router.push(`/portfolio/${portfolioId}/holdings/${holdingId}`);
  };

  const handleClick = (node: unknown) => {
    const n = node as { portfolioId?: string; holdingId?: string };
    if (n.portfolioId && n.holdingId) navigate(n.portfolioId, n.holdingId);
  };

  if (treemapData.length === 0) return null;

  const grandTotal = treemapData.reduce(
    (s, p) => s + p.children.reduce((cs, c) => cs + Number(c.size), 0),
    0
  );

  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border p-4">
        <h2 className="font-medium">Portfolio Allocation</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tile size is the holding&apos;s market value. Click a holding (or focus
          it and press Enter) to open its detail page.
        </p>
      </div>
      <div className="p-4">
        <div
          role="group"
          aria-label="Portfolio allocation treemap by market value"
        >
          <ResponsiveContainer width="100%" height={350}>
            <Treemap
              data={treemapData}
              dataKey="size"
              nameKey="name"
              aspectRatio={4 / 3}
              stroke="var(--background)"
              content={<CustomContent onNavigate={navigate} />}
              onClick={handleClick}
            >
              <Tooltip content={<TreemapTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>

        {/* Screen-reader accessible breakdown of the treemap */}
        <table className="sr-only">
          <caption>Portfolio allocation by holding (market value)</caption>
          <thead>
            <tr>
              <th>Portfolio</th>
              <th>Holding</th>
              <th>Market value</th>
              <th>Share of total</th>
            </tr>
          </thead>
          <tbody>
            {treemapData.flatMap((p) =>
              p.children.map((h) => (
                <tr key={h.holdingId}>
                  <td>{p.name}</td>
                  <td>{h.name}</td>
                  <td>
                    $
                    {Number(h.size).toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td>
                    {grandTotal > 0
                      ? ((Number(h.size) / grandTotal) * 100).toFixed(1)
                      : "0.0"}
                    %
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
