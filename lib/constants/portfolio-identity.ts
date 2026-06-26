/**
 * Portfolio visual identity — the curated set of icons and colours a user can
 * pick for a portfolio, plus a resolver that supplies a stable default when the
 * user hasn't chosen yet. Pure data (no React) so it's safe in server code.
 *
 * Render the icon with `<PortfolioIcon icon={identity.icon} />`
 * (components/ui/portfolio-icon.tsx); use `identity.swatch` for a colour chip
 * and `identity.colorVar` for chart `fill`/`stroke`.
 */

/** Icon keys (lucide component names) offered in the portfolio picker. */
export const PORTFOLIO_ICONS = [
  "Briefcase",
  "Wallet",
  "PiggyBank",
  "TrendingUp",
  "Target",
  "Landmark",
  "Building2",
  "Coins",
  "Gem",
  "LineChart",
  "BarChart3",
  "Rocket",
  "ShieldCheck",
  "Leaf",
  "Globe",
  "Home",
] as const;

export type PortfolioIconKey = (typeof PORTFOLIO_ICONS)[number];

/** Colour choices (Rosely palette), ordered for adjacent-hue contrast. */
export const PORTFOLIO_COLORS = [
  "var(--rosely14)",
  "var(--rosely7)",
  "var(--rosely11)",
  "var(--rosely13)",
  "var(--rosely8)",
  "var(--rosely10)",
  "var(--rosely2)",
  "var(--rosely5)",
  "var(--rosely12)",
  "var(--rosely9)",
] as const;

export interface PortfolioIdentity {
  icon: PortfolioIconKey;
  colorVar: string;
  swatch: string;
}

const DEFAULT_ICON: PortfolioIconKey = "Briefcase";

/** Stable hash of a string → non-negative integer. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function isIconKey(v: string | null | undefined): v is PortfolioIconKey {
  return !!v && (PORTFOLIO_ICONS as readonly string[]).includes(v);
}

/**
 * Resolve a portfolio's icon + colour, falling back to a stable default derived
 * from its id (or a positional index) when unset.
 */
export function portfolioIdentity(
  p: { id?: string | null; icon?: string | null; color?: string | null },
  index = 0
): PortfolioIdentity {
  const seed = p.id ?? String(index);
  const colorVar =
    p.color && p.color.length > 0
      ? p.color
      : PORTFOLIO_COLORS[hash(seed) % PORTFOLIO_COLORS.length];
  const icon = isIconKey(p.icon) ? p.icon : DEFAULT_ICON;
  return { icon, colorVar, swatch: `bg-[${colorVar}]` };
}
