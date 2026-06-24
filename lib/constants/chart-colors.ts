/**
 * Shared holding colour palette.
 *
 * Used to colour-code holdings consistently across every chart and table on the
 * portfolio detail page. Each entry pairs a CSS custom property (passed to
 * Recharts `fill`/`stroke` props) with the matching Tailwind arbitrary-value
 * background class (used for legend/table swatches so we avoid inline styles).
 *
 * The palette is a curated subset of the 16-colour Rosely palette (DESIGN.md),
 * ordered for maximum adjacent-hue contrast.
 */
export interface HoldingColor {
  /** CSS variable reference, e.g. `var(--rosely14)` — for Recharts props. */
  var: string;
  /** Tailwind background class, e.g. `bg-[var(--rosely14)]` — for swatches. */
  swatch: string;
}

export const HOLDING_COLORS: HoldingColor[] = [
  { var: "var(--rosely14)", swatch: "bg-[var(--rosely14)]" },
  { var: "var(--rosely7)", swatch: "bg-[var(--rosely7)]" },
  { var: "var(--rosely11)", swatch: "bg-[var(--rosely11)]" },
  { var: "var(--rosely13)", swatch: "bg-[var(--rosely13)]" },
  { var: "var(--rosely8)", swatch: "bg-[var(--rosely8)]" },
  { var: "var(--rosely2)", swatch: "bg-[var(--rosely2)]" },
  { var: "var(--rosely12)", swatch: "bg-[var(--rosely12)]" },
  { var: "var(--rosely15)", swatch: "bg-[var(--rosely15)]" },
  { var: "var(--rosely10)", swatch: "bg-[var(--rosely10)]" },
  { var: "var(--rosely9)", swatch: "bg-[var(--rosely9)]" },
  { var: "var(--rosely3)", swatch: "bg-[var(--rosely3)]" },
  { var: "var(--rosely1)", swatch: "bg-[var(--rosely1)]" },
];

/** Colour for the "Other" / aggregated slice and muted series. */
export const MUTED_COLOR: HoldingColor = {
  var: "var(--rosely3)",
  swatch: "bg-[var(--rosely3)]",
};

/** Pick a stable colour for the holding at a given ordered index. */
export function holdingColor(index: number): HoldingColor {
  return HOLDING_COLORS[index % HOLDING_COLORS.length];
}
